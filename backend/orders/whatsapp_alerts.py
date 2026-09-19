import os
import logging
import requests
from django.conf import settings
from accounts.services import normalize_phone

logger = logging.getLogger(__name__)


def format_order_invoice_text(order) -> str:
    """Formats a clean, comprehensive text bill for WhatsApp delivery."""
    store = order.store
    order_ref = order.reference or order.id
    customer_name = order.customer_name or 'Valued Customer'
    site_url = getattr(settings, 'SITE_PUBLIC_URL', 'https://apanidukan.com').rstrip('/')
    
    tracking_url = f"{site_url}/store/{store.slug}/order/{order_ref}"
    if order.tracking_token:
        tracking_url += f"?token={order.tracking_token}"

    items_text = []
    items = order.items if isinstance(order.items, list) else []
    for it in items:
        name = it.get('name') or it.get('product_name') or 'Item'
        qty = it.get('quantity', 1)
        price = it.get('price', 0)
        items_text.append(f"• *{name}* × {qty} — ₹{price}")

    lines = [
        f"🧾 *ORDER INVOICE / बिल* 🧾",
        f"🏪 *{store.name}*",
        f"Order: *#{order_ref}*",
        f"Customer: *{customer_name}*",
        f"----------------------------------",
        f"📦 *Items Ordered:*",
        *(items_text if items_text else ["• Order items"]),
        f"----------------------------------",
        f"💰 *Bill Summary:*",
        f"Items Total: ₹{order.total}",
        *( [f"Discount: -₹{order.discount_amount}"] if order.discount_amount > 0 else [] ),
        *( [f"Delivery Fee: ₹{order.delivery_fee}"] if order.delivery_fee > 0 else ["Delivery: FREE ₹0.00"] ),
        f"*TOTAL PAYABLE: ₹{order.total}*",
        f"Payment: *{order.payment_type}*",
        f"Fulfillment: *{order.order_type}*",
        *( [f"📍 Address: {order.delivery_address}"] if order.delivery_address else [] ),
        "",
        f"📍 *Live Order Tracking:*",
        f"{tracking_url}",
        "",
        f"🙏 *Thank you for ordering with {store.name}!*",
    ]
    return "\n".join(lines)


def format_seller_alert_text(order) -> str:
    """Formats a high-priority alert for the store owner."""
    store = order.store
    order_ref = order.reference or order.id
    customer_name = order.customer_name or 'Customer'
    customer_phone = order.customer_phone or 'N/A'
    site_url = getattr(settings, 'SITE_PUBLIC_URL', 'https://apanidukan.com').rstrip('/')
    seller_dashboard_url = f"{site_url}/stores/{store.id}/orders"

    lines = [
        f"🚨 *NEW ORDER RECEIVED* 🚨",
        f"🏪 Store: *{store.name}*",
        f"Order ID: *#{order_ref}*",
        f"Amount: *₹{order.total}* ({order.payment_type})",
        f"Customer: *{customer_name}* ({customer_phone})",
        f"Fulfillment: *{order.order_type}*",
        *( [f"Address: {order.delivery_address}"] if order.delivery_address else [] ),
        "",
        f"👉 *Open Seller Dashboard to accept & pack:*",
        f"{seller_dashboard_url}",
    ]
    return "\n".join(lines)


def send_whatsapp_message(to_phone: str, message: str) -> bool:
    """
    Sends outbound WhatsApp message using configured provider:
    1. MSG91 WhatsApp API (if MSG91_AUTH_KEY is configured)
    2. Meta WhatsApp Cloud API (if WHATSAPP_CLOUD_API_TOKEN is configured)
    3. Custom Webhook (if WHATSAPP_WEBHOOK_URL is configured)
    """
    clean_phone = normalize_phone(to_phone)
    if not clean_phone or len(clean_phone) < 10:
        return False
    formatted_phone = f"91{clean_phone}" if len(clean_phone) == 10 else clean_phone

    # 1. Custom Webhook Dispatch
    webhook_url = os.getenv('WHATSAPP_WEBHOOK_URL', getattr(settings, 'WHATSAPP_WEBHOOK_URL', ''))
    if webhook_url:
        try:
            requests.post(
                webhook_url,
                json={"phone": formatted_phone, "message": message, "channel": "whatsapp"},
                timeout=5
            )
            logger.info(f"[WhatsApp Alert] Sent to webhook for {formatted_phone}")
            return True
        except Exception as e:
            logger.warning(f"[WhatsApp Alert] Webhook delivery failed: {e}")

    # 2. Meta WhatsApp Cloud API (Official)
    cloud_token = os.getenv('WHATSAPP_CLOUD_API_TOKEN', getattr(settings, 'WHATSAPP_CLOUD_API_TOKEN', ''))
    phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID', getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', ''))
    if cloud_token and phone_number_id:
        try:
            url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {cloud_token}",
                "Content-Type": "application/json",
            }
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": formatted_phone,
                "type": "text",
                "text": {"preview_url": True, "body": message}
            }
            res = requests.post(url, headers=headers, json=payload, timeout=8)
            logger.info(f"[WhatsApp Cloud API] Dispatched to {formatted_phone} (Status {res.status_code})")
            return res.status_code in (200, 201)
        except Exception as e:
            logger.warning(f"[WhatsApp Cloud API] Delivery failed: {e}")

    # 3. MSG91 WhatsApp Outbound API
    msg91_key = os.getenv('MSG91_AUTH_KEY', getattr(settings, 'MSG91_AUTH_KEY', ''))
    msg91_integrated_no = os.getenv('MSG91_WHATSAPP_INTEGRATED_NUMBER', getattr(settings, 'MSG91_WHATSAPP_INTEGRATED_NUMBER', ''))
    if msg91_key and msg91_integrated_no:
        try:
            url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/"
            headers = {"authkey": msg91_key, "Content-Type": "application/json"}
            payload = {
                "integrated_number": msg91_integrated_no,
                "content_type": "text",
                "payload": {
                    "to": formatted_phone,
                    "type": "text",
                    "text": {"body": message}
                }
            }
            res = requests.post(url, headers=headers, json=payload, timeout=8)
            logger.info(f"[MSG91 WhatsApp] Dispatched to {formatted_phone} (Status {res.status_code})")
            return res.status_code in (200, 201)
        except Exception as e:
            logger.warning(f"[MSG91 WhatsApp] Delivery failed: {e}")

    # If no automated gateway is configured yet, log the ready-to-send payload
    logger.info(f"[WhatsApp Alert Logger] Message ready for {formatted_phone}:\n{message}")
    return True


def send_automated_order_whatsapp_alerts(order) -> dict:
    """
    Triggers automated WhatsApp alerts for both Customer and Store Owner.
    Safe & Non-blocking.
    """
    results = {"customer_sent": False, "seller_sent": False}
    try:
        store = order.store

        # 1. Customer Invoice Alert
        if order.customer_phone:
            cust_msg = format_order_invoice_text(order)
            results["customer_sent"] = send_whatsapp_message(order.customer_phone, cust_msg)

        # 2. Seller New Order Alert
        seller_phone = store.phone_number or getattr(store.owner, 'phone_number', '')
        if seller_phone:
            seller_msg = format_seller_alert_text(order)
            results["seller_sent"] = send_whatsapp_message(seller_phone, seller_msg)

    except Exception as e:
        logger.warning(f"[WhatsApp Alerts] Error sending order alerts for #{order.reference}: {e}")

    return results
