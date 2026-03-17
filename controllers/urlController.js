const crypto = require("crypto");
const validator = require("validator");
const Url = require("../models/Url");

// CREATE SHORT URL
module.exports.createShortUrl = async (req, res) => {
  try {
    const { originalUrl, customAlias } = req.body;
    // Validate URL
    if (!validator.isURL(originalUrl, { require_protocol: true })) {
      const urls = await Url.find({ userId: req.session.userId }).sort({ createdAt: -1 });
      return res.render("dashboard", {
        userName: req.session.userName,
        urls,
        baseUrl: `${req.protocol}://${req.get("host")}`,
        error: "Invalid URL. Please include http:// or https://",
      });
    }
    // Generate or use custom short code
    let shortCode;
    if (customAlias && customAlias.trim() !== "") {
      // Check if custom alias already exists
      const aliasExists = await Url.findOne({
        $or: [{ shortCode: customAlias.trim() }, { customAlias: customAlias.trim() }],
      });
      if (aliasExists) {
        const urls = await Url.find({ userId: req.session.userId }).sort({ createdAt: -1 });
        return res.render("dashboard", {
          userName: req.session.userName,
          urls,
          baseUrl: `${req.protocol}://${req.get("host")}`,
          error: "That custom alias is already taken. Please choose another.",
        });
      }
      shortCode = customAlias.trim();
    } else {
      shortCode = crypto.randomBytes(3).toString("hex"); // 6-char hex code
    }
    // Save URL
    const newUrl = new Url({
      userId: req.session.userId,
      originalUrl,
      shortCode,
      customAlias: customAlias && customAlias.trim() !== "" ? customAlias.trim() : undefined,
    });
    await newUrl.save();
    const shortUrl = `${req.protocol}://${req.get("host")}/${shortCode}`;
    res.render("result", { shortUrl, originalUrl });
  } catch (err) {
    console.error("Create URL error:", err);
    res.redirect("/dashboard");
  }
};

// REDIRECT TO ORIGINAL URL
module.exports.redirectToOriginal = async (req, res) => {
  try {
    const { shortCode } = req.params;
    // Find by shortCode or customAlias
    const url = await Url.findOne({
      $or: [{ shortCode }, { customAlias: shortCode }],
    });
    if (!url) {
      return res.status(404).render("index", {
        user: req.session.userId ? { name: req.session.userName } : null,
        error: "Short URL not found.",
      });
    }
    // Increment click count
    url.clicks += 1;
    await url.save();
    // Redirect to original URL
    res.redirect(url.originalUrl);
  } catch (err) {
    console.error("Redirect error:", err);
    res.redirect("/");
  }
};

// GET USER URLS (DASHBOARD)
module.exports.getUserUrls = async (req, res) => {
  try {
    const urls = await Url.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.render("dashboard", {
      userName: req.session.userName,
      urls,
      baseUrl: `${req.protocol}://${req.get("host")}`,
      error: null,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.redirect("/");
  }
};

// DELETE URL
module.exports.deleteUrl = async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow deleting own URLs
    await Url.findOneAndDelete({ _id: id, userId: req.session.userId });
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Delete error:", err);
    res.redirect("/dashboard");
  }
};
