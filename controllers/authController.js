const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");

// Email transporter setup 
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to send/log verification link
async function sendVerificationLink(user, req, res, successMsg) {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  const verifyLink = `${baseUrl}/auth/verify/${user.verificationToken}`;
  try {
    // Attempt to send verification email
    await transporter.sendMail({
      from: '"Lynkly Support" <no-reply@lynkly.com>',
      to: user.email,
      subject: "Lynkly – Verify Your Email",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:30px;border-radius:12px;background:#faf8f6;">
          <h2 style="color:#7a0c1e;">Welcome to Lynkly! 🔗</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Please verify your email by clicking the button below:</p>
          <a href="${verifyLink}" style="display:inline-block;padding:12px 28px;background:#7a0c1e;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">Verify Email</a>
          <p style="font-size:13px;color:#999;">If the button doesn't work, copy this link:<br>${verifyLink}</p>
        </div>
      `,
    });
  } catch (emailErr) {
    // FALLBACK: Log to console and file if email service isn't setup
    console.log("\n" + "=".repeat(50));
    console.log("🔗 DEBUG: VERIFICATION LINK");
    console.log(verifyLink);
    console.log("=".repeat(50) + "\n");
    const logPath = path.join(__dirname, "../verification_links.txt");
    fs.appendFileSync(logPath, `[${new Date().toLocaleString()}] ${user.email}: ${verifyLink}\n`);
  }
  return res.render("register", { success: successMsg });
}

// REGISTER
module.exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.render("register", {
          error: "An account with this email already exists and is verified. Please log in.",
        });
      } else {
        // User exists but is NOT verified. Update info and resend link.
        existingUser.verificationToken = crypto.randomBytes(32).toString("hex");
        existingUser.name = name;
        const salt = await bcrypt.genSalt(10);
        existingUser.password = await bcrypt.hash(password, salt);
        await existingUser.save();
        return await sendVerificationLink(existingUser, req, res, "Account already exists but was not verified. A new verification link has been sent!");
      }
    }

    // New user path
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      verificationToken,
    });
    await newUser.save();
    return await sendVerificationLink(newUser, req, res, "Registration successful! Check your email for the verification link.");
  } catch (err) {
    console.error("Register error:", err);
    res.render("register", { error: "Something went wrong. Please try again." });
  }
};

// VERIFY EMAIL 
module.exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.render("verify", {
        message: "Invalid or expired verification link.",
        success: false,
      });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.render("verify", {
      message: "Email verified successfully! You can now log in.",
      success: true,
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.render("verify", {
      message: "Verification failed. Please try again.",
      success: false,
    });
  }
};

// LOGIN
module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render("login", { error: "Invalid email or password." });
    }
    if (!user.isVerified) {
      return res.render("login", {
        error: "Please verify your email before logging in.",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", { error: "Invalid email or password." });
    }
    // Store user info in session
    req.session.userId = user._id;
    req.session.userName = user.name;
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { error: "Something went wrong. Please try again." });
  }
};

// LOGOUT
module.exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
};
