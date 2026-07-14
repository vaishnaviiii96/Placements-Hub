import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import {
  listSubmissions,
  searchSubmissions,
  getSubmission,
  createSubmission,
  deleteSubmission,
  approveSubmission,
  rejectSubmission,
  toggleUpvote,
  toggleBookmark,
  getPendingSubmissions,
  getMySubmissions,
} from '../controllers/submissionsController.js';

const router = Router();
const cache = cacheMiddleware(60); // 1 minute cache for read-heavy routes

// Public-ish (no auth needed for browsing)
router.get('/', cache, listSubmissions);
router.get('/search', cache, searchSubmissions);

// Moderator queue
router.get('/pending', verifyToken, requireRole('moderator'), getPendingSubmissions);

// My submissions (must come before /:id)
router.get('/mine', verifyToken, getMySubmissions);

// Single submission (must come after /search, /pending, /mine)
router.get('/:id', cache, getSubmission);

// Authenticated routes
router.post('/', verifyToken, createSubmission);
router.post('/:id/upvote', verifyToken, toggleUpvote);
router.post('/:id/bookmark', verifyToken, toggleBookmark);
router.delete('/:id', verifyToken, deleteSubmission);

// Moderator actions
router.patch('/:id/approve', verifyToken, requireRole('moderator'), approveSubmission);
router.patch('/:id/reject', verifyToken, requireRole('moderator'), rejectSubmission);

export default router;
