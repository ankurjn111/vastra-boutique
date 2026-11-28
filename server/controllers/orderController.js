const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendOrderNotifications, sendOrderCancellationNotification } = require('../services/whatsappService');

const createOrderNumber = () => `VB${Date.now().toString().slice(-8)}${crypto.randomInt(100, 999)}`;

exports.createOrder = async (req, res) => {
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return res.status(400).json({ message: 'A valid checkout request key is required. Please retry checkout.' });
  }

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

  const session = await mongoose.startSession();
  let createdOrder;
  let duplicateRequest = false;

  try {
    await session.withTransaction(async () => {
      const existing = await Order.findOne({ idempotencyKey }).session(session);
      if (existing) {
        createdOrder = existing;
        duplicateRequest = true;
        return;
      }

      const normalized = [];
      let subtotal = 0;

      for (const item of items) {
        if (!mongoose.isValidObjectId(item.productId)) {
          const error = new Error('A product in your cart is no longer available.');
          error.statusCode = 400;
          throw error;
        }

        const quantity = Number(item.quantity);
        const size = String(item.size || '').trim();
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !size) {
          const error = new Error('Please check product quantities and sizes.');
          error.statusCode = 400;
          throw error;
        }

        // Atomic conditional decrement prevents two concurrent checkouts selling the same stock.
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, sizes: size, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session },
        );

        if (!product) {
          const currentProduct = await Product.findById(item.productId).session(session);
          if (!currentProduct) {
            const error = new Error('A product in your cart is no longer available. Refresh your cart.');
            error.statusCode = 409;
            throw error;
          }
          if (!currentProduct.sizes.includes(size)) {
            const error = new Error(`${currentProduct.name} is not available in size ${size}.`);
            error.statusCode = 409;
            throw error;
          }
          const error = new Error(`Only ${currentProduct.stock} unit(s) of ${currentProduct.name} are currently available.`);
          error.statusCode = 409;
          throw error;
        }

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

      const [order] = await Order.create([{
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
      }], { session });

      createdOrder = order;
    });

    if (!createdOrder) {
      return res.status(500).json({ message: 'We could not place your order right now. Please try again.' });
    }

    // A duplicate retry must not send another notification or reserve stock again.
    if (duplicateRequest) {
      return res.status(200).json({
        order: {
          orderNumber: createdOrder.orderNumber,
          total: createdOrder.total,
          paymentMethod: createdOrder.paymentMethod,
          paymentStatus: createdOrder.paymentStatus,
          orderStatus: createdOrder.orderStatus,
        },
        duplicate: true,
      });
    }

    let whatsappNotifications = [];
    try {
      whatsappNotifications = await sendOrderNotifications(createdOrder);
    } catch (notificationError) {
      console.error('Order saved, but WhatsApp notifications failed:', notificationError.message);
    }

    return res.status(201).json({
      order: {
        _id: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        total: createdOrder.total,
        paymentMethod: createdOrder.paymentMethod,
        paymentStatus: createdOrder.paymentStatus,
        orderStatus: createdOrder.orderStatus,
        createdAt: createdOrder.createdAt,
      },
      notifications: {
        ownerWhatsAppSent: Boolean(whatsappNotifications[0]?.sent),
        customerWhatsAppRequested: createdOrder.whatsappUpdatesOptIn,
        customerWhatsAppSent: createdOrder.whatsappUpdatesOptIn ? Boolean(whatsappNotifications[1]?.sent) : false,
      },
      message: paymentMethod === 'online'
        ? 'Order received. The boutique will contact you with secure online payment instructions before processing.'
        : 'Your order has been placed. The boutique will contact you to confirm delivery.',
    });
  } catch (error) {
    if (error.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey }).select('orderNumber total paymentMethod paymentStatus orderStatus');
      if (existing) return res.status(200).json({ order: existing, duplicate: true });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error('Create order error:', error);
    return res.status(500).json({ message: 'We could not place your order right now. Please try again.' });
  } finally {
    await session.endSession();
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
  const cancellationReasons = ['Customer requested', 'Product unavailable', 'Payment not received', 'Other'];
  if (req.body.orderStatus === 'cancelled') {
    if (!cancellationReasons.includes(req.body.cancellationReason)) {
      return res.status(400).json({ message: 'Please select a valid cancellation reason.' });
    }
    updates.cancellationReason = req.body.cancellationReason;
  }
  if (req.body.orderStatus !== undefined) {
    if (!allowedStatuses.includes(req.body.orderStatus)) return res.status(400).json({ message: 'Invalid order status.' });
    updates.orderStatus = req.body.orderStatus;
  }
  if (req.body.paymentStatus !== undefined) {
    if (!allowedPaymentStatuses.includes(req.body.paymentStatus)) return res.status(400).json({ message: 'Invalid payment status.' });
    updates.paymentStatus = req.body.paymentStatus;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No valid order updates were supplied.' });

  const session = await mongoose.startSession();
  let updatedOrder;
  let shouldNotifyCancellation = false;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);
      if (!order) {
        const error = new Error('Order not found.');
        error.statusCode = 404;
        throw error;
      }

      if (order.orderStatus === 'cancelled' && updates.orderStatus && updates.orderStatus !== 'cancelled') {
        const error = new Error('A cancelled order cannot be reopened. Create a new order instead.');
        error.statusCode = 409;
        throw error;
      }

      const isNewCancellation = updates.orderStatus === 'cancelled' && order.orderStatus !== 'cancelled';
      shouldNotifyCancellation = isNewCancellation;
      if (isNewCancellation) {
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            { session },
          );
        }
      }

      Object.assign(order, updates);
      updatedOrder = await order.save({ session });
    });

    let cancellationNotification = { sent: false, skipped: true };
    if (shouldNotifyCancellation) {
      try {
        cancellationNotification = await sendOrderCancellationNotification(updatedOrder);
      } catch (notificationError) {
        console.error('Order cancelled, but customer WhatsApp notification failed:', notificationError.message);
        cancellationNotification = { sent: false, reason: 'WhatsApp notification failed.' };
      }
    }
    return res.json({
      ...updatedOrder.toObject(),
      cancellationNotification,
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error('Update order error:', error);
    return res.status(400).json({ message: 'Order could not be updated.' });
  } finally {
    await session.endSession();
  }
};
