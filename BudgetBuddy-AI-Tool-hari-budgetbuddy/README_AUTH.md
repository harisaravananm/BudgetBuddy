# Authentication setup
1. Copy `budgetbuddy_backend/.env.example` to `.env` and `frontend/.env.example` to `frontend/.env`.
2. Google Cloud Console: create an OAuth client of type **Web application**.
3. Add `http://127.0.0.1:5173/auth/callback/google` as a Google redirect URI.
4. Also add `http://localhost:5173/auth/callback/google` if you use `localhost`.
5. GitHub: Settings > Developer settings > OAuth Apps > New OAuth App.
6. Set its callback URL to `http://127.0.0.1:5173/auth/callback/github`.
7. Fill the Google/GitHub client IDs and secrets in the backend and Google/GitHub client IDs in the frontend.
8. Use the same host (`127.0.0.1` or `localhost`) in the browser, `FRONTEND_URL`, and provider settings.
9. Run `python manage.py migrate && python manage.py seed_demo` from `budgetbuddy_backend`.
10. Run `npm run dev` from `frontend`.
