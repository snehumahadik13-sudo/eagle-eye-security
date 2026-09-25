import { Router } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// PUBLIC: active services, in display order
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('id, title, description, icon, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ADMIN: all services
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, description, icon, sort_order = 0, is_active = true } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const { data, error } = await supabaseAdmin
    .from('services')
    .insert({ title, description, icon, sort_order, is_active })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { title, description, icon, sort_order, is_active } = req.body;
  const { data, error } = await supabaseAdmin
    .from('services')
    .update({ title, description, icon, sort_order, is_active })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin.from('services').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
