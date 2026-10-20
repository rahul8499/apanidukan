from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_phone_number(self, value):
        if not value:
            raise serializers.ValidationError('Valid 10-digit mobile number is required.')
        from .services import normalize_phone
        from .models import PhoneOTP
        from django.utils import timezone
        clean = normalize_phone(value)
        if not clean or len(clean) < 10:
            raise serializers.ValidationError('Valid 10-digit mobile number is required.')
        if User.objects.filter(phone_number=clean).exists():
            raise serializers.ValidationError('An account with this phone number already exists.')
        verified = PhoneOTP.objects.filter(
            phone_number=clean, is_verified=True, expires_at__gte=timezone.now()
        ).exists()
        if not verified:
            raise serializers.ValidationError('Please verify your phone number with OTP first.')
        return clean

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'phone_number')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, is_staff=False, is_superuser=False, **validated_data)
        from .models import PhoneOTP
        from django.utils import timezone
        if user.phone_number:
            PhoneOTP.objects.filter(phone_number=user.phone_number, is_verified=True).update(expires_at=timezone.now())
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    delivery_agent = serializers.SerializerMethodField()

    def get_role(self, obj):
        return 'DELIVERY_AGENT' if hasattr(obj, 'delivery_agent_profile') else ('ADMIN' if obj.is_staff else 'SELLER')

    def get_delivery_agent(self, obj):
        agent = getattr(obj, 'delivery_agent_profile', None)
        if not agent:
            return None
        return {'id': agent.id, 'agent_code': agent.agent_code, 'full_name': agent.full_name,
                'store_id': agent.store_id, 'store_name': agent.store.name,
                'must_change_password': agent.must_change_password, 'is_active': agent.is_active}

    class Meta:
        model = User
        fields = ('id', 'email', 'phone_number', 'first_name', 'last_name', 'is_active', 'is_staff', 'role', 'delivery_agent', 'created_at')
        read_only_fields = ('id', 'is_staff', 'is_active', 'created_at')
