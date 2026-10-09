from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name')

    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, is_staff=False, is_superuser=False, **validated_data)


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
