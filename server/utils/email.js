const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    throw err;
  }
};

// ── Email Templates ──────────────────────

const emailTemplates = {
  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmed — ${booking.bookingRef} | Balaji Motors`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#f59e0b;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0;color:#000">🏍 Balaji Motors Bike Care</h2>
        </div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px">
          <p>Dear <strong>${booking.customerName}</strong>,</p>
          <p>Your service booking has been <strong style="color:green">confirmed</strong>!</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#666">Booking Ref:</td><td><strong>${booking.bookingRef}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">Vehicle:</td><td>${booking.vehicleNumber || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Date:</td><td>${new Date(booking.preferredDate).toLocaleDateString('en-IN')}</td></tr>
          </table>
          <p style="font-size:13px;color:#666">Please arrive at your scheduled time. Our team will be ready.</p>
          <p style="font-size:13px;color:#666">Contact us on WhatsApp if you need to reschedule.</p>
        </div>
      </div>
    `,
  }),

  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset — Balaji Motors BMS',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Click the button below to reset your password. This link expires in <strong>10 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:16px 0">Reset Password</a>
        <p style="font-size:12px;color:#999">If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
