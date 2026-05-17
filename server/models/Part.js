const mongoose = require('mongoose');

const vendorBatchSchema = new mongoose.Schema(
  {
    vendorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName:    { type: String, trim: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice:  { type: Number, required: true, min: 0 },
    stock:         { type: Number, required: true, min: 0, default: 0 },
    purchasedAt:   { type: Date, default: Date.now },
    isActive:      { type: Boolean, default: true },
  },
  { _id: true }
);

const partSchema = new mongoose.Schema(
  {
    partNumber: {
      type: String,
      required: [true, 'Part number is required'],
      trim: true,
      uppercase: true,
    },
    partName: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
    },
    brand:      { type: String, trim: true },
    branch:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    vendorBatches: [vendorBatchSchema],
    totalStock:    { type: Number, default: 0, min: 0 },
    minStock:      { type: Number, default: 5, min: 0 },
    isActive:      { type: Boolean, default: true },
    lastRestockedAt: Date,
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

partSchema.methods.recalculateStock = function () {
  const batches = this.vendorBatches || [];

  this.totalStock = batches
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + b.stock, 0);

  return this.totalStock;
};

// Keep totalStock in sync on every save
partSchema.pre('save', function (next) {
  this.recalculateStock();
  next();
});

partSchema.virtual('isLowStock').get(function () {
  return this.totalStock <= this.minStock;
});

partSchema.virtual('stockValue').get(function () {
  const batches = this.vendorBatches || [];
  const active = batches.filter((b) => b.isActive && b.stock > 0);
  if (!active.length) return 0;
  const avg = active.reduce((s, b) => s + b.sellingPrice, 0) / active.length;
  return Math.round(this.totalStock * avg);
});

// partNumber unique per branch
partSchema.index({ branch: 1, partNumber: 1 }, { unique: true });
partSchema.index({ branch: 1, isActive: 1 });
partSchema.index({ branch: 1, totalStock: 1 });
partSchema.index({ partNumber: 1 });

module.exports = mongoose.model('Part', partSchema);