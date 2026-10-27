from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    AdminUsersView,
    MeView,
    OAuthMockLoginView,
    RegisterView,
    UpgradeRoleView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("oauth/", OAuthMockLoginView.as_view(), name="auth-oauth"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("upgrade/", UpgradeRoleView.as_view(), name="auth-upgrade"),
    path("admin/users/", AdminUsersView.as_view(), name="auth-admin-users"),
]
