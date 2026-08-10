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

    // Get ALL requests created by this hospital (requester_id = hospital's user ID)
    // Do NOT filter by status - donor may be recorded on matched/fulfilled requests
    const { data: requests, error: requestError } = await supabase
      .from('blood_requests')
      .select('id, donor_id, blood_group, units_needed, created_at, updated_at')
      .eq('requester_id', hospitalId)
      .not('donor_id', 'is', null)
      .order('updated_at', { ascending: false });

    if (requestError) {
      return res.status(400).json({ error: requestError.message });
    }

    // Also collect donation_history records linked to this hospital's requests
    // (fallback in case blood_requests.donor_id is not set)
    const allRequestIds = requests?.map(function(r) { return r.id; }) || [];

    if (allRequestIds.length > 0) {
      const { data: historyRows, error: historyError } = await supabase
        .from('donation_history')
        .select('id, donor_id, request_id, donated_at, units')
        .in('request_id', allRequestIds);

      if (!historyError && historyRows?.length > 0) {
        // Merge donation_history rows into the list (for requests missing donor_id or needing donated_at)
        var historyByRequest = {};
        historyRows.forEach(function(h) {
          historyByRequest[h.request_id] = h;
        });

        // For requests that have donation_history but no donor_id on the request,
        // use the history donor_id and donated_at
        requests?.forEach(function(r) {
          var h = historyByRequest[r.id];
          if (h && !r.donor_id) {
            r.donor_id = h.donor_id;
            r._donated_at = h.donated_at;
            r._units = h.units;
          }
        });
      }
    }

    if (requests?.length === 0 || !requests?.some(function(r) { return r.donor_id; })) {
      return res.json({
        success: true,
        history: []
      });
    }

    // Get unique donor IDs
    var donorIds = [];
    var donorSet = {};
    requests?.forEach(function(r) {
      if (r.donor_id && !donorSet[r.donor_id]) {
        donorSet[r.donor_id] = true;
        donorIds.push(r.donor_id);
      }
    });

    // Fetch donor profiles directly (blood_requests.donor_id references profiles.id)
    const { data: donorProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, division, district')
      .in('id', donorIds);

    if (profilesError) {
      return res.status(400).json({ error: profilesError.message });
    }

    // Fetch donor-specific fields from donors table (may be empty - profiles fallback)
    const { data: donorRows, error: donorRowsError } = await supabase
      .from('donors')
      .select('id, blood_group, is_available, total_donations, last_donation_date')
      .in('id', donorIds);

    if (donorRowsError) {
      return res.status(400).json({ error: donorRowsError.message });
    }

    // Build lookup maps
    var profileMap = {};
    donorProfiles?.forEach(function(p) { profileMap[p.id] = p; });

    var donorMap = {};
    donorRows?.forEach(function(d) { donorMap[d.id] = d; });

    // Format the response
    const formattedHistory = requests?.filter(function(r) { return r.donor_id; }).map(function(item) {
      var prof = profileMap[item.donor_id] || {};
      var donor = donorMap[item.donor_id] || {};
      return {
        donor_id: item.donor_id,
        donated_at: item._donated_at || item.updated_at,
        units: item._units || item.units_needed,
        request_id: item.id,
        blood_group: item.blood_group,
        donor: {
          id: item.donor_id,
          full_name: prof.full_name,
          email: prof.email,
          phone: prof.phone,
          district: prof.district,
          division: prof.division,
          blood_group: donor.blood_group,
          is_available: donor.is_available,
          total_donations: donor.total_donations,
          last_donation_date: donor.last_donation_date
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

// GET - Monthly Request Trend for a Hospital
router.get('/analytics/monthly-trend/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;

    if (!hospitalId) {
      return res.status(400).json({ error: 'Hospital ID required' });
    }

    // Get all requests created by this hospital
    const { data: requests, error: requestError } = await supabase
      .from('blood_requests')
      .select('id, created_at, status')
      .eq('requester_id', hospitalId)
      .order('created_at', { ascending: true });

    if (requestError) {
      return res.status(400).json({ error: requestError.message });
    }

    // Build monthly trend for last 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthRequests = requests?.filter(function(r) {
        const created = new Date(r.created_at);
        return created >= monthStart && created <= monthEnd;
      }) || [];

      trend.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        total: monthRequests.length,
        fulfilled: monthRequests.filter(function(r) { return r.status === 'fulfilled'; }).length,
        pending: monthRequests.filter(function(r) { return r.status === 'pending'; }).length,
        cancelled: monthRequests.filter(function(r) { return r.status === 'cancelled'; }).length
      });
    }

    res.json({
      success: true,
      trend
    });
  } catch (error) {
    console.error('Monthly trend error:', error);
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

    // Step 1: Get ALL requests created by this hospital (requester_id = hospital's user ID)
    // Do NOT filter by status - donor may be recorded on any request
    const { data: requests, error: requestError } = await supabase
      .from('blood_requests')
      .select('id, donor_id')
      .eq('requester_id', hospitalId);

    if (requestError) {
      return res.status(400).json({ error: requestError.message });
    }

    const requestIds = requests?.map(function(r) { return r.id; }) || [];

    // Step 2: Collect donor IDs from blood_requests.donor_id
    // (blood_requests.donor_id references profiles.id)
    var donorIds = [];
    var donorSet = {};
    requests?.forEach(function(r) {
      if (r.donor_id && !donorSet[r.donor_id]) {
        donorSet[r.donor_id] = true;
        donorIds.push(r.donor_id);
      }
    });

    // Step 3: Fallback - also collect donor IDs from donation_history for these requests
    // (donation_history.donor_id references donors.id)
    if (requestIds.length > 0) {
      const { data: donations, error: donationError } = await supabase
        .from('donation_history')
        .select('donor_id')
        .in('request_id', requestIds);

      if (!donationError && donations?.length > 0) {
        donations.forEach(function(d) {
          if (d.donor_id && !donorSet[d.donor_id]) {
            donorSet[d.donor_id] = true;
            donorIds.push(d.donor_id);
          }
        });
      }
    }

    if (donorIds.length === 0) {
      return res.json({
        success: true,
        donors: []
      });
    }

    // Step 4: Fetch donor profiles directly from profiles table
    // (blood_requests.donor_id → profiles.id, so this is guaranteed to find them)
    const { data: donorProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, division, district')
      .in('id', donorIds);

    if (profilesError) {
      return res.status(400).json({ error: profilesError.message });
    }

    // Step 5: Fetch donor-specific fields from donors table (blood_group, availability, etc.)
    // This may return 0 rows if the profile row exists but no donors table row - fall back OK
    const { data: donorRows, error: donorRowsError } = await supabase
      .from('donors')
      .select('id, blood_group, is_available, total_donations, last_donation_date')
      .in('id', donorIds);

    if (donorRowsError) {
      return res.status(400).json({ error: donorRowsError.message });
    }

    // Count donations per donor from the requests
    var donationCounts = {};
    requests?.forEach(function(r) {
      if (r.donor_id) {
        donationCounts[r.donor_id] = (donationCounts[r.donor_id] || 0) + 1;
      }
    });

    // Build donor lookup map
    var donorMap = {};
    donorRows?.forEach(function(d) { donorMap[d.id] = d; });

    // Step 6: Format the response - merge profiles + donors data
    var formattedDonors = donorProfiles?.map(function(p) {
      var donor = donorMap[p.id] || {};
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        district: p.district,
        division: p.division,
        blood_group: donor.blood_group || null,
        is_available: donor.is_available !== undefined ? donor.is_available : true,
        total_donations: donor.total_donations || donationCounts[p.id] || 0,
        last_donation_date: donor.last_donation_date || null,
        donation_count: donationCounts[p.id] || 0,
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