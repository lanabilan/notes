# ReadTheKey

![](./public/template.png)

Mobile-first web app for practicing staff-note → piano key reading. Built on Astro, React, Supabase, and Cloudflare Workers.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

Auth users live in `auth.users`; signed-in app data lives in `public.profiles` via `supabase/migrations/`.

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

### Email confirmation in local development

By default Supabase requires email confirmation before a user can sign in. To skip this during local development:

1. Open the Supabase dashboard for your project
2. Go to **Authentication → Email → Confirm email**
3. Toggle it **off**

Users can then sign in immediately after sign-up without clicking a confirmation link.

### Auth routes

Google is the product sign-in path. Email/password remains available as a local/dev fallback.

| Route                    | Description                                                                 |
| ------------------------ | --------------------------------------------------------------------------- |
| `/auth/signin`           | Google CTA (primary) plus email/password form                               |
| `POST /api/auth/oauth`   | Starts Google PKCE; redirects to Google                                     |
| `GET /api/auth/callback` | Exchanges the OAuth code for a session; redirects to `/`                    |
| `/auth/signup`           | Email/password sign-up form                                                 |
| `/auth/confirm-email`    | Post-signup "check your inbox" page                                         |
| `/dashboard`             | Example protected page (redirects to `/auth/signin` if unauthenticated)     |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

### Google sign-in setup

1. Create a Google Cloud OAuth **web** client.
2. Authorized JavaScript origins: the app origin (for local, `http://localhost:4321` and `http://127.0.0.1:4321`).
3. Authorized redirect URI is **Supabase Auth's** callback, not the Astro route:
   - Local: `http://127.0.0.1:54321/auth/v1/callback`
   - Hosted: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Put the client id and secret in:
   - Local: gitignored `supabase/.env` as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, then `npx supabase stop && npx supabase start`
   - Hosted: Dashboard → Authentication → Providers → Google
5. Hosted redirect allow-list must include the production origin and `https://<production-origin>/api/auth/callback`. `supabase/config.toml` only covers the local CLI.

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/).

1. Build the project:

```bash
npm run build
```

2. Deploy with Wrangler:

```bash
npx wrangler deploy
```

Set `SUPABASE_URL` and `SUPABASE_KEY` as secrets in your Cloudflare dashboard or via `npx wrangler secret put`.

## CI

GitHub Actions runs lint + build on every push and PR to `main`. Pushes to `main` also deploy to Cloudflare Workers after a green build.

Configure these repository secrets in GitHub:

| Secret | Used for |
| --- | --- |
| `SUPABASE_URL` | Build (Astro env validation) |
| `SUPABASE_KEY` | Build (Astro env validation) |
| `CLOUDFLARE_API_TOKEN` | Deploy (`wrangler deploy`) |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy (`wrangler deploy`) |

Create a Cloudflare API token with **Workers Scripts: Edit** permission for the `readthekey` worker. Runtime Supabase credentials on the worker are separate — set them with `npx wrangler secret put` or in the Cloudflare dashboard.

## License

MIT
