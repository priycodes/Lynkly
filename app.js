const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session 
app.use(
  session({
    secret: process.env.SESSION_SECRET || "lynkly-fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

// Make session user available in all EJS views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, name: req.session.userName }
    : null;
  next();
});

// Routes 
const authRoutes = require("./routes/auth");
const urlRoutes = require("./routes/url");

// Homepage
app.get("/", (req, res) => {
  res.render("index", { error: null });
});

// Auth routes (/auth/register, /auth/login, etc.)
app.use("/auth", authRoutes);

// URL routes (/dashboard, /shorten, /url/delete/:id, /:shortCode)
// IMPORTANT: mount LAST so /:shortCode doesn't catch other routes
app.use("/", urlRoutes);

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`🚀 Lynkly is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  }); 