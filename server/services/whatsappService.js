const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v27.0';

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return '';
}

function templateMessage(to, templateName, languageCode, parameters) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [{
        type: 'body',
        parameters: parameters.map((value) => ({ type: 'text', text: String(value || '-').slice(0, 900) })),
      }],
    },
  };
}

async function sendTemplate(to, templateName, parameters) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId || !templateName) {
    return { sent: false, reason: 'WhatsApp Cloud API is not fully configured.' };
  }
  if (!to) return { sent: false, reason: 'Recipient phone number is invalid.' };

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateMessage(
        to,
        templateName,
        process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
        parameters,
      )),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('WhatsApp template send failed:', response.status, data.error?.message || 'Unknown API error');
    return { sent: false, reason: data.error?.message || 'WhatsApp provider rejected the message.' };
  }
  return { sent: true, messageId: data.messages?.[0]?.id || null };
}

function formatOrderItems(items) {
  return items.map((item) => `${item.name} (Size ${item.size}) x${item.quantity}`).join('; ').slice(0, 900);
}

async function sendOrderNotifications(order) {
  const ownerPhone = normalizePhone(process.env.WHATSAPP_OWNER_PHONE || '8005642838');
  const customerPhone = normalizePhone(order.customer?.phone);
  const paymentLabel = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online payment';
  const itemSummary = formatOrderItems(order.items || []);
  const address = [
    order.customer?.address,
    order.customer?.city,
    order.customer?.state,
    order.customer?.pincode,
  ].filter(Boolean).join(', ');

  const results = await Promise.allSettled([
    sendTemplate(ownerPhone, process.env.WHATSAPP_OWNER_TEMPLATE, [
      order.orderNumber,
      order.customer?.name,
      customerPhone,
      address,
      itemSummary,
      order.total,
      paymentLabel,
    ]),
    ...(order.whatsappUpdatesOptIn ? [
      sendTemplate(customerPhone, process.env.WHATSAPP_CUSTOMER_TEMPLATE, [
        order.orderNumber,
        order.customer?.name,
        itemSummary,
        order.total,
        paymentLabel,
      ]),
    ] : []),
  ]);

  return results.map((result) => result.status === 'fulfilled'
    ? result.value
    : { sent: false, reason: 'WhatsApp notification could not be sent.' });
}


async function sendOrderCancellationNotification(order) {
  if (!order.whatsappUpdatesOptIn) {
    return { sent: false, skipped: true, reason: 'Customer did not opt in to WhatsApp order updates.' };
  }

  const customerPhone = normalizePhone(order.customer?.phone);
  return sendTemplate(customerPhone, process.env.WHATSAPP_CANCELLATION_TEMPLATE, [
    order.orderNumber,
    order.customer?.name,
    order.cancellationReason || 'Please contact the boutique for details.',
    order.total,
  ]);
}

module.exports = { sendOrderNotifications, sendOrderCancellationNotification };
