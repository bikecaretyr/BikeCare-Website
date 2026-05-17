const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    phone: { type: String, trim: true },
    paymentDueDays: {
      type: Number,
      default: 30,
      min: 0,
      comment: 'Number of days from purchase before payment is due',
    },
    vehicleModels: [{ type: String, trim: true }],
    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    isActive: { type: Boolean, default: true },
    isLegacy: { type: Boolean, default: false }, // used by migration script
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vendorSchema.index({ isActive: 1 });
vendorSchema.index({ branches: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
