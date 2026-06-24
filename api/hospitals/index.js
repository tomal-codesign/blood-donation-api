// api/hospitals/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// GET - Hospital Profile
router.get('/profile', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Update Hospital Profile
router.put('/profile', async (req, res) => {
  try {
    const { user_id, full_name, phone, city } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone,
        city,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Donation History for a Hospital
router.get('/donation-history/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;

    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital ID required' });
    }

    // Get hospital profile to get hospital_name
    const { data: hospital, error: hospitalError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', hospitalId)
      .single();

    if (hospitalError) {
      return res.status(400).json({ error: hospitalError.message });
    }

    // Get all blood requests from this hospital
    const { data: requests, error: requestError } = await supabase
      .from('blood_requests')
      .select('id, requester_id')
      .eq('hospital_name', hospital.full_name)
      .eq('status', 'fulfilled');

    if (requestError) {
      return res.status(400).json({ error: requestError.message });
    }

    const requestIds = requests?.map(r => r.id) || [];

    if (requestIds.length === 0) {
      return res.json({
        success: true,
        history: []
      });
    }

    // Get donation history for these requests
    const { data: history, error: historyError } = await supabase
      .from('donation_history')
      .select(`
        id,
        donor_id,
        request_id,
        donated_at,
        units,
        donors:donor_id (
          id,
          blood_group,
          is_available,
          total_donations,
          last_donation_date,
          profiles:profiles!inner (
            full_name,
            email,
            phone,
            city
          )
        )
      `)
      .in('request_id', requestIds)
      .order('donated_at', { ascending: false });

    if (historyError) {
      return res.status(400).json({ error: historyError.message });
    }

    // Format the response
    const formattedHistory = history?.map(function(item) {
      return {
        donor_id: item.donor_id,
        donated_at: item.donated_at,
        units: item.units,
        donor: {
          id: item.donors?.id,
          full_name: item.donors?.profiles?.full_name,
          email: item.donors?.profiles?.email,
          phone: item.donors?.profiles?.phone,
          city: item.donors?.profiles?.city,
          blood_group: item.donors?.blood_group,
          is_available: item.donors?.is_available,
          total_donations: item.donors?.total_donations,
          last_donation_date: item.donors?.last_donation_date
        }
      };
    }) || [];

    res.json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    console.error('Donation history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Donors who donated to this hospital
router.get('/donors/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;

    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital ID required' });
    }

    // Get hospital profile to get hospital_name
    const { data: hospital, error: hospitalError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', hospitalId)
      .single();

    if (hospitalError) {
      return res.status(400).json({ error: hospitalError.message });
    }

    // Get all fulfilled requests from this hospital
    const { data: requests, error: requestError } = await supabase
      .from('blood_requests')
      .select('id')
      .eq('hospital_name', hospital.full_name)
      .eq('status', 'fulfilled');

    if (requestError) {
      return res.status(400).json({ error: requestError.message });
    }

    const requestIds = requests?.map(function(r) { return r.id; }) || [];

    if (requestIds.length === 0) {
      return res.json({
        success: true,
        donors: []
      });
    }

    // Get unique donors from donation history
    const { data: donations, error: donationError } = await supabase
      .from('donation_history')
      .select('donor_id')
      .in('request_id', requestIds);

    if (donationError) {
      return res.status(400).json({ error: donationError.message });
    }

    // Get unique donor IDs
    var donorIds = [];
    var donorSet = {};
    donations?.forEach(function(d) {
      if (d.donor_id && !donorSet[d.donor_id]) {
        donorSet[d.donor_id] = true;
        donorIds.push(d.donor_id);
      }
    });

    if (donorIds.length === 0) {
      return res.json({
        success: true,
        donors: []
      });
    }

    // Get donor details
    const { data: donors, error: donorsError } = await supabase
      .from('donors')
      .select(`
        id,
        blood_group,
        is_available,
        total_donations,
        last_donation_date,
        profiles:profiles!inner (
          full_name,
          email,
          phone,
          city
        )
      `)
      .in('id', donorIds);

    if (donorsError) {
      return res.status(400).json({ error: donorsError.message });
    }

    // Count donations per donor
    var donationCounts = {};
    donations?.forEach(function(d) {
      if (d.donor_id) {
        donationCounts[d.donor_id] = (donationCounts[d.donor_id] || 0) + 1;
      }
    });

    // Format the response
    var formattedDonors = donors?.map(function(d) {
      return {
        id: d.id,
        full_name: d.profiles?.full_name,
        email: d.profiles?.email,
        phone: d.profiles?.phone,
        city: d.profiles?.city,
        blood_group: d.blood_group,
        is_available: d.is_available,
        total_donations: d.total_donations,
        last_donation_date: d.last_donation_date,
        donation_count: donationCounts[d.id] || 0,
        donated_to_hospital: true
      };
    }) || [];

    res.json({
      success: true,
      donors: formattedDonors
    });
  } catch (error) {
    console.error('Hospital donors error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;