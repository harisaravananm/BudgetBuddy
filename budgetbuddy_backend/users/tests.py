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
        ref = self.login().data["refresh"]
        self.assertEqual(self.client.post("/api/auth/refresh/", {"refresh": ref}).status_code, 200)

    def test_weak_password_rejected(self):
        r = self.client.post(REG, {"email": "w@w.com", "password": "123"})
        self.assertEqual(r.status_code, 400)
