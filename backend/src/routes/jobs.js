import { Router } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// PUBLIC: active job openings only (used by the Careers section)
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('job_openings')
    .select('id, title, location, description, requirements, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ADMIN: all job openings, active + inactive
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('job_openings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ADMIN: create
router.post('/', requireAdmin, async (req, res) => {
  const { title, location, description, requirements, is_active = true } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const { data, error } = await supabaseAdmin
    .from('job_openings')
    .insert({ title, location, description, requirements, is_active })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ADMIN: update
router.put('/:id', requireAdmin, async (req, res) => {
  const { title, location, description, requirements, is_active } = req.body;
  const { data, error } = await supabaseAdmin
    .from('job_openings')
    .update({ title, location, description, requirements, is_active })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ADMIN: delete
router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin.from('job_openings').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
