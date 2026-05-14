const express = require('express');
const router = express.Router();
const multer = require('multer');
const videosController = require('./videos.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max per chunk
});

// All routes require authentication
router.use(authMiddleware);

// POST /api/videos — Upload a video chunk from the tracker agent
router.post('/', upload.single('video'), videosController.uploadVideo);

// GET /api/videos — Get list of video recordings (role-based)
router.get('/', videosController.getVideos);

// DELETE /api/videos/:id — Delete a video recording
router.delete('/:id', videosController.deleteVideo);

module.exports = router;
