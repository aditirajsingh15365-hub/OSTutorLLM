# Deployment

Frontend on **Vercel**, backend on **Render**.

## Backend (Render)

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables (Environment tab):

| Name | Value |
| --- | --- |
| `GEMINI_API_KEY` | your key (never commit it) |
| `LLM_MODE` | `gemini` |
| `GEMINI_MODEL` | a model ID your key can use (`python -m scripts.list_models`) |
| `GEMINI_FALLBACK_MODEL` | optional; used for one response when `GEMINI_MODEL` returns 503 (default `gemini-3.5-flash-lite`, empty disables it) |
| `CORS_ORIGINS` | your Vercel URL(s), comma-separated, no trailing slash, e.g. `https://your-app.vercel.app` |
| `CORS_ORIGIN_REGEX` | optional, for Vercel preview URLs, e.g. `https://your-project-.*\.vercel\.app` |

Backend URL: `https://ostutorllm.onrender.com/api` (health check: `/api/health`).
The free tier sleeps when idle; the frontend pings `/api/health` on load to wake it.

## Frontend (Vercel)

- Root directory: `frontend`, framework preset: Vite
- Build command: `npm run build`, output directory: `dist`
- `VITE_API_URL` is optional. Without it, production builds call
  `https://ostutorllm.onrender.com/api` and `npm run dev` calls `http://127.0.0.1:8000/api`.
  It is read at build time, so redeploy after changing it.

## After changing CORS or env vars

Render redeploys when you save environment variables. If the browser console shows a
CORS error, the Vercel origin is missing from `CORS_ORIGINS` (it must match exactly:
scheme + domain, no trailing slash).
