import React from 'react';
import formatPrice from '../utils/formatPrice.js';

function AdminProductList({ products, loading, error, onRetry }) {
  return (
    <section className="admin-product-list">
      <div className="admin-panel__heading">
        <div>
          <span className="eyebrow"><span className="eyebrow__line" /> YOUR STORE</span>
          <h2>Catalog <span>({products.length})</span></h2>
        </div>
      </div>
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
            <article className="admin-product" key={product._id}>
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} />
              ) : (
                <div className="admin-product__placeholder">vastra</div>
              )}
              <div className="admin-product__details">
                <span>{product.category}{product.fabric ? ` · ${product.fabric}` : ''}</span>
                <h3>{product.name}</h3>
                <p>{product.sizes?.join(' · ') || 'Sizes not set'} · Stock: {product.stock ?? 0}</p>
              </div>
              <strong>{formatPrice(product.discountPrice || product.price)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <p className="admin-list-message">No dresses in the catalog yet. Add your first dress using the form.</p>
      )}
    </section>
  );
}

export default AdminProductList;
