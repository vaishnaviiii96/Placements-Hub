import prisma from '../lib/prisma.js';

/**
 * POST /api/comments
 */
export async function createComment(req, res) {
  try {
    const { submissionId, text } = req.body;

    if (!submissionId || !text?.trim()) {
      return res.status(400).json({ error: 'submissionId and text are required' });
    }

    const comment = await prisma.comment.create({
      data: {
        submissionId,
        userId: req.user.id,
        text: text.trim(),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
}

/**
 * GET /api/comments?submissionId=
 */
export async function listComments(req, res) {
  try {
    const { submissionId } = req.query;

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' });
    }

    const comments = await prisma.comment.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    res.json(comments);
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
}
