const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

router.get('/history', sensorController.getHistory);

module.exports = router;
