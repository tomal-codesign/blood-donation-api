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
    const { user_id, full_name, phone, division, district } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

     const { error } = await supabase
       .from('profiles')
       .update({
         full_name,
         phone,
         division,
         district,
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

    // Get all fulfilled requests created by this hospital (requester_id = hospital's user ID)
    // Each fulfilled request has a donor_id set directly on it (FK to profiles.id)
    const { data: requests, error: requestError } = await supabase
      .from('blood_requests')
      .select('id, donor_id, blood_group, units_needed, created_at, updated_at')
      .eq('requester_id', hospitalId)
      .eq('status', 'fulfilled')
      .not('donor_id', 'is', null)
      .order('updated_at', { ascending: false });

    if (requestError) {
      return res.status(400).json({ error: requestError.message });
    }

    if (requests?.length === 0) {
      return res.json({
        success: true,
        history: []
      });
    }

    // Get unique donor IDs directly from the fulfilled requests
    var donorIds = [];
    var donorSet = {};
    requests?.forEach(function(r) {
      if (r.donor_id && !donorSet[r.donor_id]) {
        donorSet[r.donor_id] = true;
        donorIds.push(r.donor_id);
      }
    });

    // Get donor details (donors.id = profiles.id, so join profiles for contact info)
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
          division,
          district
        )
      `)
      .in('id', donorIds);

    if (donorsError) {
      return res.status(400).json({ error: donorsError.message });
    }

    // Build a donor lookup map
    var donorMap = {};
    donors?.forEach(function(d) {
      donorMap[d.id] = d;
    });

    // Format the response using the fulfilled requests directly
    const formattedHistory = requests?.map(function(item) {
      var donor = donorMap[item.donor_id];
      return {
        donor_id: item.donor_id,
        donated_at: item.updated_at,
        units: item.units_needed,
        request_id: item.id,
        blood_group: item.blood_group,
        donor: {
          id: donor?.id,
          full_name: donor?.profiles?.full_name,
          email: donor?.profiles?.email,
          phone: donor?.profiles?.phone,
          district: donor?.profiles?.district,
          division: donor?.profiles?.division,
          blood_group: donor?.blood_group,
          is_available: donor?.is_available,
          total_donations: donor?.total_donations,
          last_donation_date: donor?.last_donation_date
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

    // Get all fulfilled requests created by this hospital (requester_id = hospital's user ID)
    // Each fulfilled request has a donor_id set directly on it (FK to profiles.id)
    const { data: requests, error: requestError } = await supabase
      .from('blood_requests')
      .select('id, donor_id')
      .eq('requester_id', hospitalId)
      .eq('status', 'fulfilled')
      .not('donor_id', 'is', null);

    if (requestError) {
      return res.status(400).json({ error: requestError.message });
    }

    // Get unique donor IDs directly from the fulfilled requests
    var donorIds = [];
    var donorSet = {};
    requests?.forEach(function(r) {
      if (r.donor_id && !donorSet[r.donor_id]) {
        donorSet[r.donor_id] = true;
        donorIds.push(r.donor_id);
      }
    });

    if (donorIds.length === 0) {
      return res.json({
        success: true,
        donors: []
      });
    }

    // Get donor details (donors.id = profiles.id, so join profiles for contact info)
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
          division,
          district
        )
      `)
      .in('id', donorIds);

    if (donorsError) {
      return res.status(400).json({ error: donorsError.message });
    }

    // Count donations per donor from the fulfilled requests
    var donationCounts = {};
    requests?.forEach(function(r) {
      if (r.donor_id) {
        donationCounts[r.donor_id] = (donationCounts[r.donor_id] || 0) + 1;
      }
    });

    // Format the response
    var formattedDonors = donors?.map(function(d) {
      return {
        id: d.id,
        full_name: d.profiles?.full_name,
        email: d.profiles?.email,
        phone: d.profiles?.phone,
        district: d.profiles?.district,
        division: d.profiles?.division,
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