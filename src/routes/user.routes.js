const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateProfileSchema } = require('../utils/validators');
const { uploadLimiter } = require('../middlewares/rateLimit.middleware');

// Multer setup for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.post('/upload-photo', authenticate, uploadLimiter, upload.single('image'), userController.uploadPhoto);
router.get('/export', authenticate, userController.exportData);
router.delete('/', authenticate, userController.deleteAccount);

module.exports = router;
