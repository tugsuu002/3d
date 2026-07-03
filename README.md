# MATCHDAY — 3D Player Cards

React + Vite + three.js landing page. Hero and player-grid cards render
interactive 3D `.glb` models (Messi, Ronaldo, Neymar) loaded from
`public/models/`.

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview   # optional, preview the production build locally
```

## Deploy to Vercel

**Option A — Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel        # first deploy, follow the prompts
vercel --prod # promote to production
```

**Option B — GitHub + Vercel dashboard**

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "MATCHDAY landing"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to https://vercel.com/new, import the repo.
3. Vercel auto-detects Vite — leave the defaults:
   - Build command: `vite build`
   - Output directory: `dist`
4. Click **Deploy**.

No environment variables are required; the `.glb` files are static assets
served from `public/models/` and ship as part of the build.

## Notes

- The three `.glb` models are already optimized (simplified geometry +
  1024px WebP textures) so total asset weight is a few MB, not 30–60MB.
- Click any player card to swap the hero viewer's model.
- Drag the hero model to rotate it, scroll to zoom.
