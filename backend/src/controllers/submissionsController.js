import prisma from '../lib/prisma.js';

/**
 * GET /api/submissions
 * Paginated, filterable list of approved submissions
 */
export async function listSubmissions(req, res) {
  try {
    const {
      companyId, role, topic, difficulty, batchYear, branch,
      sort = 'recent', page = 1, limit = 20,
    } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = { status: 'approved' };
    if (companyId) where.companyId = companyId;
    if (role) where.roleApplied = { contains: role, mode: 'insensitive' };
    if (batchYear) where.user = { ...where.user, batchYear: parseInt(batchYear, 10) };
    if (branch) where.user = { ...where.user, branch: { equals: branch, mode: 'insensitive' } };
    if (difficulty) where.rounds = { some: { difficulty } };
    if (topic) where.rounds = {
      some: { roundTags: { some: { tag: { name: { equals: topic, mode: 'insensitive' } } } } }
    };

    const orderBy = sort === 'upvotes'
      ? { upvoteCount: 'desc' }
      : sort === 'views'
        ? { viewCount: 'desc' }
        : { createdAt: 'desc' };

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          company: { select: { id: true, name: true, logoUrl: true, industry: true } },
          user: { select: { id: true, name: true, batchYear: true, branch: true } },
          rounds: {
            orderBy: { orderIndex: 'asc' },
            include: {
              roundTags: { include: { tag: true } },
            },
          },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    // Mask user info for anonymous submissions
    const result = submissions.map(s => ({
      ...s,
      user: s.isAnonymous ? null : s.user,
      rounds: s.rounds.map(r => ({
        ...r,
        tags: r.roundTags.map(rt => rt.tag.name),
        roundTags: undefined,
      })),
    }));

    res.json({
      data: result,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('List submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

/**
 * GET /api/submissions/search?q=
 * Full-text search + logs to SearchLog
 */
export async function searchSubmissions(req, res) {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    const query = q.trim();

    const where = {
      status: 'approved',
      OR: [
        { overallTips: { contains: query, mode: 'insensitive' } },
        { roleApplied: { contains: query, mode: 'insensitive' } },
        { company: { name: { contains: query, mode: 'insensitive' } } },
        { rounds: { some: { questions: { contains: query, mode: 'insensitive' } } } },
      ],
    };

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          company: { select: { id: true, name: true, logoUrl: true, industry: true } },
          user: { select: { id: true, name: true, batchYear: true, branch: true } },
          rounds: {
            orderBy: { orderIndex: 'asc' },
            include: {
              roundTags: { include: { tag: true } },
            },
          },
        },
      }),
      prisma.submission.count({ where }),
    ]);

    // Log search query to SearchLog (anonymized — no user_id)
    await prisma.searchLog.create({
      data: {
        query: query.toLowerCase(),
        resultCount: total,
      },
    }).catch(err => console.warn('SearchLog write failed:', err.message));

    const result = submissions.map(s => ({
      ...s,
      user: s.isAnonymous ? null : s.user,
      rounds: s.rounds.map(r => ({
        ...r,
        tags: r.roundTags.map(rt => rt.tag.name),
        roundTags: undefined,
      })),
    }));

    res.json({
      data: result,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('Search submissions error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
}

/**
 * GET /api/submissions/:id
 */
export async function getSubmission(req, res) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        company: { select: { id: true, name: true, logoUrl: true, industry: true } },
        user: { select: { id: true, name: true, batchYear: true, branch: true } },
        rounds: {
          orderBy: { orderIndex: 'asc' },
          include: {
            roundTags: { include: { tag: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Increment view count
    await prisma.submission.update({
      where: { id: req.params.id },
      data: { viewCount: { increment: 1 } },
    });

    const result = {
      ...submission,
      user: submission.isAnonymous ? null : submission.user,
      rounds: submission.rounds.map(r => ({
        ...r,
        tags: r.roundTags.map(rt => rt.tag.name),
        roundTags: undefined,
      })),
    };

    res.json(result);
  } catch (err) {
    console.error('Get submission error:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
}

/**
 * POST /api/submissions
 * Create a new submission — auto-approved, company created by name if needed
 */
export async function createSubmission(req, res) {
  try {
    const { companyName, companyId, roleApplied, interviewDate, ctc, isAnonymous, overallTips, rounds } = req.body;

    if ((!companyName && !companyId) || !roleApplied) {
      return res.status(400).json({ error: 'Company name and role are required' });
    }

    // Find or create company by name
    let resolvedCompanyId = companyId;
    if (companyName && !companyId) {
      let company = await prisma.company.findFirst({
        where: { name: { equals: companyName.trim(), mode: 'insensitive' } },
      });
      if (!company) {
        company = await prisma.company.create({
          data: { name: companyName.trim() },
        });
      }
      resolvedCompanyId = company.id;
    }

    const submission = await prisma.submission.create({
      data: {
        userId: req.user.id,
        companyId: resolvedCompanyId,
        roleApplied,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        ctc: ctc || null,
        isAnonymous: !!isAnonymous,
        overallTips: overallTips || null,
        status: 'approved',
        rounds: rounds?.length ? {
          create: rounds.map((r, index) => ({
            roundType: r.roundType || 'Technical',
            questions: r.questions || '',
            difficulty: r.difficulty || 'medium',
            orderIndex: index + 1,
            roundTags: r.tags?.length ? {
              create: r.tags.map(tagId => ({ tagId })),
            } : undefined,
          })),
        } : undefined,
      },
      include: {
        company: { select: { id: true, name: true } },
        rounds: {
          include: { roundTags: { include: { tag: true } } },
        },
      },
    });

    res.status(201).json(submission);
  } catch (err) {
    console.error('Create submission error:', err);
    res.status(500).json({ error: 'Failed to create submission' });
  }
}

/**
 * PATCH /api/submissions/:id/approve
 * Moderator-only
 */
export async function approveSubmission(req, res) {
  try {
    const submission = await prisma.submission.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    });
    res.json(submission);
  } catch (err) {
    console.error('Approve submission error:', err);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
}

/**
 * PATCH /api/submissions/:id/reject
 * Moderator-only
 */
export async function rejectSubmission(req, res) {
  try {
    const submission = await prisma.submission.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });
    res.json(submission);
  } catch (err) {
    console.error('Reject submission error:', err);
    res.status(500).json({ error: 'Failed to reject submission' });
  }
}

/**
 * POST /api/submissions/:id/upvote — toggle upvote
 */
export async function toggleUpvote(req, res) {
  try {
    const userId = req.user.id;
    const submissionId = req.params.id;

    const existing = await prisma.upvote.findUnique({
      where: { userId_submissionId: { userId, submissionId } },
    });

    let upvoted = false;

    if (existing) {
      await prisma.upvote.delete({
        where: { userId_submissionId: { userId, submissionId } },
      }).catch(() => {}); // Catch in case of race condition
    } else {
      await prisma.upvote.create({ data: { userId, submissionId } }).catch(() => {});
      upvoted = true;
    }

    // Recalculate upvote count accurately to prevent going out of sync
    const count = await prisma.upvote.count({
      where: { submissionId },
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: { upvoteCount: count },
    });

    return res.json({ upvoted });
  } catch (err) {
    console.error('Toggle upvote error:', err);
    res.status(500).json({ error: 'Failed to toggle upvote' });
  }
}

/**
 * POST /api/submissions/:id/bookmark — toggle bookmark
 */
export async function toggleBookmark(req, res) {
  try {
    const userId = req.user.id;
    const submissionId = req.params.id;

    const existing = await prisma.bookmark.findUnique({
      where: { userId_submissionId: { userId, submissionId } },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { userId_submissionId: { userId, submissionId } },
      });
      return res.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({ data: { userId, submissionId } });
      return res.json({ bookmarked: true });
    }
  } catch (err) {
    console.error('Toggle bookmark error:', err);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
}

/**
 * GET /api/submissions/pending — moderator queue
 */
export async function getPendingSubmissions(req, res) {
  try {
    const submissions = await prisma.submission.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, zenithId: true, batchYear: true, branch: true } },
        rounds: {
          orderBy: { orderIndex: 'asc' },
          include: { roundTags: { include: { tag: true } } },
        },
      },
    });

    const result = submissions.map(s => ({
      ...s,
      rounds: s.rounds.map(r => ({
        ...r,
        tags: r.roundTags.map(rt => rt.tag.name),
        roundTags: undefined,
      })),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get pending error:', err);
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
}

/**
 * GET /api/submissions/mine — current user's submissions
 */
export async function getMySubmissions(req, res) {
  try {
    const userId = req.user.id;

    const submissions = await prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, logoUrl: true, industry: true } },
        rounds: {
          orderBy: { orderIndex: 'asc' },
          include: { roundTags: { include: { tag: true } } },
        },
      },
    });

    const result = submissions.map(s => ({
      ...s,
      rounds: s.rounds.map(r => ({
        ...r,
        tags: r.roundTags.map(rt => rt.tag.name),
        roundTags: undefined,
      })),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get my submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch your submissions' });
  }
}

/**
 * DELETE /api/submissions/:id
 * Owner can delete their own submission
 */
export async function deleteSubmission(req, res) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own submissions' });
    }

    await prisma.submission.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Submission deleted successfully' });
  } catch (err) {
    console.error('Delete submission error:', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
}
