const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: String,   // e.g. "branch_507f1f77bcf86cd799439011"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
