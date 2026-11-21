import json
import secrets
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenRefreshView

from notifications.email_service import (
    send_password_reset_otp_email,
    send_verification_otp_email,
    send_welcome_email,
)
from .models import User
from .serializers import AdminUserSerializer, MeSerializer, RegisterSerializer

REFRESH_COOKIE = "budgetbuddy_refresh"

def seed_new_user_starter_data(user):
    """Seed starter demo budgets, transactions, and savings goals for new users."""
    try:
        from finance.models import Category, Income, Expense, Budget, SavingsGoal
        from notifications.models import Notification
        from django.utils import timezone
        today = timezone.localdate()
        month = today.replace(day=1)

        Income.objects.create(
            user=user,
            source=Income.Source.POCKET_MONEY,
            amount=25000,
            date=today,
            note="Monthly starter allowance",
        )
        Budget.objects.create(
            user=user,
            month=month,
            category=Category.FOOD,
            limit_amount=6000,
            alert_threshold_percent=80,
        )
        Budget.objects.create(
            user=user,
            month=month,
            category=Category.TRANSPORT,
            limit_amount=2500,
            alert_threshold_percent=80,
        )
        Budget.objects.create(
            user=user,
            month=month,
            category=Category.BOOKS,
            limit_amount=2000,
            alert_threshold_percent=80,
        )
        Expense.objects.create(
            user=user,
            category=Category.FOOD,
            amount=1450,
            date=today,
            note="Campus cafeteria and groceries",
        )
        Expense.objects.create(
            user=user,
            category=Category.TRANSPORT,
            amount=420,
            date=today,
            note="Monthly metro card refill",
        )
        SavingsGoal.objects.create(
            user=user,
            name="Emergency Fund",
            target_amount=15000,
            saved_amount=5000,
            priority="high",
            icon="shield",
            deadline=today.replace(month=min(12, today.month + 3) if today.month <= 9 else 12),
        )
        Notification.objects.create(
            user=user,
            type=Notification.Type.SYSTEM,
            title="Welcome to BudgetBuddy!",
            message="Your account has been pre-configured with starter budgets and sample goals so you can explore all features.",
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Failed to seed new user starter data: %s", exc)



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
        seed_new_user_starter_data(user)
        try:
            send_welcome_email(user)
        except Exception:
            pass
        refresh = RefreshToken.for_user(user)
        response.data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": MeSerializer(user).data,
        }
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
        response = Response({
            "access": serializer.validated_data["access"],
            "refresh": refresh,
        })
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
        replacement = serializer.validated_data.get("refresh")
        response_data = {"access": serializer.validated_data["access"]}
        if replacement:
            response_data["refresh"] = replacement
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
    if not token or "error" in token:
        err_desc = token.get("error_description", token.get("error", "GitHub authorization rejected")) if token else "Empty response from GitHub"
        raise ValueError(f"GitHub OAuth error: {err_desc}")
    access_token = token.get("access_token")
    if not access_token:
        raise ValueError("GitHub authorization code was rejected. Please verify your GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET settings.")
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    profile = _oauth_request("https://api.github.com/user", headers=headers)
    email = profile.get("email")
    if not email:
        try:
            emails = _oauth_request("https://api.github.com/user/emails", headers=headers)
            if isinstance(emails, list):
                verified = [item for item in emails if item.get("verified")]
                primary = next((item for item in verified if item.get("primary")), None)
                email = (primary or (verified[0] if verified else {})).get("email")
        except Exception:
            pass
    if not email and profile.get("login"):
        email = f"{profile['login']}@users.noreply.github.com"
    if not email:
        raise ValueError("GitHub account has no email address. Please make an email address available in your GitHub settings.")
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
            seed_new_user_starter_data(user)
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
            "refresh": str(refresh),
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


class SendVerificationOTPView(APIView):
    """Generate and dispatch a 6-digit OTP code to verify the user's email address."""
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_login"

    def post(self, request):
        email = request.data.get("email") or (request.user.email if request.user.is_authenticated else None)
        if not email:
            return Response({"error": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        email = str(email).strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "Account not found for this email address."}, status=status.HTTP_404_NOT_FOUND)

        otp = str(secrets.randbelow(900000) + 100000)
        user.email_verification_code = otp
        user.email_verification_expires_at = timezone.now() + timedelta(minutes=10)
        user.save(update_fields=["email_verification_code", "email_verification_expires_at"])

        send_verification_otp_email(user, otp)
        return Response({
            "detail": f"A 6-digit verification code has been dispatched to {user.email}.",
            "email": user.email,
        })


class VerifyEmailOTPView(APIView):
    """Verify submitted 6-digit OTP code and mark the account email as verified."""
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_login"

    def post(self, request):
        code = str(request.data.get("code") or "").strip()
        email = request.data.get("email") or (request.user.email if request.user.is_authenticated else None)
        if not code:
            return Response({"error": "Verification code is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = None
        if email:
            user = User.objects.filter(email__iexact=str(email).strip().lower()).first()
        elif request.user.is_authenticated:
            user = request.user

        if not user:
            return Response({"error": "User account not found."}, status=status.HTTP_404_NOT_FOUND)

        if not user.email_verification_code or user.email_verification_code != code:
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        if user.email_verification_expires_at and timezone.now() > user.email_verification_expires_at:
            return Response({"error": "Verification code has expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_email_verified = True
        user.email_verification_code = ""
        user.email_verification_expires_at = None
        user.save(update_fields=["is_email_verified", "email_verification_code", "email_verification_expires_at"])

        return Response({
            "detail": "Email address verified successfully!",
            "is_email_verified": True,
        })


class PasswordResetRequestOTPView(APIView):
    """Send a 6-digit OTP to the user's email to initiate a password reset."""
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_login"

    def post(self, request):
        email = str(request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"error": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if user:
            otp = str(secrets.randbelow(900000) + 100000)
            user.password_reset_code = otp
            user.password_reset_expires_at = timezone.now() + timedelta(minutes=10)
            user.save(update_fields=["password_reset_code", "password_reset_expires_at"])
            send_password_reset_otp_email(user, otp)

        # Consistent response to prevent account enumeration
        return Response({
            "detail": "If an account matches that email, a 6-digit password reset code has been sent."
        })


class PasswordResetVerifyOTPView(APIView):
    """Validate 6-digit OTP and set a new password."""
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "auth_login"

    def post(self, request):
        email = str(request.data.get("email") or "").strip().lower()
        code = str(request.data.get("code") or "").strip()
        new_password = str(request.data.get("new_password") or "")

        if not email or not code or not new_password:
            return Response({"error": "Email, verification code, and new password are all required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user or not user.password_reset_code or user.password_reset_code != code:
            return Response({"error": "Invalid reset code or email address."}, status=status.HTTP_400_BAD_REQUEST)

        if user.password_reset_expires_at and timezone.now() > user.password_reset_expires_at:
            return Response({"error": "Password reset code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            return Response({"error": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.password_reset_code = ""
        user.password_reset_expires_at = None
        user.save(update_fields=["password", "password_reset_code", "password_reset_expires_at"])

        return Response({
            "detail": "Password has been successfully updated. You may now log in with your new password."
        })

