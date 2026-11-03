from django.urls import path
from .views import (
    AdminUsersView,
    LoginView,
    LogoutView,
    MeView,
    OAuthExchangeView,
    RefreshView,
    RegisterView,
    UpgradeRoleView,
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
]
