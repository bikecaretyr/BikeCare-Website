const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true,
    },
    qty: { type: Number, required: true, min: 1 },
    purchaseCost: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    items: [purchaseItemSchema],
    miscCost: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    paymentDueDate: { type: Date },
    paymentPaid: { type: Boolean, default: false },
    paymentPaidAt: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

purchaseSchema.index({ branch: 1, createdAt: -1 });
purchaseSchema.index({ vendor: 1, paymentPaid: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);