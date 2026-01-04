import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

// Allowed image file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Multer config for storing files in memory (buffer)
 * Files will be stored in MongoDB instead of disk
 */
export const multerConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Invalid file type. Only JPEG, JPG, PNG, and WebP images are allowed.',
        ),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

