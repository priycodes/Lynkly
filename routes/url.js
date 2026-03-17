const express = require("express");
const router = express.Router();
const urlController = require("../controllers/urlController");
const { isAuthenticated } = require("../middleware/authMiddleware");

// Protected routes (require login)
router.get("/dashboard", isAuthenticated, urlController.getUserUrls);
router.post("/shorten", isAuthenticated, urlController.createShortUrl);
router.post("/url/delete/:id", isAuthenticated, urlController.deleteUrl);

// Public redirect route (MUST be last – catches /:shortCode) 
router.get("/:shortCode", urlController.redirectToOriginal);

module.exports = router;
