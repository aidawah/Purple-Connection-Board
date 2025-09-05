# Purple Connection Board

A collaborative puzzle solving platform built with SvelteKit.

## Prerequisites

- Node.js 18+
- npm/pnpm
- Git

## Getting Started

1. Clone the repository:
```sh
git clone https://github.com/aidawah/Purple-Connection-Board.git
cd Purple-Connection-Board
```

2. Install dependencies:
```sh
pnpm install
```

## Development Server

Start the dev server with hot reload:
```sh
pnpm run dev

# Open in browser automatically
pnpm run dev -- --open
```

## Building for Production

Create optimized production build:
```sh
pnpm run build
```

Preview production build locally:
```sh
pnpm run preview
```

## Deployment

1. Install required adapter for your hosting platform:
```sh
pnpm add -D @sveltejs/adapter-vercel  # For Vercel
# or
pnpm add -D @sveltejs/adapter-netlify # For Netlify
```

2. Update svelte.config.js:
```js
import adapter from '@sveltejs/adapter-vercel';
// or
import adapter from '@sveltejs/adapter-netlify';
```

3. Deploy using your platform's CLI:
```sh
vercel deploy  # For Vercel
netlify deploy # For Netlify
```

## Environment Variables

Create `.env` file with:
```env
PUBLIC_API_URL=http://localhost:3000
```

## Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request
