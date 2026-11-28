const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Products could not be loaded.' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Product could not be loaded.' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const saved = await new Product(req.body).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  const allowedFields = ['name', 'description', 'category', 'price', 'discountPrice', 'sizes', 'stock', 'fabric'];
  const updates = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No valid product fields were supplied.' });

  if (updates.stock !== undefined && (!Number.isInteger(Number(updates.stock)) || Number(updates.stock) < 0)) {
    return res.status(400).json({ message: 'Stock must be a whole number of zero or more.' });
  }
  if (updates.price !== undefined && (!Number.isFinite(Number(updates.price)) || Number(updates.price) <= 0)) {
    return res.status(400).json({ message: 'Price must be greater than zero.' });
  }
  if (updates.discountPrice !== undefined && updates.discountPrice !== null
    && (!Number.isFinite(Number(updates.discountPrice)) || Number(updates.discountPrice) <= 0
      || Number(updates.discountPrice) >= Number(updates.price ?? (await Product.findById(req.params.id))?.price))) {
    return res.status(400).json({ message: 'Offer price must be greater than zero and lower than the regular price.' });
  }
  if (updates.sizes !== undefined && (!Array.isArray(updates.sizes) || updates.sizes.length === 0
    || updates.sizes.some((size) => typeof size !== 'string' || !size.trim()))) {
    return res.status(400).json({ message: 'Add at least one valid size.' });
  }

  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    Object.assign(product, updates);
    const updated = await product.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product ID.' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Keep product references intact for historical orders and cancellation/restock processing.
    const hasOrderHistory = await Order.exists({ 'items.product': product._id });
    if (hasOrderHistory) {
      return res.status(409).json({ message: 'This product has order history and cannot be deleted. Set its stock to 0 instead.' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Product could not be deleted.' });
  }
};
