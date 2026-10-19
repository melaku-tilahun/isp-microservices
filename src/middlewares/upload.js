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

// Validate common file magic bytes to avoid content masquerading
const validateMagicBytes = (buffer, mimetype) => {
    if (!buffer || buffer.length < 4) return false;
    const hexStart = buffer.toString('hex', 0, 4);
    try {
        switch (mimetype) {
            case 'image/jpeg':
                return hexStart.startsWith('ffd8ff');
            case 'image/png':
                return hexStart.startsWith('89504e47');
            case 'image/webp':
                // RIFF....WEBP (first 4 bytes RIFF, bytes 8-12 == WEBP)
                return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
            case 'application/pdf':
                return buffer.toString('ascii', 0, 4) === '%PDF';
            default:
                return false;
        }
    } catch (err) {
        return false;
    }
};

const verifyUploadedFile = (req, res, next) => {
    if (!req.file) return next();
    const ok = validateMagicBytes(req.file.buffer, req.file.mimetype);
    if (!ok) {
        return next(new AppError('Uploaded file content does not match its MIME type.', 400, 'INVALID_FILE_CONTENT'));
    }
    next();
};

module.exports = upload;
module.exports.verifyUploadedFile = verifyUploadedFile;
