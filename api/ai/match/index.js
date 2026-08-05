// blood-donation-api/api/ai/match/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

// Haversine distance formula (returns km)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// AI Matching Algorithm
router.post('/match', async (req, res) => {
  try {
const { blood_group, location_lat, location_lng, division, district, units_needed } = req.body;

    if (!blood_group || !location_lat || !location_lng) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build query on profiles table (role=donor) with donor details
    let query = supabase
      .from('profiles')
      .select('*, donors:donors(*)')
      .eq('role', 'donor');

    // Filter by division if provided
    if (division) {
      query = query.eq('division', division);
    }

    // Filter by district if provided
    if (district) {
      query = query.eq('district', district);
    }

    const { data: profiles, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    // Score and rank donors
    const scored = profiles
      .filter((p) => {
        const donorInfo = p.donors;
        if (!donorInfo) return false;
        // Only show donors with the exact searched blood group
        if (donorInfo.blood_group !== blood_group) return false;
        return true;
      })
      .map((p) => {
        const donorInfo = p.donors;
        const distance = getDistance(
          location_lat,
          location_lng,
          p.location_lat || 23.8103,
          p.location_lng || 90.4125
        );

        // Scoring system (out of 100)
        let score = 0;

        // 1. Blood group match (40 pts)
        score += 40;

        // 2. Distance/Proximity (30 pts) - closer is better
        const distanceScore = Math.max(0, 30 - distance * 2);
        score += distanceScore;

        // 3. Total donations (20 pts)
        const donationScore = donorInfo.total_donations >= 10 ? 20 : donorInfo.total_donations >= 5 ? 15 : donorInfo.total_donations >= 1 ? 10 : 0;
        score += donationScore;

        // 4. Availability (10 pts)
        if (donorInfo.is_available) score += 10;

        return {
          donor_id: p.id,
          name: p.full_name,
          phone: p.phone,
          division: p.division,
          district: p.district,
          blood_group: donorInfo.blood_group,
          distance_km: distance.toFixed(2),
          score: Math.round(score),
          is_available: donorInfo.is_available,
          total_donations: donorInfo.total_donations,
          last_donation_date: donorInfo.last_donation_date,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 matches

    res.json({
      requested_blood_group: blood_group,
      matches_found: scored.length,
      matches: scored,
search_location: { lat: location_lat, lng: location_lng, division },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
