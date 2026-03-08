import { Link } from 'react-router-dom';
import { FaEdit, FaTrash } from 'react-icons/fa';

const ProductCard = ({ product, onDelete, showActions = false }) => {
  const categoryColors = {
    Electronics: '#3b82f6',
    Clothing: '#8b5cf6',
    Books: '#10b981',
    'Home & Garden': '#f59e0b',
    Sports: '#ef4444',
    Other: '#6b7280',
  };

  return (
    <div className="product-card">
      <div className="product-card-header">
        <span
          className="product-category"
          style={{
            backgroundColor: categoryColors[product.category] || '#6b7280',
          }}
        >
          {product.category}
        </span>
      </div>
      <div className="product-card-body">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">
          {product.description?.length > 100
            ? `${product.description.substring(0, 100)}...`
            : product.description}
        </p>
        <div className="product-details">
          <span className="product-price">${product.price?.toFixed(2)}</span>
          <span className="product-quantity">
            Stock: {product.quantity}
          </span>
        </div>
      </div>
      {showActions && (
        <div className="product-card-actions">
          <Link
            to={`/products/edit/${product._id}`}
            className="btn btn-outline btn-sm"
          >
            <FaEdit /> Edit
          </Link>
          <button
            onClick={() => onDelete(product._id)}
            className="btn btn-danger btn-sm"
          >
            <FaTrash /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
