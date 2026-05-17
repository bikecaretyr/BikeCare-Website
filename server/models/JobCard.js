const mongoose = require('mongoose');

const spareItemSchema = new mongoose.Schema(
  {
    partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part' },
    partNumber: { type: String, trim: true },   // snapshot — primary identifier
    partName: { type: String, trim: true },   // snapshot — human label
    vendorBatchId: { type: mongoose.Schema.Types.ObjectId },
    vendorName: { type: String, trim: true },
    sellingPrice: { type: Number, min: 0 },
    qty: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const jobCardSchema = new mongoose.Schema(
  {
    jobNo: { type: String, unique: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    vehicleNumber: {
      type: String, required: [true, 'Vehicle number is required'],
      uppercase: true, trim: true,
    },
    brand: { type: String, required: [true, 'Brand is required'], trim: true },
    model: { type: String, trim: true },
    kmReading: { type: Number, min: 0 },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    serviceInDate: { type: Date, required: true, default: Date.now },
    expectedDelivery: Date,
    actualDelivery: Date,
    serviceMode: {
      type: String,
      enum: ['General Service', 'Engine Repair', 'Tyre Change', 'Electrical Work', 'Body Work', 'Full Service', 'Other'],
      default: 'General Service',
    },

    complaint: { type: String, trim: true },
    mechanic: { type: String, required: [true, 'Mechanic is required'], trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    engineOil: { type: String, trim: true },
    sparesUsed: [spareItemSchema],
    workDone: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Received', 'In Progress', 'Ready', 'Delivered', 'Cancelled'],
      default: 'Received',
    },

    labourCharge: { type: Number, default: 0, min: 0 },
    waterWash: { type: Number, default: 0, min: 0 },
    sparesCost: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Credit'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Partial'],
      default: 'Paid',
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentHistory: [
      {
        amount: { type: Number, required: true, min: 0 },
        mode: {
          type: String,
          enum: ['Cash', 'UPI', 'Card', 'Credit'],
          required: true,
        },
        paidAt: {
          type: Date,
          default: Date.now,
        },
        note: String,
        receivedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    creditCollected: { type: Boolean, default: false },
    creditCollectedAt: Date,
    creditCollectedMode: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Atomic job number — no race condition
const Counter = require('./Counter');
jobCardSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const counter = await Counter.findByIdAndUpdate(
    `branch_${this.branch}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.jobNo = `JC-${date}-${String(counter.seq).padStart(4, '0')}`;
  next();
});

// Auto-calculate sparesCost from structured sparesUsed, then total
jobCardSchema.pre('save', function (next) {
  this.sparesCost = (this.sparesUsed || []).reduce(
    (sum, item) => sum + (item.sellingPrice || 0) * (item.qty || 1),
    0
  );
  this.totalAmount = Math.max(
    0,
    (this.labourCharge || 0) + (this.waterWash || 0) + (this.sparesCost || 0) - (this.discount || 0)
  );
  const totalPaid = (this.paymentHistory || []).reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  this.paidAmount = totalPaid;

  this.balanceAmount = Math.max(
    0,
    this.totalAmount - this.paidAmount
  );

  if (this.balanceAmount <= 0) {
    this.paymentStatus = 'Paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'Partial';
  } else {
    this.paymentStatus = 'Pending';
  }
  next();
});

jobCardSchema.index({ branch: 1, createdAt: -1 });
jobCardSchema.index({ branch: 1, status: 1 });
jobCardSchema.index({ vehicleNumber: 1 });
jobCardSchema.index({ customerPhone: 1 });
jobCardSchema.index({ branch: 1, serviceInDate: -1 });
jobCardSchema.index({ paymentMode: 1, creditCollected: 1 });

module.exports = mongoose.model('JobCard', jobCardSchema);