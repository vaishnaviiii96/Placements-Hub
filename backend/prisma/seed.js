import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.roundTag.deleteMany();
  await prisma.round.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.upvote.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.report.deleteMany();
  await prisma.searchLog.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.company.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  // ─── Tags ────────────────────────────────────────
  const tagNames = ['DSA', 'DBMS', 'OOPs', 'OS', 'CN', 'Aptitude', 'HR', 'System Design', 'React', 'Java', 'Python', 'SQL', 'Machine Learning'];
  const tags = {};
  for (const name of tagNames) {
    const tag = await prisma.tag.create({ data: { name } });
    tags[name] = tag;
  }
  console.log(`  ✅ Created ${tagNames.length} tags`);

  // ─── Companies ───────────────────────────────────
  const companyData = [
    { name: 'TCS', industry: 'IT Services', logoUrl: 'https://logo.clearbit.com/tcs.com' },
    { name: 'Infosys', industry: 'IT Services', logoUrl: 'https://logo.clearbit.com/infosys.com' },
    { name: 'Amazon', industry: 'E-commerce / Cloud', logoUrl: 'https://logo.clearbit.com/amazon.com' },
    { name: 'Microsoft', industry: 'Software', logoUrl: 'https://logo.clearbit.com/microsoft.com' },
    { name: 'Deloitte', industry: 'Consulting', logoUrl: 'https://logo.clearbit.com/deloitte.com' },
    { name: 'Cognizant', industry: 'IT Services', logoUrl: 'https://logo.clearbit.com/cognizant.com' },
    { name: 'Wipro', industry: 'IT Services', logoUrl: 'https://logo.clearbit.com/wipro.com' },
    { name: 'Google', industry: 'Technology', logoUrl: 'https://logo.clearbit.com/google.com' },
    { name: 'Accenture', industry: 'Consulting', logoUrl: 'https://logo.clearbit.com/accenture.com' },
    { name: 'Capgemini', industry: 'IT Services', logoUrl: 'https://logo.clearbit.com/capgemini.com' },
  ];
  const companies = {};
  for (const c of companyData) {
    const company = await prisma.company.create({ data: c });
    companies[c.name] = company;
  }
  console.log(`  ✅ Created ${companyData.length} companies`);

  // ─── Users (5 student accounts) ───────────────────
  const password = await bcrypt.hash('password123', 12);
  const users = await Promise.all([
    prisma.user.create({ data: { zenithId: 'student1', name: 'Rahul Sharma', email: 'student1@zenith.in', password, role: 'student', branch: 'CSE', batchYear: 2025 } }),
    prisma.user.create({ data: { zenithId: 'student2', name: 'Priya Reddy', email: 'student2@zenith.in', password, role: 'student', branch: 'ECE', batchYear: 2025 } }),
    prisma.user.create({ data: { zenithId: 'student3', name: 'Karthik Nair', email: 'student3@zenith.in', password, role: 'student', branch: 'IT', batchYear: 2026 } }),
    prisma.user.create({ data: { zenithId: 'student4', name: 'Sneha Gupta', email: 'student4@zenith.in', password, role: 'student', branch: 'MECH', batchYear: 2025 } }),
    prisma.user.create({ data: { zenithId: 'student5', name: 'Arjun Das', email: 'student5@zenith.in', password, role: 'student', branch: 'CSE', batchYear: 2025 } }),
  ]);
  console.log(`  ✅ Created ${users.length} users`);

  // ─── Submissions + Rounds + RoundTags ────────────
  const submissionsData = [
    // Student 1 — Rahul Sharma (2 experiences)
    {
      userId: users[0].id, companyId: companies['Amazon'].id, roleApplied: 'SDE-1',
      interviewDate: new Date('2026-03-15'), ctc: '44 LPA', status: 'approved',
      overallTips: 'Focus heavily on dynamic programming and graphs. Communication during the interview is key — always explain your thought process before writing code. Practice at least 200 LeetCode problems.',
      isAnonymous: false, upvoteCount: 34, viewCount: 280,
      rounds: [
        { roundType: 'OA', difficulty: 'medium', orderIndex: 1, questions: "Given an array, find the maximum sum of a contiguous subarray (Kadane's Algorithm).\nTwo sum problem but with a twist — find triplets.", tags: ['DSA', 'Aptitude'] },
        { roundType: 'Technical', difficulty: 'hard', orderIndex: 2, questions: "Design a URL shortener service.\nGiven a binary tree, find the maximum path sum.\nExplain how HashMap works internally in Java.", tags: ['System Design', 'DSA', 'Java'] },
        { roundType: 'HR', difficulty: 'easy', orderIndex: 3, questions: "Why Amazon?\nTell me about a time you failed and what you learned.\nWhere do you see yourself in 5 years?", tags: ['HR'] },
      ]
    },
    {
      userId: users[0].id, companyId: companies['Google'].id, roleApplied: 'SWE L3',
      interviewDate: new Date('2026-05-10'), ctc: '55 LPA', status: 'approved',
      overallTips: 'Google interviews are very structured. Expect 2-3 coding rounds. Focus on optimal solutions — brute force won\'t cut it. System design round is about scalability.',
      isAnonymous: false, upvoteCount: 52, viewCount: 410,
      rounds: [
        { roundType: 'OA', difficulty: 'hard', orderIndex: 1, questions: "Design an algorithm to detect cycles in a directed graph.\nFind the median of two sorted arrays.\nImplement a min-stack with O(1) operations.", tags: ['DSA'] },
        { roundType: 'Technical', difficulty: 'hard', orderIndex: 2, questions: "Design Google Maps routing system.\nHow would you scale a notification service to billions of users?\nExplain consistent hashing.", tags: ['System Design'] },
        { roundType: 'HR', difficulty: 'medium', orderIndex: 3, questions: "Tell me about a time you had to make a difficult technical decision.\nHow do you approach learning a new technology?", tags: ['HR'] },
      ]
    },

    // Student 2 — Priya Reddy (2 experiences)
    {
      userId: users[1].id, companyId: companies['Microsoft'].id, roleApplied: 'SDE Intern',
      interviewDate: new Date('2026-02-20'), ctc: '35 LPA', status: 'approved',
      overallTips: 'Microsoft focuses heavily on problem-solving and system design. Be ready to code on a whiteboard. They value clean code and good communication.',
      isAnonymous: false, upvoteCount: 41, viewCount: 350,
      rounds: [
        { roundType: 'OA', difficulty: 'medium', orderIndex: 1, questions: "Find the longest palindromic substring.\nImplement a LRU cache.", tags: ['DSA'] },
        { roundType: 'Technical', difficulty: 'hard', orderIndex: 2, questions: "Design a chat messaging system like Teams.\nExplain CAP theorem.\nImplement a trie data structure.", tags: ['System Design', 'DSA'] },
        { roundType: 'Technical', difficulty: 'medium', orderIndex: 3, questions: "Explain the difference between process and thread.\nWhat is virtual memory?\nDescribe deadlock and how to prevent it.", tags: ['OS'] },
        { roundType: 'HR', difficulty: 'easy', orderIndex: 4, questions: "Tell me about your most challenging project.\nHow do you handle disagreements in a team?", tags: ['HR'] },
      ]
    },
    {
      userId: users[1].id, companyId: companies['Wipro'].id, roleApplied: 'Project Engineer',
      interviewDate: new Date('2026-04-18'), ctc: '5.5 LPA', status: 'approved',
      overallTips: 'Wipro interview is straightforward. Be confident and clear in communication. Basic technical knowledge is sufficient.',
      isAnonymous: false, upvoteCount: 6, viewCount: 48,
      rounds: [
        { roundType: 'Technical', difficulty: 'easy', orderIndex: 1, questions: "What is polymorphism?\nExplain the OSI model layers.\nWrite a program to check if a number is prime.", tags: ['OOPs', 'CN', 'DSA'] },
        { roundType: 'HR', difficulty: 'easy', orderIndex: 2, questions: "Why do you want to join Wipro?\nTell me about your final year project.\nAre you comfortable working in shifts?", tags: ['HR'] },
      ]
    },

    // Student 3 — Karthik Nair (2 experiences)
    {
      userId: users[2].id, companyId: companies['TCS'].id, roleApplied: 'Digital',
      interviewDate: new Date('2026-01-12'), ctc: '7 LPA', status: 'approved',
      overallTips: 'Make sure your fundamental concepts in OOPs and DBMS are strong. They drill down on your resume projects. Be thorough with SQL queries.',
      isAnonymous: false, upvoteCount: 15, viewCount: 130,
      rounds: [
        { roundType: 'Technical', difficulty: 'medium', orderIndex: 1, questions: "Difference between abstract class and interface.\nExplain normalization in DBMS.\nWrite a SQL query to find the second highest salary.\nWhat are the four pillars of OOPs?", tags: ['OOPs', 'DBMS', 'SQL'] },
      ]
    },
    {
      userId: users[2].id, companyId: companies['Cognizant'].id, roleApplied: 'GenC Elevate',
      interviewDate: new Date('2026-03-28'), ctc: '6.5 LPA', status: 'approved',
      overallTips: 'Cognizant GenC Elevate is relatively easier. Focus on basic DSA and OOPs. Communication skills matter a lot in the HR round.',
      isAnonymous: false, upvoteCount: 9, viewCount: 72,
      rounds: [
        { roundType: 'OA', difficulty: 'easy', orderIndex: 1, questions: "Basic coding questions — reverse string, fibonacci.\nAptitude questions on percentages and ratios.\nLogical reasoning puzzles.", tags: ['DSA', 'Aptitude'] },
        { roundType: 'Technical', difficulty: 'easy', orderIndex: 2, questions: "What are the four pillars of OOPs?\nExplain inheritance with an example.\nDifference between SQL and NoSQL.", tags: ['OOPs', 'DBMS'] },
        { roundType: 'HR', difficulty: 'easy', orderIndex: 3, questions: "Tell me about yourself.\nWhat are your strengths and weaknesses?\nAre you a team player?", tags: ['HR'] },
      ]
    },

    // Student 4 — Sneha Gupta (2 experiences)
    {
      userId: users[3].id, companyId: companies['Deloitte'].id, roleApplied: 'Analyst',
      interviewDate: new Date('2026-02-10'), ctc: '8 LPA', status: 'approved',
      overallTips: 'Strong aptitude skills are essential. Practice quantitative aptitude and verbal reasoning. Resume projects matter a lot.',
      isAnonymous: false, upvoteCount: 11, viewCount: 90,
      rounds: [
        { roundType: 'OA', difficulty: 'easy', orderIndex: 1, questions: "Quantitative aptitude questions (time and work, probability).\nLogical reasoning patterns.\nVerbal ability passage comprehension.", tags: ['Aptitude'] },
        { roundType: 'Technical', difficulty: 'medium', orderIndex: 2, questions: "Explain normalization in DBMS.\nDifference between TCP and UDP.\nWhat is DHCP?", tags: ['DBMS', 'CN'] },
        { roundType: 'HR', difficulty: 'easy', orderIndex: 3, questions: "Tell me about yourself.\nWhy Deloitte?\nAre you comfortable with relocation?", tags: ['HR'] },
      ]
    },
    {
      userId: users[3].id, companyId: companies['Accenture'].id, roleApplied: 'ASE',
      interviewDate: new Date('2026-04-05'), ctc: '4.5 LPA', status: 'approved',
      overallTips: 'Accenture ASE role focuses on communication and aptitude. Technical questions are basic. Prepare well for the communication assessment.',
      isAnonymous: false, upvoteCount: 4, viewCount: 55,
      rounds: [
        { roundType: 'OA', difficulty: 'easy', orderIndex: 1, questions: "Cognitive and technical assessment.\nEmail writing and communication test.\nBasic coding — sorting algorithms.", tags: ['Aptitude', 'DSA'] },
        { roundType: 'HR', difficulty: 'easy', orderIndex: 2, questions: "Tell me about yourself.\nWhat do you know about Accenture?\nWhere do you see yourself in 5 years?", tags: ['HR'] },
      ]
    },

    // Student 5 — Arjun Das (2 experiences)
    {
      userId: users[4].id, companyId: companies['Infosys'].id, roleApplied: 'Power Programmer',
      interviewDate: new Date('2026-03-05'), ctc: '9.5 LPA', status: 'approved',
      overallTips: 'Infosys Power Programmer role has a tough OA. Focus on competitive programming. Practice graph algorithms and DP thoroughly.',
      isAnonymous: false, upvoteCount: 28, viewCount: 195,
      rounds: [
        { roundType: 'OA', difficulty: 'hard', orderIndex: 1, questions: "Implement Dijkstra's shortest path algorithm.\nFind the number of islands in a 2D grid.\nSolve a knapsack problem variant.", tags: ['DSA'] },
        { roundType: 'Technical', difficulty: 'medium', orderIndex: 2, questions: "Explain OOPs concepts with examples.\nWhat is multithreading?\nDifference between stack and heap memory.", tags: ['OOPs', 'OS', 'Java'] },
      ]
    },
    {
      userId: users[4].id, companyId: companies['Capgemini'].id, roleApplied: 'Analyst',
      interviewDate: new Date('2026-05-22'), ctc: '5 LPA', status: 'approved',
      overallTips: 'Capgemini has a pseudo-code based OA. Practice pseudo-code questions. Game-based aptitude round is unique — stay calm.',
      isAnonymous: false, upvoteCount: 7, viewCount: 60,
      rounds: [
        { roundType: 'OA', difficulty: 'medium', orderIndex: 1, questions: "Pseudo-code based MCQs.\nGame-based aptitude assessment.\nEnglish communication test.", tags: ['Aptitude'] },
        { roundType: 'Technical', difficulty: 'easy', orderIndex: 2, questions: "What is SDLC?\nExplain different types of testing.\nDifference between stack and queue.", tags: ['DSA'] },
        { roundType: 'HR', difficulty: 'easy', orderIndex: 3, questions: "Why Capgemini?\nAre you willing to relocate?\nTell me about a team project you worked on.", tags: ['HR'] },
      ]
    },
  ];

  for (const sub of submissionsData) {
    const { rounds: roundsData, ...submissionFields } = sub;
    const submission = await prisma.submission.create({
      data: submissionFields,
    });

    for (const round of roundsData) {
      const { tags: tagNames, ...roundFields } = round;
      const createdRound = await prisma.round.create({
        data: { ...roundFields, submissionId: submission.id },
      });

      for (const tagName of tagNames) {
        if (tags[tagName]) {
          await prisma.roundTag.create({
            data: { roundId: createdRound.id, tagId: tags[tagName].id },
          });
        }
      }
    }
  }
  console.log(`  ✅ Created ${submissionsData.length} submissions with rounds`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
