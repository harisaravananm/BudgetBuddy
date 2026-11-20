# BudgetBuddy frontend

## Development

Install Node.js 18 or newer, then run:

```bash
npm install
npm run dev
```

The app expects the Django API at `http://127.0.0.1:8000`. To use another API
host, copy `.env.example` to `.env` and set `VITE_API_URL`.

The current screen implements the Milestone 1 authentication flow:

- Register with email, password, and optional full name
- Log in with JWT
- Load the authenticated profile
- Update full name and monthly income
- Sign out and clear local tokens
