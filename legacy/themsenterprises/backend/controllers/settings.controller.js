const { Setting } = require('../models');

// A whitelist of settings that are safe to be exposed to the public frontend
const publicSettingsWhitelist = [
  'businessName',
  'businessEmail',
  'businessPhone',
  'businessPhone2',
  'businessAddress',
  'gstNumber',
  'maintenanceMode',
  'allowRegistrations',
  'freeShippingThreshold',
  'standardShippingCost',
  'expressShippingCost',
  'defaultTaxRate',
  'applyTaxToShipping',
];

// @desc    Get all public settings
// @route   GET /api/settings
// @access  Public
const getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.find({ key: { $in: publicSettingsWhitelist } });

    // Convert the array of settings into a key-value object
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.status(200).json(settingsObject);

  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ success: false, error: 'Server error fetching settings' });
  }
};

module.exports = {
  getPublicSettings,
};