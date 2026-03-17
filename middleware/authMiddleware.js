// Middleware to check if user is authenticated via session
module.exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect("/auth/login");
};
