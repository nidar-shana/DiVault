# DiVault

DiVault is a digital vault for organizing and previewing your favorite media across reading, YouTube, Spotify, Pinterest, and Instagram.
And saving the boards and pins under categories.

## Overview

DiVault combines a React-based frontend with a lightweight Express backend to support OAuth connectors and media import/export flows.

Key features:
- Personal profile and virtual assistant chatbot experience
- Library view for saved media items from multiple sources
- Browse and preview mode for YouTube, Spotify, Pinterest, and Instagram content
- OAuth-powered sign-in and permission flows for Google, YouTube, and Spotify
- Import favorites via URL or auto-generated placeholder content
- Export your vault data as a JSON file
- Persistent local storage support for user session and saved items

## Project structure

- `src/App.tsx` — main React UI and app logic
- `src/main.tsx` — application entry point
- `src/styles.css` — global styling
- `server.js` — Express backend for OAuth token exchange
- `index.html` — Vite HTML template
- `package.json` — project metadata, dependencies, and scripts
- `tsconfig.json`, `tsconfig.node.json` — TypeScript configuration
- `.env` — environment variables for OAuth credentials (not included in repo)

## Tech stack

- React 18
- TypeScript
- Vite
- Express
- OAuth integration with Google, YouTube, and Spotify
- Local storage persistence in the browser

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` in the project root and fill in the provider credentials:

```bash
cp .env.example .env

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_YOUTUBE_CLIENT_ID=your-google-client-id
VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id
```

The `VITE_*` values are public OAuth client IDs used to start the browser redirect. The non-`VITE_` secrets are used only by the Express backend and must not be exposed in frontend code.

3. Restart the development server after changing `.env`; Vite only loads environment variables at startup.

4. For the real OAuth flow, register redirect URIs for your app as:

```text
http://localhost:5173/?service=google
http://localhost:5173/?service=youtube
http://localhost:5173/?service=spotify
```

## Development

Run the frontend and backend together:

```bash
npm run dev
```

This starts Vite and the Express server concurrently.

## Build

Create a production build:

```bash
npm run build
```

## Preview

Preview the production build locally:

```bash
npm run preview
```

## Usage

- Open the app in the browser.
- Sign in with Google or complete the onboarding form.
- Use the Library tab to review saved items and preview them in the Browse tab.
- Use the Chat tab to ask the assistant for import guidance or add items.
- Connect YouTube and Spotify to import playlists and media.
- Export your vault to a JSON file using the export button.

## Notes

- DiVault stores session data in browser local storage under `divault-vault`.
- The OAuth backend runs on the same port as the development server by default.
- YouTube and Spotify imports require valid API credentials and permission grants.
