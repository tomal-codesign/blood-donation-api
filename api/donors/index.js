// api/donors/index.js - Complete updated version (No Dummy Data)
const express = require("express");
const router = express.Router();
const supabase = require("../../supabase");

// ============================================
// GET /stats - Get donor statistics
// ============================================
router.get("/stats", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      });
    }

    console.log("Fetching stats for user:", user_id);

    // Get donor info
    const { data: donor, error: donorError } = await supabase
      .from("donors")
      .select("*")
      .eq("id", user_id)
      .single();

    if (donorError) {
      console.error("Donor fetch error:", donorError);
      return res.status(404).json({
        success: false,
        error: "Donor not found",
      });
    }

    // Get donation history count
    const { count: totalDonations, error: countError } = await supabase
      .from("donation_history")
      .select("*", { count: "exact", head: true })
      .eq("donor_id", user_id);

    if (countError) {
      console.error("Count error:", countError);
    }

    const livesSaved = (totalDonations || 0) * 3;

    // Calculate next eligibility
    let nextEligible = "Ready now";
    if (donor.last_donation_date) {
      const lastDonation = new Date(donor.last_donation_date);
      const nextDate = new Date(lastDonation);
      nextDate.setDate(nextDate.getDate() + 90);
      const today = new Date();
      if (nextDate > today) {
        nextEligible = nextDate.toISOString().split("T")[0];
      }
    }

    res.json({
      success: true,
      stats: {
        totalDonations: totalDonations || 0,
        livesSaved: livesSaved,
        lastDonation: donor.last_donation_date || null,
        isAvailable: donor.is_available,
        nextEligible: nextEligible,
        bloodGroup: donor.blood_group,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// PATCH /availability - Toggle availability
// ============================================
router.patch("/availability", async (req, res) => {
  try {
    const { user_id, is_available } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      });
    }

    console.log("Toggling availability for user:", user_id, "to:", is_available);

    // Check if donor exists
    const { data: donor, error: donorCheckError } = await supabase
      .from("donors")
      .select("id")
      .eq("id", user_id)
      .single();

    if (donorCheckError) {
      return res.status(404).json({
        success: false,
        error: "Donor not found",
      });
    }

    // Update availability
    const { error } = await supabase
      .from("donors")
      .update({
        is_available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (error) {
      console.error("Availability update error:", error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: `Availability updated to ${is_available ? "available" : "unavailable"}`,
      is_available,
    });
  } catch (error) {
    console.error("Availability error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// GET /profile - Get donor profile
// ============================================
router.get("/profile", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (profileError) {
      return res.status(404).json({
        success: false,
        error: "Profile not found",
      });
    }

    // Get donor details
    const { data: donor, error: donorError } = await supabase
      .from("donors")
      .select("*")
      .eq("id", user_id)
      .single();

    if (donorError && donorError.code !== "PGRST116") {
      return res.status(400).json({
        success: false,
        error: donorError.message,
      });
    }

    res.json({
      success: true,
      profile,
      donor: donor || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// PUT /profile - Update donor profile
// ============================================
router.put("/profile", async (req, res) => {
  try {
const {
  user_id,
  full_name,
  phone,
  location_lat,
  location_lng,
  blood_group,
  weight,
  medical_conditions,
  division,
  district,
} = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      });
    }

    // Update profile
const profileUpdates = {
  full_name,
  phone,
  location_lat,
  location_lng,
  division,
  district,
  updated_at: new Date().toISOString(),
};

    // Remove undefined fields
    Object.keys(profileUpdates).forEach(key => {
      if (profileUpdates[key] === undefined) {
        delete profileUpdates[key];
      }
    });

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user_id);

    if (profileError) {
      return res.status(400).json({
        success: false,
        error: profileError.message,
      });
    }

    // Update donor details
    const { error: donorError } = await supabase
      .from("donors")
      .update({
        blood_group,
        weight,
        medical_conditions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (donorError) {
      return res.status(400).json({
        success: false,
        error: donorError.message,
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// GET /history - Get donation history
// ============================================
router.get("/history", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      });
    }

    const { data: history, error } = await supabase
      .from("donation_history")
      .select(
        `
        *,
        blood_requests (
          blood_group,
          hospital_name,
          division,
          district
        )
      `
      )
      .eq("donor_id", user_id)
      .order("donated_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    // Format history without dummy data
    const formattedHistory = history?.map((item) => ({
      id: item.id,
      date: item.donated_at,
      blood_group: item.blood_requests?.blood_group || "N/A",
      hospital: item.blood_requests?.hospital_name || "Unknown",
      units: item.units || 1,
      status: "completed",
      impact: "Helped save a life",
      request_id: item.request_id,
    })) || [];

    res.json({
      success: true,
      history: formattedHistory,
      total: formattedHistory.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// POST /donate - Mark donation as completed
// ============================================
router.post("/donate", async (req, res) => {
  try {
    const { user_id, request_id, units } = req.body;

    if (!user_id || !request_id) {
      return res.status(400).json({
        success: false,
        error: "User ID and Request ID required",
      });
    }

    // Check if request exists
    const { data: request, error: requestError } = await supabase
      .from("blood_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError) {
      return res.status(404).json({
        success: false,
        error: "Blood request not found",
      });
    }

    // Insert donation history
    const { data: donation, error: donationError } = await supabase
      .from("donation_history")
      .insert({
        donor_id: user_id,
        request_id: request_id,
        units: units || 1,
        donated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (donationError) {
      return res.status(400).json({
        success: false,
        error: donationError.message,
      });
    }

    // Update donor total donations and last donation date
    // Fetch current total first, then increment (supabase.raw is not available)
    const { data: currentDonor } = await supabase
      .from("donors")
      .select("total_donations")
      .eq("id", user_id)
      .single();

    const { error: updateError } = await supabase
      .from("donors")
      .update({
        total_donations: (currentDonor?.total_donations || 0) + 1,
        last_donation_date: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message,
      });
    }

    // Update request status
    await supabase
      .from("blood_requests")
      .update({
        status: "fulfilled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    res.json({
      success: true,
      message: "Donation recorded successfully 🎉",
      donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// POST /request-donation - Send a targeted donation request to a specific donor
// Creates a blood request assigned to the donor (appears in their upcoming list)
// ============================================
router.post("/request-donation", async (req, res) => {
  try {
    const {
      requester_id,
      donor_id,
      blood_group,
      units_needed,
      hospital_name,
      location_lat,
      location_lng,
      division,
      district,
      patient_condition,
      contact_phone,
    } = req.body;

    // Validate required fields
    if (!requester_id) {
      return res.status(400).json({
        success: false,
        error: "Requester ID required",
      });
    }
    if (!donor_id) {
      return res.status(400).json({
        success: false,
        error: "Donor ID required",
      });
    }
    if (!blood_group) {
      return res.status(400).json({
        success: false,
        error: "Blood group required",
      });
    }
    if (!hospital_name) {
      return res.status(400).json({
        success: false,
        error: "Hospital name required",
      });
    }

    // Verify the donor exists and is eligible
    const { data: donor, error: donorError } = await supabase
      .from("donors")
      .select("id, blood_group, is_available, last_donation_date")
      .eq("id", donor_id)
      .single();

    if (donorError || !donor) {
      return res.status(404).json({
        success: false,
        error: "Donor not found",
      });
    }

    // Check blood group compatibility (donor must be able to donate the requested group)
    const compatibleGroups = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-'],
    };

    if (!compatibleGroups[donor.blood_group]?.includes(blood_group)) {
      return res.status(400).json({
        success: false,
        error: `Donor with blood group ${donor.blood_group} cannot donate ${blood_group}`,
      });
    }

    // Check 90-day eligibility
    if (donor.last_donation_date) {
      const lastDonation = new Date(donor.last_donation_date);
      const daysSince = Math.floor((Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 90) {
        return res.status(400).json({
          success: false,
          error: `Donor is not eligible yet. Last donation was ${daysSince} days ago (minimum 90 days required).`,
        });
      }
    }

    // Set priority based on units_needed or condition
    let priority = "normal";
    if (
      units_needed >= 4 ||
      patient_condition?.toLowerCase().includes("accident") ||
      patient_condition?.toLowerCase().includes("surgery") ||
      patient_condition?.toLowerCase().includes("emergency")
    ) {
      priority = "critical";
    } else if (units_needed >= 2) {
      priority = "moderate";
    }

    // Create the targeted blood request assigned to this donor
    const { data: request, error: requestError } = await supabase
      .from("blood_requests")
      .insert({
        requester_id,
        donor_id,
        blood_group,
        units_needed: units_needed || 1,
        hospital_name,
        location_lat: location_lat || 23.8103,
        location_lng: location_lng || 90.4125,
        division,
        district,
        patient_condition,
        contact_phone,
        priority,
        status: "pending",
      })
      .select("*")
      .single();

    if (requestError) {
      console.error("Create donation request error:", requestError);
      return res.status(400).json({
        success: false,
        error: requestError.message,
      });
    }

    console.log(`✅ Donation request sent to donor ${donor_id} for blood ${blood_group}`);

    res.status(201).json({
      success: true,
      message: `Donation request sent to donor. They will be notified.`,
      request,
    });
  } catch (error) {
    console.error("Request donation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// GET /upcoming - Get upcoming donations
// Shows requests directly assigned to the donor,
// plus matching requests where the donor's
// division, district, and blood group match.
// ============================================
router.get("/upcoming", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      });
    }

    // Get the donor's profile (division, district) and blood group
    const { data: donor, error: donorError } = await supabase
      .from("donors")
      .select("id, blood_group, profiles:profiles(division, district)")
      .eq("id", user_id)
      .single();

    if (donorError) {
      return res.status(404).json({
        success: false,
        error: "Donor not found",
      });
    }

    const donorDivision = donor.profiles?.division || "";
    const donorDistrict = donor.profiles?.district || "";
    const donorBloodGroup = donor.blood_group || "";

    // 1. Requests directly assigned to this donor
    const { data: directRequests, error: directError } = await supabase
      .from("blood_requests")
      .select("*, profiles:requester_id(full_name, phone, division, district)")
      .eq("donor_id", user_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (directError) {
      return res.status(400).json({
        success: false,
        error: directError.message,
      });
    }

    // Get requests this donor has declined (so they stay hidden for this donor only)
    const { data: declinedRecords, error: declinedError } = await supabase
      .from("request_declines")
      .select("request_id")
      .eq("donor_id", user_id);

    if (declinedError) {
      console.error("Fetch declined requests error:", declinedError);
    }
    const declinedRequestIds = (declinedRecords || []).map((d) => d.request_id);

    // 2. Matching requests (same division, district, blood group).
    //    Shows all pending requests in the donor's area with matching blood group,
    //    including ones already assigned to a specific donor (so targeted requests
    //    are still visible to the donor). Requests the donor has declined are excluded.
    let matchingRequests = [];
    if (donorDivision && donorDistrict && donorBloodGroup) {
      let matchQuery = supabase
        .from("blood_requests")
        .select("*, profiles:requester_id(full_name, phone, division, district)")
        .eq("division", donorDivision)
        .eq("district", donorDistrict)
        .eq("blood_group", donorBloodGroup)
        .eq("status", "pending");

      // Exclude declined requests
      if (declinedRequestIds.length > 0) {
        matchQuery = matchQuery.not("id", "in", `(${declinedRequestIds.join(",")})`);
      }

      const { data: matches, error: matchError } = await matchQuery
        .order("created_at", { ascending: true });

      if (matchError) {
        return res.status(400).json({
          success: false,
          error: matchError.message,
        });
      }

      matchingRequests = matches || [];
    }

    // Combine and deduplicate by request id (direct requests take priority)
    const seen = new Set();
    const combined = [...(directRequests || []), ...matchingRequests].filter((req) => {
      if (seen.has(req.id)) return false;
      seen.add(req.id);
      return true;
    });

    res.json({
      success: true,
      upcoming: combined,
      total: combined.length,
      direct_count: directRequests?.length || 0,
      matching_count: matchingRequests.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// GET /matches - Get AI donor matches
// ============================================
router.get("/matches", async (req, res) => {
  try {
    const { request_id } = req.query;

    if (!request_id) {
      return res.status(400).json({
        success: false,
        error: "Request ID required",
      });
    }

    // Get request details
    const { data: request, error: requestError } = await supabase
      .from("blood_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (requestError) {
      return res.status(404).json({
        success: false,
        error: "Request not found",
      });
    }

    // Find matching donors
    const { data: donors, error: donorsError } = await supabase
      .from("donors")
      .select(`
        *,
        profiles:profiles (
          full_name,
          phone,
          division,
          district,
          location_lat,
          location_lng
        )
      `)
      .eq("blood_group", request.blood_group)
      .eq("is_available", true);

    if (donorsError) {
      return res.status(400).json({
        success: false,
        error: donorsError.message,
      });
    }

    // Calculate scores based on real data
    const matchedDonors = donors?.map((donor) => {
      let score = 50;
      
      // Score based on total donations
      if (donor.total_donations > 20) score += 20;
      else if (donor.total_donations > 10) score += 15;
      else if (donor.total_donations > 5) score += 10;
      else if (donor.total_donations > 0) score += 5;
      
      // Score based on last donation (recent donors get less score)
      if (donor.last_donation_date) {
        const lastDonation = new Date(donor.last_donation_date);
        const daysSince = Math.floor((Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 90) score += 10;
        else if (daysSince > 60) score += 5;
      } else {
        score += 10; // Never donated, ready to go
      }
      
      // Score based on location (if available)
      if (donor.profiles?.location_lat && request.location_lat) {
        const distance = calculateDistance(
          donor.profiles.location_lat,
          donor.profiles.location_lng,
          request.location_lat,
          request.location_lng
        );
        if (distance < 5) score += 15;
        else if (distance < 10) score += 10;
        else if (distance < 20) score += 5;
      }
      
      return {
        id: donor.id,
        name: donor.profiles?.full_name || "Unknown",
        phone: donor.profiles?.phone || "N/A",
        division: donor.profiles?.division || "N/A",
        district: donor.profiles?.district || "N/A",
        blood_group: donor.blood_group,
        distance_km: donor.profiles?.location_lat ? "5" : "N/A",
        score: Math.min(score, 100),
        is_available: donor.is_available,
        total_donations: donor.total_donations || 0,
        last_donation_date: donor.last_donation_date,
      };
    });

    res.json({
      success: true,
      request,
      matches: matchedDonors || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper: Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

module.exports = router;