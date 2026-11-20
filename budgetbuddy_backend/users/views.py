import secrets
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import AdminUserSerializer, MeSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class UpgradeRoleView(APIView):
    """Allows upgrading from Student to Premium role."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        target_role = request.data.get("role", User.Role.PREMIUM)
        if target_role not in [User.Role.STUDENT, User.Role.PREMIUM, User.Role.ADMIN]:
            return Response({"error": "Invalid role specified."}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.role = target_role
        user.save(update_fields=["role"])
        return Response(MeSerializer(user).data)


class OAuthMockLoginView(APIView):
    """Simulated OAuth2 login endpoint for Google / GitHub OAuth flows."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        provider = request.data.get("provider", "google")
        email = request.data.get("email")
        name = request.data.get("name", "")

        if not email:
            return Response({"error": "Email is required for OAuth login."}, status=status.HTTP_400_BAD_REQUEST)

        email = email.strip().lower()
        user = User.objects.filter(email=email).first()

        if not user:
            # Create user automatically for OAuth2
            temp_pwd = secrets.token_urlsafe(16)
            user = User.objects.create_user(email=email, password=temp_pwd)
            if name:
                user.profile.full_name = name
                user.profile.save(update_fields=["full_name"])

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "provider": provider,
            "user": MeSerializer(user).data,
        })


class AdminUsersView(APIView):
    """Admin-only endpoint to inspect registered users and system-wide metrics."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if request.user.role != User.Role.ADMIN and not request.user.is_staff:
            return Response(
                {"error": "Admin privileges required to view system administration."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = User.objects.annotate(
            incomes_count=Count("incomes", distinct=True),
            expenses_count=Count("expenses", distinct=True),
            goals_count=Count("goals", distinct=True),
        ).order_by("-date_joined")

        total_users = users.count()
        student_count = users.filter(role=User.Role.STUDENT).count()
        premium_count = users.filter(role=User.Role.PREMIUM).count()
        admin_count = users.filter(role=User.Role.ADMIN).count()

        serializer = AdminUserSerializer(users, many=True)
        return Response({
            "metrics": {
                "total_users": total_users,
                "student_users": student_count,
                "premium_users": premium_count,
                "admin_users": admin_count,
            },
            "users": serializer.data,
        })
