// api/requests/index.js
const express = require("express");
const router = express.Router();
const supabase = require("../../supabase");
const authMiddleware = require("../middleware/auth");

// ============================================
// 🔥 স্পেসিফিক রাউট (উপরে রাখুন) - প্রোটেক্টেড
// ============================================

// ========== GET MY REQUESTS (for patient) ==========
router.get("/my-requests", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { data, error } = await supabase
      .from("blood_requests")
.select("*, profiles:requester_id(full_name, phone, division, district)")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== GET HOSPITAL REQUESTS ==========
router.get("/hospital", authMiddleware, async (req, res) => {
  try {
    const hospitalId = req.user?.id;

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { data, error } = await supabase
      .from("blood_requests")
.select("*, profiles:requester_id(full_name, phone)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Get hospital requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== GET STATISTICS ==========
router.get("/stats/dashboard", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let query = supabase.from("blood_requests").select("*");

    if (userRole === "patient" && userId) {
      query = query.eq("requester_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const stats = {
      total: data?.length || 0,
      pending: data?.filter((r) => r.status === "pending").length || 0,
      matched: data?.filter((r) => r.status === "matched").length || 0,
      fulfilled: data?.filter((r) => r.status === "fulfilled").length || 0,
      cancelled: data?.filter((r) => r.status === "cancelled").length || 0,
      critical: data?.filter((r) => r.priority === "critical").length || 0,
      moderate: data?.filter((r) => r.priority === "moderate").length || 0,
      normal: data?.filter((r) => r.priority === "normal").length || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== GET REQUESTS BY BLOOD GROUP ==========
router.get("/blood-group/:bloodGroup", authMiddleware, async (req, res) => {
  try {
    const { bloodGroup } = req.params;
    const { status } = req.query;

    let query = supabase
      .from("blood_requests")
.select("*, profiles:requester_id(full_name, phone)")
      .eq("blood_group", bloodGroup)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("Get by blood group error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// 🔥 জেনেরিক রাউট (নিচে রাখুন)
// ============================================

// ========== GET ALL REQUESTS (with filters) ==========
router.get("/", async (req, res) => {
  try {
    const {
      city,
      blood_group,
      status,
      priority,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("blood_requests")
.select("id, requester_id, blood_group, units_needed, priority, status, hospital_name, location_lat, location_lng, patient_condition, contact_phone, created_at, updated_at, profiles:requester_id(full_name, phone, division, district, email)")
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

/* city filter removed */
    if (blood_group) query = query.eq("blood_group", blood_group);
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== GET SINGLE REQUEST ==========
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("blood_requests")
.select("id, requester_id, blood_group, units_needed, priority, status, hospital_name, location_lat, location_lng, patient_condition, contact_phone, created_at, updated_at, profiles:requester_id(full_name, phone, division, district, email)")
      .eq("id", req.params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== CREATE BLOOD REQUEST ==========
router.post("/", async (req, res) => {
  try {
const {
      requester_id,
      blood_group,
      units_needed,
      hospital_name,
      location_lat,
      location_lng,
      division,
      district,
      patient_condition,
      contact_phone,
      priority: bodyPriority,
    } = req.body;

    if (!requester_id || !blood_group || !units_needed || !hospital_name) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: requester_id, blood_group, units_needed, hospital_name",
      });
    }

    // Validate units_needed range (min 1, max 5)
    if (units_needed < 1 || units_needed > 5) {
      return res.status(400).json({
        success: false,
        message: "Units needed must be between 1 and 5",
      });
    }

    // Respect the client-provided priority (default to normal if invalid/missing)
    const validPriorities = ["normal", "moderate", "critical"];
    let priority = validPriorities.includes(bodyPriority) ? bodyPriority : "normal";

    // Emergency conditions always override to critical (safety)
    const isEmergency =
      units_needed >= 4 ||
      patient_condition?.toLowerCase().includes("accident") ||
      patient_condition?.toLowerCase().includes("surgery") ||
      patient_condition?.toLowerCase().includes("emergency");

    if (isEmergency) {
      priority = "critical";
    }

    const { data, error } = await supabase
      .from("blood_requests")
.insert({
        requester_id,
        blood_group,
        units_needed,
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
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Blood request created successfully",
      data,
    });
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== UPDATE REQUEST STATUS ==========
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status required",
      });
    }

    const validStatuses = ["pending", "matched", "fulfilled", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Get the current request first (need donor_id, units, etc. for donation_history)
    const { data: existing, error: fetchError } = await supabase
      .from("blood_requests")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Determine which donor is acting (for decline tracking):
    // - Prefer the request's assigned donor_id
    // - Fall back to the donor_id sent in the request body
    const actingDonorId = existing.donor_id || req.body.donor_id;

    // If a donor declines a GENERAL request (not specifically assigned to them),
    // don't cancel the whole request — just record their decline so it disappears
    // only for them, while remaining visible to other donors in the area.
    if (status === "cancelled" && !existing.donor_id && actingDonorId) {
      // Check if a decline record already exists for this request + donor
      const { data: existingDecline } = await supabase
        .from("request_declines")
        .select("id")
        .eq("request_id", req.params.id)
        .eq("donor_id", actingDonorId)
        .maybeSingle();

      // Only insert if not already declined (avoids duplicates without needing a unique constraint)
      if (!existingDecline) {
        const { error: declineError } = await supabase
          .from("request_declines")
          .insert({
            request_id: req.params.id,
            donor_id: actingDonorId,
          });

        if (declineError) {
          console.error("Decline record error:", declineError);
          return res.status(400).json({
            success: false,
            message: `Failed to record decline. Please ensure the 'request_declines' table exists in your database. Error: ${declineError.message}`,
          });
        }
      }

      return res.json({
        success: true,
        message: "Request declined. It will no longer appear in your list.",
        data: existing,
        declined: true,
      });
    }

    // Update status in blood_requests
    const { data, error } = await supabase
      .from("blood_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Determine which donor accepted/fulfilled this request:
    // - Prefer the request's assigned donor_id (targeted requests from find-donors)
    // - Fall back to the donor_id sent in the request body (general requests accepted
    //   from the donor's "My Donations" page)
    const donatingDonorId = existing.donor_id || req.body.donor_id;

    // When a request is accepted (matched) or fulfilled, record the donation in
    // donation_history and update the donor's stats so everything stays in sync.
    // (The duplicate check below ensures it is only recorded once per request.)
    if ((status === "matched" || status === "fulfilled") && donatingDonorId) {
      // If the request didn't have a donor_id yet, assign this donor to it
      if (!existing.donor_id) {
        await supabase
          .from("blood_requests")
          .update({
            donor_id: donatingDonorId,
          })
          .eq("id", req.params.id);
      }

      // Check if a donation_history record already exists for this request (avoid duplicates)
      const { data: existingHistory } = await supabase
        .from("donation_history")
        .select("id")
        .eq("request_id", req.params.id)
        .maybeSingle();

      if (!existingHistory) {
        // Insert into donation_history
        const { error: historyError } = await supabase
          .from("donation_history")
          .insert({
            donor_id: donatingDonorId,
            request_id: req.params.id,
            units: existing.units_needed || 1,
            donated_at: new Date().toISOString(),
          });

        if (historyError) {
          console.error("Donation history insert error:", historyError);
          return res.status(400).json({
            success: false,
            message: `Request status updated, but failed to record donation history: ${historyError.message}`,
          });
        }

        // Update donor stats (total_donations + last_donation_date)
        // Fetch current total first, then increment (supabase.raw is not available)
        const { data: currentDonor } = await supabase
          .from("donors")
          .select("total_donations")
          .eq("id", donatingDonorId)
          .single();

        const { error: donorUpdateError } = await supabase
          .from("donors")
          .update({
            total_donations: (currentDonor?.total_donations || 0) + 1,
            last_donation_date: new Date().toISOString().split("T")[0],
            is_available: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", donatingDonorId);

        if (donorUpdateError) {
          console.error("Donor update error:", donorUpdateError);
        }
      }
    }

    res.json({
      success: true,
      message: `Request status updated to ${status}`,
      data,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== UPDATE REQUEST DETAILS ==========
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;
    delete updates.requester_id;

    const { data, error } = await supabase
      .from("blood_requests")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    res.json({
      success: true,
      message: "Request updated successfully",
      data,
    });
  } catch (error) {
    console.error("Update request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== DELETE REQUEST (Cancel) ==========
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabase
      .from("blood_requests")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (existing.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request with status: ${existing.status}`,
      });
    }

    const { error } = await supabase
      .from("blood_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "Request cancelled successfully",
    });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
