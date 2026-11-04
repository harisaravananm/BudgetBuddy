from decimal import Decimal
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .email_service import send_test_email
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        unread = self.request.query_params.get("unread")
        if unread in ("true", "1"):
            queryset = queryset.filter(is_read=False)
        notification_type = self.request.query_params.get("type")
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        return queryset

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(is_read=False).count()})

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        unread_count = queryset.filter(is_read=False).count()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["unread_count"] = unread_count
            return response
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "results": serializer.data,
            "unread_count": unread_count,
        })

    @action(detail=True, methods=["post", "patch"], url_path="read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(self.get_serializer(notif).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": f"{updated} notifications marked as read."})

    @action(detail=False, methods=["get", "patch"], url_path="settings")
    def settings_view(self, request):
        """Retrieve or update real-time email & in-app notification preferences."""
        profile = request.user.profile
        if request.method == "PATCH":
            data = request.data

            def _bool(value):
                if isinstance(value, bool):
                    return value
                return str(value).lower() not in ("false", "0", "no", "off", "")

            if "notifications_enabled" in data:
                profile.notifications_enabled = _bool(data["notifications_enabled"])
            if "email_notifications_enabled" in data:
                profile.email_notifications_enabled = _bool(data["email_notifications_enabled"])
            if "alert_threshold_percent" in data:
                profile.alert_threshold_percent = max(1, min(100, int(data["alert_threshold_percent"])))
            if "large_expense_alert_enabled" in data:
                profile.large_expense_alert_enabled = _bool(data["large_expense_alert_enabled"])
            if "large_expense_threshold" in data:
                profile.large_expense_threshold = Decimal(str(data["large_expense_threshold"]))
            profile.save()

        return Response({
            "email": request.user.email,
            "notifications_enabled": profile.notifications_enabled,
            "email_notifications_enabled": profile.email_notifications_enabled,
            "alert_threshold_percent": profile.alert_threshold_percent,
            "large_expense_alert_enabled": profile.large_expense_alert_enabled,
            "large_expense_threshold": float(profile.large_expense_threshold),
        })

    @action(detail=False, methods=["post"], url_path="send-test-email")
    def trigger_test_email(self, request):
        """Dispatch a real-time SMTP test email to the user's registered or custom email address."""
        recipient = request.data.get("email") or request.user.email
        send_test_email(recipient_email=recipient, user=request.user)
        # Also log in-app notification
        Notification.objects.create(
            user=request.user,
            type=Notification.Type.EMAIL_SENT,
            title="Real-Time Test Email Dispatched",
            message=f"Verification email was sent to {recipient}.",
        )
        return Response({
            "success": True,
            "message": f"Real-time test email successfully dispatched to {recipient}.",
        })

    @action(detail=False, methods=["post"])
    def trigger_test_alert(self, request):
        alert_type = request.data.get("type", Notification.Type.SYSTEM)
        title = request.data.get("title", "BudgetBuddy Tip 💡")
        message = request.data.get(
            "message",
            "Great habits lead to financial freedom! Set aside 20% of your pocket money today.",
        )
        notif = Notification.objects.create(
            user=request.user,
            type=alert_type,
            title=title,
            message=message,
        )
        return Response(self.get_serializer(notif).data, status=status.HTTP_201_CREATED)
