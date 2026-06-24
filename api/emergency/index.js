// api/emergency/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// ============================================
// POST - Create Emergency Request
// ============================================
router.post('/', async (req, res) => {
  try {
    const { blood_group, hospital_name, location_lat, location_lng, city, contact_phone } = req.body;

    if (!blood_group || !hospital_name || !location_lat || !location_lng) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a critical request immediately
    const { data: request, error: requestError } = await supabase
      .from('blood_requests')
      .insert({
        blood_group,
        hospital_name,
        location_lat,
        location_lng,
        city,
        priority: 'critical',
        status: 'pending',
        units_needed: 1,
        patient_condition: 'Emergency',
        requester_id: null,
      })
      .select()
      .single();

    if (requestError) return res.status(400).json({ error: requestError.message });

    res.status(201).json({
      message: '🚨 Emergency alert created and broadcasted',
      request_id: request.id,
      blood_group,
      hospital_name,
      priority: 'critical',
      location: { lat: location_lat, lng: location_lng, city },
      contact_phone,
      timestamp: new Date().toISOString(),
      next_step: 'Nearby eligible donors will receive notifications within 30 seconds',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET - Get Emergency Alerts by City
// ============================================
router.get('/alerts', async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ error: 'City parameter required' });
    }

    console.log('Fetching emergency alerts for city:', city);

    // Fetch emergency requests from the last 24 hours
    const { data: alerts, error } = await supabase
      .from('blood_requests')
      .select(`
        id,
        blood_group,
        hospital_name,
        city,
        priority,
        status,
        created_at,
        contact_phone,
        requester_id
      `)
      .eq('city', city)
      .eq('priority', 'critical')
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Alerts fetch error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Format alerts for frontend
    const formattedAlerts = alerts?.map(alert => ({
      id: alert.id,
      patient_name: 'Emergency Patient',
      blood_group: alert.blood_group,
      hospital: alert.hospital_name || 'Unknown Hospital',
      contact_person: 'Hospital Staff',
      contact_number: alert.contact_phone || 'N/A',
      distance: 'Nearby',
      time: `${Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000)} min ago`
    })) || [];

    console.log(`Found ${formattedAlerts.length} emergency alerts`);

    res.json({
      success: true,
      alerts: formattedAlerts
    });
  } catch (error) {
    console.error('Emergency alerts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST - Respond to Emergency Alert
// ============================================
router.post('/respond/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { donor_id } = req.body;

    if (!donor_id) {
      return res.status(400).json({ error: 'Donor ID required' });
    }

    // Check if alert exists
    const { data: alert, error: checkError } = await supabase
      .from('blood_requests')
      .select('id, status')
      .eq('id', alertId)
      .single();

    if (checkError || !alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.status !== 'pending') {
      return res.status(400).json({ error: 'This alert has already been responded to' });
    }

    // Update the request status to 'matched'
    const { error } = await supabase
      .from('blood_requests')
      .update({ 
        status: 'matched',
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      console.error('Respond error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Response recorded successfully'
    });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET - Get Single Emergency Alert Details
// ============================================
router.get('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;

    const { data: alert, error } = await supabase
      .from('blood_requests')
      .select(`
        id,
        blood_group,
        hospital_name,
        city,
        priority,
        status,
        created_at,
        contact_phone,
        requester_id
      `)
      .eq('id', alertId)
      .single();

    if (error || !alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({
      success: true,
      alert: {
        id: alert.id,
        patient_name: 'Emergency Patient',
        blood_group: alert.blood_group,
        hospital: alert.hospital_name || 'Unknown Hospital',
        contact_person: 'Hospital Staff',
        contact_number: alert.contact_phone || 'N/A',
        status: alert.status,
        created_at: alert.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;