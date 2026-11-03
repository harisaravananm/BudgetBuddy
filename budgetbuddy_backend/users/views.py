import json
import secrets
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User
from .serializers import AdminUserSerializer, MeSerializer, RegisterSerializer

REFRESH_COOKIE = "budgetbuddy_refresh"


def _set_refresh_cookie(response, token):
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="Lax",
        path="/api/auth/",
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth/")


class AuthThrottle(ScopedRateThrottle):
    scope = "auth"


class LoginThrottle(ScopedRateThrottle):
    scope = "auth_login"


class OAuthThrottle(ScopedRateThrottle):
    scope = "auth_oauth"


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_register"

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user = User.objects.get(pk=response.data["id"])
        refresh = RefreshToken.for_user(user)
        response.data = {"access": str(refresh.access_token), "user": MeSerializer(user).data}
        _set_refresh_cookie(response, str(refresh))
        return response


class LoginSerializer(TokenObtainPairSerializer):
    username_field = "email"


class LoginView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = LoginSerializer
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh = serializer.validated_data["refresh"]
        response = Response({"access": serializer.validated_data["access"]})
        _set_refresh_cookie(response, refresh)
        return response


class RefreshView(TokenRefreshView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get("refresh"):
            data["refresh"] = request.COOKIES.get(REFRESH_COOKIE)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        response_data = {"access": serializer.validated_data["access"]}
        replacement = serializer.validated_data.get("refresh")
        response = Response(response_data)
        if replacement:
            _set_refresh_cookie(response, replacement)
        return response


class LogoutView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        token = request.data.get("refresh") or request.COOKIES.get(REFRESH_COOKIE)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        if token:
            try:
                RefreshToken(token).blacklist()
            except TokenError:
                pass
        _clear_refresh_cookie(response)
        return response


def _oauth_request(url, method="GET", data=None, headers=None):
    body = urlencode(data).encode() if data else None
    request = Request(url, data=body, headers=headers or {}, method=method)
    try:
        with urlopen(request, timeout=10) as result:
            return json.loads(result.read().decode())
    except (HTTPError, URLError, ValueError) as exc:
        raise ValueError("OAuth provider request failed") from exc


def _google_identity(code, redirect_uri):
    token = _oauth_request(
        "https://oauth2.googleapis.com/token",
        method="POST",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
    )
    if not token.get("access_token"):
        raise ValueError("Google authorization code was rejected")
    identity = _oauth_request(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {token['access_token']}"},
    )
    if not identity.get("email") or not identity.get("email_verified", False):
        raise ValueError("Google did not provide a verified email")
    return identity["email"], identity.get("name", ""), identity.get("picture", "")


def _github_identity(code, redirect_uri):
    token = _oauth_request(
        "https://github.com/login/oauth/access_token",
        method="POST",
        data={
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        headers={"Accept": "application/json"},
    )
    access_token = token.get("access_token")
    if not access_token:
        raise ValueError("GitHub authorization code was rejected")
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    profile = _oauth_request("https://api.github.com/user", headers=headers)
    emails = _oauth_request("https://api.github.com/user/emails", headers=headers)
    verified = [item for item in emails if item.get("verified")]
    primary = next((item for item in verified if item.get("primary")), None)
    email = (primary or (verified[0] if verified else {})).get("email")
    if not email:
        raise ValueError("GitHub account has no verified email address")
    return email, profile.get("name") or profile.get("login", ""), profile.get("avatar_url", "")


class OAuthExchangeView(APIView):
    provider = ""
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_oauth"

    def post(self, request):
        provider = str(request.data.get("provider", "")).lower() or getattr(self, "provider", "")
        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri", "")
        if provider not in {"google", "github"} or not code:
            return Response({"detail": "provider and code are required"}, status=400)
        try:
            identity = _google_identity(code, redirect_uri) if provider == "google" else _github_identity(code, redirect_uri)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        email, name, avatar = identity
        email = email.strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            user = User.objects.create_user(
                email=email,
                password=secrets.token_urlsafe(32),
                auth_provider=provider,
                avatar_url=avatar or "",
            )
        else:
            user.auth_provider = provider
            if avatar:
                user.avatar_url = avatar
            user.save(update_fields=["auth_provider", "avatar_url"])
        if name and not user.profile.full_name:
            user.profile.full_name = name
            user.profile.save(update_fields=["full_name"])

        refresh = RefreshToken.for_user(user)
        response = Response({
            "access": str(refresh.access_token),
            "user": MeSerializer(user).data,
        })
        _set_refresh_cookie(response, str(refresh))
        return response


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class UpgradeRoleView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        target_role = request.data.get("role", User.Role.PREMIUM)
        if target_role not in [User.Role.STUDENT, User.Role.PREMIUM, User.Role.ADMIN]:
            return Response({"error": "Invalid role specified."}, status=400)
        user = request.user
        user.role = target_role
        user.save(update_fields=["role"])
        return Response(MeSerializer(user).data)


class AdminUsersView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if request.user.role != User.Role.ADMIN and not request.user.is_staff:
            return Response({"error": "Admin privileges required to view system administration."}, status=403)
        users = User.objects.annotate(
            incomes_count=Count("incomes", distinct=True),
            expenses_count=Count("expenses", distinct=True),
            goals_count=Count("goals", distinct=True),
        ).order_by("-date_joined")
        return Response({
            "metrics": {
                "total_users": users.count(),
                "student_users": users.filter(role=User.Role.STUDENT).count(),
                "premium_users": users.filter(role=User.Role.PREMIUM).count(),
                "admin_users": users.filter(role=User.Role.ADMIN).count(),
            },
            "users": AdminUserSerializer(users, many=True).data,
        })
