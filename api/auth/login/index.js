// api/auth/login/index.js
const express = require("express");
const router = express.Router();
const supabase = require("../../../supabase");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt for email:", email);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Auth error:", error);
      return res.status(401).json({ error: error.message });
    }

    if (!data || !data.user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("✅ User authenticated:", data.user.id);

    // Fetch profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);

      // Try to create profile if it doesn't exist
      const { error: insertError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email,
        phone: data.user.user_metadata?.phone || "",
        role: data.user.user_metadata?.role || "donor",
        city: data.user.user_metadata?.city || "",
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("❌ Profile creation failed:", insertError);
        return res.status(500).json({ error: "Failed to create user profile" });
      }

      // Fetch the newly created profile
      const { data: newProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (!newProfile) {
        return res.status(500).json({ error: "Failed to fetch user profile" });
      }

      // Fetch donor info if role is donor
      let donorInfo = null;
      if (newProfile.role === "donor") {
        const { data: donor } = await supabase
          .from("donors")
          .select(
            "blood_group, is_available, total_donations, last_donation_date",
          )
          .eq("id", data.user.id)
          .maybeSingle();
        donorInfo = donor;
      }

      const userResponse = {
        id: data.user.id,
        email: data.user.email,
        role: newProfile.role,
        full_name: newProfile.full_name,
        phone: newProfile.phone,
        city: newProfile.city,
        ...(donorInfo && {
          blood_group: donorInfo.blood_group,
          is_available: donorInfo.is_available,
          total_donations: donorInfo.total_donations,
          last_donation_date: donorInfo.last_donation_date,
        }),
      };

      console.log("✅ Login successful for:", userResponse.email);

      return res.json({
        token: data.session.access_token,
        user: userResponse,
      });
    }

    if (!profile) {
      console.error("❌ Profile not found for user:", data.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }

    console.log("✅ Profile found:", profile.id, "Role:", profile.role);

    // Fetch donor info if role is donor
    let donorInfo = null;
    if (profile.role === "donor") {
      const { data: donor, error: donorError } = await supabase
        .from("donors")
        .select(
          "blood_group, is_available, total_donations, last_donation_date",
        )
        .eq("id", data.user.id)
        .maybeSingle();

      if (donorError) {
        console.error("❌ Donor fetch error:", donorError);
      } else {
        donorInfo = donor;
        console.log("✅ Donor info fetched for:", data.user.id);
      }
    }

    const userResponse = {
      id: data.user.id,
      email: data.user.email,
      role: profile.role,
      full_name: profile.full_name,
      phone: profile.phone,
      city: profile.city,
      location_lat: profile.location_lat,
      location_lng: profile.location_lng,
      ...(donorInfo && {
        blood_group: donorInfo.blood_group,
        is_available: donorInfo.is_available,
        total_donations: donorInfo.total_donations,
        last_donation_date: donorInfo.last_donation_date,
      }),
    };

    console.log("✅ Login successful for:", userResponse.email);

    res.json({
      token: data.session.access_token,
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

module.exports = router;
