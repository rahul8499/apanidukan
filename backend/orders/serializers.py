from rest_framework import serializers
from .models import Order, OrderItem, Payment, WhatsAppOrder, CustomerWallet, CheckoutPhoneVerification
from products.models import Product, Coupon
from django.db import transaction, models
from django.utils import timezone
from accounts.services import normalize_phone
from decimal import Decimal


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('product', 'product_name_snapshot', 'price_snapshot', 'quantity', 'subtotal')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ('id', 'customer', 'store', 'order_number', 'subtotal', 'tax', 'discount', 'total', 'currency', 'status', 'items', 'created_at')
        read_only_fields = ('customer', 'order_number', 'status', 'created_at', 'subtotal', 'tax', 'discount', 'total', 'currency')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        store = validated_data['store']
        product_ids = [item['product'].id if isinstance(item['product'], Product) else item['product'] for item in items_data]
        products = list(Product.objects.select_related('store').filter(id__in=product_ids, is_published=True, store=store, store__is_published=True))
        if len(products) != len(set(product_ids)):
            raise serializers.ValidationError('All products must be published products from the selected live store.')
        products_by_id = {product.id: product for product in products}
        with transaction.atomic():
            order = Order.objects.create(**validated_data)
            subtotal = 0
            for item in items_data:
                product_id = item['product'].id if isinstance(item['product'], Product) else item['product']
                product = products_by_id[product_id]
                quantity = item.get('quantity', 1)

                if product.stock_quantity <= 0:
                    raise serializers.ValidationError(f"'{product.name}' is out of stock.")
                if product.stock_quantity < quantity:
                    raise serializers.ValidationError(f"Only {product.stock_quantity} left for '{product.name}'.")

                product.stock_quantity = max(0, product.stock_quantity - quantity)
                product.save(update_fields=['stock_quantity'])

                price = product.price
                subtotal_item = price * quantity
                OrderItem.objects.create(order=order, product=product, product_name_snapshot=product.name, price_snapshot=price, quantity=quantity, subtotal=subtotal_item)
                subtotal += subtotal_item
            order.subtotal = subtotal
            order.total = subtotal  # tax/discount omitted for MVP
            order.save()
        return order


class WhatsAppOrderCreateSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField(), min_length=1)
    customer_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    customer_phone = serializers.CharField(max_length=40, required=True, allow_blank=False, trim_whitespace=True)
    order_type = serializers.ChoiceField(choices=('HOME_DELIVERY', 'STORE_PICKUP'), required=False, default='HOME_DELIVERY')
    payment_type = serializers.ChoiceField(choices=('COD', 'ONLINE'), required=False, default='COD')
    utr_number = serializers.CharField(required=False, allow_blank=True, max_length=64, default='')
    payment_gateway_ref = serializers.CharField(required=False, allow_blank=True, max_length=128, default='')
    delivery_address = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal('0.00'))
    delivery_distance_km = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    location_url = serializers.URLField(required=False, allow_blank=True, max_length=1000)
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal('0.00'))
    wallet_points_to_redeem = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal('0.00'))
    checkout_verification_token = serializers.UUIDField(write_only=True)

    def validate_customer_phone(self, value):
        value = normalize_phone(value)
        if len(value) != 10:
            raise serializers.ValidationError('Enter a valid 10-digit WhatsApp phone number.')
        return value

    def create(self, validated_data):
        store = self.context['store']
        verification = CheckoutPhoneVerification.objects.filter(
            token=validated_data.pop('checkout_verification_token'),
            store=store,
            customer_phone=validated_data.get('customer_phone', '').strip(),
        ).first()
        if not verification or not verification.is_valid():
            raise serializers.ValidationError({'checkout_verification_token': 'Verify this phone number before placing the order.'})
        requested = validated_data['items']
        product_ids = [item.get('id') for item in requested]
        if any(not isinstance(product_id, int) for product_id in product_ids) or len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError('Invalid cart items.')
        products = Product.objects.filter(id__in=product_ids, store=store, is_published=True, store__is_published=True)
        if products.count() != len(product_ids):
            raise serializers.ValidationError('One or more cart items are no longer available.')
        product_map = {product.id: product for product in products}

        # Stock check validation before transaction
        for item in requested:
            quantity = item.get('quantity', 1)
            product = product_map[item['id']]
            if product.stock_quantity <= 0:
                raise serializers.ValidationError(f"'{product.name}' is out of stock.")
            if product.stock_quantity < quantity:
                raise serializers.ValidationError(f"Only {product.stock_quantity} left for '{product.name}'.")

        snapshots, subtotal = [], Decimal('0.00')
        order_type = validated_data.get('order_type', 'HOME_DELIVERY')

        with transaction.atomic():
            for item in requested:
                quantity = item.get('quantity', 1)
                if not isinstance(quantity, int) or quantity < 1 or quantity > 50:
                    raise serializers.ValidationError('Quantity must be between 1 and 50.')
                product = product_map[item['id']]

                # Deduct stock quantity atomically
                product.stock_quantity = max(0, product.stock_quantity - quantity)
                product.save(update_fields=['stock_quantity'])

                # Strict price calculation from database
                line_total = product.price * quantity
                snapshots.append({
                    'product_id': product.id,
                    'name': product.name,
                    'price': str(product.price),
                    'quantity': quantity,
                    'line_total': str(line_total),
                    'image': product.image.url if product.image else ''
                })
                subtotal += line_total

            # 1. Fulfillment Mode & Minimum Order Enforcement
            if order_type == 'HOME_DELIVERY':
                if getattr(store, 'allow_home_delivery', True) is False:
                    raise serializers.ValidationError({'order_type': 'Home delivery is currently not offered by this store.'})

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
                    dist = Decimal(str(validated_data.get('delivery_distance_km') or 1))
                    server_delivery_fee = per_km_fee * dist
                elif charge_type == 'HYBRID':
                    dist = Decimal(str(validated_data.get('delivery_distance_km') or 1))
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
                codes = [c.strip() for c in c_code.split(',') if c.strip()]
                for code in codes:
                    coupon = Coupon.objects.filter(
                        store=store,
                        code__iexact=code,
                        is_active=True
                    ).filter(
                        models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=timezone.now())
                    ).first()

                    if coupon and subtotal >= coupon.min_order_amount:
                        if coupon.discount_type == 'PERCENTAGE':
                            disc = (subtotal * coupon.discount_value) / Decimal('100.00')
                            if coupon.max_discount_amount and disc > coupon.max_discount_amount:
                                disc = coupon.max_discount_amount
                            server_discount += disc
                        elif coupon.discount_type == 'BOGO':
                            if coupon.product:
                                matching_item = next((it for it in requested if it.get('id') == coupon.product.id), None)
                                qty = matching_item.get('quantity', 1) if matching_item else 1
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
                            server_discount += coupon.discount_value

                        # Increment coupon usage count atomically
                        Coupon.objects.filter(id=coupon.id).update(usage_count=models.F('usage_count') + 1)

                # Check if there was also an active client-side flash sale discount
                client_disc = Decimal(str(validated_data.get('discount_amount', 0)))
                if client_disc > server_discount:
                    flash_diff = min(client_disc - server_discount, (subtotal * Decimal('0.50')))
                    server_discount += flash_diff
            else:
                client_disc = Decimal(str(validated_data.get('discount_amount', 0)))
                server_discount = min(client_disc, (subtotal * Decimal('0.50')))

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
                items=snapshots,
                total=final_total,
                currency='INR',
                order_type=order_type,
                customer_name=c_name,
                customer_phone=c_phone,
                payment_type=validated_data.get('payment_type', 'COD'),
                utr_number=validated_data.get('utr_number', '').strip(),
                payment_gateway_ref=validated_data.get('payment_gateway_ref', '').strip(),
                payment_verified=True if validated_data.get('payment_gateway_ref') else False,
                payment_verified_at=timezone.now() if validated_data.get('payment_gateway_ref') else None,
                delivery_address=validated_data.get('delivery_address', ''),
                delivery_fee=server_delivery_fee,
                delivery_distance_km=validated_data.get('delivery_distance_km'),
                location_url=validated_data.get('location_url', ''),
                coupon_code=c_code,
                discount_amount=server_discount,
                wallet_points_redeemed=wallet_redeemed,
                wallet_cashback_earned=cashback_earned,
            )
            verification.is_used = True
            verification.save(update_fields=['is_used'])
        return order


class WhatsAppOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppOrder
        fields = (
            'id', 'reference', 'tracking_token', 'order_type', 'customer_name', 'customer_phone',
            'payment_type', 'utr_number', 'payment_gateway_ref', 'payment_verified', 'payment_verified_at',
            'delivery_address', 'delivery_fee', 'delivery_distance_km',
            'location_url', 'coupon_code', 'discount_amount', 'wallet_points_redeemed',
            'wallet_cashback_earned', 'items', 'total',
            'currency', 'status', 'cancellation_reason', 'cancelled_by', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'reference', 'tracking_token', 'items', 'total', 'currency', 'created_at', 'updated_at')


class WhatsAppOrderStatusUpdateSerializer(serializers.ModelSerializer):
    """The seller's only permitted post-order change is fulfillment status."""

    ALLOWED_TRANSITIONS = {
        WhatsAppOrder.STATUS_NEW: {
            WhatsAppOrder.STATUS_CONFIRMED,
            WhatsAppOrder.STATUS_CANCELLED,
        },
        WhatsAppOrder.STATUS_CONFIRMED: {
            WhatsAppOrder.STATUS_PAID,
            WhatsAppOrder.STATUS_DELIVERED,
            WhatsAppOrder.STATUS_CANCELLED,
        },
        WhatsAppOrder.STATUS_PAID: {WhatsAppOrder.STATUS_DELIVERED},
        WhatsAppOrder.STATUS_DELIVERED: set(),
        WhatsAppOrder.STATUS_CANCELLED: set(),
    }

    class Meta:
        model = WhatsAppOrder
        fields = ('status',)

    def validate_status(self, value):
        current_status = self.instance.status
        if value == current_status:
            return value
        if value not in self.ALLOWED_TRANSITIONS[current_status]:
            raise serializers.ValidationError(
                f"An order cannot move from {current_status} to {value}."
            )
        return value


class CustomerWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerWallet
        fields = ('customer_phone', 'customer_name', 'balance', 'total_earned', 'total_redeemed', 'updated_at')


