import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createComment, listComments } from '../controllers/commentsController.js';

const router = Router();

router.get('/', listComments);
router.post('/', verifyToken, createComment);

export default router;
