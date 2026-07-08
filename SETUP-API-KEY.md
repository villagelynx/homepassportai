# API key setup (HomePassportAI)

Two ways to enable AI photo analysis:

## Option A — Settings on your phone (BYOK)

1. Open **https://homepassportai.com** (or local dev server)
2. Tap **⚙ Settings**
3. Paste your OpenAI API key → **Save**

## Option B — Server key (local Mac or Netlify)

1. Copy `.env.example` to `.env`
2. Set `OPENAI_API_KEY=sk-...`
3. Local: restart `./serve.sh`
4. Netlify: add `OPENAI_API_KEY` in site environment variables → redeploy

```bash
cd ~/Documents/homepassport-ai
cp .env.example .env
# edit .env, then:
./serve.sh
```

Never commit `.env` or put API keys in the browser source code.
