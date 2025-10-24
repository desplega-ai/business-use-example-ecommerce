# Medusa.js E-commerce with Business-Use Flow Tracking

A complete e-commerce demonstration using Medusa.js v2 (TypeScript) that showcases Business-Use tracking of critical business flows and rules. The focus is on tracking BUSINESS LOGIC (revenue protection, compliance enforcement, customer experience rules) rather than technical events.

## Architecture

- **Backend**: Medusa.js v2 (TypeScript) on port 9000
- **Storefront**: Next.js on port 8000
- **Business-Use Backend**: Running on port 13371
- **Database**: PostgreSQL on port 5437
- **Redis**: On port 6380

## Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL running on port 5437
- Redis running on port 6380
- Python 3.8+ (for Business-Use backend via uvx)

### Setup

```bash
# Install dependencies
yarn setup

# Database is already created and migrated
# If you need to re-run migrations:
yarn migrate

# Start all services with PM2
yarn start

# Check status
yarn status

# View logs
yarn logs                    # All services
yarn logs:medusa            # Medusa backend only
yarn logs:business-use      # Business-Use backend only
yarn logs:storefront        # Storefront only

# Monitor in real-time
yarn monit

# Stop all services
yarn stop

# Restart all services
yarn restart
```

## PM2 Management

All services are managed through PM2 for easy development:

```bash
yarn start      # Start all services
yarn stop       # Stop all services
yarn restart    # Restart all services
yarn delete     # Remove from PM2
yarn status     # Check service status
yarn monit      # Real-time monitoring dashboard
```

Individual service logs:
```bash
yarn logs:business-use     # Business-Use backend logs
yarn logs:medusa          # Medusa backend logs
yarn logs:storefront      # Next.js storefront logs
```

## Service URLs

- **Medusa Admin**: http://localhost:9000/app
- **Storefront**: http://localhost:8000
- **Business-Use Dashboard**: http://localhost:13371
- **Medusa API**: http://localhost:9000

## Business Flows Tracked

### 1. Checkout Flow
- Cart validation
- Discount stacking limits (max 30%)
- First-order discount enforcement
- Free shipping eligibility ($50+)
- Tax calculation
- Payment validation
- Inventory reservation
- Order confirmation

### 2. Returns Flow
- 30-day return window enforcement
- Product eligibility checks
- Restocking fee calculation (15% for electronics)
- Inventory restocking
- Refund processing

### 3. Loyalty Program
- VIP status calculation ($1000 spent or 5 orders)
- Points earning (1x regular, 2x VIP)
- Points redemption limits (max 50% of order)
- Lifetime spend tracking

### 4. Inventory Management
- Stock level monitoring
- Low stock alerts (20% of reorder point)
- Oversell prevention
- Reorder calculations (3 months supply)

## Development Workflow

### Seeding Demo Data

```bash
yarn seed
```

This creates:
- 10 products across 3 categories
- 3 discount codes with business rules
- 3 sample customers with order history
- Shipping options

### Testing Business Rules

```bash
# View all flows
uvx business-use-core flow list

# Evaluate a specific flow run
uvx business-use-core flow eval <run_id> checkout --verbose

# Show flow graph
uvx business-use-core flow eval <run_id> checkout --show-graph
```

## Configuration

### Environment Variables

Backend configuration is in `backend/.env`:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5437/ecomm
REDIS_URL=redis://localhost:6380
BUSINESS_USE_API_KEY=<your-api-key>
BUSINESS_USE_URL=http://localhost:13371
```

### Business-Use Configuration

Configuration is in `.business-use/config.yaml`:

```yaml
database_path: ./.business-use/db.sqlite
log_level: info
debug: false
env: local
api_key: <your-api-key>
```

## Project Structure

```
.
├── backend/                 # Medusa.js backend
│   ├── src/
│   │   ├── api/            # API routes & endpoints
│   │   ├── modules/        # Custom modules (Business-Use integration)
│   │   ├── subscribers/    # Event subscribers (business rules)
│   │   ├── scripts/        # Seed scripts
│   │   └── workflows/      # Medusa workflows
│   └── .env                # Backend configuration
│
├── storefront/             # Next.js storefront
│   ├── src/
│   └── .env.local          # Storefront configuration
│
├── .business-use/          # Business-Use backend data
│   ├── config.yaml         # Business-Use configuration
│   └── db.sqlite           # Business-Use database
│
├── logs/                   # PM2 log files
├── ecosystem.config.js     # PM2 configuration
└── package.json            # Root package.json with PM2 scripts
```

## Next Steps

1. ✅ Phase 1: Foundation & Infrastructure (COMPLETE)
2. ✅ Phase 2: Database setup and migrations (COMPLETE)
3. 🔄 Phase 2: Create seed data
4. ⏳ Phase 3: Implement checkout business rules
5. ⏳ Phase 4: Implement returns flow
6. ⏳ Phase 5: Implement loyalty program
7. ⏳ Phase 6: Implement inventory management
8. ⏳ Phase 7: Testing & documentation

## Troubleshooting

### Services won't start

```bash
# Check if ports are already in use
lsof -i:9000 -i:8000 -i:13371

# View PM2 logs for errors
yarn logs
```

### Database connection issues

```bash
# Verify PostgreSQL is running
psql "postgres://postgres:postgres@localhost:5437/postgres" -c "SELECT 1"

# Recreate database if needed
psql "postgres://postgres:postgres@localhost:5437/postgres" -c "DROP DATABASE IF EXISTS ecomm; CREATE DATABASE ecomm;"
yarn migrate
```

### Business-Use backend not responding

```bash
# Restart just the Business-Use service
pm2 restart business-use

# Check Business-Use logs
yarn logs:business-use
```

## License

MIT

## Support

For issues or questions:
- Medusa.js: https://docs.medusajs.com/
- Business-Use: https://docs.desplega.ai/business-use
