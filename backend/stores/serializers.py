from rest_framework import serializers
from .models import Store, StoreSettings, StoreScratchConfig, SellerNotification, CustomerNotification


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = '__all__'
        read_only_fields = ('store',)


class StoreSerializer(serializers.ModelSerializer):
    settings = StoreSettingsSerializer(required=False)

    class Meta:
        model = Store
        fields = (
            'id', 'owner', 'name', 'slug', 'description', 'business_type', 'address', 'latitude', 'longitude', 'phone_number', 'logo',
            'theme', 'status', 'is_published', 'manage_in_app', 'has_seen_onboarding_tour',
            'allow_home_delivery', 'allow_store_pickup',
            'min_delivery_order', 'delivery_radius_km', 'serviceable_pincodes', 'delivery_charge_type',
            'delivery_flat_fee', 'delivery_per_km_fee', 'free_delivery_above',
            'delivery_estimated_time', 'pickup_instructions',
            'exchange_enabled', 'exchange_window_days', 'exchange_evidence_required',
            'exchange_allowed_reasons', 'exchange_policy',
            'enable_loyalty_cashback', 'loyalty_cashback_percent', 'loyalty_min_order_amount',
            'custom_domain', 'custom_domain_verified',
            'upi_id', 'upi_name', 'upi_qr_code', 'razorpay_key_id', 'enable_online_payments',
            'created_at', 'updated_at', 'settings'
        )
        read_only_fields = ('owner', 'slug', 'created_at', 'updated_at')

    def validate_business_type(self, value):
        if value != 'GARMENTS':
            raise serializers.ValidationError('Only Clothing, Garments & Fashion stores are supported.')
        return value

    def validate_exchange_window_days(self, value):
        if value < 1 or value > 30:
            raise serializers.ValidationError('Exchange window must be between 1 and 30 days.')
        return value

    def validate_exchange_allowed_reasons(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Exchange reasons must be a list.')
        cleaned = []
        for reason in value:
            reason = str(reason).strip()
            if reason and reason not in cleaned:
                cleaned.append(reason[:120])
        if len(cleaned) > 12:
            raise serializers.ValidationError('A maximum of 12 exchange reasons is allowed.')
        return cleaned

    def create(self, validated_data):
        validated_data['business_type'] = 'GARMENTS'
        settings_data = validated_data.pop('settings', None)
        # StoreViewSet supplies the authenticated user via serializer.save().
        # Remove it from validated_data so it is not passed twice to create().
        validated_data.pop('owner', None)
        request = self.context.get('request')
        owner = request.user
        store = Store.objects.create(owner=owner, **validated_data)
        if settings_data:
            StoreSettings.objects.create(store=store, **settings_data)
        return store

    def update(self, instance, validated_data):
        settings_data = validated_data.pop('settings', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if settings_data:
            settings, created = StoreSettings.objects.get_or_create(store=instance)
            for k, v in settings_data.items():
                setattr(settings, k, v)
            settings.save()
        return instance


class PublicStoreSerializer(serializers.ModelSerializer):
    settings = StoreSettingsSerializer(read_only=True)

    class Meta:
        model = Store
        fields = (
            'id', 'name', 'slug', 'description', 'business_type', 'address', 'latitude', 'longitude', 'logo', 'theme', 'settings',
            'phone_number', 'manage_in_app', 'allow_home_delivery', 'allow_store_pickup',
            'min_delivery_order', 'delivery_radius_km', 'serviceable_pincodes', 'delivery_charge_type',
            'delivery_flat_fee', 'delivery_per_km_fee', 'free_delivery_above',
            'delivery_estimated_time', 'pickup_instructions',
            'exchange_enabled', 'exchange_window_days', 'exchange_evidence_required',
            'exchange_allowed_reasons', 'exchange_policy',
            'enable_loyalty_cashback', 'loyalty_cashback_percent', 'loyalty_min_order_amount',
            'custom_domain', 'custom_domain_verified', 'is_published',
            'upi_id', 'upi_name', 'upi_qr_code', 'razorpay_key_id', 'enable_online_payments'
        )


class StoreScratchConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreScratchConfig
        fields = '__all__'
        read_only_fields = ('store',)


class SellerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerNotification
        fields = '__all__'
        read_only_fields = ('store', 'created_at')



class CustomerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerNotification
        fields = '__all__'
        read_only_fields = ('store', 'created_at')
