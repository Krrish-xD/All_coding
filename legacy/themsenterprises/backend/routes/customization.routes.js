const express = require('express');
const multer = require('multer');
const {
  createCustomization,
  updateCustomization,
  deleteCustomization,
  listCustomizations,
  getCustomization,
  uploadCustomizationImage
} = require('../controllers/customization.controller');
const { uploadImages, deleteImages } = require('../controllers/image.controller');
const { adminAuth } = require('../middleware/adminAuth.middleware');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Public routes
router.get('/', listCustomizations);
router.get('/:id', getCustomization);

// Public image upload route for user customizations (no auth required)
router.post('/upload-image', upload.array('images', 10), uploadImages);
router.delete('/delete-image', deleteImages);

// Protected routes (require admin authentication)
router.use(adminAuth);

// Routes
router.post('/', createCustomization);
router.put('/:id', updateCustomization);
router.delete('/:id', deleteCustomization);
router.post('/upload-image/:id', upload.single('image'), uploadCustomizationImage);

module.exports = router;
