const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: { type: String, unique: true },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Provide a valid Indian phone number'],
    },
    customerEmail: { type: String, trim: true, lowercase: true },
    vehicleNumber: { type: String, trim: true, uppercase: true },
    vehicleBrand: { type: String, trim: true },
    vehicleModel: { type: String, trim: true },
    serviceRequested: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    serviceNote: { type: String, trim: true },
    preferredDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    adminNote: { type: String, trim: true },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: Date,
    convertedToJobCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobCard',
      default: null,
    },
    ipAddress: String,
  },
  { timestamps: true }
);

bookingSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const count = await this.constructor.countDocuments();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  this.bookingRef = `BK-${date}-${String(count + 1).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
