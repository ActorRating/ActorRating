# Development Mode - Bypass Authentication

To test the dashboard locally without authentication, you can enable development mode.

## Setup

1. Create or update your `.env.local` file in the root directory:

```bash
# Add this line to enable dev mode
NEXT_PUBLIC_DEV_MODE=true
```

2. Restart your development server:

```bash
npm run dev
```

3. Now you can access `/dashboard` and other protected routes without signing in!

## Important Notes

⚠️ **WARNING**: 
- This only works in `development` mode (`NODE_ENV=development`)
- Never commit `.env.local` with `NEXT_PUBLIC_DEV_MODE=true` to git
- This feature is automatically disabled in production builds
- The `.env.local` file is already in `.gitignore` so it won't be committed

## How It Works

- The middleware bypasses authentication checks when `NEXT_PUBLIC_DEV_MODE=true`
- The SessionProvider returns a mock user session in dev mode
- All protected routes become accessible without real authentication

## Disabling Dev Mode

Simply remove the line or set it to `false`:

```bash
NEXT_PUBLIC_DEV_MODE=false
```

Then restart your dev server.
