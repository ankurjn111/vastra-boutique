import React, { useEffect, useMemo, useState } from 'react';
import CartDrawer from './components/CartDrawer.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import CategorySection from './components/CategorySection.jsx';
import Header from './components/Header.jsx';
import HeroSection from './components/HeroSection.jsx';
import ProductCollection from './components/ProductCollection.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import StorySection from './components/StorySection.jsx';
import useCart from './hooks/useCart.js';
import useProducts from './hooks/useProducts.js';
import formatPrice from './utils/formatPrice.js';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

function App() {
  const { products, loading, loadError, loadProducts } = useProducts();
  const { cart, cartCount, cartTotal, addToCart, updateQuantity, removeItem } = useCart();
  const [activeCategory, setActiveCategory] = useState('All pieces');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(
    () => ['All pieces', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = activeCategory === 'All pieces' || product.category === activeCategory;
      const matchesSearch =
        !query ||
        [product.name, product.category, product.description, product.fabric]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      return inCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);


  return (
    <>
      <Header
        cartCount={cartCount}
        search={search}
        searchOpen={searchOpen}
        mobileMenuOpen={mobileMenuOpen}
        onSearchChange={setSearch}
        onOpenCart={() => setCartOpen(true)}
        onToggleSearch={() => setSearchOpen(true)}
        onCloseSearch={() => { setSearchOpen(false); setSearch(''); }}
        onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      <main>
        <HeroSection />
        <CategorySection onShowAllPieces={() => setActiveCategory('All pieces')} />
        <ProductCollection
          products={products}
          filteredProducts={filteredProducts}
          categories={categories}
          activeCategory={activeCategory}
          loading={loading}
          loadError={loadError}
          selectedSizes={selectedSizes}
          onCategoryChange={setActiveCategory}
          onSelectSize={(productId, size) => setSelectedSizes((sizes) => ({ ...sizes, [productId]: size }))}
          onAddToCart={(product, size) => addToCart(product, size, setNotice)}
          onNotice={setNotice}
          onRetry={loadProducts}
          onShowAllPieces={() => { setActiveCategory('All pieces'); setSearch(''); }}
        />
        <StorySection />
      </main>
      <SiteFooter />
      {cartOpen && (
        <CartDrawer
          cart={cart}
          cartCount={cartCount}
          cartTotal={cartTotal}
          onClose={() => setCartOpen(false)}
          onBrowseCollection={() => {
            setCartOpen(false);
            document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onRemoveItem={removeItem}
          onUpdateQuantity={updateQuantity}
          onStartOrder={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          cartTotal={cartTotal}
          onClose={() => setCheckoutOpen(false)}
          onOrderPlaced={() => { removeItem; window.dispatchEvent(new CustomEvent('vastra-order-placed')); }}
          onNotice={setNotice}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  );
}

export default App;
