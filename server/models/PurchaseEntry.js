const mongoose = require('mongoose');

const purchaseEntrySchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    qty: { type: Number, required: true, min: 1 },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    // Reference back to the embedded batch id in Part.vendorBatches
    batchId: { type: mongoose.Schema.Types.ObjectId },
    // Payment tracking
    paymentDueDate: { type: Date },
    paymentPaid: { type: Boolean, default: false },
    paymentPaidAt: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

purchaseEntrySchema.index({ branch: 1, createdAt: -1 });
purchaseEntrySchema.index({ vendor: 1, paymentPaid: 1 });
purchaseEntrySchema.index({ part: 1 });

module.exports = mongoose.model('PurchaseEntry', purchaseEntrySchema);
