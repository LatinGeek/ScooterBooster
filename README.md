# ScooterBooster

**Potenciá tu scooter eléctrico** — Platform connecting electric scooter owners with technicians in Uruguay.

## Overview

ScooterBooster is a marketplace where scooter owners can find verified technicians for:
- Speed limit removal (private property use only)
- Firmware updates
- Cruise control activation
- General maintenance

**Domain:** scooterbooster.uy
**Market:** Uruguay (Spanish-language UI)

## Tech Stack

- **Framework:** Next.js 16+ (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui + Lucide icons
- **Database:** Firebase Firestore
- **Auth:** Firebase Auth (Google SSO)
- **Payments:** MercadoPago (payment link generation)
- **Chat:** WhatsApp via wa.me links
- **Deployment:** Vercel + Firebase

## Getting Started

```bash
# Install dependencies
npm install

# Copy env vars and fill in your credentials
cp .env.example .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/            # Next.js App Router pages and API routes
├── components/     # React components (shadcn/ui + custom)
├── hooks/          # Custom React hooks (auth, Firestore)
├── lib/            # Firebase, MercadoPago, utilities
└── types/          # TypeScript interfaces

knowledge-base/     # RAG knowledge base for the Alan agent
design-system/      # UI/UX design system (MASTER.md)
```

## Scripts

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Agent

This project includes **Alan**, a Claude Code dev assistant agent defined in `CLAUDE.md`. Alan has full context about the platform architecture, services, and business logic via the RAG knowledge base in `/knowledge-base/`.
