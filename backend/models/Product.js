const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price must be a positive number'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: [
        'Electronics',
        'Clothing',
        'Books',
        'Home & Garden',
        'Sports',
        'Other',
      ],
    },
    quantity: {
      type: Number,
      required: [true, 'Please add a quantity'],
      min: [0, 'Quantity must be a positive number'],
      default: 0,
    },
    image: {
      type: String,
      default: 'no-image.jpg',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
