import React, { useState } from 'react';
import formatPrice from '../utils/formatPrice.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: 'Jaipur',
  state: 'Rajasthan',
  pincode: '',
  customerNote: '',
  paymentMethod: 'cod',
};

function CheckoutModal({ cart, cartTotal, onClose, onOrderPlaced, onNotice }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (submitting || !cart.length) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': window.crypto?.randomUUID?.() || `vb-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email,
            address: form.address,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
          customerNote: form.customerNote,
          paymentMethod: form.paymentMethod,
          items: cart.map((item) => ({ productId: item.id, size: item.size, quantity: item.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Your order could not be placed.');
      setPlacedOrder(data);
      onOrderPlaced();
    } catch (submitError) {
      setError(submitError.message || 'Your order could not be placed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <header className="checkout-modal__header">
          <div><span className="eyebrow">A FEW DETAILS</span><h2 id="checkout-title">{placedOrder ? 'Thank you.' : 'Complete your order'}</h2></div>
          {!placedOrder && <button className="icon-button" type="button" onClick={onClose} aria-label="Close checkout">×</button>}
        </header>
        {placedOrder ? (
          <div className="checkout-success">
            <span className="checkout-success__mark">✓</span>
            <h3>Order received</h3>
            <p>Your order number is <strong>{placedOrder.order?.orderNumber}</strong>.</p>
            <p>{placedOrder.message}</p>
            <p className="checkout-success__total">Order total: {formatPrice(placedOrder.order?.total || cartTotal)}</p>
            <button className="button button--dark" type="button" onClick={onClose}>Continue browsing</button>
          </div>
        ) : (
          <form onSubmit={submitCheckout}>
            <div className="checkout-form-grid">
              <label>Full name *<input name="name" value={form.name} onChange={updateField} required maxLength="100" autoComplete="name" /></label>
              <label>Mobile number *<input name="phone" type="tel" value={form.phone} onChange={updateField} required pattern="[6-9][0-9]{9}" maxLength="10" title="Enter a 10-digit Indian mobile number" autoComplete="tel" /></label>
              <label className="checkout-field--wide">Email (optional)<input name="email" type="email" value={form.email} onChange={updateField} maxLength="160" autoComplete="email" /></label>
              <label className="checkout-field--wide">Delivery address *<textarea name="address" value={form.address} onChange={updateField} required rows="2" maxLength="500" autoComplete="street-address" /></label>
              <label>City *<input name="city" value={form.city} onChange={updateField} required maxLength="80" autoComplete="address-level2" /></label>
              <label>State *<input name="state" value={form.state} onChange={updateField} required maxLength="80" autoComplete="address-level1" /></label>
              <label>Pincode *<input name="pincode" value={form.pincode} onChange={updateField} required pattern="[0-9]{6}" maxLength="6" autoComplete="postal-code" /></label>
              <label className="checkout-field--wide">Order note (optional)<textarea name="customerNote" value={form.customerNote} onChange={updateField} rows="2" maxLength="500" placeholder="Any delivery or stitching instructions?" /></label>
            </div>
            <fieldset className="checkout-payment">
              <legend>Payment method</legend>
              <label><input type="radio" name="paymentMethod" value="cod" checked={form.paymentMethod === 'cod'} onChange={updateField} /> <span><strong>Cash on Delivery</strong><small>Pay when your order arrives.</small></span></label>
              <label><input type="radio" name="paymentMethod" value="online" checked={form.paymentMethod === 'online'} onChange={updateField} /> <span><strong>Online payment</strong><small>We will contact you with a secure payment link before processing. Payment is not collected on this screen.</small></span></label>
            </fieldset>
            <div className="checkout-total"><span>Order total</span><strong>{formatPrice(cartTotal)}</strong></div>
            {error && <p className="checkout-error" role="alert">{error}</p>}
            <button className="button button--dark checkout-submit" type="submit" disabled={submitting}>{submitting ? 'Placing order…' : 'Place order'}</button>
            <p className="checkout-disclaimer">Final prices are calculated securely by the boutique server. Your order is not confirmed as paid until payment is verified.</p>
          </form>
        )}
      </section>
    </div>
  );
}

export default CheckoutModal;
