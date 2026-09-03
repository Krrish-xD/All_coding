const CustomizationOption = require('../models/customizationOption.model');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
const s3 = new AWS.S3();

// @desc    Create a new customization option
// @route   POST /api/customizations
// @access  Private/Admin
const createCustomization = async (req, res) => {
  try {
    const { name, type, description, options, priceModifier, isDefault, isActive } = req.body;

    const customization = new CustomizationOption({
      name,
      type,
      description,
      options,
      priceModifier,
      isDefault,
      isActive
    });

    await customization.save();

    res.status(201).json({
      success: true,
      customization
    });
  } catch (error) {
    console.error('Create customization error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating customization'
    });
  }
};

// @desc    Update customization option
// @route   PUT /api/customizations/:id
// @access  Private/Admin
const updateCustomization = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const customization = await CustomizationOption.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Customization not found'
      });
    }

    res.status(200).json({
      success: true,
      customization
    });
  } catch (error) {
    console.error('Update customization error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating customization'
    });
  }
};

// @desc    Soft delete customization option
// @route   DELETE /api/customizations/:id
// @access  Private/Admin
const deleteCustomization = async (req, res) => {
  try {
    const { id } = req.params;

    const customization = await CustomizationOption.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Customization not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customization deactivated successfully'
    });
  } catch (error) {
    console.error('Delete customization error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting customization'
    });
  }
};

// @desc    Get all active customization options
// @route   GET /api/customizations
// @access  Public
const listCustomizations = async (req, res) => {
  try {
    const customizations = await CustomizationOption.find({ isActive: true });

    res.status(200).json({
      success: true,
      count: customizations.length,
      customizations
    });
  } catch (error) {
    console.error('List customizations error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting customizations'
    });
  }
};

// @desc    Get single customization option
// @route   GET /api/customizations/:id
// @access  Public
const getCustomization = async (req, res) => {
  try {
    const { id } = req.params;

    const customization = await CustomizationOption.findById(id);

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Customization not found'
      });
    }

    res.status(200).json({
      success: true,
      customization
    });
  } catch (error) {
    console.error('Get customization error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting customization'
    });
  }
};

// @desc    Upload image for boolean customization option
// @route   POST /api/customizations/upload-image/:id
// @access  Private/Admin
const uploadCustomizationImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the customization exists and is of type 'boolean'
    const customization = await CustomizationOption.findById(id);
    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Customization not found'
      });
    }

    if (customization.type !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Image upload is only allowed for boolean type customizations'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Validate file size (10MB limit for customizations)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size must be less than 10MB'
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed'
      });
    }

    const bucketName = process.env.S3_BUCKET_NAME || 'themsenterprises-product-images';
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `customizations/${uuidv4()}.${fileExtension}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    const result = await s3.upload(uploadParams).promise();

    // Update the customization option with the image URL
    // For boolean type, we'll store the image URL in the first option or create one
    if (!customization.options || customization.options.length === 0) {
      customization.options = [{
        value: 'Image Upload',
        priceModifier: { operator: '+', value: 0 },
        imageUrl: result.Location
      }];
    } else {
      // Update the first option with the image URL
      customization.options[0].imageUrl = result.Location;
    }

    await customization.save();

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.Location,
      customization
    });
  } catch (error) {
    console.error('Upload customization image error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error uploading image'
    });
  }
};

module.exports = {
  createCustomization,
  updateCustomization,
  deleteCustomization,
  listCustomizations,
  getCustomization,
  uploadCustomizationImage
};
