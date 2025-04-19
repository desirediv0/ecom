# Ecommerce Dashboard & API

A comprehensive ecommerce platform with a RESTful API for managing supplements and other products.

## Features

### User Management

- Authentication (Register, Login, Logout)
- Profile Management
- Addresses Management
- Wishlists
- Order History
- Reviews
- Shopping Cart

### Admin Dashboard

- Admin Authentication
- Role-based Access Control
- Product Management
- Category Management
- Order Management
- Customer Management
- Sales Analytics

### Products

- Categories & Subcategories
- Products with Variants (Flavors, Weights)
- Images Management
- Inventory Tracking

### Orders

- Cart Management
- Checkout Process
- Payment Integration (Razorpay)
- Order Tracking
- Shipping Updates

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Digital Ocean Spaces (S3-compatible)
- **Payment Gateway**: Razorpay

## Project Structure

```
├── server/               # Backend code
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── email/            # Email templates
│   ├── helper/           # Helper functions
│   ├── middlewares/      # Middleware functions
│   ├── prisma/           # Prisma schema and migrations
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   ├── app.js            # Express application
│   └── index.js          # Entry point
└── client/               # Frontend code (React)
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/ecom-dashboard.git
   cd ecom-dashboard
   ```

2. Install dependencies:

   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:

   ```bash
   # In the server directory
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:

   ```bash
   cd server
   npx prisma migrate dev
   ```

5. Start the development servers:

   ```bash
   # Start the backend server
   cd server
   npm run dev

   # In a new terminal, start the frontend
   cd client
   npm run dev
   ```

## API Documentation

The API endpoints are organized by resources:

### User Endpoints

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login
- `POST /api/users/logout` - Logout
- `GET /api/users/me` - Get user profile
- `PATCH /api/users/update-profile` - Update user profile
- ... and more

### Cart Endpoints

- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PATCH /api/cart/update/:cartItemId` - Update cart item quantity
- `DELETE /api/cart/remove/:cartItemId` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart

### Admin Endpoints

- `POST /api/admin/login` - Admin login
- `GET /api/admin/products` - Get all products
- `POST /api/admin/products` - Create a new product
- `GET /api/admin/categories` - Get all categories
- `POST /api/admin/categories` - Create a new category
- ... and more

### Public Endpoints

- `GET /api/categories` - Get all categories
- `GET /api/categories/:slug/products` - Get products by category
- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/:slug` - Get product details by slug
- `GET /api/product-variant` - Get product variant details
- `GET /api/flavors` - Get all flavors
- `GET /api/weights` - Get all weights

For a complete list of endpoints and request/response formats, see the API documentation.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
