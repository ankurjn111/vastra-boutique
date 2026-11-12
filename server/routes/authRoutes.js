const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();
const CLIENT_ORIGIN = new URL(process.env.CLIENT_URL || 'http://localhost:5173').origin;

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/admin', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.adminOAuthState = state;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    const savedAdminState = req.session?.adminOAuthState;
    const isAdminLogin =
      typeof savedAdminState === 'string' &&
      typeof req.query.state === 'string' &&
      req.query.state === savedAdminState;

    if (savedAdminState) {
      delete req.session.adminOAuthState;
    }

    if (savedAdminState && !isAdminLogin) {
      return res.redirect(`${CLIENT_ORIGIN}/admin?login=failed`);
    }

    passport.authenticate('google', { session: false }, (error, user) => {
      if (error) return next(error);
      if (!user) {
        return isAdminLogin
          ? res.redirect(`${CLIENT_ORIGIN}/admin?login=failed`)
          : res.redirect('/login');
      }

      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      if (!isAdminLogin) {
        return res.json({ token, user });
      }

      const message = JSON.stringify({ type: 'vastra-admin-auth', token });
      const targetOrigin = JSON.stringify(CLIENT_ORIGIN);

      res.type('html').send(`<!doctype html>
        <html lang="en">
          <head><meta charset="utf-8"><title>Vastra sign-in</title></head>
          <body>
            <p>Sign-in complete. You can close this window.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage(${message}, ${targetOrigin});
                window.close();
              }
            </script>
          </body>
        </html>`);
    })(req, res, next);
  }
);

router.get('/me', protect, (req, res) => {
  res.json({ message: 'Aap logged in ho', user: req.user });
});

module.exports = router;