import { Router } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateEnquiry } from '../middleware/validate.js';
import { notifyAdmin } from '../utils/mailer.js';

const router = Router();

// PUBLIC: submit the Contact Us form
router.post('/', validateEnquiry, async (req, res) => {
  const { name, email, mobile, subject, message } = req.validated;

  const { data, error } = await supabaseAdmin
    .from('client_enquiries')
    .insert({ name, email, mobile, subject, message })
    .select()
    .single();

  if (error) {
    console.error('Insert enquiry failed:', error);
    return res.status(500).json({ error: 'Could not submit your enquiry. Please try again.' });
  }

  notifyAdmin(
    `New enquiry: ${subject}`,
    `<h2>New client enquiry</h2>
     <p><b>Name:</b> ${name}</p>
     <p><b>Email:</b> ${email}</p>
     <p><b>Mobile:</b> ${mobile}</p>
     <p><b>Subject:</b> ${subject}</p>
     <p><b>Requirement:</b><br>${message.replace(/\n/g, '<br>')}</p>`
  );

  res.status(201).json({ success: true, id: data.id });
});

// ADMIN: list enquiries (optional ?status=New filter)
router.get('/', requireAdmin, async (req, res) => {
  let query = supabaseAdmin.from('client_enquiries').select('*').order('created_at', { ascending: false });
  if (req.query.status) query = query.eq('status', req.query.status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ADMIN: single enquiry detail
router.get('/:id', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('client_enquiries')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Enquiry not found.' });
  res.json(data);
});

// ADMIN: update status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const allowed = ['New', 'Contacted', 'In Progress', 'Closed'];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }
  const { data, error } = await supabaseAdmin
    .from('client_enquiries')
    .update({ status: req.body.status })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
