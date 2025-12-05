# Deploying Next.js 15 to GitHub Pages

This guide documents the complete workflow for deploying a Next.js 15 application to GitHub Pages. Use this as a recipe for similar projects.

## Prerequisites

- Next.js 15.x project
- GitHub repository
- Node.js 20+

## Step 1: Configure Next.js for Static Export

Edit `next.config.ts` to enable static export with the correct base path:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',           // Enable static HTML export
  distDir: 'docs',            // Output to docs/ for GitHub Pages
  basePath: '/your-repo-name', // Must match your GitHub repo name
  assetPrefix: '/your-repo-name/', // Prefix for all assets
  
  // Optional: if you have build errors you want to bypass
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
```

### Key Configuration Options

| Option | Purpose |
|--------|---------|
| `output: 'export'` | Generates static HTML/CSS/JS instead of requiring a Node server |
| `distDir: 'docs'` | Outputs to `docs/` folder (GitHub Pages can serve from this) |
| `basePath` | URL path prefix (required when not serving from root domain) |
| `assetPrefix` | Ensures JS/CSS/images load from correct path |

## Step 2: Update package.json Scripts

The `next export` command is deprecated in Next.js 15. Use this instead:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "export": "next build",
    "start": "next start"
  }
}
```

The `output: 'export'` config option replaces the old `next export` command.

## Step 3: Add .nojekyll File

**Critical:** GitHub Pages uses Jekyll by default, which ignores folders starting with `_` (like `_next/`). Create an empty `.nojekyll` file in your output directory:

```bash
touch docs/.nojekyll
```

Or add it to your build script:

```json
{
  "scripts": {
    "export": "next build && touch docs/.nojekyll"
  }
}
```

## Step 4: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run export
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./docs
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Action Versions (as of December 2024)

Use these versions to avoid deprecation errors:

| Action | Version |
|--------|---------|
| `actions/checkout` | v4 |
| `actions/setup-node` | v4 |
| `actions/upload-pages-artifact` | **v3** (v2 uses deprecated artifact actions) |
| `actions/deploy-pages` | **v4** (v2 uses deprecated artifact actions) |

## Step 5: Configure GitHub Repository

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**

## Step 6: Build and Deploy

```bash
# Build locally to generate docs/ folder
npm run export

# Commit everything including docs/
git add -A
git commit -m "Deploy to GitHub Pages"
git push
```

The GitHub Actions workflow will automatically deploy on push to `main`.

## Troubleshooting

### 404 Errors for Assets (`_next/static/...`)

**Cause:** Jekyll is processing the output and ignoring `_next/` folder.

**Fix:** Ensure `.nojekyll` file exists in `docs/` folder.

### Assets Loading from Wrong Path

**Cause:** Missing or incorrect `basePath`/`assetPrefix`.

**Fix:** Both must match your repository name:
```typescript
basePath: '/repo-name',
assetPrefix: '/repo-name/',
```

### "Unknown option -o" Error

**Cause:** Using deprecated `next export -o docs` syntax.

**Fix:** Remove the command; use `output: 'export'` and `distDir` in config instead.

### Deprecated Artifact Actions Error

**Cause:** Using `actions/upload-pages-artifact@v2` which depends on deprecated `actions/upload-artifact@v3`.

**Fix:** Upgrade to `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`.

### Page Shows "Loading..." Forever

**Cause:** Client-side JavaScript not loading (404 errors in console).

**Fix:** Check browser console for 404s, verify `basePath` and `.nojekyll` are correct.

## Full Example Files

### next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'docs',
  basePath: '/causal-flow',
  assetPrefix: '/causal-flow/',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
```

### .gitignore (relevant sections)

```gitignore
# Next.js
/.next/

# Don't ignore docs/ - it's our GitHub Pages output
# /docs/

# Environment
.env*
```

## Verification

After deployment, verify with curl:

```bash
# Check main page
curl -s -o /dev/null -w "%{http_code}" https://username.github.io/repo-name/

# Check assets are accessible
curl -s -o /dev/null -w "%{http_code}" https://username.github.io/repo-name/_next/static/css/[hash].css
```

Both should return `200`.

## Summary Checklist

- [ ] `next.config.ts` has `output: 'export'`
- [ ] `next.config.ts` has `distDir: 'docs'`
- [ ] `next.config.ts` has correct `basePath` and `assetPrefix`
- [ ] `package.json` uses `next build` (not `next export`)
- [ ] `docs/.nojekyll` file exists
- [ ] GitHub Actions uses `upload-pages-artifact@v3` and `deploy-pages@v4`
- [ ] GitHub Pages source is set to "GitHub Actions"
- [ ] `docs/` folder is committed to git
