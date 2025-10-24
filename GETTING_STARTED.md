# Getting Started with Business-Use E-commerce Demo

This guide will help you get the Medusa.js + Business-Use e-commerce demo up and running.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ and Yarn installed
- ✅ PostgreSQL running on port 5437 with database `ecomm`
- ✅ Redis running on port 6380
- ✅ Python 3.8+ (for Business-Use backend via uvx)

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Install root dependencies (PM2)
yarn install

# Install backend and storefront dependencies
yarn setup
```

### 2. Start All Services with PM2

```bash
# Start Business-Use backend, Medusa, and Next.js storefront
yarn start

# Check status
yarn status
```

You should see:
```
│ id │ name            │ status  │
├────┼─────────────────┼─────────┤
│ 0  │ business-use    │ online  │
│ 1  │ medusa-backend  │ online  │
│ 2  │ storefront      │ online  │
```

### 3. Access the Applications

- **Medusa Admin**: http://localhost:9000/app
- **Storefront**: http://localhost:8000
- **Business-Use Dashboard**: http://localhost:13371
- **Medusa API**: http://localhost:9000

### 4. Test the Business Rules Tracking

```bash
# Create a test order
curl -X POST http://localhost:9000/admin/test-checkout

# Check the Business-Use tracking
uvx business-use-core flow eval cart_<cart_id> checkout --verbose

# Or view in the dashboard
open http://localhost:13371
```

## What's Being Tracked?

### Checkout Flow

Every time a customer creates a cart and places an order, Business-Use tracks:

1. ✅ **Cart Validation** - Ensures cart has items and positive total
2. ✅ **Discount Limits** - Prevents >30% total discount stacking
3. ✅ **Free Shipping** - Validates $50+ minimum for free shipping
4. ✅ **Tax Calculation** - Ensures tax is calculated
5. ✅ **Payment Validation** - Verifies payment matches order total
6. ✅ **Inventory Check** - Tracks inventory reservation
7. ✅ **First Order Tracking** - Monitors customer order history
8. ✅ **Order Confirmation** - Final validation checkpoint

### Loyalty Program

When customers place orders:

1. ✅ **VIP Status** - Calculates based on $1000 spent OR 5 orders
2. ✅ **Points Earning** - 1 point/dollar (2x for VIP)
3. ✅ **Lifetime Tracking** - Monitors total spend

### Inventory Management

When inventory levels change:

1. ✅ **Stock Validation** - Ensures non-negative inventory
2. ✅ **Low Stock Alerts** - Triggers at 20% of reorder point
3. ✅ **Reorder Calculation** - Calculates 3 months supply needed

### Returns Flow

When customers request returns:

1. ✅ **Return Tracking** - Logs return requests
2. ⏳ **30-day Window** - Validates return within policy period (pending full implementation)
3. ⏳ **Product Eligibility** - Checks non-returnable items (pending)

## Viewing Business-Use Data

### CLI Commands

```bash
# List all flow runs
uvx business-use-core runs

# Evaluate a specific checkout flow
uvx business-use-core flow eval <run_id> checkout --verbose

# Show flow graph
uvx business-use-core flow eval <run_id> checkout --show-graph

# List all flows
uvx business-use-core flow list
```

### Dashboard

Visit http://localhost:13371 to see:
- Real-time flow tracking
- Business rule violations
- Flow dependencies and graphs
- Event data and validation results

## PM2 Management Commands

```bash
# View logs
yarn logs                    # All services
yarn logs:medusa            # Medusa backend only
yarn logs:business-use      # Business-Use backend only
yarn logs:storefront        # Storefront only

# Monitor in real-time
yarn monit

# Restart services
yarn restart

# Stop services
yarn stop

# Remove from PM2
yarn delete
```

## Troubleshooting

### Services won't start

```bash
# Check port conflicts
lsof -i:9000 -i:8000 -i:13371

# View detailed logs
yarn logs
```

### Database connection issues

```bash
# Verify PostgreSQL is running
psql "postgres://postgres:postgres@localhost:5437/postgres" -c "SELECT 1"

# Check if database exists
psql "postgres://postgres:postgres@localhost:5437/postgres" -c "\l" | grep ecomm
```

### Business-Use not receiving events

```bash
# Check Business-Use is running
yarn logs:business-use

# Verify API key in backend/.env matches .business-use/config.yaml
cat backend/.env | grep BUSINESS_USE_API_KEY
cat .business-use/config.yaml | grep api_key
```

### Medusa backend errors

```bash
# Check Medusa logs
yarn logs:medusa

# Verify database migrations are complete
cd backend && npx medusa db:migrate

# Re-seed if needed
yarn seed
```

## Next Steps

1. **Explore the Admin**: Create products, manage orders at http://localhost:9000/app
2. **Test the Storefront**: Browse products and checkout at http://localhost:8000
3. **Monitor Business Rules**: Watch flows in Business-Use dashboard at http://localhost:13371
4. **Create Test Scenarios**: Use the test endpoint to simulate various flows

## Understanding the Code

### Subscribers

All business rule tracking happens in `backend/src/subscribers/`:

- `cart-updated.ts` - Tracks cart validation and discounts
- `order-placed.ts` - Tracks payment, tax, inventory on orders
- `loyalty-tracking.ts` - Tracks VIP status and points
- `inventory-monitoring.ts` - Tracks stock levels and reordering
- `return-requested.ts` - Tracks return requests

### Business-Use Integration

The Business-Use SDK is initialized in `backend/src/modules/business-use/index.ts` and provides helper functions for generating consistent run IDs.

### API Routes

Test endpoints are in `backend/src/api/admin/test-checkout/route.ts` for testing the checkout flow.

## Architecture Overview

```
┌─────────────────┐
│   Next.js       │  Port 8000
│   Storefront    │  (Customer-facing)
└────────┬────────┘
         │
         │ API Calls
         ├─────────────────────┐
         │                     │
┌────────▼────────┐   ┌────────▼────────┐
│  Medusa.js      │   │  Business-Use   │
│  Backend        │───│  Backend        │
│  (Port 9000)    │   │  (Port 13371)   │
└────────┬────────┘   └─────────────────┘
         │
         │ Events via ensure()
         │
    ┌────▼────┐
    │ Business│
    │  Rules  │
    │Tracking │
    └─────────┘
```

## Demo Data

The seeded database includes:

- **Products**: 4 products (T-shirt, Sweatshirt, Sweatpants, Shorts)
- **Categories**: Shirts, Sweatshirts, Pants, Merch
- **Regions**: Europe with EUR/USD support
- **Shipping**: Standard and Express options
- **Inventory**: 1,000,000 units per product (for testing)

## Support

For issues:
- **Medusa.js**: https://docs.medusajs.com/
- **Business-Use**: https://docs.desplega.ai/business-use
- **Project Issues**: Check logs with `yarn logs`
