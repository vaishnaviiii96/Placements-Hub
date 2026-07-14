# Placements

A full-stack placement preparation platform built for Zenith University students. Track your interview experiences, practice questions by topic, and analyze your preparation progress with rich analytics.

## Tech Stack

### Frontend
- **React 19** with Vite
- **Tailwind CSS 4** for styling
- **React Router** for navigation
- **TanStack React Query** for data fetching
- **Framer Motion** for animations
- **Recharts** for analytics charts
- **Lucide React** for icons

### Backend
- **Express 5** (Node.js)
- **Prisma ORM** with PostgreSQL
- **JWT** authentication (access + refresh tokens)
- **Redis** caching (optional — falls back to in-memory)
- **Helmet** & **Rate Limiting** for security

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional)

### Backend Setup
```bash
cd backend
cp .env.example .env    # edit with your credentials
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Project Structure
```
placements/
├── backend/          # Express API server
│   ├── prisma/       # Database schema & migrations
│   └── src/          # Routes, controllers, middleware
└── frontend/         # React SPA
    ├── public/       # Static assets
    └── src/          # Components, pages, hooks
```

## License
MIT
