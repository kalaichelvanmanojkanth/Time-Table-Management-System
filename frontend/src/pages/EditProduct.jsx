import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import productService from '../services/productService';
import ProductForm from '../components/ProductForm';
import Spinner from '../components/Spinner';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productService.getById(id);
        setProduct(data.data);
      } catch (error) {
        toast.error('Failed to load product');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  const handleSubmit = async (formData) => {
    try {
      await productService.update(id, formData);
      toast.success('Product updated successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update product'
      );
      throw error;
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="form-page">
      <div className="container">
        <div className="form-card">
          <h1 className="page-title">Edit Product</h1>
          <ProductForm
            initialData={product}
            onSubmit={handleSubmit}
            isEdit={true}
          />
        </div>
      </div>
    </div>
  );
};

export default EditProduct;
