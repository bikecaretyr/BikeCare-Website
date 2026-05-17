const Booking = require('../models/Booking');
const Branch = require('../models/Branch');
const User = require('../models/User');
const JobCard = require('../models/JobCard');
const { notifyAdmins } = require('../utils/notification');
const { sendEmail, emailTemplates } = require('../utils/email');
const audit = require('../utils/audit');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Public: Create Booking ────────────────────────────────
exports.createBooking = asyncHandler(async (req, res) => {
  const { customerName, customerPhone, customerEmail, vehicleNumber, vehicleBrand, vehicleModel, serviceRequested, serviceNote, preferredDate, branchId } = req.body;
  if (!customerName || !customerPhone || !preferredDate || !branchId)
    throw new AppError('Name, phone, preferred date and branch are required.', 400);

  const branch = await Branch.findById(branchId);
  if (!branch || !branch.isActive) throw new AppError('Selected branch is not available.', 400);

  const booking = await Booking.create({
    branch: branchId,
    customerName,
    customerPhone,
    customerEmail,
    vehicleNumber,
    vehicleBrand,
    vehicleModel,
    serviceRequested,
    serviceNote,
    preferredDate: new Date(preferredDate),
    ipAddress: req.ip,
  });

  await notifyAdmins(User, {
    type: 'booking_new',
    title: '📅 New Service Booking',
    message: `${customerName} booked a service at ${branch.name} for ${new Date(preferredDate).toLocaleDateString('en-IN')}`,
    link: `/admin/bookings/${booking._id}`,
    relatedId: booking._id.toString(),
    relatedModel: 'Booking',
  });

  // Send confirmation email if provided
  if (customerEmail) {
    try {
      const { subject, html } = emailTemplates.bookingConfirmation(booking);
      await sendEmail({ to: customerEmail, subject, html });
    } catch (_) { /* non-blocking */ }
  }

  res.status(201).json({
    success: true,
    message: 'Booking submitted successfully! We will contact you to confirm.',
    bookingRef: booking.bookingRef,
  });
});

// ── Admin: Get All Bookings ───────────────────────────────
exports.getBookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.branchFilter) filter.branch = req.branchFilter;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.branch) filter.branch = req.query.branch;

  const bookings = await Booking.find(filter)
    .populate('branch', 'name code')
    .populate('serviceRequested', 'name price')
    .populate('confirmedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: bookings.length, bookings });
});

// ── Admin: Update Booking Status ─────────────────────────
exports.updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);

  const { status, adminNote } = req.body;
  booking.status = status || booking.status;
  booking.adminNote = adminNote || booking.adminNote;
  if (status === 'Confirmed') {
    booking.confirmedBy = req.user.id;
    booking.confirmedAt = new Date();
  }
  await booking.save();
  await audit({ actor: req.user.id, actorRole: req.user.role, action: 'UPDATE_BOOKING', targetModel: 'Booking', targetId: booking._id, req });
  res.json({ success: true, message: 'Booking updated.', booking });
});

// ── Admin: Convert Booking to Job Card ────────────────────
exports.convertToJobCard = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.convertedToJobCard) throw new AppError('Already converted to job card.', 409);

  const job = await JobCard.create({
    branch: booking.branch,
    vehicleNumber: booking.vehicleNumber || 'PENDING',
    brand: booking.vehicleBrand || 'Other',
    model: booking.vehicleModel,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    serviceInDate: new Date(),
    mechanic: req.body.mechanic || 'Unassigned',
    serviceMode: req.body.serviceMode || 'General Service',
    complaint: booking.serviceNote,
    createdBy: req.user.role === 'superadmin' ? null : req.user.id,
  });

  booking.convertedToJobCard = job._id;
  booking.status = 'Completed';
  await booking.save();

  res.status(201).json({ success: true, message: 'Booking converted to job card.', job });
});
