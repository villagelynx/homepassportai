# HomePassportAI

**Phase A** — mobile-first web app to scan home appliances, save model numbers, and build your home inventory.

**Website:** [homepassportai.com](https://homepassportai.com)

## Run locally

```bash
cd ~/Documents/homepassport-ai
cp .env.example .env   # add your OPENAI_API_KEY and Supabase keys
node scripts/build-config.mjs
./serve.sh
```

Open **http://localhost:8080** on your Mac or **http://YOUR_MAC_IP:8080** on your phone (same Wi‑Fi).

> Use **http://** not `https://`. Keep Terminal open while testing.

### Enable AI

1. Create an API key at [platform.openai.com](https://platform.openai.com/api-keys)
2. Add to `.env` or **Settings (⚙)** in the app (BYOK)
3. Restart `./serve.sh`
4. Check **http://localhost:8080/api/health**

## What works now

- **3-step scan:** appliance → label → optional receipt
- **AI extraction** (OpenAI Vision + BYOK)
- **Cloud sync** (Supabase auth + storage)
- **Room categories**, manuals, local repair search, repair company notes
- **Netlify deploy** + custom domain

## Deploy (Netlify + Supabase)

See **[DEPLOY.md](./DEPLOY.md)** for full setup.

## Project layout

```
homepassport-ai/
  index.html
  css/app.css
  js/
  netlify/functions/
  supabase/schema.sql
  scripts/build-config.mjs
```

## License

Private — add a license when you’re ready to share.
