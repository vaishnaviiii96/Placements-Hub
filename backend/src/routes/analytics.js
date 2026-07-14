import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import {
  topicHeatmap,
  topicFrequency,
  topicTrends,
  companyTimeline,
  difficultyDistribution,
  topQuestions,
  searchGaps,
  submissionPipeline,
  contributorLeaderboard,
  weeklyActiveUsers,
} from '../controllers/analyticsController.js';

const router = Router();

// All analytics routes require JWT auth
router.use(verifyToken);

// All analytics routes are cached for 1 hour
const cache = cacheMiddleware();

// ─── Public Analytics (all authenticated users) ──────────────
router.get('/topic-heatmap', cache, topicHeatmap);
router.get('/topic-frequency', cache, topicFrequency);
router.get('/topic-trends', cache, topicTrends);
router.get('/company-timeline', cache, companyTimeline);
router.get('/difficulty-distribution', cache, difficultyDistribution);
router.get('/top-questions', cache, topQuestions);

// ─── Moderator-Only Analytics ────────────────────────────────
router.get('/search-gaps', requireRole('moderator'), cache, searchGaps);
router.get('/submission-pipeline', requireRole('moderator'), cache, submissionPipeline);
router.get('/contributor-leaderboard', requireRole('moderator'), cache, contributorLeaderboard);
router.get('/weekly-active-users', requireRole('moderator'), cache, weeklyActiveUsers);

export default router;
