from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

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

    @action(detail=True, methods=["post", "patch"])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(self.get_serializer(notif).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": f"{updated} notifications marked as read."})

    @action(detail=False, methods=["post"])
    def trigger_test_alert(self, request):
        alert_type = request.data.get("type", Notification.Type.SAVINGS_REMINDER)
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
