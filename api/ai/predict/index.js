// api/ai/predict/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

// All standard blood groups
const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Statuses that count as real demand.
// Workflow: pending (waiting for donor) → matched (donor found — FINAL STEP in this system)
// "matched" is the last step, so it counts as completed demand.
// 'cancelled' requests are excluded (they don't represent real demand).
const ACTIVE_STATUSES = ['pending', 'matched'];

router.get('/predict', async (req, res) => {
  try {
    // ============ 1. Fetch blood requests from last 60 days (two periods) ============
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // Current 30-day period requests (pending + matched = real demand)
    const { data: currentRequests, error: currentError } = await supabase
      .from('blood_requests')
      .select('blood_group, units_needed, priority, status, created_at')
      .gte('created_at', thirtyDaysAgo)
      .in('status', ACTIVE_STATUSES);

    if (currentError) return res.status(400).json({ error: currentError.message });

    // Previous 30-day period requests (for trend comparison)
    const { data: previousRequests, error: previousError } = await supabase
      .from('blood_requests')
      .select('blood_group, units_needed, priority, status, created_at')
      .gte('created_at', sixtyDaysAgo)
      .lt('created_at', thirtyDaysAgo)
      .in('status', ACTIVE_STATUSES);

    if (previousError) return res.status(400).json({ error: previousError.message });

    // ============ 2. Fetch hospital inventory ============
    const { data: inventory, error: inventoryError } = await supabase
      .from('blood_inventory')
      .select('blood_group, units_available');

    if (inventoryError) return res.status(400).json({ error: inventoryError.message });

    // ============ 3. Aggregate request data per blood group ============
    const aggregateRequests = (requests) => {
      const summary = {};
      ALL_BLOOD_GROUPS.forEach((bg) => {
        summary[bg] = {
          request_count: 0,
          total_units_needed: 0,
          critical_requests: 0,
          moderate_requests: 0,
          normal_requests: 0,
        };
      });

      requests?.forEach((r) => {
        const group = summary[r.blood_group];
        if (!group) return;
        group.request_count += 1;
        group.total_units_needed += r.units_needed || 1;

        if (r.priority === 'critical') group.critical_requests += 1;
        else if (r.priority === 'moderate') group.moderate_requests += 1;
        else group.normal_requests += 1;
      });

      return summary;
    };

    const currentSummary = aggregateRequests(currentRequests);
    const previousSummary = aggregateRequests(previousRequests);

    // ============ 4. Aggregate inventory per blood group ============
    const inventoryByGroup = {};
    inventory?.forEach((item) => {
      inventoryByGroup[item.blood_group] =
        (inventoryByGroup[item.blood_group] || 0) + (item.units_available || 0);
    });

    // ============ 5. Build the prediction report ============
    const report = ALL_BLOOD_GROUPS.map((bloodGroup) => {
      const current = currentSummary[bloodGroup];
      const previous = previousSummary[bloodGroup];
      const unitsAvailable = inventoryByGroup[bloodGroup] || 0;

      // Trend: change vs previous period
      const trendChange = previous.request_count > 0
        ? Math.round(((current.request_count - previous.request_count) / previous.request_count) * 100)
        : (current.request_count > 0 ? 100 : 0);

      // Projected next month demand (based on current + trend)
      const growthFactor = 1 + Math.max(trendChange / 100, 0.05); // min 5% growth
      const projectedRequestCount = Math.round(current.request_count * growthFactor);
      const projectedUnitsNeeded = Math.round(current.total_units_needed * growthFactor);

      // Status based on demand level
      let status = 'stable';
      if (current.critical_requests > 0 || (current.request_count > 0 && unitsAvailable === 0)) {
        status = 'critical';
      } else if (current.request_count > 10 || (current.total_units_needed > unitsAvailable && unitsAvailable > 0)) {
        status = 'low';
      }

      // Demand level label
      const demandLevel =
        current.request_count >= 20
          ? 'Very High'
          : current.request_count >= 10
          ? 'High'
          : current.request_count >= 5
          ? 'Medium'
          : current.request_count > 0
          ? 'Low'
          : 'No Demand';

      // Recommendation message
      const recommendation =
        current.request_count === 0
          ? `✅ No blood requests for ${bloodGroup} in the last 30 days.`
          : status === 'critical'
          ? `🔴 CRITICAL: ${bloodGroup} has ${current.critical_requests} urgent request(s). Stock: ${unitsAvailable} units. Immediate action needed!`
          : status === 'low'
          ? `🟡 CAUTION: ${bloodGroup} demand (${current.request_count} requests, ${current.total_units_needed} units) exceeds available stock (${unitsAvailable}). Monitor closely.`
          : `✅ ${bloodGroup} demand is manageable. ${current.request_count} requests, ${current.total_units_needed} units needed vs ${unitsAvailable} units available.`;

      return {
        blood_group: bloodGroup,
        // Current period
        current_period: {
          request_count: current.request_count,
          total_units_needed: current.total_units_needed,
          critical_requests: current.critical_requests,
          moderate_requests: current.moderate_requests,
          normal_requests: current.normal_requests,
        },
        // Previous period
        previous_period: {
          request_count: previous.request_count,
          total_units_needed: previous.total_units_needed,
        },
        // Trend & projection
        trend_change_pct: trendChange,
        projected_request_count: projectedRequestCount,
        projected_units_needed: projectedUnitsNeeded,
        // Inventory
        units_available: unitsAvailable,
        demand_level: demandLevel,
        status,
        recommendation,
      };
    });

    // ============ 6. Aggregate stats ============
    const totalCurrentRequests = report.reduce((s, r) => s + r.current_period.request_count, 0);
    const totalProjectedRequests = report.reduce((s, r) => s + r.projected_request_count, 0);
    const totalUnitsNeeded = report.reduce((s, r) => s + r.current_period.total_units_needed, 0);
    const totalCriticalRequests = report.reduce((s, r) => s + r.current_period.critical_requests, 0);

    const criticalGroups = report.filter((r) => r.status === 'critical').length;
    const lowGroups = report.filter((r) => r.status === 'low').length;
    const stableGroups = report.filter((r) => r.status === 'stable').length;

    const highestDemandGroup = report.reduce((max, r) =>
      r.projected_request_count > max.projected_request_count ? r : max, report[0]);

    res.json({
      predictions: report,
      generated_at: new Date().toISOString(),
      analysis_period: '30 days',
      summary: {
        total_blood_groups: ALL_BLOOD_GROUPS.length,
        total_current_requests: totalCurrentRequests,
        total_projected_requests: totalProjectedRequests,
        total_units_needed: totalUnitsNeeded,
        total_critical_requests: totalCriticalRequests,
        critical_groups: criticalGroups,
        low_groups: lowGroups,
        stable_groups: stableGroups,
        highest_demand_group: highestDemandGroup ? {
          blood_group: highestDemandGroup.blood_group,
          projected_requests: highestDemandGroup.projected_request_count,
        } : null,
      },
      demand_distribution: {
        critical: criticalGroups,
        low: lowGroups,
        stable: stableGroups,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;