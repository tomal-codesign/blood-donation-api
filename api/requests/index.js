// api/requests/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');
const authMiddleware = require('../middleware/auth');

// ============================================
// 🔥 স্পেসিফিক রাউট (উপরে রাখুন) - প্রোটেক্টেড
// ============================================

// ========== GET MY REQUESTS (for patient) ==========
router.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { data, error } = await supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name, phone, city)')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== GET HOSPITAL REQUESTS ==========
router.get('/hospital', authMiddleware, async (req, res) => {
  try {
    const hospitalId = req.user?.id;
    
    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { data, error } = await supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name, phone, city)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Get hospital requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== GET STATISTICS ==========
router.get('/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let query = supabase.from('blood_requests').select('*');
    
    if (userRole === 'patient' && userId) {
      query = query.eq('requester_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(r => r.status === 'pending').length || 0,
      matched: data?.filter(r => r.status === 'matched').length || 0,
      fulfilled: data?.filter(r => r.status === 'fulfilled').length || 0,
      cancelled: data?.filter(r => r.status === 'cancelled').length || 0,
      critical: data?.filter(r => r.priority === 'critical').length || 0,
      moderate: data?.filter(r => r.priority === 'moderate').length || 0,
      normal: data?.filter(r => r.priority === 'normal').length || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== GET REQUESTS BY BLOOD GROUP ==========
router.get('/blood-group/:bloodGroup', authMiddleware, async (req, res) => {
  try {
    const { bloodGroup } = req.params;
    const { status } = req.query;

    let query = supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name, phone, city)')
      .eq('blood_group', bloodGroup)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Get by blood group error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 🔥 জেনেরিক রাউট (নিচে রাখুন)
// ============================================

// ========== GET ALL REQUESTS (with filters) ==========
router.get('/', async (req, res) => {
  try {
    const { city, blood_group, status, priority, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name, phone, city, email)')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (city) query = query.eq('city', city);
    if (blood_group) query = query.eq('blood_group', blood_group);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== GET SINGLE REQUEST ==========
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name, phone, city, email)')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Request not found'
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== CREATE BLOOD REQUEST ==========
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
      contact_phone
    } = req.body;

    if (!requester_id || !blood_group || !units_needed || !hospital_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: requester_id, blood_group, units_needed, hospital_name'
      });
    }

    let priority = 'normal';
    if (
      units_needed >= 4 ||
      patient_condition?.toLowerCase().includes('accident') ||
      patient_condition?.toLowerCase().includes('surgery') ||
      patient_condition?.toLowerCase().includes('emergency')
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
        location_lat: location_lat || 23.8103,
        location_lng: location_lng || 90.4125,
        city,
        patient_condition,
        contact_phone,
        priority,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      data
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== UPDATE REQUEST STATUS ==========
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status required'
      });
    }

    const validStatuses = ['pending', 'matched', 'fulfilled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const { data, error } = await supabase
      .from('blood_requests')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: `Request status updated to ${status}`,
      data
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== UPDATE REQUEST DETAILS ==========
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;
    delete updates.requester_id;

    const { data, error } = await supabase
      .from('blood_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      message: 'Request updated successfully',
      data
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== DELETE REQUEST (Cancel) ==========
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabase
      .from('blood_requests')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request with status: ${existing.status}`
      });
    }

    const { error } = await supabase
      .from('blood_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;