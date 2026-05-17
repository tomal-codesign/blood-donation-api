const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// Get inventory for a hospital
router.get('/:hospitalId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blood_inventory')
      .select('*')
      .eq('hospital_id', req.params.hospitalId);

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      hospital_id: req.params.hospitalId,
      inventory: data,
      total_units: data.reduce((sum, item) => sum + item.units_available, 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory (upsert)
router.patch('/update', async (req, res) => {
  try {
    const { hospital_id, blood_group, units_available } = req.body;

    if (!hospital_id || !blood_group || units_available === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('blood_inventory')
      .upsert(
        {
          hospital_id,
          blood_group,
          units_available,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hospital_id,blood_group' }
      )
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: 'Inventory updated',
      inventory: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update inventory
router.post('/bulk-update', async (req, res) => {
  try {
    const { hospital_id, inventory_items } = req.body;

    if (!hospital_id || !Array.isArray(inventory_items)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const items = inventory_items.map((item) => ({
      hospital_id,
      blood_group: item.blood_group,
      units_available: item.units_available,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('blood_inventory')
      .upsert(items, { onConflict: 'hospital_id,blood_group' })
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: 'Inventory updated',
      items_updated: data.length,
      inventory: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
