// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, googleLogin, logout, verifyToken } = require('../controllers/authController');

// Route yang sudah ada
router.post('/register', register);
router.post('/login', login);

// ✅ Route baru untuk Google login
router.post('/google-login', googleLogin);

// ✅ Route untuk logout
router.post('/logout', logout);

// ✅ Route untuk test token (opsional)
router.get('/profile', verifyToken, (req, res) => {
  res.json({
    message: 'Token valid',
    user: req.user
  });
});

module.exports = router;
