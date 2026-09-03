const mongoose = require('mongoose');

const customizationOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["boolean", "text", "select", "multi-select"]
  },
  description: {
    type: String
  },
  priceModifier: {
    type: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed'
    },
    value: {
      type: Number,
      default: 0
    },
    operator: {
      type: String,
      enum: ['+', '-'],
      default: '+'
    }
  },
  options: {
    type: [{
      value: {
        type: String,
        required: true
      },
      priceModifier: {
        operator: {
          type: String,
          enum: ['+', '-'],
          default: '+'
        },
        value: {
          type: Number,
          default: 0
        }
      },
      // For boolean type customizations that store image URLs
      imageUrl: {
        type: String
      }
    }],
    validate: {
      validator: function(value) {
        if (this.type === 'select' || this.type === 'multi-select') {
          return value && value.length > 0;
        }
        return true;
      },
      message: 'Options are required for select and multi-select types'
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("CustomizationOption", customizationOptionSchema);
