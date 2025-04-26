# E-Commerce Dashboard

A modern e-commerce dashboard for managing products, orders, categories, and more.

## Recent Updates

### Auto-generated SKUs

Products and variants now have auto-generated SKUs based on:

- Product name (first 3 characters)
- Category name (first 2 characters)
- Price (last 3 digits)
- Variant information (if applicable)
- Random suffix for uniqueness

Example SKU format: `PRO-CA-999-VA123`

### Image Upload Improvements

All file uploads now use a consistent path structure:

- Base path: `UPLOAD_FOLDER` environment variable (defaults to "ecom-uploads")
- Subdirectories for different content types:
  - Products: `{UPLOAD_FOLDER}/products/{productId}/{timestamp}-{filename}`
  - Flavors: `{UPLOAD_FOLDER}/flavors/{uuid}-{filename}`
  - Categories: `{UPLOAD_FOLDER}/categories/{uuid}-{filename}`

### Removed Features

- Removed inventory management section
  - Product quantities are now managed directly in the product/variant forms
  - Removed inventory logs, statistics, and dedicated pages

## File Structure

```
server/
  ├── controllers/   # API controllers
  ├── middlewares/   # Auth and file handling
  ├── routes/        # API endpoints
  ├── utils/         # Helper functions
  ├── prisma/        # Database schema
  └── app.js         # Main server file

front/
  ├── src/
  │   ├── api/       # API client
  │   ├── components/# UI components
  │   ├── context/   # Auth context
  │   ├── layouts/   # Dashboard layout
  │   ├── lib/       # Utilities
  │   ├── pages/     # Page components
  │   ├── types/     # TypeScript types
  │   └── App.tsx    # Main app component
  ├── public/        # Static assets
  └── index.html     # Entry HTML
```

## Key Features

- **Product Management**: Create, edit, and delete products with variants
- **Order Management**: Track and manage orders with different statuses
- **Category Management**: Organize products into categories
- **Flavors & Weights**: Define product attributes for variants
- **User Authentication**: Secure admin login with permissions
- **Dashboard**: View sales statistics and performance metrics

## Environment Variables

```
# Database
DATABASE_URL=

# Authentication
ACCESS_JWT_SECRET=
REFRESH_JWT_SECRET=
ADMIN_JWT_SECRET=

# S3 Storage
SPACES_ENDPOINT=
SPACES_REGION=
SPACES_ACCESS_KEY=
SPACES_SECRET_KEY=
SPACES_BUCKET=
UPLOAD_FOLDER=ecom-uploads

# Payment Gateway
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Server
PORT=4000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install` in both server and front directories
3. Set up environment variables in server/.env
4. Start server: `cd server && npm start`
5. Start frontend: `cd front && npm run dev`
