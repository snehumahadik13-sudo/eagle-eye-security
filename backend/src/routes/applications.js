import { Router } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateApplication } from '../middleware/validate.js';
import { notifyAdmin } from '../utils/mailer.js';

const router = Router();

// PUBLIC: submit a job application
router.post('/', validateApplication, async (req, res) => {
  const { name, email, mobile, cover_note, job_id } = req.validated;

  const { data, error } = await supabaseAdmin
    .from('job_applications')
    .insert({ name, email, mobile, cover_note, job_id })
    .select()
    .single();

  if (error) {
    console.error('Insert application failed:', error);
    return res.status(500).json({ error: 'Could not submit your application. Please try again.' });
  }

  notifyAdmin(
    `New job application: ${name}`,
    `<h2>New job application</h2>
     <p><b>Name:</b> ${name}</p>
     <p><b>Email:</b> ${email}</p>
     <p><b>Mobile:</b> ${mobile}</p>
     ${cover_note ? `<p><b>Note:</b><br>${cover_note.replace(/\n/g, '<br>')}</p>` : ''}`
  );

  res.status(201).json({ success: true, id: data.id });
});

// ADMIN: list applications
router.get('/', requireAdmin, async (req, res) => {
  let query = supabaseAdmin
    .from('job_applications')
    .select('*, job_openings(title)')
    .order('created_at', { ascending: false });
  if (req.query.status) query = query.eq('status', req.query.status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ADMIN: single application
router.get('/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('job_applications')
    .select('*, job_openings(title)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Application not found.' });
  res.json(data);
});

// ADMIN: update status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const allowed = ['New', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }
  const { data, error } = await supabaseAdmin
    .from('job_applications')
    .update({ status: req.body.status })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
