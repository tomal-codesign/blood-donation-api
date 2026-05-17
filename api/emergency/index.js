const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

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
        requester_id: null, // Emergency requests don't have a specific requester
      })
      .select()
      .single();

    if (requestError) return res.status(400).json({ error: requestError.message });

    // TODO: Integrate with Twilio/Resend to send SMS/email notifications to nearby donors
    // Example: triggerEmergencyNotifications(request, blood_group, city)

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

module.exports = router;
