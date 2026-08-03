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

// Blood group compatibility matrix
const compatible = {
  'O-': ['O-'],
  'O+': ['O+'],
  'A-': ['A-'],
  'A+': ['A+'],
  'B-': ['B-'],
  'B+': ['B+'],
  'AB-': ['AB-'],
  'AB+': ['AB+'],
};

// AI Matching Algorithm
router.post('/match', async (req, res) => {
  try {
const { blood_group, location_lat, location_lng, division, district, units_needed } = req.body;

    if (!blood_group || !location_lat || !location_lng) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch available donors
    const { data: donors, error } = await supabase
      .from('donors')
.select('*, profiles:profiles(full_name, phone, division, district, location_lat, location_lng)')
      .eq('is_available', true);

    if (error) return res.status(400).json({ error: error.message });

    // Find compatible blood groups
    const eligibleGroups = Object.entries(compatible)
      .filter(([donor_group]) => compatible[donor_group]?.includes(blood_group))
      .map(([g]) => g);

    // Score and rank donors
    const scored = donors
      .filter((d) => {
        const profile = d.profiles;
        if (!profile || !eligibleGroups.includes(d.blood_group)) return false;

        // Restrict to the searched division, and district if one was given
if (division && profile.division?.toLowerCase() !== division.toLowerCase()) return false;
         if (district && profile.district?.toLowerCase() !== district.toLowerCase()) return false;

        // Check last donation eligibility (minimum 90 days)
        const lastDonation = d.last_donation_date
          ? (Date.now() - new Date(d.last_donation_date).getTime()) / (1000 * 60 * 60 * 24)
          : 999;

        return lastDonation >= 90;
      })
      .map((d) => {
        const profile = d.profiles;
        const distance = getDistance(
          location_lat,
          location_lng,
          profile.location_lat,
          profile.location_lng
        );

        // Scoring system (out of 100)
        let score = 0;

        // 1. Blood group match (40 pts)
        score += 40;

        // 2. Distance/Proximity (30 pts) - closer is better
        const distanceScore = Math.max(0, 30 - distance * 2);
        score += distanceScore;

        // 3. Last donation eligibility (20 pts)
        const lastDonation = d.last_donation_date
          ? (Date.now() - new Date(d.last_donation_date).getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        const eligibilityScore = lastDonation >= 180 ? 20 : lastDonation >= 90 ? 15 : 0;
        score += eligibilityScore;

        // 4. Availability (10 pts)
        if (d.is_available) score += 10;

        return {
          donor_id: d.id,
          name: profile.full_name,
          phone: profile.phone,
division: profile.division,
           district: profile.district,
          blood_group: d.blood_group,
          distance_km: distance.toFixed(2),
          score: Math.round(score),
          is_available: d.is_available,
          total_donations: d.total_donations,
          last_donation_date: d.last_donation_date,
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
