import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function loadProducts() {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error('We could not load the collection right now.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('The product list could not be displayed.');
      setProducts(data);
    } catch (error) {
      setLoadError(error.message || 'We could not load the collection right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return { products, loading, loadError, loadProducts };
}

export default useProducts;
