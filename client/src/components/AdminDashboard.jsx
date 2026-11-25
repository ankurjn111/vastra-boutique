import React, { useCallback, useEffect, useState } from 'react';
import AdminProductForm from './AdminProductForm.jsx';
import AdminProductList from './AdminProductList.jsx';
import AdminOrderList from './AdminOrderList.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'vastra-admin-token';

function AdminDashboard({ user, onSignOut }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Catalog could not be loaded.');
      if (!Array.isArray(data)) throw new Error('Catalog response was not a product list.');
      setProducts(data);
    } catch (loadError) {
      setError(loadError.message || 'Catalog could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a className="admin-login__brand" href="/">vastra <span>B O U T I Q U E</span></a>
        <div className="admin-topbar__actions">
          <span>Signed in as <strong>{user.email || 'Admin account'}</strong></span>
          <button className="button button--outline" onClick={onSignOut}>Sign out</button>
        </div>
      </header>
      <div className="admin-content">
        <section className="admin-welcome">
          <span className="eyebrow"><span className="eyebrow__line" /> BOUTIQUE ADMIN</span>
          <h1>Your store, <em>your collection.</em></h1>
          <p>Add dresses to your catalog and see what is already in your store.</p>
        </section>
        <AdminProductForm onCreated={loadProducts} />
        <AdminProductList products={products} loading={loading} error={error} onRetry={loadProducts} />
        <AdminOrderList />
      </div>
    </main>
  );
}

export default AdminDashboard;
