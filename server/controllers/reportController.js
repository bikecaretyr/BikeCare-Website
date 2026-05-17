const JobCard = require('../models/JobCard');
const Part = require('../models/Part');
const Booking = require('../models/Booking');
const { asyncHandler } = require('../middleware/errorHandler');

const dateRange = (period) => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    return { $gte: start };
  }

  if (period === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }

  if (period === 'week') return { $gte: new Date(Date.now() - 7 * 864e5) };
  if (period === 'month') return { $gte: new Date(Date.now() - 30 * 864e5) };

  if (period === 'lastMonth') {
    start.setMonth(start.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }

  if (period === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { $gte: start };
  }

  return undefined;
};

exports.getDashboard = asyncHandler(async (req, res) => {
  const branchFilter = req.branchFilter ? { branch: req.branchFilter } : {};
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [
    totalJobs, todayJobs, totalRevenue, todayRevenue,
    pendingCredits, lowStockCount, pendingBookings, pendingApprovals
  ] = await Promise.all([
    JobCard.countDocuments(branchFilter),
    JobCard.countDocuments({ ...branchFilter, serviceInDate: { $gte: today } }),
    JobCard.aggregate([{ $match: { ...branchFilter, paymentMode: { $ne: 'Credit' } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    JobCard.aggregate([{ $match: { ...branchFilter, serviceInDate: { $gte: today }, paymentMode: { $ne: 'Credit' } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    JobCard.aggregate([{ $match: { ...branchFilter, paymentMode: 'Credit', creditCollected: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Part.countDocuments({ ...branchFilter, isActive: true, $expr: { $and: [{ $lte: ['$totalStock', '$minStock'] }, { $gt: ['$minStock', 0] }] } }),
    Booking.countDocuments({ ...(req.branchFilter ? { branch: req.branchFilter } : {}), status: 'Pending' }),
    req.user.role !== 'employee' ? require('../models/ApprovalRequest').countDocuments({ status: 'Pending', adminSeen: false, ...(req.branchFilter ? { branch: req.branchFilter } : {}) }) : Promise.resolve(0),
  ]);

  res.json({
    success: true,
    stats: {
      totalJobs,
      todayJobs,
      totalRevenue: totalRevenue[0]?.total || 0,
      todayRevenue: todayRevenue[0]?.total || 0,
      pendingCredits: pendingCredits[0]?.total || 0,
      lowStockCount,
      pendingBookings,
      pendingApprovals,
    },
  });
});

exports.getRevenueReport = asyncHandler(async (req, res) => {
  const branchFilter = req.branchFilter ? { branch: req.branchFilter } : {};
  if (req.query.branch) branchFilter.branch = req.query.branch;
  const dr = dateRange(req.query.period);
  if (dr) branchFilter.serviceInDate = dr;

  const [revenueByBrand, revenueByMode, revenueByService, revenueByMechanic, dailyRevenue] = await Promise.all([
    JobCard.aggregate([{ $match: branchFilter }, { $group: { _id: '$brand', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }, { $sort: { revenue: -1 } }]),
    JobCard.aggregate([{ $match: branchFilter }, { $group: { _id: '$paymentMode', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }]),
    JobCard.aggregate([{ $match: branchFilter }, { $group: { _id: '$serviceMode', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }, { $sort: { count: -1 } }]),
    JobCard.aggregate([{ $match: branchFilter }, { $group: { _id: '$mechanic', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }, { $sort: { revenue: -1 } }, { $limit: 10 }]),
    JobCard.aggregate([
      { $match: { ...branchFilter, serviceInDate: { $gte: new Date(Date.now() - 30 * 864e5) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$serviceInDate' } }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totals = await JobCard.aggregate([
    { $match: branchFilter },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalJobs: { $sum: 1 }, totalDiscount: { $sum: '$discount' }, totalLabour: { $sum: '$labourCharge' }, totalSpares: { $sum: '$sparesCost' } } },
  ]);

  res.json({ success: true, totals: totals[0] || {}, revenueByBrand, revenueByMode, revenueByService, revenueByMechanic, dailyRevenue });
});

exports.getInventoryReport = asyncHandler(async (req, res) => {
  const branchFilter = req.branchFilter ? { branch: req.branchFilter } : {};
  const [parts, lowStock, totalValue] = await Promise.all([
    Part.find({ ...branchFilter, isActive: true }).populate('branch', 'name'),
    Part.find({ ...branchFilter, isActive: true, $expr: { $and: [{ $lte: ['$totalStock', '$minStock'] }, { $gt: ['$minStock', 0] }] } }),
    Part.aggregate([{ $match: { ...branchFilter, isActive: true } }, { $group: { _id: null, total: { $sum: { $multiply: ['$totalStock', '$unitPrice'] } } } }]),
  ]);
  res.json({ success: true, totalParts: parts.length, lowStockCount: lowStock.length, totalInventoryValue: totalValue[0]?.total || 0, lowStock, allParts: parts });
});

