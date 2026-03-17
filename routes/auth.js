const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Page routes
router.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Action routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.get("/verify/:token", authController.verifyEmail);
router.get("/logout", authController.logoutUser);

module.exports = router;
