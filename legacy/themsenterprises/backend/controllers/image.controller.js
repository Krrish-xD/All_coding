const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// Configure AWS
// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION || 'ap-south-1'
// });

const s3 = new AWS.S3();

// @desc    Upload images to S3
// @route   POST /api/admin2009/upload-images
// @access  Private (Admin only)
const uploadImages = async (req, res) => {
  try {
    // console.log('AWS Config:', {
    //   accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
    //   region: process.env.AWS_REGION || 'NOT SET',
    //   bucket: process.env.S3_BUCKET_NAME || 'themsenterprises-product-images'
    // });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const bucketName = process.env.S3_BUCKET_NAME || 'themsenterprises-product-images';
    const uploadedUrls = [];

    // Check if this is a customization upload (no compression needed)
    const isCustomizationUpload = req.body.customizationId === '68dc1da4f36ac028a2d6d515';

    for (const file of req.files) {
      let processedBuffer = file.buffer;
      let contentType = file.mimetype;
      const fileExtension = file.originalname.split('.').pop();
      let fileName = `customizations/${uuidv4()}.${fileExtension}`;

      // Skip compression for customization uploads
      if (!isCustomizationUpload) {
        // Process image with sharp: convert to WebP, compress, and resize if needed
        let processedBufferTemp = file.buffer;
        let contentTypeTemp = 'image/webp';
        let fileNameTemp = `products/${uuidv4()}.webp`;

        try {
          // Get image metadata to check dimensions
          const metadata = await sharp(file.buffer).metadata();

          // Resize if width > 1200px, maintain aspect ratio
          let sharpInstance = sharp(file.buffer);
          if (metadata.width > 1200) {
            sharpInstance = sharpInstance.resize(1200, null, {
              withoutEnlargement: true,
              fit: 'inside'
            });
          }

          // Convert to WebP with 85% quality for good compression
          processedBufferTemp = await sharpInstance
            .webp({ quality: 85 })
            .toBuffer();

          processedBuffer = processedBufferTemp;
          contentType = contentTypeTemp;
          fileName = fileNameTemp;

        } catch (processingError) {
          console.warn(`Failed to process image ${file.originalname}, uploading original:`, processingError.message);
          // Fallback to original file if processing fails
          processedBuffer = file.buffer;
          contentType = file.mimetype;
          const fileExtensionFallback = file.originalname.split('.').pop();
          fileName = `products/${uuidv4()}.${fileExtensionFallback}`;
        }
      }

      const uploadParams = {
        Bucket: bucketName,
        Key: fileName,
        Body: processedBuffer,
        ContentType: contentType
      };

      const result = await s3.upload(uploadParams).promise();
      uploadedUrls.push(result.Location);
    }

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      urls: uploadedUrls
    });
  } catch (error) {
    console.error('Image upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    });
    res.status(500).json({
      success: false,
      error: 'Server error uploading images',
      details: error.message
    });
  }
};

// @desc    Delete images from S3
// @route   DELETE /api/admin/delete-images
// @access  Private (Admin only)
const deleteImages = async (req, res) => {
  try {
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image URLs provided'
      });
    }

    const bucketName = process.env.S3_BUCKET_NAME || 'themsenterprises-product-images';
    const deletePromises = imageUrls.map(async (url) => {
      try {
        // Extract key from URL
        const urlParts = url.split('/');
        const key = urlParts.slice(-2).join('/'); // products/uuid.ext

        const deleteParams = {
          Bucket: bucketName,
          Key: key
        };

        await s3.deleteObject(deleteParams).promise();
        return { url, success: true };
      } catch (error) {
        console.error(`Failed to delete image ${url}:`, error);
        return { url, success: false, error: error.message };
      }
    });

    const results = await Promise.all(deletePromises);
    const failedDeletions = results.filter(r => !r.success);

    if (failedDeletions.length > 0) {
      return res.status(207).json({
        success: false,
        message: 'Some images failed to delete',
        results
      });
    }

    res.status(200).json({
      success: true,
      message: 'Images deleted successfully',
      results
    });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting images'
    });
  }
};

// @desc    Test AWS S3 configuration
// @route   GET /api/admin/test-s3
// @access  Private (Admin only)
const testS3Config = async (req, res) => {
  try {
    const bucketName = process.env.S3_BUCKET_NAME || 'themsenterprises-product-images';

    // Test if we can list objects (this will fail if credentials are wrong)
    const params = {
      Bucket: bucketName,
      MaxKeys: 1
    };

    await s3.listObjectsV2(params).promise();

    res.status(200).json({
      success: true,
      message: 'S3 configuration is working',
      bucket: bucketName,
      region: process.env.AWS_REGION || 'ap-south-1'
    });
  } catch (error) {
    console.error('S3 test error:', error);
    res.status(500).json({
      success: false,
      error: 'S3 configuration error',
      details: error.message,
      code: error.code
    });
  }
};

module.exports = {
  uploadImages,
  deleteImages,
  testS3Config
};
