import React from 'react';
import Icon from './Icon.jsx';
import ProductCard from './ProductCard.jsx';

function ProductCollection({
  products,
  filteredProducts,
  categories,
  activeCategory,
  loading,
  loadError,
  selectedSizes,
  onCategoryChange,
  onSelectSize,
  onAddToCart,
  onNotice,
  onRetry,
  onShowAllPieces,
}) {
  return (
    <section className="collection section-shell" id="collection">
      <div className="collection__top">
        <div className="section-heading section-heading--compact">
          <div>
            <span className="eyebrow"><span className="eyebrow__line" /> THE VASTRA COLLECTION</span>
            <h2>Good things, <em>stitched here.</em></h2>
          </div>
          <p>Our latest pieces, made with care and ready for your wardrobe.</p>
        </div>
        <a className="text-link collection__all-link" href="#collection">Shop the edit <Icon name="arrow" size={16} /></a>
      </div>

      <div className="collection-controls">
        <div className="category-filters" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              className={activeCategory === category ? 'filter-chip filter-chip--active' : 'filter-chip'}
              key={category}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <span className="product-count">{loading ? 'Finding your favourites…' : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'piece' : 'pieces'}`}</span>
      </div>

      {loadError ? (
        <div className="collection-state">
          <span className="collection-state__icon">↻</span>
          <h3>The collection is taking a moment.</h3>
          <p>{loadError} Please check your connection and try again.</p>
          <button className="button button--outline" onClick={onRetry}>Try again</button>
        </div>
      ) : loading ? (
        <div className="product-grid" aria-label="Loading collection">
          {[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item} />)}
        </div>
      ) : filteredProducts.length ? (
        <div className="product-grid">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product._id}
              product={product}
              index={index}
              selectedSize={selectedSizes[product._id]}
              onSelectSize={onSelectSize}
              onAddToCart={onAddToCart}
              onNotice={onNotice}
            />
          ))}
        </div>
      ) : (
        <div className="collection-state">
          <span className="collection-state__icon">✳</span>
          <h3>{products.length ? 'No pieces found just yet.' : 'Something lovely is in the works.'}</h3>
          <p>{products.length ? 'Try another search or category.' : 'Our collection is being prepared. Check back soon to find your new favourite.'}</p>
          {products.length > 0 && (
            <button className="button button--outline" onClick={onShowAllPieces}>See all pieces</button>
          )}
        </div>
      )}
    </section>
  );
}

export default ProductCollection;
