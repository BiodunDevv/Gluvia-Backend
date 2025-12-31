const cloudinary = require('cloudinary').v2;
const config = require('../config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud,
  api_key: config.cloudinary.key,
  api_secret: config.cloudinary.secret,
});

/**
 * Upload image to Cloudinary
 * @param {Buffer|string} file - File buffer or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} { public_id, secure_url }
 */
const uploadImage = async (file, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: options.folder || 'gluvia',
      resource_type: 'image',
      transformation: options.transformation || [
        { width: 1024, height: 1024, crop: 'limit' },
        { quality: 'auto' },
      ],
      ...options,
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    throw new Error('Failed to upload image');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { ok: true };
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
    throw new Error('Failed to delete image');
  }
};

/**
 * Generate thumbnail URL
 * @param {string} publicId
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
const getThumbnailUrl = (publicId, width = 200, height = 200) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
};

/**
 * Upload image from buffer (for multer integration)
 * @param {Buffer} buffer - Image buffer
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<Object>}
 */
const uploadFromBuffer = async (buffer, folder = 'gluvia') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1024, height: 1024, crop: 'limit' },
          { quality: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload stream error:', error.message);
          reject(new Error('Failed to upload image'));
        } else {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

module.exports = {
  uploadImage,
  deleteImage,
  getThumbnailUrl,
  uploadFromBuffer,
};
