import api from './api';

const productService = {
  // Get all products
  getAll: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  // Get single product
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Create product
  create: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Update product
  update: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  // Delete product
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

export default productService;
