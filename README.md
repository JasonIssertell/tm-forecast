# TM FOREcast ⛳

Internal prediction market platform for TaylorMade Golf. Employees bet on business outcomes using fake money, with collective wisdom surfacing probability estimates.

## Features

- **Binary Markets**: Yes/No questions with automated market maker pricing
- **Real-time Odds**: Prices adjust as bets come in
- **Leaderboard**: Top 3 win prizes
- **Portfolio Tracking**: See your positions and P&L
- **Admin Tools**: Create and resolve markets

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Charts**: Recharts
- **Hosting**: Vercel

## Local Development

```bash
npm install
npm run dev
```

## Deployment

This app is configured for one-click deployment to Vercel:

1. Push to GitHub
2. Connect repo to Vercel
3. Deploy

## Environment

Supabase credentials are embedded in `/src/lib/supabase.js`. For production, consider using environment variables.

## Admin Access

The first user to register with `Jason.Issertell@taylormadegolf.com` is automatically granted admin privileges.
