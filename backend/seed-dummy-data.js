import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('No users found.');
    return;
  }

  // Tags
  const tagNames = ['React', 'Node.js', 'System Design', 'Algorithms', 'Data Structures', 'SQL', 'AWS'];
  const tags = [];
  for (const name of tagNames) {
    let tag = await prisma.tag.findUnique({ where: { name } });
    if (!tag) tag = await prisma.tag.create({ data: { name } });
    tags.push(tag);
  }

  const companyNames = ['Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys'];
  const companies = [];
  for (const name of companyNames) {
    let company = await prisma.company.findUnique({ where: { name } });
    if (!company) company = await prisma.company.create({ data: { name, industry: 'Tech' } });
    companies.push(company);
  }

  const roles = ['Software Engineer', 'Frontend Developer', 'Backend Developer'];

  let created = 0;
  for (const user of users) {
    for (let i = 0; i < 5; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const role = roles[Math.floor(Math.random() * roles.length)];
      
      const sub = await prisma.submission.create({
        data: {
          userId: user.id,
          companyId: company.id,
          roleApplied: role,
          interviewDate: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
          ctc: '15 LPA',
          status: 'approved',
          overallTips: 'Practice hard.',
          rounds: {
            create: [
              {
                roundType: 'Technical',
                questions: 'Explain event loop.\nReverse a linked list.',
                difficulty: 'medium',
                orderIndex: 1
              }
            ]
          }
        },
        include: { rounds: true }
      });

      // Link random tags
      const round = sub.rounds[0];
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      await prisma.roundTag.create({
        data: {
          roundId: round.id,
          tagId: randomTag.id
        }
      });
      created++;
    }
  }
  console.log(`Created ${created} submissions with tags.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
