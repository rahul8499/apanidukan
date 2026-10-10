from rest_framework import serializers
from .models import Order, OrderItem, Payment, WhatsAppOrder, CustomerWallet, CheckoutPhoneVerification, OrderIssueRequest
from products.models import Product, ProductVariant, Coupon
from django.db import transaction, models
from django.utils import timezone
from accounts.services import normalize_phone
from decimal import Decimal
from datetime import timedelta
from math import asin, cos, radians, sin, sqrt
import re


def reserve_product_stock(product, selected_size, quantity):
    """Reserve total and size-level stock on an already row-locked product."""
    if product.available_sizes:
        if selected_size not in product.available_sizes:
            raise serializers.ValidationError({'selected_size': f"Select an available size for '{product.name}'."})
        variant = ProductVariant.objects.select_for_update().filter(
            product=product, size=selected_size, color='', is_active=True
        ).first()
        size_stock = dict(product.size_stock or {})
        available_for_size = variant.stock_quantity if variant else int(size_stock.get(selected_size, 0))
        if available_for_size < quantity:
            raise serializers.ValidationError(
                f"Only {available_for_size} left in size {selected_size} for '{product.name}'."
            )
        size_stock[selected_size] = available_for_size - quantity
        product.size_stock = size_stock
        if variant:
            variant.stock_quantity = available_for_size - quantity
            variant.save(update_fields=['stock_quantity', 'updated_at'])
    if product.stock_quantity < quantity:
        raise serializers.ValidationError(f"Only {product.stock_quantity} left for '{product.name}'.")
    product.stock_quantity -= quantity
    update_fields = ['stock_quantity']
    if product.available_sizes:
        update_fields.append('size_stock')
    product.save(update_fields=update_fields)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('product', 'product_name_snapshot', 'price_snapshot', 'quantity', 'selected_size', 'subtotal')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ('id', 'customer', 'store', 'order_number', 'idempotency_key', 'subtotal', 'tax', 'discount', 'total', 'currency', 'status', 'items', 'created_at')
        read_only_fields = ('customer', 'order_number', 'idempotency_key', 'status', 'created_at', 'subtotal', 'tax', 'discount', 'total', 'currency')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        store = validated_data['store']
        product_ids = [item['product'].id if isinstance(item['product'], Product) else item['product'] for item in items_data]
        with transaction.atomic():
            products = list(Product.objects.select_for_update().select_related('store').filter(id__in=product_ids, is_published=True, store=store, store__is_published=True))
            if len(products) != len(set(product_ids)):
                raise serializers.ValidationError('All products must be published products from the selected live store.')
            products_by_id = {product.id: product for product in products}
            order = Order.objects.create(**validated_data)
            subtotal = 0
            for item in items_data:
                product_id = item['product'].id if isinstance(item['product'], Product) else item['product']
                product = products_by_id[product_id]
                quantity = item.get('quantity', 1)
                selected_size = (item.get('selected_size') or '').strip().upper()

                reserve_product_stock(product, selected_size, quantity)

                price = product.price
                subtotal_item = price * quantity
                OrderItem.objects.create(order=order, product=product, product_name_snapshot=product.name, price_snapshot=price, quantity=quantity, selected_size=selected_size, subtotal=subtotal_item)
                subtotal += subtotal_item
            order.subtotal = subtotal
            order.total = subtotal  # tax/discount omitted for MVP
            order.save()
        return order


class RoundedCoordinateField(serializers.DecimalField):
    """Accept raw browser GPS precision and normalize it before DRF precision validation."""
    def to_internal_value(self, data):
        if data in (None, ''):
            return super().to_internal_value(data)
        try:
            data = Decimal(str(data)).quantize(Decimal('0.000001'))
        except Exception:
            pass
        return super().to_internal_value(data)


class WhatsAppOrderCreateSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField(), min_length=1)
    customer_name = serializers.CharField(max_length=150, required=True, allow_blank=False, trim_whitespace=True)
    customer_phone = serializers.CharField(max_length=40, required=True, allow_blank=False, trim_whitespace=True)
    order_type = serializers.ChoiceField(choices=('HOME_DELIVERY', 'STORE_PICKUP'), required=False, default='HOME_DELIVERY')
    payment_type = serializers.ChoiceField(choices=('COD', 'ONLINE'), required=False, default='COD')
    utr_number = serializers.CharField(required=False, allow_blank=True, max_length=64, default='')
    payment_gateway_ref = serializers.CharField(required=False, allow_blank=True, max_length=128, default='')
    delivery_address = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal('0.00'))
    delivery_distance_km = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    delivery_latitude = RoundedCoordinateField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    delivery_longitude = RoundedCoordinateField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    location_url = serializers.URLField(required=False, allow_blank=True, max_length=1000)
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal('0.00'))
    wallet_points_to_redeem = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal('0.00'))
    checkout_verification_token = serializers.UUIDField(write_only=True)
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    customer_note = serializers.CharField(required=False, allow_blank=True, max_length=1000, default='')

    def validate_customer_phone(self, value):
        value = normalize_phone(value)
        if len(value) != 10:
            raise serializers.ValidationError('Enter a valid 10-digit WhatsApp phone number.')
        return value

    def validate(self, attrs):
        coupon_code = str(attrs.get('coupon_code') or '').strip()
        if ',' in coupon_code:
            raise serializers.ValidationError({'coupon_code': 'Only one coupon can be used per order.'})
        if attrs.get('payment_type') != 'COD':
            raise serializers.ValidationError({
                'payment_type': 'Online payment is temporarily unavailable. Please use Cash on Delivery / Pay at Shop.'
            })
        if attrs.get('order_type') == 'HOME_DELIVERY':
            address = str(attrs.get('delivery_address') or '').strip()
            if len(address) < 10:
                raise serializers.ValidationError({'delivery_address': 'Enter a complete delivery address.'})
            serviceable_pincodes = self.context['store'].serviceable_pincodes or []
            if serviceable_pincodes:
                address_pincodes = re.findall(r'(?<!\d)\d{6}(?!\d)', address)
                if not address_pincodes:
                    raise serializers.ValidationError({'delivery_address': 'Include the 6-digit delivery pincode.'})
                if address_pincodes[-1] not in {str(code) for code in serviceable_pincodes}:
                    raise serializers.ValidationError({'delivery_address': 'This pincode is not serviceable by the store.'})
            # Distance and fees are server-calculated; never trust browser values.
            attrs['delivery_distance_km'] = None
        return attrs

    def create(self, validated_data):
        store = self.context['store']
        idemp_key = validated_data.pop('idempotency_key', '').strip() or None
        verification_token = validated_data.pop('checkout_verification_token')
        requested = validated_data['items']
        product_ids = [item.get('id') for item in requested]
        line_keys = [(item.get('id'), str(item.get('selected_size') or '').strip().upper()) for item in requested]
        if any(not isinstance(product_id, int) for product_id in product_ids) or len(line_keys) != len(set(line_keys)):
            raise serializers.ValidationError('Invalid cart items.')

        snapshots, subtotal = [], Decimal('0.00')
        order_type = validated_data.get('order_type', 'HOME_DELIVERY')

        with transaction.atomic():
            # Lock the one-time OTP proof and stock rows. This prevents two
            # concurrent requests from reusing a token or overselling stock.
            verification = CheckoutPhoneVerification.objects.select_for_update().filter(
                token=verification_token,
                store=store,
                customer_phone=validated_data.get('customer_phone', '').strip(),
            ).first()
            if not verification or not verification.is_valid():
                raise serializers.ValidationError({'checkout_verification_token': 'Verify this phone number before placing the order.'})

            products = list(Product.objects.select_for_update().filter(
                id__in=product_ids, store=store, is_published=True, store__is_published=True
            ))
            if len(products) != len(set(product_ids)):
                raise serializers.ValidationError('One or more cart items are no longer available.')
            product_map = {product.id: product for product in products}

            for item in requested:
                quantity = item.get('quantity', 1)
                if not isinstance(quantity, int) or quantity < 1 or quantity > 50:
                    raise serializers.ValidationError('Quantity must be between 1 and 50.')
                product = product_map[item['id']]
                selected_size = str(item.get('selected_size') or '').strip().upper()

                reserve_product_stock(product, selected_size, quantity)

                # Strict price calculation from database
                line_total = product.price * quantity
                snapshots.append({
                    'product_id': product.id,
                    'name': product.name,
                    'price': str(product.price),
                    'quantity': quantity,
                    'selected_size': selected_size,
                    'line_total': str(line_total),
                    'image': product.image.url if product.image else ''
                })
                subtotal += line_total

            # 1. Fulfillment Mode & Minimum Order Enforcement
            if order_type == 'HOME_DELIVERY':
                if getattr(store, 'allow_home_delivery', True) is False:
                    raise serializers.ValidationError({'order_type': 'Home delivery is currently not offered by this store.'})

                customer_lat = validated_data.get('delivery_latitude')
                customer_lng = validated_data.get('delivery_longitude')
                store_lat = getattr(store, 'latitude', None)
                store_lng = getattr(store, 'longitude', None)
                if store_lat is not None and store_lng is not None:
                    if customer_lat is None or customer_lng is None:
                        raise serializers.ValidationError({
                            'delivery_location': 'Use current GPS location to verify that this address is serviceable.'
                        })
                    lat1, lng1, lat2, lng2 = map(radians, map(float, (store_lat, store_lng, customer_lat, customer_lng)))
                    dlat, dlng = lat2 - lat1, lng2 - lng1
                    haversine = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
                    server_distance = Decimal(str(round(6371 * 2 * asin(sqrt(haversine)), 2)))
                    delivery_radius = Decimal(str(getattr(store, 'delivery_radius_km', 10) or 10))
                    if server_distance > delivery_radius:
                        raise serializers.ValidationError({
                            'delivery_location': f'Delivery is available within {delivery_radius} km. This address is {server_distance} km away.'
                        })
                    validated_data['delivery_distance_km'] = server_distance

                min_del = Decimal(str(getattr(store, 'min_delivery_order', 0) or 0))
                if min_del > Decimal('0.00') and subtotal < min_del:
                    raise serializers.ValidationError({
                        'min_delivery_order': f'Minimum order amount for Home Delivery is ₹{min_del}. Cart subtotal is ₹{subtotal}.'
                    })

                # Server-Side Delivery Fee Computation
                free_above = Decimal(str(getattr(store, 'free_delivery_above', 0) or 0))
                charge_type = getattr(store, 'delivery_charge_type', 'FIXED')
                flat_fee = Decimal(str(getattr(store, 'delivery_flat_fee', 0) or 0))
                per_km_fee = Decimal(str(getattr(store, 'delivery_per_km_fee', 0) or 0))

                if free_above > Decimal('0.00') and subtotal >= free_above:
                    server_delivery_fee = Decimal('0.00')
                elif charge_type == 'FREE':
                    server_delivery_fee = Decimal('0.00')
                elif charge_type == 'PER_KM':
                    if validated_data.get('delivery_distance_km') is None:
                        raise serializers.ValidationError({'delivery_location': 'Store GPS location is required for per-km delivery.'})
                    dist = Decimal(str(validated_data['delivery_distance_km']))
                    server_delivery_fee = per_km_fee * dist
                elif charge_type == 'HYBRID':
                    if validated_data.get('delivery_distance_km') is None:
                        raise serializers.ValidationError({'delivery_location': 'Store GPS location is required for distance-based delivery.'})
                    dist = Decimal(str(validated_data['delivery_distance_km']))
                    server_delivery_fee = flat_fee + (per_km_fee * dist)
                else:
                    server_delivery_fee = flat_fee
            else:
                if getattr(store, 'allow_store_pickup', True) is False:
                    raise serializers.ValidationError({'order_type': 'Store Pickup is currently not available.'})
                server_delivery_fee = Decimal('0.00')

            # 2. Strict Coupon Validation & Server-Side Discount Calculation
            c_code = validated_data.get('coupon_code', '').strip().upper()
            server_discount = Decimal('0.00')

            if c_code:
                codes = [c_code]
                for code in codes:
                    coupon = Coupon.objects.filter(
                        store=store,
                        code__iexact=code,
                        is_active=True
                    ).filter(
                        models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=timezone.now())
                    ).first()

                    if not coupon:
                        try:
                            scratch = store.scratch_config
                        except Exception:
                            scratch = None
                        if scratch and scratch.enabled and scratch.coupon_code.strip().upper() == code:
                            coupon = Coupon(
                                store=store,
                                code=scratch.coupon_code.strip().upper(),
                                discount_type='PERCENTAGE' if scratch.discount_type.lower() == 'percentage' else 'FLAT',
                                discount_value=scratch.discount_value,
                                min_order_amount=scratch.min_order,
                                is_active=True,
                            )

                    if coupon and subtotal >= coupon.min_order_amount:
                        coupon_base = subtotal
                        matching_coupon_item = None
                        if coupon.product:
                            matching_coupon_item = next((it for it in requested if it.get('id') == coupon.product.id), None)
                            if not matching_coupon_item:
                                continue
                            coupon_base = coupon.product.price * Decimal(str(matching_coupon_item.get('quantity', 1)))
                        if coupon.discount_type == 'PERCENTAGE':
                            disc = (coupon_base * coupon.discount_value) / Decimal('100.00')
                            if coupon.max_discount_amount and disc > coupon.max_discount_amount:
                                disc = coupon.max_discount_amount
                            server_discount += disc
                        elif coupon.discount_type == 'BOGO':
                            if coupon.product:
                                qty = matching_coupon_item.get('quantity', 1)
                                price = coupon.product.price
                            else:
                                qty = sum(it.get('quantity', 1) for it in requested) if requested else 1
                                price = (subtotal / Decimal(str(qty))) if qty > 0 else Decimal('0.00')

                            free_units = qty // 2
                            disc = price * Decimal(str(free_units)) if free_units >= 1 else Decimal('0.00')
                            server_discount += disc
                        elif coupon.discount_type == 'FREE_DELIVERY':
                            if coupon.discount_value > Decimal('0.00'):
                                server_discount += coupon.discount_value
                            server_delivery_fee = Decimal('0.00')
                        else:
                            server_discount += min(coupon.discount_value, coupon_base)

                        # Increment coupon usage count atomically
                        if coupon.pk:
                            Coupon.objects.filter(id=coupon.id).update(usage_count=models.F('usage_count') + 1)

            # Never trust a client-provided discount amount. Every discount that
            # affects the payable total must be derived from a valid server-side
            # coupon above.

            # Hard clamp: discount can never exceed subtotal
            server_discount = min(server_discount, subtotal)
            net_amount_before_wallet = max(Decimal('0.00'), subtotal - server_discount)

            # 3. Customer Loyalty Cashback & Coins Wallet Redemption
            c_phone = validated_data.get('customer_phone', '').strip()
            c_name = validated_data.get('customer_name', '').strip()
            requested_wallet_points = Decimal(str(validated_data.get('wallet_points_to_redeem', 0) or 0))
            wallet_redeemed = Decimal('0.00')

            wallet, _ = CustomerWallet.objects.get_or_create(
                store=store,
                customer_phone=c_phone,
                defaults={'customer_name': c_name, 'balance': Decimal('0.00')}
            )
            if c_name and not wallet.customer_name:
                wallet.customer_name = c_name
                wallet.save(update_fields=['customer_name'])

            if requested_wallet_points > Decimal('0.00') and wallet.balance > Decimal('0.00'):
                # Max redeemable is min of requested, available balance, and net payable before delivery fee
                wallet_redeemed = min(requested_wallet_points, wallet.balance, net_amount_before_wallet)
                if wallet_redeemed > Decimal('0.00'):
                    wallet.balance = max(Decimal('0.00'), wallet.balance - wallet_redeemed)
                    wallet.total_redeemed = wallet.total_redeemed + wallet_redeemed
                    wallet.save(update_fields=['balance', 'total_redeemed', 'updated_at'])

            # 4. Dynamic Store Loyalty Cashback Reward Calculation on Net Purchase
            net_paid_for_items = max(Decimal('0.00'), net_amount_before_wallet - wallet_redeemed)
            cashback_earned = Decimal('0.00')

            loyalty_enabled = getattr(store, 'enable_loyalty_cashback', True)
            cashback_pct = Decimal(str(getattr(store, 'loyalty_cashback_percent', Decimal('5.00')) or Decimal('0.00')))
            min_order_for_loyalty = Decimal(str(getattr(store, 'loyalty_min_order_amount', Decimal('0.00')) or Decimal('0.00')))

            if loyalty_enabled and cashback_pct > Decimal('0.00') and subtotal >= min_order_for_loyalty:
                cashback_earned = (net_paid_for_items * (cashback_pct / Decimal('100.00'))).quantize(Decimal('0.01'))
                if cashback_earned > Decimal('0.00'):
                    wallet.balance = wallet.balance + cashback_earned
                    wallet.total_earned = wallet.total_earned + cashback_earned
                    wallet.save(update_fields=['balance', 'total_earned', 'updated_at'])


            # 5. Final Total Calculation (100% Calculated & Verified on Server)
            final_total = max(Decimal('0.00'), subtotal - server_discount - wallet_redeemed + server_delivery_fee)

            order = WhatsAppOrder.objects.create(
                store=store,
                idempotency_key=idemp_key,
                items=snapshots,
                total=final_total,
                currency='INR',
                order_type=order_type,
                customer_name=c_name,
                customer_phone=c_phone,
                payment_type=validated_data.get('payment_type', 'COD'),
                utr_number=validated_data.get('utr_number', '').strip(),
                payment_gateway_ref=validated_data.get('payment_gateway_ref', '').strip(),
                # A gateway reference supplied by a browser is not proof of
                # payment. Only a verified provider callback may change these.
                payment_verified=False,
                payment_verified_at=None,
                delivery_address=validated_data.get('delivery_address', ''),
                delivery_fee=server_delivery_fee,
                delivery_distance_km=validated_data.get('delivery_distance_km'),
                delivery_latitude=validated_data.get('delivery_latitude'),
                delivery_longitude=validated_data.get('delivery_longitude'),
                location_url=validated_data.get('location_url', ''),
                coupon_code=c_code,
                discount_amount=server_discount,
                wallet_points_redeemed=wallet_redeemed,
                wallet_cashback_earned=cashback_earned,
                customer_note=validated_data.get('customer_note', '').strip(),
            )
            verification.is_used = True
            verification.save(update_fields=['is_used'])
        return order


class WhatsAppOrderSerializer(serializers.ModelSerializer):
    delivery_assignment_status = serializers.SerializerMethodField()
    delivery_otp_pending = serializers.SerializerMethodField()
    delivery_otp_expires_at = serializers.SerializerMethodField()
    delivery_otp_resend_at = serializers.SerializerMethodField()

    def get_delivery_assignment_status(self, obj):
        try:
            return obj.delivery_assignment.status
        except Exception:
            return None

    def _delivery_otp(self, obj):
        try:
            return obj.delivery_otp
        except Exception:
            return None

    def get_delivery_otp_pending(self, obj):
        otp = self._delivery_otp(obj)
        return bool(otp and not otp.is_verified and otp.expires_at > timezone.now())

    def get_delivery_otp_expires_at(self, obj):
        otp = self._delivery_otp(obj)
        return otp.expires_at if otp and not otp.is_verified else None

    def get_delivery_otp_resend_at(self, obj):
        otp = self._delivery_otp(obj)
        return otp.last_sent_at + timedelta(seconds=60) if otp and not otp.is_verified else None

    class Meta:
        model = WhatsAppOrder
        fields = (
            'id', 'reference', 'idempotency_key', 'tracking_token', 'order_type', 'customer_name', 'customer_phone',
            'payment_type', 'utr_number', 'payment_gateway_ref', 'payment_verified', 'payment_verified_at',
            'delivery_address', 'delivery_fee', 'delivery_distance_km', 'delivery_latitude', 'delivery_longitude',
            'location_url', 'coupon_code', 'discount_amount', 'wallet_points_redeemed',
            'wallet_cashback_earned', 'items', 'total',
            'currency', 'status', 'customer_note', 'expected_dispatch_at', 'delivery_agent_name',
            'delivery_agent_phone', 'delivery_assignment_status', 'delivery_otp_pending', 'delivery_otp_expires_at',
            'delivery_otp_resend_at', 'delivery_proof', 'delivered_at', 'cancellation_reason', 'cancelled_by', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'reference', 'idempotency_key', 'tracking_token', 'items', 'total', 'currency', 'created_at', 'updated_at')


class WhatsAppOrderStatusUpdateSerializer(serializers.ModelSerializer):
    """The seller's only permitted post-order change is fulfillment status."""

    ALLOWED_TRANSITIONS = {
        WhatsAppOrder.STATUS_NEW: {
            WhatsAppOrder.STATUS_CONFIRMED,
            WhatsAppOrder.STATUS_CANCELLED,
        },
        WhatsAppOrder.STATUS_CONFIRMED: {
            WhatsAppOrder.STATUS_PACKED,
            WhatsAppOrder.STATUS_PAID,
            WhatsAppOrder.STATUS_CANCELLED,
        },
        WhatsAppOrder.STATUS_PACKED: {
            WhatsAppOrder.STATUS_READY_FOR_PICKUP,
            WhatsAppOrder.STATUS_OUT_FOR_DELIVERY,
            WhatsAppOrder.STATUS_CANCELLED,
        },
        WhatsAppOrder.STATUS_READY_FOR_PICKUP: {WhatsAppOrder.STATUS_PAID, WhatsAppOrder.STATUS_DELIVERED},
        WhatsAppOrder.STATUS_OUT_FOR_DELIVERY: {WhatsAppOrder.STATUS_PAID, WhatsAppOrder.STATUS_DELIVERED},
        WhatsAppOrder.STATUS_PAID: {
            WhatsAppOrder.STATUS_PACKED,
            WhatsAppOrder.STATUS_READY_FOR_PICKUP,
            WhatsAppOrder.STATUS_OUT_FOR_DELIVERY,
            WhatsAppOrder.STATUS_DELIVERED,
        },
        WhatsAppOrder.STATUS_DELIVERED: set(),
        WhatsAppOrder.STATUS_CANCELLED: set(),
    }

    class Meta:
        model = WhatsAppOrder
        fields = ('status', 'expected_dispatch_at', 'delivery_agent_name', 'delivery_agent_phone')

    def validate_status(self, value):
        current_status = self.instance.status
        if value == current_status:
            return value
        if value == WhatsAppOrder.STATUS_DELIVERED:
            raise serializers.ValidationError('Use customer Delivery OTP verification to mark this order delivered.')
        if value not in self.ALLOWED_TRANSITIONS[current_status]:
            raise serializers.ValidationError(
                f"An order cannot move from {current_status} to {value}."
            )
        if value == WhatsAppOrder.STATUS_READY_FOR_PICKUP and self.instance.order_type != 'STORE_PICKUP':
            raise serializers.ValidationError('Home-delivery orders cannot be marked ready for pickup.')
        if value == WhatsAppOrder.STATUS_OUT_FOR_DELIVERY and self.instance.order_type != 'HOME_DELIVERY':
            raise serializers.ValidationError('Pickup orders cannot be marked out for delivery.')
        return value

    def validate(self, attrs):
        new_status = attrs.get('status', self.instance.status)
        if new_status == WhatsAppOrder.STATUS_CONFIRMED and not attrs.get('expected_dispatch_at', self.instance.expected_dispatch_at):
            raise serializers.ValidationError({'expected_dispatch_at': 'Expected dispatch/ready time is required.'})
        if new_status == WhatsAppOrder.STATUS_OUT_FOR_DELIVERY:
            if not attrs.get('delivery_agent_name', self.instance.delivery_agent_name):
                raise serializers.ValidationError({'delivery_agent_name': 'Delivery agent name is required.'})
            phone = normalize_phone(attrs.get('delivery_agent_phone', self.instance.delivery_agent_phone))
            if len(phone) != 10:
                raise serializers.ValidationError({'delivery_agent_phone': 'Valid 10-digit delivery agent number is required.'})
            attrs['delivery_agent_phone'] = phone
        return attrs


class OrderIssueRequestSerializer(serializers.ModelSerializer):
    evidence = serializers.SerializerMethodField()
    class Meta:
        model = OrderIssueRequest
        fields = (
            'id', 'order', 'request_type', 'status', 'product_id', 'selected_size',
            'requested_size', 'quantity', 'reason', 'customer_phone', 'seller_note',
            'refund_amount', 'provider_refund_id', 'evidence', 'completion_proof', 'completed_at', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'order', 'status', 'customer_phone', 'seller_note', 'refund_amount', 'provider_refund_id', 'completion_proof', 'completed_at', 'created_at', 'updated_at')

    def validate(self, attrs):
        if attrs.get('request_type') == OrderIssueRequest.TYPE_EXCHANGE and not attrs.get('requested_size'):
            raise serializers.ValidationError({'requested_size': 'Select the replacement size.'})
        if len(str(attrs.get('reason') or '').strip()) < 5:
            raise serializers.ValidationError({'reason': 'Please provide a clear reason.'})
        return attrs

    def get_evidence(self, obj):
        request = self.context.get('request')
        values = []
        for evidence in obj.evidence.all():
            url = evidence.image.url
            values.append(request.build_absolute_uri(url) if request else url)
        return values


class CustomerWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerWallet
        fields = ('customer_phone', 'customer_name', 'balance', 'total_earned', 'total_redeemed', 'updated_at')
