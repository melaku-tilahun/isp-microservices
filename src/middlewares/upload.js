const multer = require('multer');
const { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } = require('../config/constants');
const AppError = require('../utils/AppError');

// Memory storage for forwarding to backend
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Invalid file type. Only JPEG, PNG, WEBP, and PDF receipts are allowed.', 400, 'INVALID_FILE_TYPE'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES
    },
    fileFilter
});

module.exports = upload;
