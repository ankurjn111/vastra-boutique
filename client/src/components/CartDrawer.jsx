import React from 'react';
import Icon from './Icon.jsx';
import formatPrice from '../utils/formatPrice.js';

function CartDrawer({
  cart,
  cartCount,
  cartTotal,
  onClose,
  onBrowseCollection,
  onRemoveItem,
  onUpdateQuantity,
  onStartOrder,
}) {
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="cart-drawer" aria-label="Shopping bag">
        <div className="cart-drawer__header">
          <div>
            <span className="eyebrow">YOUR LITTLE EDIT</span>
            <h2>Your bag <span>({cartCount})</span></h2>
          </div>
          <button className="icon-button" aria-label="Close bag" onClick={onClose}><Icon name="close" /></button>
        </div>
        {cart.length ? (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={`${item.id}-${item.size}`}>
                  {item.image ? <img src={item.image} alt="" /> : <div className="cart-item__placeholder">vastra</div>}
                  <div className="cart-item__details">
                    <h3>{item.name}</h3>
                    <span>Size: {item.size}</span>
                    <strong>{formatPrice(item.price)}</strong>
                    <div className="quantity-control">
                      <button aria-label={`Remove one ${item.name}`} onClick={() => onUpdateQuantity(item.id, item.size, -1)}><Icon name="minus" size={14} /></button>
                      <span>{item.quantity}</span>
                      <button aria-label={`Add one ${item.name}`} onClick={() => onUpdateQuantity(item.id, item.size, 1)}><Icon name="plus" size={14} /></button>
                    </div>
                  </div>
                  <button className="cart-item__remove" aria-label={`Remove ${item.name}`} onClick={() => onRemoveItem(item.id, item.size)}>
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{formatPrice(cartTotal)}</strong></div>
              <p>Shipping and any other details can be confirmed when you place your order.</p>
              <button className="button button--dark cart-summary__checkout" onClick={onStartOrder}>
                Order on WhatsApp <Icon name="arrow" size={17} />
              </button>
            </div>
          </>
        ) : (
          <div className="cart-empty">
            <span className="cart-empty__icon"><Icon name="bag" size={28} /></span>
            <h3>Your bag is taking a little breather.</h3>
            <p>Find something that feels like you, and it’ll be right here.</p>
            <button className="button button--dark" onClick={onBrowseCollection}>Explore the collection <Icon name="arrow" size={16} /></button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
