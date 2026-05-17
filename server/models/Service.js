const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, min: 0, default: 0 },
    priceType: {
      type: String,
      enum: ['fixed', 'starting_from', 'on_request'],
      default: 'fixed',
    },
    category: {
      type: String,
      enum: ['General', 'Repair', 'Electrical', 'Body', 'Tyres', 'Full Service', 'Other'],
      default: 'General',
    },
    durationMinutes: { type: Number, default: 60 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
