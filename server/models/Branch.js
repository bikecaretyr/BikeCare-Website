const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
      trim: true,
      maxlength: 10,
    },
    address: {
      street: String,
      city: { type: String, default: 'Trichy' },
      state: { type: String, default: 'Tamil Nadu' },
      pincode: String,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;

          const mobileRegex =
            /^(?:\+91)?[6-9]\d{9}$/;

          const landlineRegex =
            /^(?:\+91[- ]?)?0\d{2,4}[- ]?\d{6,8}$/;

          return mobileRegex.test(v) || landlineRegex.test(v);
        },
        message: 'Invalid phone number',
      },
    },

    phoneType: {
      type: String,
      enum: ['mobile', 'landline'],
      default: 'mobile',
    },
    whatsapp: String,
    email: String,
    googleMapsUrl: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    workingHours: {
      open: { type: String, default: '08:00' },
      close: { type: String, default: '20:00' },
      days: {
        type: [String],
        default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      },
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', branchSchema);
