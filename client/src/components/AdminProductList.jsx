import React, { useState } from 'react';
import formatPrice from '../utils/formatPrice.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'vastra-admin-token';

function AdminProductList({ products, loading, error, onRetry, onUpdated }) {
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({});
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  function startEdit(product) {
    setEditingId(product._id);
    setEditForm({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      fabric: product.fabric || '',
      price: String(product.price ?? ''),
      discountPrice: product.discountPrice ? String(product.discountPrice) : '',
      sizes: (product.sizes || []).join(', '),
      stock: String(product.stock ?? 0),
    });
    setMessage('');
    setActionError('');
  }

  async function saveEdit(event) {
    event.preventDefault();
    setBusyId(editingId);
    setMessage('');
    setActionError('');
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Admin session expired. Please sign in again.');
      const payload = {
        ...editForm,
        price: Number(editForm.price),
        discountPrice: editForm.discountPrice ? Number(editForm.discountPrice) : undefined,
        sizes: editForm.sizes.split(',').map((size) => size.trim()).filter(Boolean),
        stock: Number(editForm.stock),
      };
      if (!payload.discountPrice) delete payload.discountPrice;
      const response = await fetch(`${API_URL}/products/${editingId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Product could not be updated.');
      setEditingId('');
      setMessage('Product details updated.');
      onUpdated();
    } catch (err) {
      setActionError(err.message || 'Product could not be updated.');
    } finally {
      setBusyId('');
    }
  }

  async function changeStock(product, amount) {
    const nextStock = Number(product.stock || 0) + amount;
    if (nextStock < 0) return;
    setBusyId(product._id);
    setMessage('');
    setActionError('');
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Admin session expired. Please sign in again.');
      const response = await fetch(`${API_URL}/products/${product._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: nextStock }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Stock could not be updated.');
      setMessage(`Stock updated: ${product.name} now has ${nextStock} unit(s).`);
      onUpdated();
    } catch (err) {
      setActionError(err.message || 'Stock could not be updated.');
    } finally {
      setBusyId('');
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}" from the catalog? This cannot be undone.`)) return;
    setBusyId(product._id);
    setMessage('');
    setActionError('');
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('Admin session expired. Please sign in again.');
      const response = await fetch(`${API_URL}/products/${product._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Product could not be deleted.');
      if (editingId === product._id) setEditingId('');
      setMessage(`${product.name} deleted from catalog.`);
      onUpdated();
    } catch (err) {
      setActionError(err.message || 'Product could not be deleted.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <section className="admin-product-list">
      <div className="admin-panel__heading">
        <div>
          <span className="eyebrow"><span className="eyebrow__line" /> YOUR STORE</span>
          <h2>Catalog <span>({products.length})</span></h2>
        </div>
      </div>
      {message && <p className="admin-form-message admin-form-message--success" role="status">{message}</p>}
      {actionError && <p className="admin-form-message admin-form-message--error" role="alert">{actionError}</p>}
      {loading ? (
        <p className="admin-list-message">Loading your dresses…</p>
      ) : error ? (
        <div className="admin-list-message">
          <p className="admin-form-message admin-form-message--error">{error}</p>
          <button className="button button--outline" onClick={onRetry}>Try again</button>
        </div>
      ) : products.length ? (
        <div className="admin-products">
          {products.map((product) => (
            <React.Fragment key={product._id}>
              <article className="admin-product">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} />
                ) : (
                  <div className="admin-product__placeholder">vastra</div>
                )}
                <div className="admin-product__details">
                  <span>{product.category}{product.fabric ? ` · ${product.fabric}` : ''}</span>
                  <h3>{product.name}</h3>
                  <p className="admin-product__sizes">{product.sizes?.join(' · ') || 'Sizes not set'}</p>
                  <div className="admin-product__stock" aria-label={`Update stock for ${product.name}`}>
                    <span className="admin-product__stock-label">Stock</span>
                    <strong className={`admin-product__stock-count${Number(product.stock || 0) === 0 ? ' is-out' : ''}`}>{product.stock ?? 0}</strong>
                    <button type="button" aria-label={`Decrease ${product.name} stock`} disabled={busyId === product._id || Number(product.stock || 0) <= 0} onClick={() => changeStock(product, -1)}>−</button>
                    <button type="button" aria-label={`Increase ${product.name} stock`} disabled={busyId === product._id} onClick={() => changeStock(product, 1)}>+</button>
                  </div>
                </div>
                <div className="admin-product__actions">
                  <strong>{formatPrice(product.discountPrice || product.price)}</strong>
                  <button type="button" className="button button--outline" disabled={busyId === product._id} onClick={() => startEdit(product)}>Edit</button>
                  <button type="button" className="admin-product__delete" disabled={busyId === product._id} onClick={() => deleteProduct(product)}>Delete</button>
                </div>
              </article>
              {editingId === product._id && (
                <form className="admin-product-edit" onSubmit={saveEdit}>
                  <div className="admin-product-edit__heading">
                    <h3>Edit product</h3>
                    <button type="button" className="admin-product-edit__close" onClick={() => setEditingId('')}>Close</button>
                  </div>
                  <div className="admin-form-grid">
                    {[
                      ['name', 'Product name', 'text'],
                      ['category', 'Category', 'text'],
                      ['fabric', 'Fabric', 'text'],
                      ['price', 'Price (₹)', 'number'],
                      ['discountPrice', 'Offer price (₹)', 'number'],
                      ['sizes', 'Sizes (comma separated)', 'text'],
                      ['stock', 'Stock quantity', 'number'],
                    ].map(([name, label, type]) => (
                      <label className="admin-field" key={name}>{label}
                        <input name={name} type={type} min={type === 'number' ? (name === 'stock' ? '0' : '1') : undefined}
                          value={editForm[name]} required={['name', 'category', 'price', 'sizes', 'stock'].includes(name)}
                          onChange={(event) => setEditForm((current) => ({ ...current, [name]: event.target.value }))} />
                      </label>
                    ))}
                    <label className="admin-field admin-field--wide">Description
                      <textarea rows="3" maxLength="1000" value={editForm.description}
                        onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                  </div>
                  <p className="admin-product-edit__note">Existing product photos will be kept. Image replacement can be added separately.</p>
                  <div className="admin-product-edit__actions">
                    <button className="button button--dark" type="submit" disabled={busyId === product._id}>
                      {busyId === product._id ? 'Saving…' : 'Save changes'}
                    </button>
                    <button className="button button--outline" type="button" disabled={busyId === product._id}
                      onClick={() => { setEditingId(''); setEditForm({}); setActionError(''); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <p className="admin-list-message">No dresses in the catalog yet. Add your first dress using the form.</p>
      )}
    </section>
  );
}

export default AdminProductList;
