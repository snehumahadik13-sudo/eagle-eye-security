import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_NOTIFY_EMAIL } =
  process.env;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.warn('[mailer] SMTP env vars not fully set — admin email notifications are disabled.');
}

/**
 * Fire-and-forget style: failures are logged, never thrown, so a broken SMTP
 * config can't block a form submission from being saved.
 */
export async function notifyAdmin(subject, html) {
  if (!transporter || !ADMIN_NOTIFY_EMAIL) return { sent: false, reason: 'not_configured' };
  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: ADMIN_NOTIFY_EMAIL,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send admin notification:', err.message);
    return { sent: false, reason: err.message };
  }
}
