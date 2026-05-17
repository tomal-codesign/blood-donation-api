const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// Create a blood request
router.post('/', async (req, res) => {
  try {
    const {
      requester_id,
      blood_group,
      units_needed,
      hospital_name,
      location_lat,
      location_lng,
      city,
      patient_condition,
    } = req.body;

    if (!requester_id || !blood_group || !units_needed) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Auto-classify priority
    let priority = 'normal';
    if (
      units_needed >= 4 ||
      patient_condition?.toLowerCase().includes('accident') ||
      patient_condition?.toLowerCase().includes('surgery')
    ) {
      priority = 'critical';
    } else if (units_needed >= 2) {
      priority = 'moderate';
    }

    const { data, error } = await supabase
      .from('blood_requests')
      .insert({
        requester_id,
        blood_group,
        units_needed,
        hospital_name,
        location_lat,
        location_lng,
        city,
        patient_condition,
        priority,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({
      message: 'Blood request created',
      request: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all requests (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { city, blood_group, status, priority } = req.query;

    let query = supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name, phone, city)')
      .order('created_at', { ascending: false });

    if (city) query = query.eq('city', city);
    if (blood_group) query = query.eq('blood_group', blood_group);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      total: data.length,
      requests: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single request
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name, phone, city)')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Request not found' });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update request status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const { data, error } = await supabase
      .from('blood_requests')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: 'Request updated',
      request: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
