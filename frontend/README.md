# GameSurge Frontend

GameSurge is a React + Vite dashboard for tracking cross-store game prices, surfacing surge alerts, and comparing deals.

## Requirements

- Node.js 20+
- Backend API running locally (default: `http://localhost:8080`)

## Setup

1. Install dependencies:
   - `npm install`
2. Create an environment file:
   - `.env.local`
   - Add `VITE_API_BASE_URL=http://localhost:8080` (or your API URL)
3. Start dev server:
   - `npm run dev`

## Scripts

- `npm run dev` - Run Vite dev server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint checks

## Key Pages

- `/` - Storefront with featured game, surge sections, and search palette
- `/game/:id` - Game detail page with charts, price comparison, and system requirements

## Notes

- The frontend polls market status every 30 seconds.
- API base URL is configured through `VITE_API_BASE_URL`.
