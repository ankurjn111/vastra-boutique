import React, { useCallback, useEffect, useState } from 'react';
import formatPrice from '../utils/formatPrice.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'vastra-admin-token';
const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const CANCELLATION_REASONS = ['Customer requested', 'Product unavailable', 'Payment not received', 'Other'];

function AdminOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [cancellationOrderId, setCancellationOrderId] = useState('');
  const [cancellationReason, setCancellationReason] = useState(CANCELLATION_REASONS[0]);
  const [notice, setNotice] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Orders could not be loaded.');
      setOrders(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Orders could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  async function updateOrder(id, updates) {
    setSavingId(id);
    setError('');
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Order could not be updated.');
      setOrders((current) => current.map((order) => order._id === id ? data : order));
      setCancellationOrderId('');
      setNotice(updates.orderStatus === 'cancelled'
        ? (data.cancellationNotification?.sent
          ? 'Order cancelled. Customer WhatsApp notification sent.'
          : data.cancellationNotification?.skipped
            ? 'Order cancelled and stock restored. Customer did not opt in to WhatsApp updates.'
            : 'Order cancelled and stock restored. WhatsApp notification was not sent; check Meta template configuration.')
        : 'Order updated successfully.');
    } catch (updateError) {
      setError(updateError.message || 'Order could not be updated.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <section className="admin-order-list">
      <div className="admin-panel__heading">
        <div><span className="eyebrow"><span className="eyebrow__line" /> CUSTOMER ORDERS</span><h2>Orders</h2></div>
        <button className="button button--outline" type="button" onClick={loadOrders} disabled={loading}>Refresh</button>
      </div>
      {error && <p className="admin-form-message admin-form-message--error" role="alert">{error}</p>}
      {notice && <p className="admin-form-message admin-form-message--success" role="status">{notice}</p>}
      {loading ? <p className="admin-list-message">Loading orders…</p> : orders.length === 0 ? <p className="admin-list-message">No orders yet. New customer orders will appear here.</p> : (
        <div className="admin-orders">
          {orders.map((order) => (
            <article className="admin-order" key={order._id}>
              <div className="admin-order__top">
                <div><strong>{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleString('en-IN')}</span></div>
                <strong>{formatPrice(order.total)}</strong>
              </div>
              <div className="admin-order__customer">
                <strong>{order.customer?.name}</strong><span>{order.customer?.phone}</span>
                <p>{order.customer?.address}, {order.customer?.city}, {order.customer?.state} – {order.customer?.pincode}</p>
              </div>
              <div className="admin-order__items">
                {order.items?.map((item, index) => (
                  <div className="admin-order__item" key={`${order._id}-${index}`}>
                    {item.image ? (
                      <img className="admin-order__item-image" src={item.image} alt={item.name} loading="lazy" />
                    ) : (
                      <div className="admin-order__item-image admin-order__item-image--empty" aria-label="Product image unavailable">No image</div>
                    )}
                    <div className="admin-order__item-details">
                      <strong>{item.name}</strong>
                      <span>Size: {item.size} · Qty: {item.quantity}</span>
                    </div>
                    <strong className="admin-order__item-price">{formatPrice(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="admin-order__meta"><span>Payment: <strong>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}</strong></span><span>Payment status: <strong>{order.paymentStatus}</strong></span></div>
              {order.orderStatus === 'cancelled' && order.cancellationReason && (
                <p className="admin-order__cancellation-reason">Cancellation reason: <strong>{order.cancellationReason}</strong></p>
              )}
              <div className="admin-order__controls">
                <label>Order status<select value={order.orderStatus} disabled={savingId === order._id || order.orderStatus === 'cancelled'} onChange={(event) => {
                  if (event.target.value === 'cancelled') {
                    setCancellationOrderId(order._id);
                    setCancellationReason(CANCELLATION_REASONS[0]);
                  } else {
                    updateOrder(order._id, { orderStatus: event.target.value });
                  }
                }}>{ORDER_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}</select></label>
                <label>Payment status<select value={order.paymentStatus} disabled={savingId === order._id} onChange={(event) => updateOrder(order._id, { paymentStatus: event.target.value })}>{PAYMENT_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}</select></label>
              </div>
              {cancellationOrderId === order._id && (
                <div className="admin-order-cancel">
                  <div>
                    <strong>Cancel this order?</strong>
                    <p>Stock will be restored automatically. The customer will receive a WhatsApp message only if they opted in to order updates.</p>
                  </div>
                  <label>Reason for cancellation
                    <select value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)}>
                      {CANCELLATION_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                    </select>
                  </label>
                  <div className="admin-order-cancel__actions">
                    <button type="button" className="button button--outline" disabled={savingId === order._id} onClick={() => setCancellationOrderId('')}>Keep order</button>
                    <button type="button" className="button button--dark" disabled={savingId === order._id} onClick={() => updateOrder(order._id, { orderStatus: 'cancelled', cancellationReason })}>
                      {savingId === order._id ? 'Cancelling…' : 'Confirm cancellation'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminOrderList;
