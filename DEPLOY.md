# Deploy HomePassportAI (Netlify + Supabase)

Production site: **https://homepassportai.com**

## Overview

| Piece | Role |
|--------|------|
| **Netlify** | Hosts the site at `homepassportai.com` + `/api/analyze` |
| **Supabase** | Sign-in, Postgres inventory, private photo storage |
| **OpenAI** | Photo analysis (BYOK in Settings or Netlify env var) |

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Note your **Project URL** and **anon public** key (Settings → API)

### Run the database schema

1. Supabase dashboard → **SQL Editor** → **New query**
2. Paste the contents of `supabase/schema.sql` and **Run**

### Auth settings (recommended for testing)

1. **Authentication** → **Providers** → Email → enable
2. Optionally turn **off** “Confirm email” for easier testing

---

## 2. Push code to GitHub

```bash
cd ~/Documents/homepassport-ai
git add .
git commit -m "HomePassportAI — Netlify + Supabase"
git push -u origin main
```

---

## 3. Deploy on Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Select your `homepassport-ai` repo
3. Build settings (from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `.`
4. **Environment variables:**

| Variable | Value |
|----------|--------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | your anon key |
| `OPENAI_API_KEY` | *(optional)* server fallback for AI |

5. **Deploy site**

---

## 4. Custom domain (homepassportai.com)

1. Netlify → your site → **Domain management** → **Add a domain**
2. Enter `homepassportai.com` (and `www.homepassportai.com` if you use www)
3. At your domain registrar, set DNS per Netlify’s instructions:
   - **Apex** (`homepassportai.com`): Netlify load balancer IP, **or** ALIAS/ANAME if supported
   - **www**: CNAME to `your-site.netlify.app`
4. Enable **HTTPS** (Netlify provisions Let’s Encrypt automatically)
5. Set **Primary domain** to `homepassportai.com`

---

## 5. Test

1. Open **https://homepassportai.com** on your phone
2. Sign in or create an account
3. Scan an appliance — verify it appears on another device
4. Health check: `https://homepassportai.com/api/health`

---

## Local dev with Supabase

```bash
cd ~/Documents/homepassport-ai
# .env: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY
node scripts/build-config.mjs
./serve.sh
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Domain not loading | Wait for DNS (up to 48h); verify registrar records |
| Sign-in fails | Check Supabase auth settings / email confirmation |
| Demo mode on analyze | Add OpenAI key in ⚙ Settings or `OPENAI_API_KEY` on Netlify |
| Sync empty | Confirm `SUPABASE_URL` + `SUPABASE_ANON_KEY` on Netlify, redeploy |
