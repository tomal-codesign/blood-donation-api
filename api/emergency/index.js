// api/emergency/index.js (Complete updated version)
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// ============================================
// POST - Create Emergency Request
// ============================================
router.post('/', async (req, res) => {
  try {
    const { blood_group, hospital_name, location_lat, location_lng, city, contact_phone, patient_name } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!blood_group) missingFields.push('blood_group');
    if (!hospital_name) missingFields.push('hospital_name');
    if (!location_lat) missingFields.push('location_lat');
    if (!location_lng) missingFields.push('location_lng');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: missingFields 
      });
    }

    console.log('Creating emergency request:', { blood_group, hospital_name, city });

    const { data: request, error: requestError } = await supabase
      .from('blood_requests')
      .insert({
        blood_group,
        hospital_name,
        location_lat,
        location_lng,
        city,
        contact_phone: contact_phone || 'N/A',
        priority: 'critical',
        status: 'pending',
        units_needed: 1,
        patient_condition: patient_name || 'Emergency Patient',
        requester_id: null,
      })
      .select()
      .single();

    if (requestError) {
      console.error('Request creation error:', requestError);
      return res.status(400).json({ error: requestError.message });
    }

    console.log('Emergency request created:', request.id);

    // TODO: Send notifications to nearby donors
    // await sendEmergencyNotifications(request);

    res.status(201).json({
      success: true,
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
    console.error('Emergency creation error:', error);
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
        contact_phone,
        patient_condition
      `)
      .eq('city', city)
      .eq('priority', 'critical')
      .in('status', ['pending', 'matched'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Alerts fetch error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Format alerts for frontend
    const formattedAlerts = alerts?.map(alert => {
      const timeDiff = Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000);
      let timeDisplay = 'Just now';
      if (timeDiff > 0) {
        timeDisplay = timeDiff < 60 ? `${timeDiff} min ago` : `${Math.floor(timeDiff / 60)} hours ago`;
      }

      return {
        id: alert.id,
        patient_name: alert.patient_condition || 'Emergency Patient',
        blood_group: alert.blood_group,
        hospital: alert.hospital_name || 'Unknown Hospital',
        contact_person: alert.status === 'matched' ? '✅ Matched - Donor Found' : 'Hospital Staff',
        contact_number: alert.contact_phone || 'N/A',
        distance: 'Nearby',
        status: alert.status,
        time: timeDisplay,
        created_at: alert.created_at
      };
    }) || [];

    console.log(`Found ${formattedAlerts.length} emergency alerts`);

    res.json({
      success: true,
      count: formattedAlerts.length,
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

    console.log(`Responding to alert ${alertId} by donor ${donor_id}`);

    // Check if alert exists and is pending
    const { data: alert, error: checkError } = await supabase
      .from('blood_requests')
      .select('id, status, blood_group, hospital_name, city')
      .eq('id', alertId)
      .single();

    if (checkError || !alert) {
      console.error('Alert not found:', checkError);
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.status !== 'pending') {
      return res.status(400).json({ 
        error: `This alert has already been ${alert.status}`,
        status: alert.status
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

    console.log(`Alert ${alertId} matched by donor ${donor_id}`);

    // TODO: Notify hospital that donor has responded
    // await notifyHospital(alert, donor_id);

    res.json({
      success: true,
      message: 'Response recorded successfully',
      alert: {
        id: alert.id,
        blood_group: alert.blood_group,
        hospital: alert.hospital_name,
        status: 'matched'
      }
    });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET - Get Single Alert Details
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
        patient_condition
      `)
      .eq('id', alertId)
      .single();

    if (error || !alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const timeDiff = Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000);
    const timeDisplay = timeDiff < 60 ? `${timeDiff} min ago` : `${Math.floor(timeDiff / 60)} hours ago`;

    res.json({
      success: true,
      alert: {
        id: alert.id,
        patient_name: alert.patient_condition || 'Emergency Patient',
        blood_group: alert.blood_group,
        hospital: alert.hospital_name || 'Unknown Hospital',
        contact_person: alert.status === 'matched' ? '✅ Matched - Donor Found' : 'Hospital Staff',
        contact_number: alert.contact_phone || 'N/A',
        status: alert.status,
        time: timeDisplay,
        created_at: alert.created_at
      }
    });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;