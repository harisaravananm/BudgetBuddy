from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Profile, User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.STUDENT, required=False)

    class Meta:
        model = User
        fields = ("id", "email", "password", "full_name", "role")

    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "")
        validated_data.pop("role", None)
        user = User.objects.create_user(role=User.Role.STUDENT, **validated_data)
        if full_name:
            user.profile.full_name = full_name
            user.profile.save(update_fields=["full_name"])
        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = (
            "full_name",
            "monthly_income",
            "currency",
            "savings_target_percent",
            "notifications_enabled",
        )


class MeSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()

    class Meta:
        model = User
        fields = ("id", "email", "role", "profile")
        read_only_fields = ("id", "email")

    def update(self, instance, validated_data):
        if "role" in validated_data and validated_data["role"]:
            instance.role = validated_data["role"]
            instance.save(update_fields=["role"])

        profile_data = validated_data.pop("profile", {})
        for k, v in profile_data.items():
            setattr(instance.profile, k, v)
        instance.profile.save()
        return instance


class AdminUserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    incomes_count = serializers.IntegerField(read_only=True)
    expenses_count = serializers.IntegerField(read_only=True)
    goals_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "is_staff",
            "date_joined",
            "profile",
            "incomes_count",
            "expenses_count",
            "goals_count",
        )
