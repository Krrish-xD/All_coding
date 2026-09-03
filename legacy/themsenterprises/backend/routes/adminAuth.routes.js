const express = require('express');
const router = express.Router();
const { adminLogin, adminLogout, getAdminProfile } = require('../controllers/adminAuth.controller');
const { adminAuth } = require('../middleware/adminAuth.middleware');

// @route   POST /api/admin2009/login
router.post('/login', adminLogin);

// @route   POST /api/admin2009/logout
router.post('/logout', adminAuth, adminLogout);

// @route   GET /api/admin2009/profile
router.get('/profile', adminAuth, getAdminProfile);

module.exports = router;
