const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const sensorController = require('../controllers/sensorController');

// Proteksi dengan JWT
router.get('/', verifyToken, (req, res) => {
  res.json({ message: `Hello user ID: ${req.user.id}` });
});

// Endpoint sensor
router.get('/lastsensor', sensorController.getLatestEntry);

module.exports = router;
