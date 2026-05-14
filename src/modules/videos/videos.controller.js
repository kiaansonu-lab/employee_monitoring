const { successResponse, errorResponse } = require('../../utils/response');
const { getOrganizationId } = require('../../utils/orgId');
const prisma = require('../../config/db');
const fs = require('fs');
const path = require('path');

const videosController = {
    // POST /api/videos — Upload a video recording from the WebTrackerAgent
    uploadVideo: async (req, res) => {
        try {
            const { employeeId } = req.body;
            const organizationId = await getOrganizationId(req);

            if (!employeeId) {
                return errorResponse(res, 'employeeId is required', 400);
            }
            if (!req.file) {
                return errorResponse(res, 'video file is required', 400);
            }

            // Save video file to disk
            const ext = req.file.mimetype.includes('mp4') ? 'mp4' : 'webm';
            const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
            const uploadDir = path.join(__dirname, '../../../public/uploads/videos');

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filepath = path.join(uploadDir, filename);
            fs.writeFileSync(filepath, req.file.buffer);

            const sizeMb = parseFloat((req.file.size / (1024 * 1024)).toFixed(2));
            const fileUrl = `/uploads/videos/${filename}`;

            // Persist to DB
            const record = await prisma.videoRecording.create({
                data: {
                    employeeId,
                    organizationId,
                    fileUrl,
                    sizeMb,
                },
                include: {
                    employee: { select: { id: true, fullName: true } },
                },
            });

            return successResponse(res, record, 'Video recording uploaded successfully');
        } catch (error) {
            console.error('[VideosController] Error uploading video:', error);
            return errorResponse(res, error.message);
        }
    },

    // GET /api/videos — Fetch video recordings (role-based)
    getVideos: async (req, res) => {
        try {
            const organizationId = await getOrganizationId(req);
            const { role, employeeId: userId } = req.user;
            const { employeeId, limit = 50, offset = 0 } = req.query;

            let where = { organizationId };

            if (role === 'EMPLOYEE') {
                where.employeeId = userId;
            } else if (employeeId) {
                where.employeeId = employeeId;
            }

            const videos = await prisma.videoRecording.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit, 10),
                skip: parseInt(offset, 10),
                include: {
                    employee: { select: { id: true, fullName: true, avatar: true } },
                },
            });

            return successResponse(res, videos, 'Videos fetched successfully');
        } catch (error) {
            console.error('[VideosController] Error fetching videos:', error);
            return errorResponse(res, error.message);
        }
    },

    // DELETE /api/videos/:id
    deleteVideo: async (req, res) => {
        try {
            const { id } = req.params;
            const { role, employeeId: userId } = req.user;

            const video = await prisma.videoRecording.findUnique({ where: { id } });
            if (!video) return errorResponse(res, 'Video not found', 404);

            if (role === 'EMPLOYEE' && video.employeeId !== userId) {
                return errorResponse(res, 'Forbidden', 403);
            }

            // Delete file from disk
            try {
                const filepath = path.join(__dirname, '../../../public', video.fileUrl);
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            } catch (fsErr) {
                console.warn('[VideosController] Could not delete file:', fsErr.message);
            }

            await prisma.videoRecording.delete({ where: { id } });
            return successResponse(res, null, 'Video deleted successfully');
        } catch (error) {
            console.error('[VideosController] Error deleting video:', error);
            return errorResponse(res, error.message);
        }
    },
};

module.exports = videosController;
