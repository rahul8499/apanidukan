from rest_framework import serializers
from .models import Order, OrderItem, Payment, WhatsAppOrder
from products.models import Product
from django.db import transaction
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
    payment_type = serializers.ChoiceField(choices=('COD', 'ONLINE'), required=False, default='COD')
    delivery_address = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    location_url = serializers.URLField(required=False, allow_blank=True, max_length=1000)

    def validate_customer_phone(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('WhatsApp phone number is required.')
        return value

    def create(self, validated_data):
        store = self.context['store']
        requested = validated_data['items']
        product_ids = [item.get('id') for item in requested]
        if any(not isinstance(product_id, int) for product_id in product_ids) or len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError('Invalid cart items.')
        products = Product.objects.filter(id__in=product_ids, store=store, is_published=True, store__is_published=True)
        if products.count() != len(product_ids):
            raise serializers.ValidationError('A cart item is no longer available.')
        product_map = {product.id: product for product in products}
        
        # Stock check validation before transaction
        for item in requested:
            quantity = item.get('quantity', 1)
            product = product_map[item['id']]
            if product.stock_quantity <= 0:
                raise serializers.ValidationError(f"'{product.name}' is out of stock.")
            if product.stock_quantity < quantity:
                raise serializers.ValidationError(f"Only {product.stock_quantity} left for '{product.name}'.")

        snapshots, total = [], Decimal('0.00')
        with transaction.atomic():
            for item in requested:
                quantity = item.get('quantity', 1)
                if not isinstance(quantity, int) or quantity < 1 or quantity > 50:
                    raise serializers.ValidationError('Quantity must be between 1 and 50.')
                product = product_map[item['id']]

                # Deduct stock quantity atomically
                product.stock_quantity = max(0, product.stock_quantity - quantity)
                product.save(update_fields=['stock_quantity'])

                line_total = product.price * quantity
                snapshots.append({'product_id': product.id, 'name': product.name, 'price': str(product.price), 'quantity': quantity, 'line_total': str(line_total)})
                total += line_total

            order = WhatsAppOrder.objects.create(
                store=store,
                items=snapshots,
                total=total,
                currency='INR',
                customer_name=validated_data.get('customer_name', ''),
                customer_phone=validated_data.get('customer_phone', ''),
                payment_type=validated_data.get('payment_type', 'COD'),
                delivery_address=validated_data.get('delivery_address', ''),
                location_url=validated_data.get('location_url', ''),
            )
        return order


class WhatsAppOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppOrder
        fields = ('id', 'reference', 'customer_name', 'customer_phone', 'payment_type', 'delivery_address', 'location_url', 'items', 'total', 'currency', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'reference', 'items', 'total', 'currency', 'created_at', 'updated_at')
