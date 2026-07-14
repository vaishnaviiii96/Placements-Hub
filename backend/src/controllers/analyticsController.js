import prisma from '../lib/prisma.js';

// ─── Helper: Build user filter for branch/batchYear ───────────────────

function buildUserFilter(branch, batchYear) {
  const filter = {};
  if (branch) filter.branch = { equals: branch, mode: 'insensitive' };
  if (batchYear) filter.batchYear = parseInt(batchYear, 10);
  return Object.keys(filter).length > 0 ? { user: filter } : {};
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC ANALYTICS (all authenticated users)
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/topic-heatmap?branch=&batch_year=
 * Returns [{ company_name, tag_name, count }]
 */
export async function topicHeatmap(req, res) {
  try {
    const { branch, batch_year } = req.query;
    const userFilter = buildUserFilter(branch, batch_year);

    const results = await prisma.roundTag.findMany({
      where: {
        round: {
          submission: {
            status: 'approved',
            ...userFilter,
          },
        },
      },
      select: {
        tag: { select: { name: true } },
        round: {
          select: {
            submission: {
              select: {
                company: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Aggregate: company_name x tag_name -> count
    const map = new Map();
    for (const r of results) {
      const companyName = r.round.submission.company.name;
      const tagName = r.tag.name;
      const key = `${companyName}|||${tagName}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const data = Array.from(map.entries()).map(([key, count]) => {
      const [company_name, tag_name] = key.split('|||');
      return { company_name, tag_name, count };
    });

    res.json(data);
  } catch (err) {
    console.error('Topic heatmap error:', err);
    res.status(500).json({ error: 'Failed to generate topic heatmap' });
  }
}

/**
 * GET /api/analytics/topic-frequency?branch=&batch_year=
 * Returns [{ tag_name, count }] sorted desc
 */
export async function topicFrequency(req, res) {
  try {
    const { branch, batch_year } = req.query;
    const userFilter = buildUserFilter(branch, batch_year);

    const results = await prisma.roundTag.groupBy({
      by: ['tagId'],
      where: {
        round: {
          submission: {
            status: 'approved',
            ...userFilter,
          },
        },
      },
      _count: { tagId: true },
      orderBy: { _count: { tagId: 'desc' } },
    });

    // Resolve tag names
    const tagIds = results.map(r => r.tagId);
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true },
    });
    const tagMap = new Map(tags.map(t => [t.id, t.name]));

    const data = results.map(r => ({
      tag_name: tagMap.get(r.tagId) || 'Unknown',
      count: r._count.tagId,
    }));

    res.json(data);
  } catch (err) {
    console.error('Topic frequency error:', err);
    res.status(500).json({ error: 'Failed to generate topic frequency' });
  }
}

/**
 * GET /api/analytics/topic-trends?months=12&branch=&batch_year=
 * Returns [{ month (YYYY-MM), tag_name, count }]
 */
export async function topicTrends(req, res) {
  try {
    const { months = 12, branch, batch_year } = req.query;
    const userFilter = buildUserFilter(branch, batch_year);

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(months, 10));

    const results = await prisma.roundTag.findMany({
      where: {
        round: {
          submission: {
            status: 'approved',
            interviewDate: { gte: cutoff },
            ...userFilter,
          },
        },
      },
      select: {
        tag: { select: { name: true } },
        round: {
          select: {
            submission: {
              select: { interviewDate: true },
            },
          },
        },
      },
    });

    // Aggregate by month + tag
    const map = new Map();
    for (const r of results) {
      const date = r.round.submission.interviewDate;
      if (!date) continue;
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const key = `${month}|||${r.tag.name}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const data = Array.from(map.entries())
      .map(([key, count]) => {
        const [month, tag_name] = key.split('|||');
        return { month, tag_name, count };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json(data);
  } catch (err) {
    console.error('Topic trends error:', err);
    res.status(500).json({ error: 'Failed to generate topic trends' });
  }
}

/**
 * GET /api/analytics/company-timeline
 * Returns [{ company_name, month, submission_count }]
 */
export async function companyTimeline(req, res) {
  try {
    const submissions = await prisma.submission.findMany({
      where: {
        status: 'approved',
        interviewDate: { not: null },
      },
      select: {
        interviewDate: true,
        company: { select: { name: true } },
      },
    });

    const map = new Map();
    for (const s of submissions) {
      const date = s.interviewDate;
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const key = `${s.company.name}|||${month}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const data = Array.from(map.entries())
      .map(([key, count]) => {
        const [company_name, month] = key.split('|||');
        return { company_name, month, submission_count: count };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json(data);
  } catch (err) {
    console.error('Company timeline error:', err);
    res.status(500).json({ error: 'Failed to generate company timeline' });
  }
}

/**
 * GET /api/analytics/difficulty-distribution?branch=&batch_year=
 * Returns [{ company_name, easy_count, medium_count, hard_count }]
 */
export async function difficultyDistribution(req, res) {
  try {
    const { branch, batch_year } = req.query;
    const userFilter = buildUserFilter(branch, batch_year);

    const rounds = await prisma.round.findMany({
      where: {
        submission: {
          status: 'approved',
          ...userFilter,
        },
      },
      select: {
        difficulty: true,
        submission: {
          select: {
            company: { select: { name: true } },
          },
        },
      },
    });

    const map = new Map();
    for (const r of rounds) {
      const company = r.submission.company.name;
      if (!map.has(company)) {
        map.set(company, { easy_count: 0, medium_count: 0, hard_count: 0 });
      }
      const entry = map.get(company);
      if (r.difficulty === 'easy') entry.easy_count++;
      else if (r.difficulty === 'medium') entry.medium_count++;
      else if (r.difficulty === 'hard') entry.hard_count++;
    }

    const data = Array.from(map.entries()).map(([company_name, counts]) => ({
      company_name,
      ...counts,
    }));

    res.json(data);
  } catch (err) {
    console.error('Difficulty distribution error:', err);
    res.status(500).json({ error: 'Failed to generate difficulty distribution' });
  }
}

/**
 * GET /api/analytics/top-questions?limit=15
 * Returns [{ question, count, companies[] }]
 */
export async function topQuestions(req, res) {
  try {
    const limit = parseInt(req.query.limit || '15', 10);

    const rounds = await prisma.round.findMany({
      where: {
        submission: { status: 'approved' },
      },
      select: {
        questions: true,
        submission: {
          select: {
            company: { select: { name: true } },
          },
        },
      },
    });

    // Split questions by newline, trim, lowercase, and count
    const questionMap = new Map(); // question -> { count, companies: Set }
    for (const r of rounds) {
      const companyName = r.submission.company.name;
      const lines = r.questions.split('\n');
      for (let line of lines) {
        line = line.trim();
        // Remove leading numbering like "1. ", "2) ", etc.
        line = line.replace(/^\d+[\.\)]\s*/, '');
        if (!line || line.length < 5) continue;

        const key = line.toLowerCase();
        if (!questionMap.has(key)) {
          questionMap.set(key, { original: line, count: 0, companies: new Set() });
        }
        const entry = questionMap.get(key);
        entry.count++;
        entry.companies.add(companyName);
      }
    }

    const data = Array.from(questionMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(q => ({
        question: q.original,
        count: q.count,
        companies: Array.from(q.companies),
      }));

    res.json(data);
  } catch (err) {
    console.error('Top questions error:', err);
    res.status(500).json({ error: 'Failed to generate top questions' });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MODERATOR-ONLY ANALYTICS
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/search-gaps
 * Top 20 most searched queries with 0 results
 */
export async function searchGaps(req, res) {
  try {
    const results = await prisma.searchLog.groupBy({
      by: ['query'],
      where: { resultCount: 0 },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 20,
    });

    const data = results.map((r, i) => ({
      rank: i + 1,
      query: r.query,
      search_count: r._count.query,
    }));

    res.json(data);
  } catch (err) {
    console.error('Search gaps error:', err);
    res.status(500).json({ error: 'Failed to generate search gaps' });
  }
}

/**
 * GET /api/analytics/submission-pipeline
 * Returns [{ week, pending, approved, rejected }] for last 12 weeks
 */
export async function submissionPipeline(req, res) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84); // 12 weeks

    const submissions = await prisma.submission.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { createdAt: true, status: true },
    });

    // Group by ISO week
    const weekMap = new Map();
    for (const s of submissions) {
      const d = new Date(s.createdAt);
      // Get ISO week
      const year = d.getFullYear();
      const oneJan = new Date(year, 0, 1);
      const weekNum = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
      const week = `${year}-W${String(weekNum).padStart(2, '0')}`;

      if (!weekMap.has(week)) {
        weekMap.set(week, { pending: 0, approved: 0, rejected: 0 });
      }
      weekMap.get(week)[s.status]++;
    }

    const data = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, counts]) => ({ week, ...counts }));

    res.json(data);
  } catch (err) {
    console.error('Submission pipeline error:', err);
    res.status(500).json({ error: 'Failed to generate submission pipeline' });
  }
}

/**
 * GET /api/analytics/contributor-leaderboard
 * Top 10 users by approved submission count
 */
export async function contributorLeaderboard(req, res) {
  try {
    const results = await prisma.submission.groupBy({
      by: ['userId'],
      where: {
        status: 'approved',
        userId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const userIds = results.map(r => r.userId).filter(Boolean);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    // Check which submissions are anonymous
    const anonCheck = await prisma.submission.findMany({
      where: {
        userId: { in: userIds },
        status: 'approved',
        isAnonymous: true,
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    const anonUserIds = new Set(anonCheck.map(a => a.userId));

    const data = results.map((r, i) => ({
      rank: i + 1,
      user_id: r.userId,
      name: anonUserIds.has(r.userId) ? 'Anonymous Contributor' : (userMap.get(r.userId) || 'Unknown'),
      approved_count: r._count.id,
    }));

    res.json(data);
  } catch (err) {
    console.error('Contributor leaderboard error:', err);
    res.status(500).json({ error: 'Failed to generate leaderboard' });
  }
}

/**
 * GET /api/analytics/weekly-active-users
 * Returns [{ week, unique_user_count }] for last 12 weeks
 */
export async function weeklyActiveUsers(req, res) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84); // 12 weeks

    const sessions = await prisma.userSession.findMany({
      where: { loggedInAt: { gte: cutoff } },
      select: { userId: true, loggedInAt: true },
    });

    const weekMap = new Map();
    for (const s of sessions) {
      const d = new Date(s.loggedInAt);
      const year = d.getFullYear();
      const oneJan = new Date(year, 0, 1);
      const weekNum = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
      const week = `${year}-W${String(weekNum).padStart(2, '0')}`;

      if (!weekMap.has(week)) weekMap.set(week, new Set());
      weekMap.get(week).add(s.userId);
    }

    const data = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, users]) => ({
        week,
        unique_user_count: users.size,
      }));

    res.json(data);
  } catch (err) {
    console.error('Weekly active users error:', err);
    res.status(500).json({ error: 'Failed to generate WAU data' });
  }
}
