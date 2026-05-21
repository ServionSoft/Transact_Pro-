# Render Web Service — environment variables

Use this on the **backend Web Service** (e.g. `transactpro.onrender.com`), not on the Postgres instance.

**Note:** `backend/.env.render` is **local only** (migrations/seeds from your PC). It does **not** configure the hosted API. Copy values into **Render Dashboard → Web Service → Environment**.

---

## Required (production)

| Key | Example / how to set |
|-----|----------------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | **Link from database** → Internal Database URL (`transactpro_db_gidr`) |
| `JWT_ACCESS_SECRET` | Long random string (not `change_me_*`) |
| `JWT_REFRESH_SECRET` | Long random string |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `7d` |
| `PUBLIC_API_URL` | `https://transactpro.onrender.com` |
| `PUBLIC_APP_URL` | Your frontend URL (Vercel), e.g. `https://your-app.vercel.app` |
| `CORS_ORIGINS` | Same frontend URL(s), comma-separated, exact match (no trailing slash). **Each Vercel preview URL is different** — add every URL you use, or use production only. |
| `UPLOAD_DIR` | `./uploads` (add a **Render Disk** mounted if you need persistent files) |
| `CRM_VAULT_PROJECT_ID` | `1` |
| `CRM_VAULT_SLUG` | `crm-doc-vault` |

---

## Do not set on Render (local / seed only)

| Key | Reason |
|-----|--------|
| `ADMIN_SEED_*` | Only for `npm run db:seed:admin-user` on your machine |
| `LIBREOFFICE_BIN` | Windows path; not available on Render Linux |
| Contents of `backend/.env.render` | Local migrate override only |

---

## Optional (when you use the feature)

DocuSign, Google OAuth, `DOCUSIGN_CONNECT_HMAC_KEY`, etc. — see `backend/.env.example`.

---

## Frontend (Vercel / static host)

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://transactpro.onrender.com` |

Redeploy frontend after changing.

---

## Verify

| Check | URL / action |
|-------|----------------|
| API + DB | `GET https://transactpro.onrender.com/health` → `"database":"up"` |
| Root | `GET https://transactpro.onrender.com/` → `Cannot GET /` is **normal** (API has no homepage) |
| Login | **POST** from frontend only — opening `/api/auth/login` in the browser (GET) will show `Cannot GET /api/auth/login` |

---

## Login test (PowerShell, after `\q` from psql)

```powershell
curl -X POST https://transactpro.onrender.com/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"admin@transactpro.local\",\"password\":\"YOUR_ADMIN_PASSWORD\"}"
```

Expect JSON with `accessToken`, not `Cannot GET`.
