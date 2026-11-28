const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendOrderNotifications } = require('../services/whatsappService');

const createOrderNumber = () => `VB${Date.now().toString().slice(-8)}${crypto.randomInt(100, 999)}`;

exports.createOrder = async (req, res) => {
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return res.status(400).json({ message: 'A valid checkout request key is required. Please retry checkout.' });
  }

  try {
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) return res.status(200).json({ order: existing, duplicate: true });

    const { customer, items, paymentMethod, customerNote = '' } = req.body || {};
    const requiredCustomerFields = ['name', 'phone', 'address', 'city', 'state', 'pincode'];
    if (!customer || requiredCustomerFields.some((field) => !String(customer[field] || '').trim())) {
      return res.status(400).json({ message: 'Please complete all required delivery details.' });
    }
    if (!/^[6-9]\d{9}$/.test(String(customer.phone).replace(/\D/g, ''))) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' });
    }
    if (!/^\d{6}$/.test(String(customer.pincode).trim())) {
      return res.status(400).json({ message: 'Enter a valid 6-digit pincode.' });
    }
    if (!['cod', 'online'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Choose Cash on Delivery or Online payment.' });
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 30) {
      return res.status(400).json({ message: 'Your cart is empty or contains too many different items.' });
    }

    const location = customer.location;
    const hasValidLocation = location && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))
      && Number(location.latitude) >= -90 && Number(location.latitude) <= 90
      && Number(location.longitude) >= -180 && Number(location.longitude) <= 180;

    const normalized = [];
    let subtotal = 0;
    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId)) {
        return res.status(400).json({ message: 'A product in your cart is no longer available.' });
      }
      const quantity = Number(item.quantity);
      const size = String(item.size || '').trim();
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !size) {
        return res.status(400).json({ message: 'Please check product quantities and sizes.' });
      }
      const product = await Product.findById(item.productId);
      if (!product) return res.status(409).json({ message: 'A product in your cart is no longer available. Refresh your cart.' });
      if (!product.sizes.includes(size)) return res.status(409).json({ message: `${product.name} is not available in size ${size}.` });
      if (product.stock < quantity) return res.status(409).json({ message: `Only ${product.stock} unit(s) of ${product.name} are currently available.` });
      const unitPrice = Number(product.discountPrice > 0 ? product.discountPrice : product.price);
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;
      normalized.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        size,
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    const order = await Order.create({
      orderNumber: createOrderNumber(),
      idempotencyKey,
      customer: {
        name: String(customer.name).trim().slice(0, 100),
        phone: String(customer.phone).replace(/\D/g, '').slice(-10),
        email: String(customer.email || '').trim().slice(0, 160),
        address: String(customer.address).trim().slice(0, 500),
        city: String(customer.city).trim().slice(0, 80),
        state: String(customer.state).trim().slice(0, 80),
        pincode: String(customer.pincode).trim(),
        ...(hasValidLocation ? { location: { latitude: Number(location.latitude), longitude: Number(location.longitude) } } : {}),
      },
      items: normalized,
      subtotal,
      shipping: 0,
      total: subtotal,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'placed',
      customerNote: String(customerNote).trim().slice(0, 500),
      whatsappUpdatesOptIn: req.body.whatsappUpdates === true,
    });

    let whatsappNotifications = [];
    try {
      whatsappNotifications = await sendOrderNotifications(order);
    } catch (notificationError) {
      console.error('Order saved, but WhatsApp notifications failed:', notificationError.message);
    }

    return res.status(201).json({
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      },
      notifications: {
        ownerWhatsAppSent: Boolean(whatsappNotifications[0]?.sent),
        customerWhatsAppRequested: order.whatsappUpdatesOptIn,
        customerWhatsAppSent: order.whatsappUpdatesOptIn ? Boolean(whatsappNotifications[1]?.sent) : false,
      },
      message: paymentMethod === 'online'
        ? 'Order received. The boutique will contact you with secure online payment instructions before processing.'
        : 'Your order has been placed. The boutique will contact you to confirm delivery.',
    });
  } catch (error) {
    if (error.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) return res.status(200).json({ order: existing, duplicate: true });
    }
    console.error('Create order error:', error);
    return res.status(500).json({ message: 'We could not place your order right now. Please try again.' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Orders could not be loaded.' });
  }
};

exports.updateOrder = async (req, res) => {
  const allowedStatuses = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const allowedPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
  const updates = {};
  if (req.body.orderStatus !== undefined) {
    if (!allowedStatuses.includes(req.body.orderStatus)) return res.status(400).json({ message: 'Invalid order status.' });
    updates.orderStatus = req.body.orderStatus;
  }
  if (req.body.paymentStatus !== undefined) {
    if (!allowedPaymentStatuses.includes(req.body.paymentStatus)) return res.status(400).json({ message: 'Invalid payment status.' });
    updates.paymentStatus = req.body.paymentStatus;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No valid order updates were supplied.' });
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: 'Order could not be updated.' });
  }
};
