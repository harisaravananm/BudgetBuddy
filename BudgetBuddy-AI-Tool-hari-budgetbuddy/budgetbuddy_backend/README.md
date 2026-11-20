# BudgetBuddy Backend (M1)

```bash
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| /api/auth/register/ | POST | no | email, password, full_name |
| /api/auth/login/ | POST | no | returns access + refresh |
| /api/auth/refresh/ | POST | no | new access token |
| /api/auth/me/ | GET/PATCH | Bearer | user + profile |

The root URL `/` returns a small health response. Admin panel: `/admin/` — Tests: `python manage.py test`
