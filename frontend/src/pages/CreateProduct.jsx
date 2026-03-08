import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import productService from '../services/productService';
import ProductForm from '../components/ProductForm';

const CreateProduct = () => {
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    try {
      await productService.create(formData);
      toast.success('Product created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create product'
      );
      throw error;
    }
  };

  return (
    <div className="form-page">
      <div className="container">
        <div className="form-card">
          <h1 className="page-title">Create New Product</h1>
          <ProductForm onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
};

export default CreateProduct;
