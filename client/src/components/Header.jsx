import React from 'react';
import Icon from './Icon.jsx';

function Header({
  cartCount,
  search,
  searchOpen,
  mobileMenuOpen,
  onSearchChange,
  onOpenCart,
  onToggleSearch,
  onCloseSearch,
  onToggleMobileMenu,
  onCloseMobileMenu,
}) {
  return (
    <>
      <div className="announcement">
        <span>Thoughtful Indian wear, made with care</span>
        <span className="announcement__divider">✳</span>
        <span>Discover your kind of beautiful</span>
      </div>

      <header className="site-header">
        <button
          className="mobile-menu"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          onClick={onToggleMobileMenu}
        >
          <span />
          <span />
        </button>
        <a className="brand" href="#" aria-label="Vastra Boutique home">
          <span className="brand__name">vastra</span>
          <span className="brand__caption">B O U T I Q U E</span>
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? 'main-nav--open' : ''}`} aria-label="Main navigation">
          <a href="#collection" onClick={onCloseMobileMenu}>Shop all</a>
          <a href="#categories" onClick={onCloseMobileMenu}>Collections</a>
          <a href="#our-story" onClick={onCloseMobileMenu}>Our story</a>
        </nav>
        <div className="header-actions">
          {searchOpen ? (
            <label className="search-field">
              <span className="sr-only">Search the collection</span>
              <input
                autoFocus
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search pieces"
              />
              <button aria-label="Close search" onClick={onCloseSearch}>
                <Icon name="close" size={17} />
              </button>
            </label>
          ) : (
            <button className="icon-button search-button" aria-label="Search" onClick={onToggleSearch}>
              <Icon name="search" />
            </button>
          )}
          <button className="bag-button" onClick={onOpenCart} aria-label={`Shopping bag, ${cartCount} items`}>
            <Icon name="bag" />
            <span className="bag-button__label">Bag</span>
            <span className="bag-count">{cartCount}</span>
          </button>
        </div>
      </header>
    </>
  );
}

export default Header;
