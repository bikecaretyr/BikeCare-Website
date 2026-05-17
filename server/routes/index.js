const express = require('express');
const router = express.Router();
const { protect, authorize, superAdminOnly, branchScope } = require('../middleware/auth');
const { loginLimiter, publicApiLimiter, bookingLimiter } = require('../middleware/rateLimiter');

// Controllers
const authCtrl     = require('../controllers/authController');
const userCtrl     = require('../controllers/userController');
const jobCtrl      = require('../controllers/jobController');
const partCtrl     = require('../controllers/partController');
const approvalCtrl = require('../controllers/approvalController');
const bookingCtrl  = require('../controllers/bookingController');
const reportCtrl   = require('../controllers/reportController');
const branchCtrl   = require('../controllers/branchController');
const notifCtrl    = require('../controllers/notificationController');

// ══ AUTH ══════════════════════════════════════════════════
router.post('/auth/login',         loginLimiter, authCtrl.login);
router.post('/auth/superadmin',    loginLimiter, authCtrl.superAdminLogin);
router.post('/auth/refresh',       authCtrl.refresh);
router.post('/auth/logout',        protect, authCtrl.logout);
router.get ('/auth/me',            protect, authCtrl.getMe);
router.patch('/auth/password',     protect, authCtrl.changePassword);

// ══ PUBLIC ════════════════════════════════════════════════
router.get ('/public/services',    publicApiLimiter, branchCtrl.getServices);
router.get ('/public/branches',    publicApiLimiter, branchCtrl.getBranches);
router.post('/public/bookings',    bookingLimiter, bookingCtrl.createBooking);
router.get ('/public/track',       publicApiLimiter, jobCtrl.trackVehicle);

// ══ NOTIFICATIONS ════════════════════════════════════════
router.get ('/notifications',      protect, notifCtrl.getMyNotifications);
router.patch('/notifications/read',protect, notifCtrl.markRead);
router.patch('/notifications/:id', protect, notifCtrl.markOneRead);

// ══ JOBS ══════════════════════════════════════════════════
router.post('/jobs',               protect, authorize('superadmin','admin','manager','employee'), branchScope, jobCtrl.createJobCard);
router.get ('/jobs',               protect, authorize('superadmin','admin','manager','employee'), branchScope, jobCtrl.getJobs);
router.get ('/jobs/:id',           protect, authorize('superadmin','admin','manager','employee'), branchScope, jobCtrl.getJob);
router.patch('/jobs/:id',          protect, authorize('superadmin','admin','manager','employee'), branchScope, jobCtrl.updateJob);
router.post('/jobs/:id/spares',    protect, authorize('superadmin','admin','manager','employee'), branchScope, jobCtrl.addJobSpares);
router.post('/jobs/:id/payment',   protect, authorize('superadmin','admin','manager','employee'), branchScope, jobCtrl.addPayment);
router.delete('/jobs/:id',         protect, authorize('superadmin','admin','manager','employee'), branchScope, jobCtrl.deleteJob);

// ══ PARTS ═════════════════════════════════════════════════
router.get ('/parts',              protect, authorize('superadmin','admin','manager','employee'), branchScope, partCtrl.getParts);
router.post('/parts',              protect, authorize('superadmin','admin','manager','employee'), branchScope, partCtrl.createPart);
router.get ('/parts/:id',          protect, authorize('superadmin','admin','manager','employee'), branchScope, partCtrl.getPart);
router.patch('/parts/:id',         protect, authorize('superadmin','admin','manager','employee'), branchScope, partCtrl.updatePart);
router.delete('/parts/:id',        protect, authorize('superadmin','admin','manager','employee'), branchScope, partCtrl.deletePart);

// ══ APPROVALS ════════════════════════════════════════════
router.get ('/approvals/my',        protect, authorize('superadmin','admin','manager','employee'), approvalCtrl.getMyRequests);
router.get ('/approvals',          protect, authorize('superadmin','admin','manager'), branchScope, approvalCtrl.getRequests);
router.get ('/approvals/count',    protect, authorize('superadmin','admin','manager'), branchScope, approvalCtrl.getPendingCount);
router.get ('/approvals/:id',      protect, authorize('superadmin','admin','manager'), approvalCtrl.getRequest);
router.post('/approvals/:id/review', protect, authorize('superadmin','admin','manager'), approvalCtrl.reviewRequest);

// ══ BOOKINGS ══════════════════════════════════════════════
router.get ('/bookings',           protect, authorize('superadmin','admin','manager','employee'), branchScope, bookingCtrl.getBookings);
router.patch('/bookings/:id',      protect, authorize('superadmin','admin','manager','employee'), bookingCtrl.updateBooking);
router.post('/bookings/:id/convert', protect, authorize('superadmin','admin','manager','employee'), bookingCtrl.convertToJobCard);

// ══ BRANCHES ══════════════════════════════════════════════
router.get   ('/branches',                   protect, branchCtrl.getBranches);
router.post  ('/branches',                   protect, authorize('superadmin','admin'), branchCtrl.createBranch);
router.get   ('/branches/:id',               protect, branchCtrl.getBranch);
router.patch ('/branches/:id',               protect, authorize('superadmin','admin'), branchCtrl.updateBranch);
router.patch ('/branches/:id/activate',      protect, authorize('superadmin','admin'), branchCtrl.activateBranch);
router.patch ('/branches/:id/deactivate',    protect, authorize('superadmin','admin'), branchCtrl.deactivateBranch);
router.delete('/branches/:id',               protect, authorize('superadmin','admin'), branchCtrl.deleteBranch);

// ══ SERVICES ══════════════════════════════════════════════
router.get ('/services',              protect, authorize('superadmin','admin'), branchCtrl.getServices);
router.post('/services',              protect, authorize('superadmin','admin'), branchCtrl.createService);
router.patch('/services/:id',         protect, authorize('superadmin','admin'), branchCtrl.updateService);
router.patch('/services/:id/activate',   protect, authorize('superadmin','admin'), branchCtrl.activateService);
router.patch('/services/:id/deactivate', protect, authorize('superadmin','admin'), branchCtrl.deactivateService);
router.delete('/services/:id',        protect, authorize('superadmin','admin'), branchCtrl.deleteService);

// ══ USERS / EMPLOYEES ════════════════════════════════════
router.get ('/users',              protect, authorize('superadmin','admin','manager'), userCtrl.getEmployees);
router.post('/users',              protect, authorize('superadmin','admin'), userCtrl.createEmployee);
router.get ('/users/:id',          protect, authorize('superadmin','admin'), userCtrl.getEmployee);
router.patch('/users/:id',         protect, authorize('superadmin','admin'), userCtrl.updateEmployee);
router.patch('/users/:id/activate', protect, authorize('superadmin','admin'), userCtrl.activateEmployee);
router.patch('/users/:id/deactivate', protect, authorize('superadmin','admin'), userCtrl.deactivateEmployee);
router.delete('/users/:id',        protect, authorize('superadmin','admin'), userCtrl.deleteEmployee);
router.post('/users/:id/reset-password', protect, authorize('superadmin','admin'), userCtrl.adminResetPassword);

// ══ REPORTS ═══════════════════════════════════════════════
router.get ('/reports/dashboard',  protect, authorize('superadmin','admin','manager'), branchScope, reportCtrl.getDashboard);
router.get ('/reports/revenue',    protect, authorize('superadmin','admin','manager'), branchScope, reportCtrl.getRevenueReport);
router.get ('/reports/inventory',  protect, authorize('superadmin','admin','manager'), branchScope, reportCtrl.getInventoryReport);

// ══ SUPERADMIN ════════════════════════════════════════════
router.get ('/superadmin/audit',   protect, superAdminOnly, notifCtrl.getAuditLogs);
router.get ('/superadmin/users',   protect, superAdminOnly, userCtrl.getEmployees);
router.post('/superadmin/users',   protect, superAdminOnly, userCtrl.createEmployee);
router.patch('/superadmin/users/:id', protect, superAdminOnly, userCtrl.updateEmployee);

module.exports = router;

// ══ VENDORS ═══════════════════════════════════════════════
router.get   ('/vendors',              protect, authorize('superadmin','admin','manager','employee'), partCtrl.getVendors);
router.post  ('/vendors',              protect, authorize('superadmin','admin','manager'), partCtrl.createVendor);
router.get   ('/vendors/:id',          protect, authorize('superadmin','admin','manager'), partCtrl.getVendor);
router.patch ('/vendors/:id',          protect, authorize('superadmin','admin','manager'), partCtrl.updateVendor);
router.delete('/vendors/:id',          protect, authorize('superadmin','admin'), partCtrl.deleteVendor);

// ══ PURCHASES ═════════════════════════════════════════════
router.post('/purchases',           protect, authorize('superadmin','admin','manager'), branchScope, partCtrl.createPurchase);
router.post  ('/parts/:id/purchase',                   protect, authorize('superadmin','admin','manager'), branchScope, partCtrl.recordPurchase);
router.patch ('/parts/:id/batches/:batchId/deactivate',protect, authorize('superadmin','admin','manager'), partCtrl.deactivateBatch);
router.get   ('/purchases',            protect, authorize('superadmin','admin','manager'), branchScope, partCtrl.getPurchases);
router.patch ('/purchases/:id/paid',   protect, authorize('superadmin','admin','manager'), partCtrl.markPurchasePaid);

// ══ VEHICLE LOOKUP ════════════════════════════════════════
router.get('/jobs/vehicle-lookup', protect, authorize('superadmin','admin','manager','employee'), jobCtrl.vehicleLookup);
