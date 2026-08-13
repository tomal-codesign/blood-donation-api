// api/admin/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// Get analytics dashboard
router.get('/analytics', async (req, res) => {
  try {
    const [{ data: donors }, { data: requests }, { data: hospitals }, { data: donations }] =
      await Promise.all([
        supabase.from('donors').select('blood_group, is_available'),
        supabase.from('blood_requests').select('blood_group, priority, status, created_at'),
        supabase.from('profiles').select('id').eq('role', 'hospital'),
        supabase.from('donation_history').select('donated_at'),
      ]);

    const totalDonors = donors?.length || 0;
    const availableDonors = donors?.filter((d) => d.is_available).length || 0;
    const totalRequests = requests?.length || 0;
    const criticalRequests = requests?.filter((r) => r.priority === 'critical').length || 0;
    const moderateRequests = requests?.filter((r) => r.priority === 'moderate').length || 0;
    const normalRequests = requests?.filter((r) => r.priority === 'normal').length || 0;
    const fulfilledRequests = requests?.filter((r) => r.status === 'fulfilled').length || 0;
    const pendingRequests = requests?.filter((r) => r.status === 'pending').length || 0;

    // Blood group distribution
    const bloodGroupDistribution = {};
    donors?.forEach((d) => {
      bloodGroupDistribution[d.blood_group] =
        (bloodGroupDistribution[d.blood_group] || 0) + 1;
    });

    // Last 7 days requests
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const requestsLast7Days = requests?.filter((r) => r.created_at >= sevenDaysAgo).length || 0;

    res.json({
      dashboard: {
        total_donors: totalDonors,
        available_donors: availableDonors,
        unavailable_donors: totalDonors - availableDonors,
        donor_availability_rate: ((availableDonors / totalDonors) * 100).toFixed(1) + '%',
      },
      requests: {
        total_requests: totalRequests,
        pending_requests: pendingRequests,
        fulfilled_requests: fulfilledRequests,
        critical_requests: criticalRequests,
        moderate_requests: moderateRequests,
        normal_requests: normalRequests,
        fulfillment_rate:
          totalRequests > 0
            ? ((fulfilledRequests / totalRequests) * 100).toFixed(1) + '%'
            : '0%',
        requests_last_7_days: requestsLast7Days,
      },
      hospitals: {
        total_hospitals: hospitals?.length || 0,
      },
      donations: {
        total_donations: donations?.length || 0,
      },
      blood_group_distribution: bloodGroupDistribution,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all donors (profiles + donor details joined)
router.get('/donors', async (req, res) => {
  try {
    const { availability } = req.query;

    let query = supabase
      .from('donors')
      .select(`
        *,
        profiles:profiles (
          id,
          full_name,
          phone,
          email,
          division,
          district,
          role,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (availability === 'active') query = query.eq('is_available', true);
    if (availability === 'inactive') query = query.eq('is_available', false);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    // Flatten the response
    const donors = (data || []).map((d) => ({
      id: d.id,
      full_name: d.profiles?.full_name || 'Unknown',
      phone: d.profiles?.phone || 'N/A',
      email: d.profiles?.email || 'N/A',
      division: d.profiles?.division || 'N/A',
      district: d.profiles?.district || 'N/A',
      blood_group: d.blood_group,
      is_available: d.is_available,
      last_donation_date: d.last_donation_date,
      total_donations: d.total_donations || 0,
      weight: d.weight,
      medical_conditions: d.medical_conditions || [],
      created_at: d.created_at,
    }));

    res.json({
      total_donors: donors.length,
      donors,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;

    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      total_users: data.length,
      users: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (admin only)
router.patch('/users/:userId/role', async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role required' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', req.params.userId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: 'User role updated',
      user: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
