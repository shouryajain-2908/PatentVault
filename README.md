# PatentScope AI — Intelligent Patent Analytics Platform

A production-ready single-page application for patent portfolio analysis with 3D visualization, an AI chatbot, authentication, and onboarding.

## Features

### Authentication
- Email/password sign-up and sign-in via Supabase Auth
- Protected routes — unauthenticated users are redirected to login
- User profiles with role-based access (analyst/admin)
- Session persistence across page reloads

### Dashboard
- Portfolio overview with stat cards (total, granted, pending, average citations)
- Sortable, searchable, filterable patent data table
- Expandable rows with full patent details
- Status badges (granted, pending, rejected)
- Similarity score visual bars

### 3D Patent Visualization
- Interactive Three.js scene with D3.js force simulation
- Three graph layouts:
  - **Force Graph** — physics-based clustering showing patent relationships
  - **Timeline** — chronological layout by filing date
  - **Radial** — category-based clusters arranged radially
- Click any node for a full patent detail modal
- Hover tooltips with key stats
- Color-coded by technology category
- Node size proportional to citation count
- Connection lines showing patent relationships
- Auto-rotation with smooth animations

### AI Chatbot
- Context-aware responses about your patent portfolio
- Conversation history saved to the database per user
- Multiple conversations with create/delete
- Suggested questions for quick start
- Typing indicator and smooth message animations
- Deployed as a Supabase Edge Function for server-side processing

### Onboarding Tour
- 5-step interactive tour on first visit
- Highlights key navigation elements
- Progress bar and step indicators
- Replays automatically for new users
- Skippable at any time

### Design
- Dark theme with sky/cyan accent colors
- Fully responsive (mobile, tablet, desktop)
- Smooth animations and micro-interactions
- Custom scrollbars
- Glassmorphism effects
- Consistent 8px spacing system

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **3D Graphics:** Three.js
- **Data Visualization:** D3.js
- **Icons:** Lucide React
- **Routing:** React Router v7
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Database:** PostgreSQL with Row Level Security

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx           — Sidebar nav + mobile header
│   ├── ProtectedRoute.tsx   — Auth guard for protected pages
│   └── OnboardingTour.tsx   — First-visit guided tour
├── context/
│   └── AuthContext.tsx      — Supabase auth provider + hooks
├── lib/
│   ├── supabase.ts          — Supabase client + TypeScript types
│   └── mockPatentData.ts    — 12 sample patents + suggested questions
├── pages/
│   ├── Login.tsx            — Sign in / sign up
│   ├── Dashboard.tsx        — Patent portfolio table + stats
│   ├── Visualization.tsx    — 3D Three.js + D3 visualization
│   └── Chatbot.tsx          — AI chat with conversation history
├── App.tsx                  — Router + providers
├── main.tsx                 — Entry point
└── index.css                — Tailwind + custom styles

supabase/
├── config.toml              — Edge function config
└── functions/
    └── chatbot/
        └── index.ts         — AI chatbot edge function
```

## Database Schema

- `user_profiles` — extends auth.users with display name and role
- `patents` — patent records with metadata, citations, similarity scores
- `chat_conversations` — chat conversation sessions per user
- `chat_messages` — individual messages within conversations

All tables have Row Level Security enabled with owner-scoped CRUD policies.

## Environment Variables

Supabase credentials are pre-configured. The app reads:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Getting Started

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`

## Sample Data

The app includes 12 mock patents across 8 technology categories (AI, Quantum, IoT, Blockchain, Telecom, Cryptography, Healthcare AI, Robotics) with realistic metadata, citation counts, similarity scores, and cross-references.
