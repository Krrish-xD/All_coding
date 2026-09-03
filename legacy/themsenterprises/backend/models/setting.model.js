const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

// Initialize settings
const initializeSettings = async () => {
  const settings = [
    {
      key: 'bulkDiscount',
      value: {
        threshold: 50000,
        percentage: 10, // Example: 10% discount
      },
    },
  ];

  for (const setting of settings) {
    const existing = await Setting.findOne({ key: setting.key });
    if (!existing) {
      await Setting.create(setting);
    }
  }
};

module.exports = { Setting, initializeSettings };