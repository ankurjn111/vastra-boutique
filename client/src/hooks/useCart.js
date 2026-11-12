import { useEffect, useState } from 'react';

function useCart() {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vastra-cart') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('vastra-cart', JSON.stringify(cart));
  }, [cart]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  function addToCart(product, size, onNotice) {
    if (product.stock === 0) {
      onNotice('This piece is currently out of stock.');
      return;
    }
    const chosenSize = size || product.sizes?.[0] || 'One size';
    setCart((items) => {
      const existing = items.find((item) => item.id === product._id && item.size === chosenSize);
      if (existing) {
        return items.map((item) =>
          item.id === product._id && item.size === chosenSize
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock || 99) }
            : item,
        );
      }
      return [
        ...items,
        {
          id: product._id,
          name: product.name,
          price: product.discountPrice || product.price,
          image: product.images?.[0] || '',
          size: chosenSize,
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
    onNotice(`${product.name} added to your bag.`);
  }

  function updateQuantity(id, size, change) {
    setCart((items) =>
      items
        .map((item) => {
          if (item.id !== id || item.size !== size) return item;
          return { ...item, quantity: Math.min(item.quantity + change, item.stock || 99) };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(id, size) {
    setCart((items) => items.filter((item) => item.id !== id || item.size !== size));
  }

  return { cart, cartCount, cartTotal, addToCart, updateQuantity, removeItem };
}

export default useCart;
