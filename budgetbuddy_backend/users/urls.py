from django.urls import path
from .views import (
    AdminUsersView,
    LoginView,
    LogoutView,
    MeView,
    OAuthExchangeView,
    PasswordResetRequestOTPView,
    PasswordResetVerifyOTPView,
    RefreshView,
    RegisterView,
    SendVerificationOTPView,
    UpgradeRoleView,
    VerifyEmailOTPView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("google/", OAuthExchangeView.as_view(provider="google"), name="auth-google"),
    path("github/", OAuthExchangeView.as_view(provider="github"), name="auth-github"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("upgrade/", UpgradeRoleView.as_view(), name="auth-upgrade"),
    path("admin/users/", AdminUsersView.as_view(), name="auth-admin-users"),
    path("send-verification-otp/", SendVerificationOTPView.as_view(), name="auth-send-verification-otp"),
    path("verify-email-otp/", VerifyEmailOTPView.as_view(), name="auth-verify-email-otp"),
    path("password-reset/request-otp/", PasswordResetRequestOTPView.as_view(), name="auth-password-reset-request-otp"),
    path("password-reset/verify-otp/", PasswordResetVerifyOTPView.as_view(), name="auth-password-reset-verify-otp"),
]
