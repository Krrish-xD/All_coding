const express = require('express');
const router = express.Router();
const { getPublicSettings } = require('../controllers/settings.controller');

// @route   GET /api/settings
// @desc    Get all public settings
// @access  Public
router.get('/', getPublicSettings);

module.exports = router;