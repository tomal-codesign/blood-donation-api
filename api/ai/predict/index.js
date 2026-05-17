const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

router.get('/predict', async (req, res) => {
  try {
    // Get inventory levels
    const { data: inventory, error: inventoryError } = await supabase
      .from('blood_inventory')
      .select('blood_group, units_available');

    if (inventoryError) return res.status(400).json({ error: inventoryError.message });

    // Get requests from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRequests, error: requestError } = await supabase
      .from('blood_requests')
      .select('blood_group')
      .gte('created_at', thirtyDaysAgo);

    if (requestError) return res.status(400).json({ error: requestError.message });

    // Count demand per blood group
    const demand = {};
    recentRequests?.forEach((r) => {
      demand[r.blood_group] = (demand[r.blood_group] || 0) + 1;
    });

    // Build prediction report
    const report = inventory
      ?.map((item) => {
        const monthlyDemand = demand[item.blood_group] || 0;
        const daysLeft =
          monthlyDemand > 0
            ? Math.round((item.units_available / monthlyDemand) * 30)
            : 999;

        let status = 'stable';
        if (daysLeft < 7) status = 'critical';
        else if (daysLeft < 15) status = 'low';

        return {
          blood_group: item.blood_group,
          units_available: item.units_available,
          monthly_demand: monthlyDemand,
          days_until_shortage: daysLeft,
          status,
          recommendation:
            daysLeft < 15
              ? `🔴 URGENT: Run donation campaign for ${item.blood_group}`
              : daysLeft < 30
              ? `🟡 CAUTION: Monitor ${item.blood_group} levels`
              : `✅ Stock for ${item.blood_group} is sufficient`,
        };
      })
      .sort((a, b) => a.days_until_shortage - b.days_until_shortage);

    res.json({
      predictions: report,
      generated_at: new Date().toISOString(),
      analysis_period: '30 days',
      total_blood_groups_monitored: report.length,
      critical_groups: report.filter((r) => r.status === 'critical').length,
      low_groups: report.filter((r) => r.status === 'low').length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
