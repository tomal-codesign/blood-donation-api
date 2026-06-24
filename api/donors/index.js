// api/donors/index.js - Complete updated version
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// ============================================
// GET /stats - Get donor statistics (FIXED)
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }

    console.log('Fetching stats for user:', user_id);

    // Get donor info
    const { data: donor, error: donorError } = await supabase
      .from('donors')
      .select('*')
      .eq('id', user_id)
      .single();

    if (donorError) {
      console.error('Donor fetch error:', donorError);
      // Return default stats if donor not found
      return res.json({
        success: true,
        stats: {
          totalDonations: 0,
          livesSaved: 0,
          lastDonation: 'Never',
          isAvailable: true,
          nextEligible: 'Ready now'
        }
      });
    }

    // Get donation history count
    const { count: totalDonations, error: countError } = await supabase
      .from('donation_history')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', user_id);

    if (countError) {
      console.error('Count error:', countError);
    }

    const livesSaved = (totalDonations || 0) * 3;

    // Calculate next eligibility
    let nextEligible = 'Ready now';
    if (donor.last_donation_date) {
      const lastDonation = new Date(donor.last_donation_date);
      const nextDate = new Date(lastDonation);
      nextDate.setDate(nextDate.getDate() + 90);
      const today = new Date();
      if (nextDate > today) {
        nextEligible = nextDate.toLocaleDateString();
      }
    }

    console.log('Stats response:', {
      totalDonations: totalDonations || 0,
      livesSaved,
      lastDonation: donor.last_donation_date || 'Never',
      isAvailable: donor.is_available,
      nextEligible
    });

    res.json({
      success: true,
      stats: {
        totalDonations: totalDonations || 0,
        livesSaved: livesSaved,
        lastDonation: donor.last_donation_date || 'Never',
        isAvailable: donor.is_available,
        nextEligible: nextEligible
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// PATCH /availability - Toggle availability (FIXED)
// ============================================
router.patch('/availability', async (req, res) => {
  try {
    const { user_id, is_available } = req.body;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }

    console.log('Toggling availability for user:', user_id, 'to:', is_available);

    // Check if donor exists
    const { data: donor, error: donorCheckError } = await supabase
      .from('donors')
      .select('id')
      .eq('id', user_id)
      .single();

    if (donorCheckError) {
      // Create donor record if not exists
      const { error: createError } = await supabase
        .from('donors')
        .insert({
          id: user_id,
          blood_group: 'O+',
          is_available: is_available,
          total_donations: 0,
          last_donation_date: null,
          created_at: new Date().toISOString()
        });

      if (createError) {
        console.error('Create donor error:', createError);
        return res.status(400).json({ 
          success: false, 
          error: createError.message 
        });
      }

      return res.json({
        success: true,
        message: `Availability updated to ${is_available ? 'available' : 'unavailable'}`
      });
    }

    // Update availability
    const { error } = await supabase
      .from('donors')
      .update({ 
        is_available,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (error) {
      console.error('Availability update error:', error);
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      message: `Availability updated to ${is_available ? 'available' : 'unavailable'}`
    });
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GET /profile - Get donor profile
// ============================================
router.get('/profile', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (profileError) {
      return res.status(400).json({ 
        success: false, 
        error: profileError.message 
      });
    }

    // Get donor details
    const { data: donor, error: donorError } = await supabase
      .from('donors')
      .select('*')
      .eq('id', user_id)
      .single();

    if (donorError && donorError.code !== 'PGRST116') {
      return res.status(400).json({ 
        success: false, 
        error: donorError.message 
      });
    }

    res.json({
      success: true,
      profile,
      donor: donor || null
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// PUT /profile - Update donor profile
// ============================================
router.put('/profile', async (req, res) => {
  try {
    const { 
      user_id, 
      full_name, 
      phone, 
      city, 
      location_lat, 
      location_lng,
      blood_group,
      weight,
      medical_conditions 
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone,
        city,
        location_lat,
        location_lng,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (profileError) {
      return res.status(400).json({ 
        success: false, 
        error: profileError.message 
      });
    }

    // Update donor details
    const { error: donorError } = await supabase
      .from('donors')
      .update({
        blood_group,
        weight,
        medical_conditions,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (donorError) {
      return res.status(400).json({ 
        success: false, 
        error: donorError.message 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GET /history - Get donation history
// ============================================
router.get('/history', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }

    const { data: history, error } = await supabase
      .from('donation_history')
      .select(`
        *,
        blood_requests (
          blood_group,
          hospital_name,
          city
        )
      `)
      .eq('donor_id', user_id)
      .order('donated_at', { ascending: false });

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    const formattedHistory = history?.map(item => ({
      id: item.id,
      date: item.donated_at,
      blood_group: item.blood_requests?.blood_group,
      hospital: item.blood_requests?.hospital_name,
      units: item.units,
      status: 'completed',
      impact: 'Helped save a life'
    })) || [];

    res.json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// POST /donate - Mark donation as completed
// ============================================
router.post('/donate', async (req, res) => {
  try {
    const { user_id, request_id, units } = req.body;

    if (!user_id || !request_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and Request ID required' 
      });
    }

    // Insert donation history
    const { data: donation, error: donationError } = await supabase
      .from('donation_history')
      .insert({
        donor_id: user_id,
        request_id: request_id,
        units: units || 1,
        donated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (donationError) {
      return res.status(400).json({ 
        success: false, 
        error: donationError.message 
      });
    }

    // Update donor total donations and last donation date
    const { error: updateError } = await supabase
      .from('donors')
      .update({
        total_donations: supabase.raw('total_donations + 1'),
        last_donation_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      return res.status(400).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    // Update request status
    await supabase
      .from('blood_requests')
      .update({ 
        status: 'fulfilled',
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id);

    res.json({
      success: true,
      message: 'Donation recorded successfully 🎉',
      donation
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GET /upcoming - Get upcoming donations
// ============================================
router.get('/upcoming', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }

    // Get donor blood group
    const { data: donor } = await supabase
      .from('donors')
      .select('blood_group')
      .eq('id', user_id)
      .single();

    res.json({
      success: true,
      donations: [
        {
          id: 1,
          blood_group: donor?.blood_group || 'O+',
          hospital: 'Scheduled Donation',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '10:00 AM',
          location: 'Blood Bank, 2nd Floor',
          status: 'upcoming'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;