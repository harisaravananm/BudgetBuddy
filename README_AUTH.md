# 🔐 BudgetBuddy Authentication & Notification Setup

This guide details how to configure **GitHub OAuth**, **Google OAuth**, and **EmailJS real-time email notifications** for local development and production deployment (Vercel & Render).

---

## 1. 🐙 GitHub OAuth Setup (Login with GitHub)

1. Go to **[GitHub Developer Settings > OAuth Apps](https://github.com/settings/developers)**.
2. Click **New OAuth App**.
3. Fill in the application details:
   - **Application name**: `BudgetBuddy`
   - **Homepage URL**:
     - Local: `http://127.0.0.1:5173` (or `http://localhost:5173`)
     - Production: `https://your-app.vercel.app`
   - **Authorization callback URL**:
     - Local: `http://127.0.0.1:5173/auth/callback/github`
     - Production: `https://your-app.vercel.app/auth/callback/github`
4. Click **Register application**.
5. Copy your **Client ID** and generate a new **Client Secret**.
6. Set these environment variables:
   - **Backend (`budgetbuddy_backend/.env` & Render environment)**:
     ```env
     GITHUB_CLIENT_ID=your_github_client_id
     GITHUB_CLIENT_SECRET=your_github_client_secret
     ```
   - **Frontend (`frontend/.env` & Vercel environment)**:
     ```env
     VITE_GITHUB_CLIENT_ID=your_github_client_id
     ```

---

## 2. 🌐 Google OAuth2 Setup (Login with Google)

1. Open the **[Google Cloud Console](https://console.cloud.google.com/)** and create/select a project.
2. Go to **APIs & Services > Credentials** and create an **OAuth 2.0 Client ID** of type **Web application**.
3. Add Authorized Redirect URIs:
   - `https://budget-buddy-kappa-ten.vercel.app/auth/callback/google`
   - `http://127.0.0.1:5173/auth/callback/google`
   - `http://localhost:5173/auth/callback/google`
4. Set credentials:
   - **Backend**: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - **Frontend**: `VITE_GOOGLE_CLIENT_ID`

---

## 3. ✉️ EmailJS Client-Side Notifications Setup

EmailJS enables instant email notifications directly from the browser (free tier: 200 emails/month) without needing a custom SMTP server.

1. Sign up for a free account at **[emailjs.com](https://www.emailjs.com/)**.
2. **Add an Email Service**:
   - Go to **Email Services** > **Add New Service** (e.g. Gmail, Outlook, or Personal Email).
   - Copy your **Service ID** (e.g. `service_xxxxxxx`).
3. **Create an Email Template**:
   - Go to **Email Templates** > **Create New Template**.
   - Set Subject: `{{subject}}`
   - In the Template Content, use any of these available template variables:
     - `{{to_name}}` — Recipient full name or username
     - `{{to_email}}` — Target email address
     - `{{subject}}` — Notification heading
     - `{{message}}` — Detailed alert description
     - `{{alert_type}}` — Alert category (e.g., Budget Exceeded, Large Expense)
     - `{{amount}}` — Currency amount (e.g., ₹5,000)
     - `{{category}}` — Expense category (e.g., Food, Travel)
     - `{{timestamp}}` — Indian Standard Time timestamp
     - `{{app_url}}` — Application web URL
   - Copy your **Template ID** (e.g. `template_xxxxxxx`).
4. **Get Public API Key**:
   - Go to **Account** > **API Keys** > copy your **Public Key** (e.g. `user_xxxxxxx` or public token).
5. **Configure Frontend**:
   - In `frontend/.env` (and Vercel Environment Variables):
     ```env
     VITE_EMAILJS_SERVICE_ID=your_service_id
     VITE_EMAILJS_TEMPLATE_ID=your_template_id
     VITE_EMAILJS_PUBLIC_KEY=your_public_key
     ```
6. **Verify in App**:
   - Go to **Settings > Email Notifications > Test EmailJS Alert** or use **Notifications Modal > Test EmailJS** to verify real-time email delivery.

---

## 4. 🚀 Local Startup Instructions

```bash
# 1. Backend setup
cd budgetbuddy_backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver

# 2. Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

Visit `http://127.0.0.1:5173` in your browser. Demo credentials are pre-seeded and accessible with one click!
