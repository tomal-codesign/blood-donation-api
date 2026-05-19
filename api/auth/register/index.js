// api/auth/register/index.js - No email verification
const express = require("express");
const router = express.Router();
const supabase = require("../../../supabase");

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters`,
    };
  }
  if (!hasUpperCase) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }
  if (!hasLowerCase) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }
  if (!hasNumbers) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }
  return { valid: true, message: "" };
};

const validatePhone = (phone) => {
  const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
  return phoneRegex.test(phone);
};

const validateBloodGroup = (bloodGroup) => {
  const validGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  return validGroups.includes(bloodGroup);
};

const validateCity = (city) => {
  const validCities = [
    "Dhaka",
    "Chittagong",
    "Khulna",
    "Rajshahi",
    "Sylhet",
    "Barishal",
    "Rangpur",
    "Mymensingh",
  ];
  return validCities.includes(city);
};

router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name, phone, role, city, blood_group } =
      req.body;

    // ============================================
    // 1. REQUIRED FIELDS VALIDATION
    // ============================================
    const errors = [];

    if (!email) errors.push("Email is required");
    if (!password) errors.push("Password is required");
    if (!full_name) errors.push("Full name is required");
    if (!phone) errors.push("Phone number is required");
    if (!role) errors.push("Role is required");
    if (!city) errors.push("City is required");

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        details: errors,
      });
    }

    // ============================================
    // 2. EMAIL VALIDATION
    // ============================================
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
        details:
          "Please provide a valid email address (e.g., user@example.com)",
      });
    }

    // ============================================
    // 3. PASSWORD VALIDATION
    // ============================================
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: "Password requirements not met",
        details: passwordValidation.message,
      });
    }

    // ============================================
    // 4. PHONE VALIDATION
    // ============================================
    if (!validatePhone(phone)) {
      return res.status(400).json({
        error: "Invalid phone number",
        details: "Phone number must be 8-20 digits (e.g., 01712345678)",
      });
    }

    // ============================================
    // 5. ROLE VALIDATION
    // ============================================
    const validRoles = ["donor", "patient", "hospital", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: "Invalid role",
        details: `Role must be one of: ${validRoles.join(", ")}`,
      });
    }

    // ============================================
    // 6. CITY VALIDATION
    // ============================================
    if (!validateCity(city)) {
      const validCities = [
        "Dhaka",
        "Chittagong",
        "Khulna",
        "Rajshahi",
        "Sylhet",
        "Barishal",
        "Rangpur",
        "Mymensingh",
      ];
      return res.status(400).json({
        error: "Invalid city",
        details: `City must be one of: ${validCities.join(", ")}`,
      });
    }

    // ============================================
    // 7. BLOOD GROUP VALIDATION (for donors)
    // ============================================
    if (role === "donor") {
      if (!blood_group) {
        return res.status(400).json({
          error: "Blood group required",
          details: "Blood group is required for donors",
        });
      }

      if (!validateBloodGroup(blood_group)) {
        return res.status(400).json({
          error: "Invalid blood group",
          details:
            "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-",
        });
      }
    }

    // ============================================
    // 8. NAME VALIDATION
    // ============================================
    if (full_name.length < 2 || full_name.length > 100) {
      return res.status(400).json({
        error: "Invalid name length",
        details: "Full name must be between 2 and 100 characters",
      });
    }

    // ============================================
    // 9. CHECK IF USER ALREADY EXISTS
    // ============================================
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists",
        details:
          "An account with this email already exists. Please login instead.",
      });
    }

    // ============================================
    // 10. CREATE USER WITH ADMIN API (No email verification)
    // ============================================
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // This auto-confirms email, no verification needed
        user_metadata: {
          full_name,
          phone,
          role,
          city,
          blood_group: blood_group || null,
        },
      });

    if (authError) {
      console.error("Auth error:", authError);

      if (authError.message.includes("already registered")) {
        return res.status(400).json({
          error: "Email already registered",
          details: "This email is already registered. Please login.",
        });
      }

      return res.status(400).json({
        error: "Registration failed",
        details: authError.message,
      });
    }

    if (!authData || !authData.user) {
      return res.status(500).json({
        error: "Registration failed",
        details: "Unable to create user account. Please try again.",
      });
    }

    console.log("User created:", authData.user.id);

    // ============================================
    // 11. INSERT INTO PROFILES TABLE
    // ============================================
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      full_name,
      phone,
      role,
      city,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile error:", profileError);
      // Rollback - delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({
        error: "Failed to create profile",
        details: profileError.message,
      });
    }

    console.log("Profile created for:", authData.user.id);

    // ============================================
    // 12. CREATE DONOR RECORD (if donor)
    // ============================================
    if (role === "donor" && blood_group) {
      const { error: donorError } = await supabase.from("donors").insert({
        id: authData.user.id,
        blood_group,
        is_available: true,
        total_donations: 0,
        last_donation_date: null,
        created_at: new Date().toISOString(),
      });

      if (donorError) {
        console.error("Donor creation error:", donorError);
        // Don't fail registration, just log error
      } else {
        console.log("Donor record created for:", authData.user.id);
      }
    }

    // ============================================
    // 13. SUCCESS RESPONSE (No email verification needed)
    // ============================================
    res.status(201).json({
      success: true,
      message: "Registration successful!",
      userId: authData.user.id,
      email: authData.user.email,
      role: role,
      redirectTo: "/login",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

module.exports = router;
