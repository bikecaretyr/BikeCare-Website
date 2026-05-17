require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Service = require('../models/Service');
const logger = require('../utils/logger');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to MongoDB for seeding...');

  // ── Branches ──────────────────────────────────────────
  const branchData = [
    { name: 'Main Branch — Trichy', code: 'TN-MAIN', address: { street: '42, Palayamkottai Road', city: 'Trichy', state: 'Tamil Nadu', pincode: '627002' }, phone: '9876500001', whatsapp: '9876500001' },
    { name: 'Branch 2 — Pettai', code: 'TN-PTT', address: { street: '18, NH Road, Pettai', city: 'Trichy', state: 'Tamil Nadu', pincode: '627004' }, phone: '9876500002', whatsapp: '9876500002' },
    { name: 'Branch 3 — Melapalayam', code: 'TN-MLP', address: { street: '5, Melapalayam Main Rd', city: 'Trichy', state: 'Tamil Nadu', pincode: '627005' }, phone: '9876500003', whatsapp: '9876500003' },
    { name: 'Branch 4 — Nanguneri', code: 'TN-NNG', address: { street: '10, Gandhi Street', city: 'Nanguneri', state: 'Tamil Nadu', pincode: '627108' }, phone: '9876500004', whatsapp: '9876500004' },
  ];

  let branches = [];
  for (const b of branchData) {
    const existing = await Branch.findOne({ code: b.code });
    if (!existing) {
      const branch = await Branch.create(b);
      branches.push(branch);
      logger.info(`✅ Branch created: ${b.name}`);
    } else {
      branches.push(existing);
      logger.info(`⏭ Branch exists: ${b.name}`);
    }
  }

  // ── Admin User ────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@balajimotor.in';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: process.env.ADMIN_NAME || 'Balaji Motors Admin',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin@1234',
      role: 'admin',
      branch: null,
    });
    logger.info(`✅ Admin created: ${adminEmail}`);
  } else {
    logger.info(`⏭ Admin exists: ${adminEmail}`);
  }

  // ── Demo Employee ─────────────────────────────────────
  const empEmail = 'employee@balajimotor.in';
  if (!(await User.findOne({ email: empEmail }))) {
    await User.create({
      name: 'Demo Employee',
      email: empEmail,
      password: 'Employee@1234',
      role: 'employee',
      branch: branches[0]._id,
    });
    logger.info(`✅ Demo employee created: ${empEmail}`);
  }

  // ── Service Catalog ──────────────────────────────────
  const services = [
    { name: 'General Service', description: 'Complete bike checkup including oil change, brake adjustment, and filter cleaning.', price: 499, category: 'General', durationMinutes: 60, sortOrder: 1 },
    { name: 'Engine Oil Change', description: 'Premium engine oil replacement with filter change.', price: 350, category: 'General', durationMinutes: 30, sortOrder: 2 },
    { name: 'Full Service', description: 'Comprehensive service covering all mechanical and electrical components.', price: 1299, category: 'Full Service', durationMinutes: 180, sortOrder: 3 },
    { name: 'Tyre Change', description: 'Front or rear tyre replacement with balancing.', price: 250, priceType: 'starting_from', category: 'Tyres', durationMinutes: 45, sortOrder: 4 },
    { name: 'Electrical Repair', description: 'Wiring, battery, horn, and lighting repairs.', price: 300, priceType: 'starting_from', category: 'Electrical', durationMinutes: 60, sortOrder: 5 },
    { name: 'Engine Repair', description: 'Cylinder head, piston, and engine overhaul services.', price: 1500, priceType: 'starting_from', category: 'Repair', durationMinutes: 240, sortOrder: 6 },
    { name: 'Body Work & Painting', description: 'Dent removal, panel repair, and partial/full painting.', price: 800, priceType: 'starting_from', category: 'Body', durationMinutes: 120, sortOrder: 7 },
    { name: 'Water Wash & Cleaning', description: 'Full bike wash and detailing.', price: 100, category: 'General', durationMinutes: 30, sortOrder: 8 },
  ];

  for (const svc of services) {
    if (!(await Service.findOne({ name: svc.name }))) {
      await Service.create(svc);
      logger.info(`✅ Service created: ${svc.name}`);
    }
  }

  logger.info('\n🎉 Database seeded successfully!');
  logger.info(`\n📋 Login Credentials:`);
  logger.info(`   Admin    → ${adminEmail} / ${process.env.ADMIN_PASSWORD || 'Admin@1234'}`);
  logger.info(`   Employee → ${empEmail} / Employee@1234`);
  logger.info(`   SuperAdmin → /superadmin (use .env credentials)`);
  logger.info('\n⚠  Change all passwords after first login!\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  logger.error(err);
  process.exit(1);
});
