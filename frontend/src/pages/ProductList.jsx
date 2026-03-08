import { useState } from 'react';
import useProducts from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';
import { FaSearch, FaFilter } from 'react-icons/fa';

const CATEGORIES = [
  'All',
  'Electronics',
  'Clothing',
  'Books',
  'Home & Garden',
  'Sports',
  'Other',
];

const ProductList = () => {
  const { products, loading, error, pagination, fetchProducts } = useProducts();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (category !== 'All') params.category = category;
    fetchProducts(params);
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    const params = {};
    if (search) params.search = search;
    if (cat !== 'All') params.category = cat;
    fetchProducts(params);
  };

  const handlePageChange = (page) => {
    const params = { page };
    if (search) params.search = search;
    if (category !== 'All') params.category = category;
    fetchProducts(params);
  };

  if (loading) return <Spinner />;

  return (
    <div className="product-list-page">
      <div className="container">
        <h1 className="page-title">Products</h1>

        {/* Search & Filter */}
        <div className="search-filter-bar">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>

          <div className="category-filters">
            <FaFilter className="filter-icon" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`category-btn ${
                  category === cat ? 'active' : ''
                }`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="alert alert-error">
            <p>{error}</p>
          </div>
        )}

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="empty-state">
            <h3>No products found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <>
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${
                        pagination.page === page ? 'active' : ''
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductList;
