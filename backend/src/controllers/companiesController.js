import prisma from '../lib/prisma.js';

/**
 * GET /api/companies
 */
export async function listCompanies(req, res) {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            submissions: {
              where: { status: 'approved' },
            },
          },
        },
      },
    });

    const result = companies.map(c => ({
      id: c.id,
      name: c.name,
      logoUrl: c.logoUrl,
      industry: c.industry,
      submissionCount: c._count.submissions,
    }));

    res.json(result);
  } catch (err) {
    console.error('List companies error:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
}

/**
 * GET /api/companies/:id
 */
export async function getCompany(req, res) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            submissions: {
              where: { status: 'approved' },
            },
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({
      ...company,
      submissionCount: company._count.submissions,
      _count: undefined,
    });
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
}
