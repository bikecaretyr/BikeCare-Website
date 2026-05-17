/**
 * Migration: existing parts → vendor batch model
 *
 * Run once: node server/utils/migrateInventory.js
 *
 * What it does:
 *   1. Creates one "Legacy Vendor" per branch
 *   2. For each existing Part with a unitPrice + stock,
 *      wraps those into a single VendorBatch pointing at the legacy vendor
 *   3. Sets totalStock = existing stock value
 *   4. Leaves unitPrice data in the document as a comment field (migrated_unitPrice)
 *      so nothing is lost — can be removed later
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Part = require('../models/Part');
const Vendor = require('../models/Vendor');
const Branch = require('../models/Branch');
const logger = require('../utils/logger');

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected. Starting inventory migration...');

  const branches = await Branch.find({ isActive: true });
  const legacyVendorMap = {}; // branchId → vendorId

  // Step 1: Create a legacy vendor for each branch
  for (const branch of branches) {
    let legacy = await Vendor.findOne({ isLegacy: true, branches: branch._id });
    if (!legacy) {
      legacy = await Vendor.create({
        name: `Legacy Stock — ${branch.name}`,
        isLegacy: true,
        paymentDueDays: 0,
        branches: [branch._id],
      });
      logger.info(`  Created legacy vendor for branch: ${branch.name}`);
    }
    legacyVendorMap[branch._id.toString()] = legacy;
  }

  // Step 2: Find all parts that haven't been migrated yet
  // We detect un-migrated parts by checking if vendorBatches is empty
  const unmigrated = await mongoose.connection.db
    .collection('parts')
    .find({ $or: [{ vendorBatches: { $exists: false } }, { vendorBatches: { $size: 0 } }] })
    .toArray();

  logger.info(`Found ${unmigrated.length} parts to migrate.`);

  let ok = 0;
  let skipped = 0;

  for (const raw of unmigrated) {
    const branchKey = raw.branch?.toString();
    const legacyVendor = legacyVendorMap[branchKey];

    if (!legacyVendor) {
      logger.warn(`  Skipping part "${raw.partName}" — no branch vendor found`);
      skipped++;
      continue;
    }

    const stock = raw.stock || 0;
    const unitPrice = raw.unitPrice || 0;

    const batch = {
      _id: new mongoose.Types.ObjectId(),
      vendorId: legacyVendor._id,
      vendorName: legacyVendor.name,
      purchasePrice: unitPrice, // we don't know actual purchase price, use selling as estimate
      sellingPrice: unitPrice,
      stock,
      purchasedAt: raw.createdAt || new Date(),
      isActive: true,
    };

    await mongoose.connection.db.collection('parts').updateOne(
      { _id: raw._id },
      {
        $set: {
          vendorBatches: [batch],
          totalStock: stock,
          // Keep original fields as a record — remove later if desired
          migrated_unitPrice: unitPrice,
          migrated_stock: stock,
        },
        $unset: { unitPrice: '', stock: '' },
      }
    );

    ok++;
    if (ok % 20 === 0) logger.info(`  Migrated ${ok}/${unmigrated.length}...`);
  }

  logger.info(`Migration complete. ${ok} migrated, ${skipped} skipped.`);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
