from rest_framework.test import APITestCase
from .models import User

REG = "/api/auth/register/"
LOGIN = "/api/auth/login/"
ME = "/api/auth/me/"
PW = "Str0ng!Pass#99"


class AuthTests(APITestCase):
    def register(self, email="a@b.com"):
        return self.client.post(REG, {"email": email, "password": PW, "full_name": "Hari"})

    def login(self, email="a@b.com"):
        return self.client.post(LOGIN, {"email": email, "password": PW})

    def test_register_creates_student_with_profile(self):
        r = self.register()
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email="a@b.com")
        self.assertEqual(u.role, "student")
        self.assertEqual(u.profile.full_name, "Hari")

    def test_cannot_self_assign_admin(self):
        self.client.post(REG, {"email": "x@y.com", "password": PW, "role": "admin"})
        self.assertEqual(User.objects.get(email="x@y.com").role, "student")

    def test_login_and_me(self):
        self.register()
        tok = self.login().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        r = self.client.get(ME)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["email"], "a@b.com")

    def test_update_profile(self):
        self.register()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.login().data['access']}")
        r = self.client.patch(ME, {"profile": {"monthly_income": "5000.00"}}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["profile"]["monthly_income"], "5000.00")

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get(ME).status_code, 401)

    def test_refresh(self):
        self.register()
        response = self.login()
        self.assertIn("refresh", response.data)
        self.assertIn("access", response.data)
        # Can also refresh via body
        r2 = self.client.post("/api/auth/refresh/", {"refresh": response.data["refresh"]})
        self.assertEqual(r2.status_code, 200)
        self.assertIn("access", r2.data)

    def test_weak_password_rejected(self):
        r = self.client.post(REG, {"email": "w@w.com", "password": "123"})
        self.assertEqual(r.status_code, 400)

    def test_send_and_verify_email_otp(self):
        self.register("verify@student.com")
        user = User.objects.get(email="verify@student.com")
        self.assertFalse(user.is_email_verified)

        # 1. Request OTP
        res = self.client.post("/api/auth/send-verification-otp/", {"email": "verify@student.com"})
        self.assertEqual(res.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.email_verification_code)

        # 2. Verify with wrong code
        fail_res = self.client.post("/api/auth/verify-email-otp/", {"email": "verify@student.com", "code": "000000"})
        self.assertEqual(fail_res.status_code, 400)

        # 3. Verify with valid code
        ok_res = self.client.post("/api/auth/verify-email-otp/", {"email": "verify@student.com", "code": user.email_verification_code})
        self.assertEqual(ok_res.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)
        self.assertEqual(user.email_verification_code, "")

    def test_password_reset_flow(self):
        self.register("reset@student.com")
        user = User.objects.get(email="reset@student.com")

        # 1. Request password reset
        req_res = self.client.post("/api/auth/password-reset/request-otp/", {"email": "reset@student.com"})
        self.assertEqual(req_res.status_code, 200)
        user.refresh_from_db()
        otp = user.password_reset_code
        self.assertTrue(otp)

        # 2. Reset with new password
        new_pw = "BrandNew#SecurePass2026!"
        verify_res = self.client.post("/api/auth/password-reset/verify-otp/", {
            "email": "reset@student.com",
            "code": otp,
            "new_password": new_pw,
        })
        self.assertEqual(verify_res.status_code, 200)

        # 3. Verify login works with new password
        login_res = self.client.post(LOGIN, {"email": "reset@student.com", "password": new_pw})
        self.assertEqual(login_res.status_code, 200)

