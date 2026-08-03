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
         division: data.user.user_metadata?.division || "",
         district: data.user.user_metadata?.district || "",
         location_lat: data.user.user_metadata?.location_lat || 23.8103,
         location_lng: data.user.user_metadata?.location_lng || 90.4125,
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

      // ✅ CREATE ROLES FOR NEW USER
      let roles = [newProfile.role || 'donor'];
      
      // Add patient role for donor
      if (newProfile.role === 'donor' || newProfile.role === 'admin') {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: 'patient'
          }, { onConflict: 'user_id,role' });
        if (!roles.includes('patient')) roles.push('patient');
      }
      
      // Add hospital role for admin
      if (newProfile.role === 'admin') {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: 'hospital'
          }, { onConflict: 'user_id,role' });
        if (!roles.includes('hospital')) roles.push('hospital');
      }
      
      // Also add donor role for admin if not already
      if (newProfile.role === 'admin') {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: 'donor'
          }, { onConflict: 'user_id,role' });
        if (!roles.includes('donor')) roles.push('donor');
      }

      const currentRole = newProfile.role || 'donor';

      // Fetch donor info if donor role exists
      let donorInfo = null;
      if (roles.includes('donor')) {
        const { data: donor } = await supabase
          .from("donors")
          .select("blood_group, is_available, total_donations, last_donation_date")
          .eq("id", data.user.id)
          .maybeSingle();
        donorInfo = donor;
      }

       const userResponse = {
         id: data.user.id,
         email: data.user.email,
         roles: roles,
         currentRole: currentRole,
         full_name: newProfile.full_name,
         phone: newProfile.phone,
         division: newProfile.division,
         district: newProfile.district,
         location_lat: newProfile.location_lat,
         location_lng: newProfile.location_lng,
         ...(donorInfo && {
           blood_group: donorInfo.blood_group,
           is_available: donorInfo.is_available,
           total_donations: donorInfo.total_donations,
           last_donation_date: donorInfo.last_donation_date,
         }),
       };

      console.log("✅ Login successful for:", userResponse.email);
      console.log("✅ User roles:", roles);

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

    // ✅ FETCH USER ROLES
    let { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    if (rolesError) {
      console.error("❌ Roles fetch error:", rolesError);
    }

    let roles = userRoles?.map(r => r.role) || [];

    // ✅ AUTO-CREATE ROLES IF NOT EXISTS
    if (roles.length === 0) {
      console.log('⚠️ No roles found, creating default roles...');
      
      // Add primary role
      await supabase
        .from('user_roles')
        .upsert({
          user_id: data.user.id,
          role: profile.role
        }, { onConflict: 'user_id,role' });
      
      roles = [profile.role];
      
      // Add patient role for donor or admin
      if (profile.role === 'donor' || profile.role === 'admin') {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: 'patient'
          }, { onConflict: 'user_id,role' });
        if (!roles.includes('patient')) roles.push('patient');
      }
      
      // Add hospital role for admin
      if (profile.role === 'admin') {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: 'hospital'
          }, { onConflict: 'user_id,role' });
        if (!roles.includes('hospital')) roles.push('hospital');
      }
      
      // Add donor role for admin if not already
      if (profile.role === 'admin' && !roles.includes('donor')) {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: 'donor'
          }, { onConflict: 'user_id,role' });
        roles.push('donor');
      }
      
      console.log('✅ Roles created:', roles);
    }

    // Set current role
    const currentRole = roles.includes('admin') ? 'admin' : 
                        roles.includes('donor') ? 'donor' : 
                        roles[0] || 'donor';

    // Fetch donor info if donor role exists
    let donorInfo = null;
    if (roles.includes('donor')) {
      const { data: donor, error: donorError } = await supabase
        .from("donors")
        .select("blood_group, is_available, total_donations, last_donation_date")
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
       roles: roles,
       currentRole: currentRole,
       full_name: profile.full_name,
       phone: profile.phone,
       division: profile.division,
       district: profile.district,
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
    console.log("✅ User roles:", roles);
    console.log("✅ Current role:", currentRole);

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