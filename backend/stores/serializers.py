from rest_framework import serializers
from .models import Store, StoreSettings


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
            'id', 'owner', 'name', 'slug', 'description', 'address', 'phone_number', 'logo',
            'theme', 'status', 'is_published', 'manage_in_app',
            'allow_home_delivery', 'allow_store_pickup',
            'min_delivery_order', 'delivery_radius_km', 'delivery_charge_type',
            'delivery_flat_fee', 'delivery_per_km_fee', 'free_delivery_above',
            'delivery_estimated_time', 'pickup_instructions',
            'enable_loyalty_cashback', 'loyalty_cashback_percent', 'loyalty_min_order_amount',
            'custom_domain', 'custom_domain_verified',
            'created_at', 'updated_at', 'settings'
        )
        read_only_fields = ('owner', 'slug', 'created_at', 'updated_at')

    def create(self, validated_data):
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
            'id', 'name', 'slug', 'description', 'address', 'logo', 'theme', 'settings',
            'phone_number', 'manage_in_app', 'allow_home_delivery', 'allow_store_pickup',
            'min_delivery_order', 'delivery_radius_km', 'delivery_charge_type',
            'delivery_flat_fee', 'delivery_per_km_fee', 'free_delivery_above',
            'delivery_estimated_time', 'pickup_instructions',
            'enable_loyalty_cashback', 'loyalty_cashback_percent', 'loyalty_min_order_amount',
            'custom_domain', 'custom_domain_verified'
        )

