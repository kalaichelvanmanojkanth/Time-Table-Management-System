import { useState, useEffect, useCallback } from 'react';
import productService from '../services/productService';

const useProducts = (initialParams = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const fetchProducts = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getAll(params);
      setProducts(data.data);
      setPagination({
        page: data.page,
        pages: data.pages,
        total: data.total,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(initialParams);
  }, []);

  const createProduct = async (productData) => {
    const data = await productService.create(productData);
    await fetchProducts();
    return data;
  };

  const updateProduct = async (id, productData) => {
    const data = await productService.update(id, productData);
    await fetchProducts();
    return data;
  };

  const deleteProduct = async (id) => {
    const data = await productService.delete(id);
    await fetchProducts();
    return data;
  };

  return {
    products,
    loading,
    error,
    pagination,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

export default useProducts;
