import React from 'react';
import Icon from './Icon.jsx';
import formatPrice from '../utils/formatPrice.js';

function ProductCard({ product, index, selectedSize, onSelectSize, onAddToCart, onNotice }) {
  return (
    <article className="product-card" key={product._id}>
      <div className="product-card__image-wrap">
        <div className={`product-card__placeholder product-card__placeholder--${index % 4} ${product.images?.[0] ? 'product-card__placeholder--hidden' : ''}`}><span>vastra</span></div>
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            onError={(event) => event.currentTarget.parentElement?.classList.add('product-card__image-wrap--failed')}
          />
        )}
        {product.stock === 0 && <span className="product-card__badge">Sold out</span>}
        <button className="product-card__favorite" aria-label={`Save ${product.name}`} onClick={() => onNotice('Your favourites are coming soon.')}>
          <Icon name="heart" size={19} />
        </button>
        <button
          className="product-card__add"
          onClick={() => onAddToCart(product, selectedSize)}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? 'Currently unavailable' : 'Add to bag'} <Icon name="plus" size={16} />
        </button>
      </div>
      <div className="product-card__info">
        <div>
          <span className="product-card__category">{product.category}</span>
          <h3>{product.name}</h3>
        </div>
        <div className="product-card__price">
          {product.discountPrice && <span>{formatPrice(product.price)}</span>}
          <strong>{formatPrice(product.discountPrice || product.price)}</strong>
        </div>
      </div>
      {product.sizes?.length > 0 && (
        <label className="product-card__sizes">
          Size
          <select
            value={selectedSize || product.sizes[0]}
            onChange={(event) => onSelectSize(product._id, event.target.value)}
            aria-label={`Choose a size for ${product.name}`}
          >
            {product.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      )}
    </article>
  );
}

export default ProductCard;
