const express = require('express');
const { createOrder, getOrders, updateOrder } = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', createOrder);
router.get('/', protect, adminOnly, getOrders);
router.patch('/:id', protect, adminOnly, updateOrder);

module.exports = router;
