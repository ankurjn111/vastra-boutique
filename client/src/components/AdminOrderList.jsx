import React, { useCallback, useEffect, useState } from 'react';
import formatPrice from '../utils/formatPrice.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'vastra-admin-token';
const ORDER_STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

function AdminOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

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
              <ul className="admin-order__items">
                {order.items?.map((item, index) => <li key={`${order._id}-${index}`}>{item.name} · {item.size} × {item.quantity} <strong>{formatPrice(item.lineTotal)}</strong></li>)}
              </ul>
              <div className="admin-order__meta"><span>Payment: <strong>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}</strong></span><span>Payment status: <strong>{order.paymentStatus}</strong></span></div>
              <div className="admin-order__controls">
                <label>Order status<select value={order.orderStatus} disabled={savingId === order._id} onChange={(event) => updateOrder(order._id, { orderStatus: event.target.value })}>{ORDER_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}</select></label>
                <label>Payment status<select value={order.paymentStatus} disabled={savingId === order._id} onChange={(event) => updateOrder(order._id, { paymentStatus: event.target.value })}>{PAYMENT_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}</select></label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminOrderList;
