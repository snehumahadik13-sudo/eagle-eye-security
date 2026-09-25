const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[0-9+\-\s()]{7,16}$/;

function clean(str, maxLen) {
  return String(str ?? '').trim().slice(0, maxLen);
}

export function validateEnquiry(req, res, next) {
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160);
  const mobile = clean(req.body.mobile, 20);
  const subject = clean(req.body.subject, 160);
  const message = clean(req.body.message, 4000);

  const errors = [];
  if (!name) errors.push('Name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.');
  if (!mobile || !MOBILE_RE.test(mobile)) errors.push('A valid mobile number is required.');
  if (!subject) errors.push('Subject is required.');
  if (!message) errors.push('Please describe your security service requirement.');

  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  req.validated = { name, email, mobile, subject, message };
  next();
}

export function validateApplication(req, res, next) {
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 160);
  const mobile = clean(req.body.mobile, 20);
  const cover_note = clean(req.body.cover_note, 4000);
  const job_id = req.body.job_id ? clean(req.body.job_id, 64) : null;

  const errors = [];
  if (!name) errors.push('Name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.');
  if (!mobile || !MOBILE_RE.test(mobile)) errors.push('A valid mobile number is required.');

  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  req.validated = { name, email, mobile, cover_note, job_id };
  next();
}
