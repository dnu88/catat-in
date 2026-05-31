# Deployment & Vercel Setup — Kaswise

**Last updated:** 2026-05-10  
**Status:** ✅ Production ready — Google login working

## Live URLs

- **Production:** https://kaswise.vercel.app
- **Preview:** https://kaswise-*.vercel.app (auto-generated per commit)
- **GitHub:** https://github.com/dnu88/catat-in

## Environment Variables (Vercel)

### Firebase Frontend (Required for Google login)
| Variable | Value (masked) | Environment |
|----------|----------------|-------------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCvkor7gjuVhzJgPbqZoRTKJgEg2gY8PNQ` | Production |
| `VITE_FIREBASE_AUTH_DOMAIN` | `catat-in-69ca6.firebaseapp.com` | Production |
| `VITE_FIREBASE_PROJECT_ID` | `catat-in-69ca6` | Production |
| `VITE_FIREBASE_STORAGE_BUCKET` | `catat-in-69ca6.firebasestorage.app` | Production |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `762871694317` | Production |
| `VITE_FIREBASE_APP_ID` | `1:762871694317:web:18f423edaaf6c6496c1de4` | Production |

**Note:** These are VITE_ prefixed variables — visible in client-side bundle. This is expected for Firebase frontend SDK.

## Firebase Console Configuration

### Authentication
- **Sign-in method:** Google → Enabled
- **Authorized domains:**
  - `kaswise.vercel.app`
  - `kaswise-*.vercel.app` (preview deployments)
  - `localhost` (development)

### Project
- **Project ID:** `catat-in-69ca6`
- **Location:** Default (US)

## Vercel Project Configuration

### Services (Monorepo)
```json
{
  "experimentalServices": {
    "web": {
      "entrypoint": "apps/web",
      "routePrefix": "/",
      "framework": "vite"
    },
    "backend": {
      "entrypoint": "backend",
      "routePrefix": "/_/backend"
    }
  }
}
```

### Build Commands
- **Root:** `pnpm run build` (via workspace filter)
- **Web:** `tsc && vite build`
- **Backend:** Python 3.12 + uv (auto-detected)

## Deployment History

### 2026-05-10 — Fix Google Login
- **Issue:** "The requested action is invalid." error
- **Root cause:** Firebase env vars empty in Vercel Production environment
- **Fix:**
  1. Pull correct values from `apps/web/.env`
  2. Update Vercel env vars via CLI:
     ```bash
     npx vercel env rm VITE_FIREBASE_API_KEY production --yes
     npx vercel env add VITE_FIREBASE_API_KEY production --value "AIzaSyCvkor7gjuVhzJgPbqZoRTKJgEg2gY8PNQ" --yes
     # ... repeat for all 6 Firebase variables
     ```
  3. Force redeploy with fresh build cache
  4. Verify Firebase Console authorized domains include `kaswise.vercel.app`
- **Result:** ✅ Google login functional

### 2026-05-10 — Initial Vercel Setup
- **Issue:** Deployment failing due to output directory mismatch
- **Fix:**
  1. Link project: `npx vercel link --yes`
  2. Configure monorepo services in `vercel.json`
  3. Deploy: `npx vercel deploy --prod --yes`
- **Result:** ✅ App live at `https://kaswise.vercel.app`

## Commands Reference

### Deploy to Production
```bash
npx vercel deploy --prod --yes
```

### Force Fresh Build (No Cache)
```bash
npx vercel deploy --prod --yes --force
```

### Check Environment Variables
```bash
npx vercel env ls
```

### Pull Env Vars Locally
```bash
npx vercel env pull .env.production.local --environment production
```

### View Deployment Logs
```bash
npx vercel logs https://kaswise.vercel.app
```

## Troubleshooting

### Google Login Fails
1. Check Firebase Console → Authentication → Sign-in method → Google is enabled
2. Verify `kaswise.vercel.app` is in Authorized domains
3. Check env vars are populated in Vercel:
   ```bash
   npx vercel env pull .env.production.local --environment production
   grep VITE_FIREBASE_ .env.production.local
   ```
4. Force redeploy with fresh build cache

### Build Fails
1. Check monorepo structure — Vercel expects `apps/web` as web service entrypoint
2. Verify `vercel.json` has correct `experimentalServices` config
3. Check for missing dependencies in `package.json`

### Preview Deployments Not Working
Preview deployments use `preview` environment. Ensure Firebase env vars are also set for `preview` environment in Vercel Dashboard.

## Next Steps

1. **Add custom domain** (optional) via Vercel Dashboard → Domains
2. **Set up preview environment variables** for branch deployments
3. **Configure monitoring** (Vercel Analytics, error tracking)
4. **Backend deployment** — currently configured but not active; requires Python dependencies in `backend/requirements.txt`

---

**Maintained by:** Claude Code  
**Last verified:** 2026-05-10 — Google login working, deployment healthy