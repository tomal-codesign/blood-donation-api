// api/emergency/index.js (Complete updated version)
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

    const { data: request, error: requestError } = await supabase
      .from('blood_requests')
      .insert({
        blood_group,
        hospital_name,
        location_lat,
        location_lng,
        city,
        contact_phone: contact_phone || 'N/A', // ✅ Added contact_phone
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
      contact_phone: contact_phone || 'N/A',
      timestamp: new Date().toISOString(),
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
        contact_phone
      `)
      .eq('city', city)
      .eq('priority', 'critical')
      .in('status', ['pending', 'matched'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Alerts fetch error:', error);
      return res.status(400).json({ error: error.message });
    }

    const formattedAlerts = alerts?.map(alert => ({
      id: alert.id,
      patient_name: 'Emergency Patient',
      blood_group: alert.blood_group,
      hospital: alert.hospital_name || 'Unknown Hospital',
      contact_person: 'Hospital Staff',
      contact_number: alert.contact_phone || 'N/A',
      distance: 'Nearby',
      status: alert.status,
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

    // Check if alert exists and is pending
    const { data: alert, error: checkError } = await supabase
      .from('blood_requests')
      .select('id, status')
      .eq('id', alertId)
      .single();

    if (checkError || !alert) {
      console.error('Alert not found:', checkError);
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.status !== 'pending') {
      return res.status(400).json({ 
        error: `This alert has already been ${alert.status}` 
      });
    }

    // Update the request status to 'matched'
    const { error: updateError } = await supabase
      .from('blood_requests')
      .update({ 
        status: 'matched',
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(400).json({ error: updateError.message });
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

module.exports = router;