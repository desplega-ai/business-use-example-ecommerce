# Medusa.js E-commerce Store with Business-Use Flow Tracking - Implementation Plan

## Overview

Building a complete e-commerce demonstration using Medusa.js v2 (TypeScript) that showcases Business-Use tracking of critical business flows and rules. The focus is on tracking BUSINESS LOGIC (revenue protection, compliance enforcement, customer experience rules) rather than technical events. Includes both backend API and Next.js storefront for end-to-end demonstration.

## Current State Analysis

**What exists now:**
- Empty git repository at `/Users/taras/Documents/code/business-use-ecommerce`
- No Medusa installation
- No Business-Use integration

**What's missing:**
- Medusa v2 backend with database
- Product catalog and demo data
- Business-Use service integration
- Business flow definitions and validators
- Test scenarios and automation
- Storefront UI

**Key constraints:**
- Using Medusa v2 (latest) with TypeScript
- Business-Use default batching (5s intervals, batch size 100)
- Must track ALL 4 business flows: checkout, returns, loyalty, inventory
- Focus on business value metrics (prevented losses, compliance violations)

## Desired End State

### Functional Requirements:
1. **Medusa Backend** running on `http://localhost:9000`
   - PostgreSQL/SQLite database with seeded demo data
   - Admin dashboard accessible
   - 10 products across 3 categories
   - 3 discount codes with business rules
   - 2 shipping options

2. **Next.js Storefront** running on `http://localhost:8000`
   - Product browsing and search
   - Shopping cart functionality
   - Checkout flow with payment
   - Customer account with order history

3. **Business-Use Integration** on `http://localhost:13370`
   - 4 complete business flows defined
   - Real-time business rule validation
   - Violation tracking and reporting
   - Metrics dashboard showing prevented losses

4. **Test Suite**
   - 10+ automated test scenarios
   - API endpoints to trigger violations
   - CLI scripts for flow evaluation
   - Documentation with examples

### Verification Methods:

**Automated:**
- `npm run build` - TypeScript compilation succeeds
- `npm test` - All unit tests pass
- `npm run seed` - Demo data loads successfully
- `business-use flow list` - All 4 flows registered
- `business-use flow eval <run_id> checkout` - Flow evaluation works

**Manual:**
- Place order through storefront → tracked in Business-Use
- Apply >30% discount → violation caught and blocked
- Request return after 30 days → rejection tracked
- VIP status upgrade → points multiplier applied correctly
- Oversell inventory → prevented by business rule

### Key Discoveries:
- Medusa v2 uses module-based architecture (different from v1 subscribers)
- Business-Use validators run on backend, not in application code
- Flow dependencies (`depIds`) enforce business rule sequence
- Context (`ctx.deps`) allows accessing dependent node data in validators

## What We're NOT Doing

- ❌ Production deployment or hosting setup
- ❌ Real payment gateway integration (Stripe test mode only)
- ❌ Email notifications or SMS alerts
- ❌ Advanced admin UI customization
- ❌ Multi-currency or internationalization
- ❌ Mobile app development
- ❌ SEO optimization or marketing features
- ❌ User authentication beyond Medusa defaults
- ❌ Custom analytics beyond Business-Use tracking
- ❌ Performance load testing (basic benchmarking only)

## Implementation Approach

**Strategy:**
Build in phases from foundation to advanced features, ensuring each phase is fully tested before proceeding. Start with infrastructure (Medusa + Business-Use), then implement flows in order of business impact (checkout first, then returns, loyalty, inventory).

**Reasoning:**
- Checkout flow has highest revenue impact → implement first
- Returns affect customer satisfaction → second priority
- Loyalty drives retention → third priority
- Inventory prevents operational issues → fourth priority

Each flow will be independently testable before moving to the next.

---

## Phase 1: Foundation & Infrastructure

### Overview
Set up Medusa v2 backend, database, Business-Use integration, and Next.js storefront. Establish core architecture that all business flows will build upon.

### Changes Required:

#### 1. Medusa Backend Initialization
**Directory**: `/backend`
**Changes**: Create new Medusa v2 project with TypeScript

```bash
# Initialize Medusa v2 backend
npx create-medusa-app@latest backend
cd backend
# Select: TypeScript, PostgreSQL (or SQLite for simplicity), Admin enabled
```

**File**: `backend/medusa-config.js`
```javascript
module.exports = {
  projectConfig: {
    database_url: process.env.DATABASE_URL || "postgres://localhost/medusa-store",
    admin_cors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:7000",
    store_cors: process.env.STORE_CORS || "http://localhost:8000",
    redis_url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  plugins: [
    {
      resolve: "@medusajs/admin",
      options: {
        serve: true,
      },
    },
  ],
  modules: {},
}
```

#### 2. Business-Use Installation
**File**: `backend/package.json`
**Changes**: Add Business-Use dependency

```bash
cd backend
npm install @desplega.ai/business-use
```

**File**: `backend/.env`
```bash
DATABASE_URL=postgres://localhost/medusa-business-use
BUSINESS_USE_API_KEY=test-key
BUSINESS_USE_URL=http://localhost:13370
```

#### 3. Business-Use Service Integration
**File**: `backend/src/services/business-use.service.ts`
**Changes**: Create core Business-Use service

```typescript
import { TransactionBaseService } from "@medusajs/medusa"
import { initialize, ensure } from '@desplega.ai/business-use'

class BusinessUseService extends TransactionBaseService {
  private initialized = false

  constructor(container) {
    super(container)
    this.initializeBusinessUse()
  }

  private initializeBusinessUse() {
    if (this.initialized) return

    initialize({
      apiKey: process.env.BUSINESS_USE_API_KEY || 'test-key',
      url: process.env.BUSINESS_USE_URL || 'http://localhost:13370',
      batchSize: 100,
      batchInterval: 5000, // 5 seconds (default)
      maxQueueSize: 1000
    })

    this.initialized = true
    console.log('[Business-Use] Initialized successfully')
  }

  // Generate consistent run IDs for tracking order flows
  getOrderRunId(orderId: string): string {
    return `order_${orderId}`
  }

  // Generate run IDs for return flows
  getReturnRunId(returnId: string): string {
    return `return_${returnId}`
  }

  // Generate run IDs for loyalty flows
  getLoyaltyRunId(customerId: string, orderId: string): string {
    return `loyalty_${customerId}_${orderId}`
  }

  // Generate run IDs for inventory flows
  getInventoryRunId(variantId: string): string {
    return `inventory_${variantId}`
  }
}

export default BusinessUseService
```

#### 4. Flow Definitions Configuration
**File**: `backend/.business-use/flows.yaml`
**Changes**: Define all 4 business flows

```yaml
flows:
  - id: checkout
    name: "Order Checkout Flow"
    description: "Tracks critical business rules during checkout process"
    nodes:
      - cart_validated
      - discount_validation
      - first_order_discount_check
      - free_shipping_eligibility
      - tax_calculated
      - payment_amount_validation
      - inventory_reserved
      - order_confirmed

  - id: returns
    name: "Return & Refund Flow"
    description: "Enforces return policy and refund calculation rules"
    nodes:
      - return_requested
      - return_eligibility_checked
      - refund_calculated
      - inventory_restocked
      - refund_processed

  - id: loyalty
    name: "Customer Loyalty Program"
    description: "Validates loyalty points and VIP status calculations"
    nodes:
      - vip_status_check
      - points_earned
      - points_redeemed
      - lifetime_spend_updated

  - id: inventory
    name: "Inventory Management"
    description: "Prevents stockouts and ensures proper reordering"
    nodes:
      - stock_level_checked
      - low_stock_alert
      - fulfillment_validated
      - reorder_triggered
```

#### 5. Next.js Storefront Setup
**Directory**: `/storefront`
**Changes**: Initialize Medusa Next.js starter

```bash
# From project root
npx create-next-app@latest storefront --typescript
cd storefront
npm install @medusajs/medusa-js
```

**File**: `storefront/.env.local`
```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
```

**File**: `storefront/src/lib/config.ts`
```typescript
import Medusa from "@medusajs/medusa-js"

export const medusaClient = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  maxRetries: 3,
})
```

### Success Criteria:

#### Automated Verification:
- [ ] Medusa backend builds: `cd backend && npm run build`
- [ ] Medusa migrations run: `cd backend && npx medusa migrations run`
- [ ] Backend starts successfully: `cd backend && npm run dev` (port 9000)
- [ ] Admin accessible at `http://localhost:9000/app`
- [ ] Storefront builds: `cd storefront && npm run build`
- [ ] Storefront starts: `cd storefront && npm run dev` (port 8000)
- [ ] Business-Use service initializes without errors (check logs)
- [ ] TypeScript compilation passes: `npm run typecheck`

#### Manual Verification:
- [ ] Access Medusa Admin at `http://localhost:9000/app` and create admin user
- [ ] Access storefront at `http://localhost:8000` and see default page
- [ ] Business-Use dashboard accessible at `http://localhost:13370`
- [ ] No console errors in any service
- [ ] Database connection successful (check Medusa logs)

---

## Phase 2: Demo Data & Product Catalog

### Overview
Seed the database with realistic e-commerce data: products, categories, shipping options, discount codes, and sample customers with order history.

### Changes Required:

#### 1. Database Seed Script
**File**: `backend/src/scripts/seed.ts`
**Changes**: Create comprehensive seed data

```typescript
import { MedusaContainer } from "@medusajs/medusa"

export default async function seedDemoData(container: MedusaContainer) {
  const productService = container.resolve("productService")
  const productCategoryService = container.resolve("productCategoryService")
  const shippingProfileService = container.resolve("shippingProfileService")
  const discountService = container.resolve("discountService")
  const customerService = container.resolve("customerService")

  console.log("[Seed] Creating categories...")

  // Create 3 categories
  const electronics = await productCategoryService.create({
    name: "Electronics",
    handle: "electronics",
    is_active: true,
  })

  const clothing = await productCategoryService.create({
    name: "Clothing",
    handle: "clothing",
    is_active: true,
  })

  const homeGarden = await productCategoryService.create({
    name: "Home & Garden",
    handle: "home-garden",
    is_active: true,
  })

  console.log("[Seed] Creating products...")

  // Electronics products
  const products = [
    {
      title: "Wireless Headphones",
      subtitle: "Premium noise-canceling headphones",
      description: "High-quality wireless headphones with active noise cancellation",
      handle: "wireless-headphones",
      category_id: electronics.id,
      variants: [{ title: "Default", prices: [{ amount: 29900, currency_code: "usd" }], inventory_quantity: 50 }],
    },
    {
      title: "Smart Watch",
      subtitle: "Fitness tracking smartwatch",
      description: "Track your health and fitness with this advanced smartwatch",
      handle: "smart-watch",
      category_id: electronics.id,
      variants: [{ title: "Default", prices: [{ amount: 39900, currency_code: "usd" }], inventory_quantity: 30 }],
    },
    {
      title: "Laptop Stand",
      subtitle: "Ergonomic aluminum stand",
      description: "Improve your posture with this adjustable laptop stand",
      handle: "laptop-stand",
      category_id: electronics.id,
      variants: [{ title: "Default", prices: [{ amount: 4900, currency_code: "usd" }], inventory_quantity: 100 }],
    },

    // Clothing products
    {
      title: "Cotton T-Shirt",
      subtitle: "Comfortable everyday tee",
      description: "100% organic cotton t-shirt in multiple colors",
      handle: "cotton-tshirt",
      category_id: clothing.id,
      variants: [
        { title: "Small", prices: [{ amount: 2400, currency_code: "usd" }], inventory_quantity: 40 },
        { title: "Medium", prices: [{ amount: 2400, currency_code: "usd" }], inventory_quantity: 60 },
        { title: "Large", prices: [{ amount: 2400, currency_code: "usd" }], inventory_quantity: 50 },
      ],
    },
    {
      title: "Denim Jeans",
      subtitle: "Classic fit jeans",
      description: "Durable denim jeans with classic styling",
      handle: "denim-jeans",
      category_id: clothing.id,
      variants: [{ title: "Default", prices: [{ amount: 7900, currency_code: "usd" }], inventory_quantity: 35 }],
    },

    // Home & Garden products
    {
      title: "Indoor Plant Pot",
      subtitle: "Ceramic planter with drainage",
      description: "Beautiful ceramic pot perfect for indoor plants",
      handle: "plant-pot",
      category_id: homeGarden.id,
      variants: [{ title: "Default", prices: [{ amount: 3200, currency_code: "usd" }], inventory_quantity: 75 }],
    },
    {
      title: "LED Desk Lamp",
      subtitle: "Adjustable brightness lamp",
      description: "Energy-efficient LED lamp with adjustable brightness",
      handle: "desk-lamp",
      category_id: homeGarden.id,
      variants: [{ title: "Default", prices: [{ amount: 5900, currency_code: "usd" }], inventory_quantity: 45 }],
    },
    {
      title: "Throw Pillow Set",
      subtitle: "Set of 2 decorative pillows",
      description: "Soft and comfortable decorative pillows for your couch",
      handle: "throw-pillows",
      category_id: homeGarden.id,
      variants: [{ title: "Default", prices: [{ amount: 4200, currency_code: "usd" }], inventory_quantity: 60 }],
    },
    {
      title: "Wall Clock",
      subtitle: "Modern minimalist design",
      description: "Sleek wall clock with silent quartz movement",
      handle: "wall-clock",
      category_id: homeGarden.id,
      variants: [{ title: "Default", prices: [{ amount: 3800, currency_code: "usd" }], inventory_quantity: 55 }],
    },
    {
      title: "Bluetooth Speaker",
      subtitle: "Portable waterproof speaker",
      description: "High-quality portable speaker with 12-hour battery life",
      handle: "bluetooth-speaker",
      category_id: electronics.id,
      variants: [{ title: "Default", prices: [{ amount: 8900, currency_code: "usd" }], inventory_quantity: 40 }],
    },
  ]

  for (const productData of products) {
    await productService.create(productData)
  }

  console.log("[Seed] Creating discount codes...")

  // Create 3 discount codes with business rules
  await discountService.create({
    code: "WELCOME10",
    rule: {
      type: "percentage",
      value: 10,
      allocation: "total",
    },
    is_dynamic: false,
    is_disabled: false,
    metadata: { first_order_only: true }, // Business rule metadata
  })

  await discountService.create({
    code: "SUMMER20",
    rule: {
      type: "percentage",
      value: 20,
      allocation: "total",
      conditions: [
        {
          type: "min_subtotal",
          value: 10000, // $100 minimum
        },
      ],
    },
    is_dynamic: false,
    is_disabled: false,
  })

  await discountService.create({
    code: "VIP30",
    rule: {
      type: "percentage",
      value: 30,
      allocation: "total",
    },
    is_dynamic: false,
    is_disabled: false,
    metadata: { vip_only: true }, // Business rule metadata
  })

  console.log("[Seed] Creating sample customers...")

  // Create customers with different order histories for testing
  await customerService.create({
    email: "first.timer@example.com",
    first_name: "First",
    last_name: "Timer",
    metadata: {
      order_count: 0,
      lifetime_spent: 0,
      vip_status: false,
      loyalty_points: 0,
    },
  })

  await customerService.create({
    email: "vip.customer@example.com",
    first_name: "VIP",
    last_name: "Customer",
    metadata: {
      order_count: 6,
      lifetime_spent: 125000, // $1,250
      vip_status: true,
      loyalty_points: 2500,
    },
  })

  await customerService.create({
    email: "regular.shopper@example.com",
    first_name: "Regular",
    last_name: "Shopper",
    metadata: {
      order_count: 3,
      lifetime_spent: 45000, // $450
      vip_status: false,
      loyalty_points: 450,
    },
  })

  console.log("[Seed] ✅ Demo data created successfully!")
}
```

**File**: `backend/package.json`
**Changes**: Add seed script command

```json
{
  "scripts": {
    "seed": "medusa exec ./src/scripts/seed.ts"
  }
}
```

#### 2. Shipping Options Configuration
**File**: `backend/src/scripts/setup-shipping.ts`
**Changes**: Configure shipping options

```typescript
export default async function setupShipping(container) {
  const shippingOptionService = container.resolve("shippingOptionService")
  const fulfillmentProviderService = container.resolve("fulfillmentProviderService")

  // Standard Shipping: $5, 5-7 days
  await shippingOptionService.create({
    name: "Standard Shipping",
    region_id: "default_region",
    provider_id: "manual",
    price_type: "flat_rate",
    amount: 500, // $5.00
    data: {
      estimated_days: "5-7",
    },
  })

  // Express Shipping: $15, 1-2 days
  await shippingOptionService.create({
    name: "Express Shipping",
    region_id: "default_region",
    provider_id: "manual",
    price_type: "flat_rate",
    amount: 1500, // $15.00
    data: {
      estimated_days: "1-2",
    },
  })

  // Free Shipping: $0 (for orders $50+)
  await shippingOptionService.create({
    name: "Free Shipping",
    region_id: "default_region",
    provider_id: "manual",
    price_type: "flat_rate",
    amount: 0,
    requirements: [
      {
        type: "min_subtotal",
        amount: 5000, // $50 minimum
      },
    ],
  })

  console.log("[Setup] ✅ Shipping options configured!")
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Seed script runs successfully: `cd backend && npm run seed`
- [ ] Database has 10 products: Query product table
- [ ] Database has 3 categories: Query category table
- [ ] Database has 3 discount codes: Query discount table
- [ ] Database has 3 sample customers: Query customer table
- [ ] No duplicate entries on re-run (idempotent)

#### Manual Verification:
- [ ] Log into Medusa Admin and see all 10 products
- [ ] Products correctly categorized (Electronics, Clothing, Home & Garden)
- [ ] Discount codes visible in admin: WELCOME10, SUMMER20, VIP30
- [ ] Customers visible with correct metadata (order count, VIP status)
- [ ] Product prices range from $10-$500 as specified
- [ ] Inventory quantities set correctly (various levels)

---

## Phase 3: Checkout Flow Business Rules

### Overview
Implement Flow 1 (Checkout) with all 8 critical business rules: cart validation, discount stacking limits, first-order discount enforcement, free shipping threshold, tax calculation, payment matching, inventory reservation, and order confirmation.

### Changes Required:

#### 1. Checkout Business Rules Subscriber
**File**: `backend/src/subscribers/checkout-business-rules.ts`
**Changes**: Track all checkout business events

```typescript
import { EventBusService, OrderService, CartService } from "@medusajs/medusa"
import { ensure } from '@desplega.ai/business-use'
import BusinessUseService from "../services/business-use.service"

class CheckoutBusinessRulesSubscriber {
  constructor({
    eventBusService,
    orderService,
    cartService,
    businessUseService
  }: {
    eventBusService: EventBusService
    orderService: OrderService
    cartService: CartService
    businessUseService: BusinessUseService
  }) {
    // Subscribe to cart and order events
    eventBusService.subscribe("cart.updated", this.handleCartUpdated.bind(this))
    eventBusService.subscribe("order.placed", this.handleOrderPlaced.bind(this))
    eventBusService.subscribe("order.payment_captured", this.handlePaymentCaptured.bind(this))

    this.orderService = orderService
    this.cartService = cartService
    this.businessUseService = businessUseService
  }

  async handleCartUpdated({ id }: { id: string }) {
    const cart = await this.cartService.retrieve(id, {
      relations: ["items", "items.variant", "discounts", "shipping_methods", "region"]
    })

    const runId = `cart_${cart.id}`

    // BUSINESS RULE #1: Cart must have items and valid total
    ensure({
      id: 'cart_validated',
      flow: 'checkout',
      runId,
      data: {
        cart_id: cart.id,
        item_count: cart.items?.length || 0,
        subtotal: cart.subtotal || 0,
        total: cart.total || 0,
      },
      validator: (data) => {
        // Business Rule: Cart cannot be empty and must have positive total
        return data.item_count > 0 && data.total > 0
      },
      description: "Cart validation: must have items and positive total"
    })

    // BUSINESS RULE #2: Discount stacking limit (max 30%)
    if (cart.discounts && cart.discounts.length > 0) {
      const totalDiscountAmount = cart.discount_total || 0
      const discountPercent = cart.subtotal > 0 ? totalDiscountAmount / cart.subtotal : 0

      ensure({
        id: 'discount_validation',
        flow: 'checkout',
        runId,
        data: {
          cart_id: cart.id,
          subtotal: cart.subtotal,
          total_discount: totalDiscountAmount,
          discount_percent: discountPercent,
          discount_codes: cart.discounts.map(d => d.code),
          discount_count: cart.discounts.length,
        },
        depIds: ['cart_validated'],
        validator: (data) => {
          // Business Rule: Total discounts cannot exceed 30% (company policy)
          // This prevents discount abuse and ensures minimum margins
          return data.discount_percent <= 0.30
        },
        description: "Discount stacking limit: prevent >30% total discount abuse"
      })
    }

    // BUSINESS RULE #3: Free shipping eligibility ($50 minimum)
    if (cart.shipping_methods && cart.shipping_methods.length > 0) {
      const freeShipping = cart.shipping_methods.find(m => m.amount === 0)

      ensure({
        id: 'free_shipping_eligibility',
        flow: 'checkout',
        runId,
        data: {
          cart_id: cart.id,
          subtotal: cart.subtotal,
          has_free_shipping: !!freeShipping,
          shipping_total: cart.shipping_total,
        },
        depIds: ['cart_validated'],
        validator: (data) => {
          // Business Rule: Free shipping only on orders $50+ ($5000 in cents)
          if (data.has_free_shipping) {
            return data.subtotal >= 5000
          }
          return true
        },
        description: "Free shipping threshold: $50 minimum order value"
      })
    }

    // BUSINESS RULE #4: Tax calculation for US orders
    if (cart.region && cart.shipping_address) {
      ensure({
        id: 'tax_calculated',
        flow: 'checkout',
        runId,
        data: {
          cart_id: cart.id,
          country_code: cart.shipping_address.country_code?.toUpperCase(),
          tax_total: cart.tax_total || 0,
          tax_rate: cart.region.tax_rate || 0,
          subtotal: cart.subtotal,
        },
        depIds: ['cart_validated', 'discount_validation'],
        validator: (data) => {
          // Business Rule: US orders must have tax calculated (compliance)
          if (data.country_code === 'US') {
            return data.tax_total > 0 && data.tax_rate > 0
          }
          return true // Non-US orders may have different tax rules
        },
        description: "Tax calculation: US orders must have tax applied (compliance)"
      })
    }
  }

  async handleOrderPlaced({ id }: { id: string }) {
    const order = await this.orderService.retrieve(id, {
      relations: [
        "items",
        "items.variant",
        "customer",
        "payments",
        "discounts",
        "shipping_address"
      ]
    })

    const runId = this.businessUseService.getOrderRunId(order.id)

    // BUSINESS RULE #5: First-order discount validation (WELCOME10)
    const welcomeDiscount = order.discounts?.find(d => d.code === 'WELCOME10')
    if (welcomeDiscount) {
      // Check if this is truly a first order
      const previousOrders = await this.orderService.list({
        customer_id: order.customer_id,
      })

      ensure({
        id: 'first_order_discount_check',
        flow: 'checkout',
        runId,
        data: {
          order_id: order.id,
          customer_id: order.customer_id,
          customer_email: order.email,
          is_first_order: previousOrders.length === 1, // Current order is the only one
          applied_discount: 'WELCOME10',
          discount_amount: order.discount_total,
          previous_order_count: previousOrders.length - 1,
        },
        validator: (data) => {
          // Business Rule: WELCOME10 only valid for first-time customers
          // Prevents discount abuse by repeat customers
          return data.is_first_order === true
        },
        description: "First-order discount: prevent WELCOME10 reuse by existing customers"
      })
    }

    // BUSINESS RULE #6: Inventory reservation (prevent overselling)
    for (const item of order.items) {
      ensure({
        id: `inventory_reserved_${item.id}`,
        flow: 'checkout',
        runId,
        data: {
          order_id: order.id,
          variant_id: item.variant_id,
          product_title: item.title,
          ordered_quantity: item.quantity,
          available_inventory: item.variant?.inventory_quantity || 0,
        },
        validator: (data) => {
          // Business Rule: Cannot oversell inventory
          // Prevents backorders and customer dissatisfaction
          return data.available_inventory >= data.ordered_quantity
        },
        description: `Inventory check: prevent overselling ${item.title}`
      })
    }

    // BUSINESS RULE #7: Payment amount validation
    const payment = order.payments?.[0]
    if (payment) {
      ensure({
        id: 'payment_amount_validation',
        flow: 'checkout',
        runId,
        data: {
          order_id: order.id,
          order_total: order.total,
          payment_amount: payment.amount,
          currency: order.currency_code,
          payment_provider: payment.provider_id,
        },
        depIds: ['first_order_discount_check', 'discount_validation'],
        validator: (data) => {
          // Business Rule: Payment must match order total (fraud prevention)
          // Allow $1 variance for rounding
          return Math.abs(data.order_total - data.payment_amount) < 100
        },
        description: "Payment validation: amount must match order total"
      })
    }
  }

  async handlePaymentCaptured({ id }: { id: string }) {
    const order = await this.orderService.retrieve(id)
    const runId = this.businessUseService.getOrderRunId(order.id)

    // BUSINESS RULE #8: Final order confirmation
    ensure({
      id: 'order_confirmed',
      flow: 'checkout',
      runId,
      data: {
        order_id: order.id,
        order_total: order.total,
        status: order.status,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        confirmed_at: new Date().toISOString(),
      },
      // All upstream business rules must pass before confirmation
      depIds: [
        'payment_amount_validation',
        'discount_validation',
        'free_shipping_eligibility',
      ],
      description: "Order confirmation: all business rules validated successfully"
    })

    console.log(`[Business-Use] ✅ Order ${order.id} confirmed with all rules validated`)
  }
}

export default CheckoutBusinessRulesSubscriber
```

#### 2. Test Endpoints for Checkout Violations
**File**: `backend/src/api/routes/admin/test-flows.ts`
**Changes**: Create test endpoints

```typescript
import { Router } from "express"
import { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

const router = Router()

// Test: Successful checkout (happy path)
router.post("/test/successful-checkout", async (req: MedusaRequest, res: MedusaResponse) => {
  const cartService = req.scope.resolve("cartService")
  const orderService = req.scope.resolve("orderService")

  // Create cart with valid items, no excessive discounts
  const cart = await cartService.create({
    region_id: "default_region",
    email: "test@example.com",
  })

  // Add item worth $60 (qualifies for free shipping)
  await cartService.addLineItem(cart.id, {
    variant_id: "variant_bluetooth_speaker", // $89 item
    quantity: 1,
  })

  // Complete checkout
  const order = await orderService.createFromCart(cart.id)

  res.json({
    success: true,
    order_id: order.id,
    message: "Order should pass all business rules",
    run_id: `order_${order.id}`,
  })
})

// Test: Discount abuse (exceeds 30% limit)
router.post("/test/discount-abuse", async (req: MedusaRequest, res: MedusaResponse) => {
  const cartService = req.scope.resolve("cartService")

  const cart = await cartService.create({
    region_id: "default_region",
    email: "test@example.com",
  })

  await cartService.addLineItem(cart.id, {
    variant_id: "variant_laptop_stand",
    quantity: 2, // $98 total
  })

  // Apply SUMMER20 (20% off) + VIP30 (30% off) = 50% total discount (violates 30% rule)
  await cartService.update(cart.id, {
    discounts: [{ code: "SUMMER20" }, { code: "VIP30" }],
  })

  res.json({
    success: false,
    expected_violation: "discount_validation",
    message: "Should violate 30% discount stacking limit",
    run_id: `cart_${cart.id}`,
  })
})

// Test: Inventory oversell attempt
router.post("/test/inventory-oversell", async (req: MedusaRequest, res: MedusaResponse) => {
  const cartService = req.scope.resolve("cartService")
  const productVariantService = req.scope.resolve("productVariantService")

  // Find a variant with low stock
  const variant = await productVariantService.retrieve("variant_smart_watch") // 30 in stock

  const cart = await cartService.create({
    region_id: "default_region",
    email: "test@example.com",
  })

  // Try to order more than available
  await cartService.addLineItem(cart.id, {
    variant_id: variant.id,
    quantity: 50, // Exceeds 30 available
  })

  res.json({
    success: false,
    expected_violation: "inventory_reserved",
    message: "Should prevent overselling inventory",
    run_id: `cart_${cart.id}`,
  })
})

// Test: First-order discount abuse
router.post("/test/first-order-discount-reuse", async (req: MedusaRequest, res: MedusaResponse) => {
  const cartService = req.scope.resolve("cartService")
  const orderService = req.scope.resolve("orderService")

  // Use existing customer with previous orders
  const cart = await cartService.create({
    region_id: "default_region",
    email: "vip.customer@example.com", // Has 6 previous orders
    customer_id: "customer_vip",
  })

  await cartService.addLineItem(cart.id, {
    variant_id: "variant_headphones",
    quantity: 1,
  })

  // Try to apply first-order discount
  await cartService.update(cart.id, {
    discounts: [{ code: "WELCOME10" }],
  })

  const order = await orderService.createFromCart(cart.id)

  res.json({
    success: false,
    expected_violation: "first_order_discount_check",
    message: "Should prevent WELCOME10 reuse by existing customer",
    run_id: `order_${order.id}`,
  })
})

export default router
```

### Success Criteria:

#### Automated Verification:
- [ ] Subscriber loads without errors: `npm run dev` (check logs)
- [ ] TypeScript compilation: `npm run typecheck`
- [ ] Test endpoint responds: `POST http://localhost:9000/admin/test/successful-checkout`
- [ ] Business-Use receives events: Check dashboard for `checkout` flow
- [ ] Violations detected: Run discount-abuse test and verify failure in Business-Use

#### Manual Verification:
- [ ] Complete checkout through storefront → tracked in Business-Use
- [ ] Cart validation triggers on item add
- [ ] Discount stacking prevented when >30%
- [ ] WELCOME10 rejected for repeat customer
- [ ] Free shipping only applies on $50+ orders
- [ ] Inventory oversell blocked
- [ ] Payment mismatch detected
- [ ] Order confirmation appears after all rules pass
- [ ] Business-Use dashboard shows all 8 checkout nodes

---

## Phase 4: Returns & Refunds Flow

### Overview
Implement Flow 2 (Returns) with business rules for return windows, product eligibility, restocking fees, and inventory management.

### Changes Required:

#### 1. Return Business Rules Subscriber
**File**: `backend/src/subscribers/return-business-rules.ts`
**Changes**: Track return flow events

```typescript
import { EventBusService, ReturnService, OrderService } from "@medusajs/medusa"
import { ensure } from '@desplega.ai/business-use'
import BusinessUseService from "../services/business-use.service"

class ReturnBusinessRulesSubscriber {
  constructor({
    eventBusService,
    returnService,
    orderService,
    businessUseService
  }) {
    eventBusService.subscribe("order.return_requested", this.handleReturnRequested.bind(this))
    eventBusService.subscribe("return.received", this.handleReturnReceived.bind(this))

    this.returnService = returnService
    this.orderService = orderService
    this.businessUseService = businessUseService
  }

  async handleReturnRequested({ id, return_id }) {
    const returnRequest = await this.returnService.retrieve(return_id, {
      relations: ["order", "items", "items.item"]
    })
    const order = returnRequest.order

    const runId = this.businessUseService.getReturnRunId(return_id)
    const daysSincePurchase = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)

    // BUSINESS RULE #1: 30-day return window
    ensure({
      id: 'return_requested',
      flow: 'returns',
      runId,
      data: {
        return_id: return_id,
        order_id: order.id,
        order_date: order.created_at,
        request_date: new Date().toISOString(),
        days_since_purchase: daysSincePurchase,
        customer_email: order.email,
      },
      validator: (data) => {
        // Business Rule: Returns only within 30 days
        return data.days_since_purchase <= 30
      },
      description: "Return window: must be within 30 days of purchase"
    })

    // BUSINESS RULE #2: Product eligibility (non-returnable categories)
    for (const returnItem of returnRequest.items) {
      const item = returnItem.item

      ensure({
        id: `return_eligibility_${item.id}`,
        flow: 'returns',
        runId,
        data: {
          return_id: return_id,
          item_id: item.id,
          product_title: item.title,
          category: item.variant?.product?.metadata?.category || 'UNKNOWN',
          is_final_sale: item.metadata?.final_sale || false,
          reason: returnItem.reason,
        },
        depIds: ['return_requested'],
        validator: (data) => {
          // Business Rule: Final sale and certain categories cannot be returned
          const nonReturnable = ['FINAL_SALE', 'CONSUMABLE', 'DIGITAL']
          if (data.is_final_sale) return false
          return !nonReturnable.includes(data.category)
        },
        description: `Eligibility check: ${item.title} return policy`
      })
    }
  }

  async handleReturnReceived({ id, return_id }) {
    const returnRequest = await this.returnService.retrieve(return_id, {
      relations: ["order", "items", "items.item", "refund_amount"]
    })

    const runId = this.businessUseService.getReturnRunId(return_id)

    // BUSINESS RULE #3: Refund calculation with restocking fee
    let totalRefund = 0
    for (const returnItem of returnRequest.items) {
      const item = returnItem.item
      const itemTotal = item.unit_price * returnItem.quantity
      const category = item.variant?.product?.metadata?.category
      const isDefective = returnItem.reason === 'defective'

      let refundAmount = itemTotal

      // Apply 15% restocking fee for non-defective electronics
      if (category === 'ELECTRONICS' && !isDefective) {
        refundAmount = itemTotal * 0.85
      }

      totalRefund += refundAmount

      ensure({
        id: `refund_calculated_${item.id}`,
        flow: 'returns',
        runId,
        data: {
          return_id: return_id,
          item_id: item.id,
          item_total: itemTotal,
          refund_amount: refundAmount,
          category: category,
          is_defective: isDefective,
          restocking_fee_applied: category === 'ELECTRONICS' && !isDefective,
          restocking_fee_amount: itemTotal - refundAmount,
        },
        depIds: [`return_eligibility_${item.id}`],
        validator: (data) => {
          // Business Rule: Restocking fee calculation accuracy
          if (data.category === 'ELECTRONICS' && !data.is_defective) {
            const expectedRefund = data.item_total * 0.85
            return Math.abs(data.refund_amount - expectedRefund) < 1
          }
          // No restocking fee for other categories or defective items
          return data.refund_amount === data.item_total
        },
        description: `Refund calculation: 15% restocking fee for electronics`
      })
    }

    // BUSINESS RULE #4: Inventory restocking
    for (const returnItem of returnRequest.items) {
      ensure({
        id: `inventory_restocked_${returnItem.item_id}`,
        flow: 'returns',
        runId,
        data: {
          return_id: return_id,
          variant_id: returnItem.item.variant_id,
          quantity_returned: returnItem.quantity,
          quantity_restocked: returnItem.quantity, // Should match
        },
        validator: (data) => {
          // Business Rule: All returned items must be added back to inventory
          return data.quantity_returned === data.quantity_restocked
        },
        description: "Inventory restocking: returned items added back to stock"
      })
    }

    console.log(`[Business-Use] ✅ Return ${return_id} processed with refund: $${totalRefund / 100}`)
  }
}

export default ReturnBusinessRulesSubscriber
```

#### 2. Test Endpoints for Return Violations
**File**: `backend/src/api/routes/admin/test-flows.ts`
**Changes**: Add return test endpoints

```typescript
// Test: Return outside 30-day window
router.post("/test/return-outside-window", async (req: MedusaRequest, res: MedusaResponse) => {
  const orderService = req.scope.resolve("orderService")
  const returnService = req.scope.resolve("returnService")

  // Create old order (simulate by manually setting created_at)
  const order = await orderService.create({
    region_id: "default_region",
    email: "test@example.com",
    items: [{ variant_id: "variant_headphones", quantity: 1 }],
  })

  // Manually update order date to 35 days ago (bypassing validation for test)
  await orderService.update(order.id, {
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
  })

  // Request return
  const returnRequest = await returnService.create({
    order_id: order.id,
    items: [{ item_id: order.items[0].id, quantity: 1 }],
  })

  res.json({
    success: false,
    expected_violation: "return_requested",
    message: "Should reject return after 30-day window",
    run_id: `return_${returnRequest.id}`,
  })
})

// Test: Non-returnable item (final sale)
router.post("/test/return-final-sale", async (req: MedusaRequest, res: MedusaResponse) => {
  const orderService = req.scope.resolve("orderService")
  const returnService = req.scope.resolve("returnService")

  const order = await orderService.create({
    region_id: "default_region",
    email: "test@example.com",
    items: [{
      variant_id: "variant_final_sale_item",
      quantity: 1,
      metadata: { final_sale: true },
    }],
  })

  const returnRequest = await returnService.create({
    order_id: order.id,
    items: [{ item_id: order.items[0].id, quantity: 1 }],
  })

  res.json({
    success: false,
    expected_violation: "return_eligibility",
    message: "Should reject return of final sale items",
    run_id: `return_${returnRequest.id}`,
  })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] Return subscriber loads: Check server logs
- [ ] TypeScript compilation passes
- [ ] Test endpoint responds: `POST /admin/test/return-outside-window`
- [ ] Business-Use shows `returns` flow in dashboard
- [ ] Violations detected for late returns

#### Manual Verification:
- [ ] Request return within 30 days → approved
- [ ] Request return after 30 days → violation caught
- [ ] Return electronics → 15% restocking fee applied
- [ ] Return defective electronics → no restocking fee
- [ ] Return final sale item → rejected
- [ ] Inventory correctly restocked after return
- [ ] Refund amount matches calculation rules

---

## Phase 5: Loyalty & VIP Program Flow

### Overview
Implement Flow 3 (Loyalty) with points calculation, VIP status validation, and redemption limits.

### Changes Required:

#### 1. Loyalty Business Rules Subscriber
**File**: `backend/src/subscribers/loyalty-business-rules.ts`
**Changes**: Track loyalty program logic

```typescript
import { EventBusService, OrderService, CustomerService } from "@medusajs/medusa"
import { ensure } from '@desplega.ai/business-use'
import BusinessUseService from "../services/business-use.service"

class LoyaltyBusinessRulesSubscriber {
  constructor({
    eventBusService,
    orderService,
    customerService,
    businessUseService
  }) {
    eventBusService.subscribe("order.placed", this.handleOrderPlaced.bind(this))

    this.orderService = orderService
    this.customerService = customerService
    this.businessUseService = businessUseService
  }

  async handleOrderPlaced({ id }) {
    const order = await this.orderService.retrieve(id, {
      relations: ["customer"]
    })

    if (!order.customer_id) return // Guest checkout, no loyalty

    const customer = await this.customerService.retrieve(order.customer_id)
    const runId = this.businessUseService.getLoyaltyRunId(customer.id, order.id)

    const lifetimeSpent = (customer.metadata?.lifetime_spent || 0) + order.total
    const orderCount = (customer.metadata?.order_count || 0) + 1

    // BUSINESS RULE #1: VIP status calculation
    const shouldBeVip = lifetimeSpent >= 100000 || orderCount >= 5 // $1000 or 5 orders
    const currentVipStatus = customer.metadata?.vip_status === true

    ensure({
      id: 'vip_status_check',
      flow: 'loyalty',
      runId,
      data: {
        customer_id: customer.id,
        customer_email: customer.email,
        lifetime_spent: lifetimeSpent,
        order_count: orderCount,
        is_vip: currentVipStatus,
        should_be_vip: shouldBeVip,
        order_total: order.total,
      },
      validator: (data) => {
        // Business Rule: VIP status at $1000 spent OR 5+ orders
        const expectedVip = data.lifetime_spent >= 100000 || data.order_count >= 5
        return expectedVip === data.is_vip
      },
      description: "VIP status: granted at $1000 lifetime spend or 5 orders"
    })

    // BUSINESS RULE #2: Points earning calculation
    const basePoints = Math.floor(order.total / 100) // 1 point per dollar
    const multiplier = currentVipStatus ? 2 : 1
    const expectedPoints = basePoints * multiplier
    const actualPoints = customer.metadata?.points_earned_this_order || expectedPoints

    ensure({
      id: 'points_earned',
      flow: 'loyalty',
      runId,
      data: {
        order_id: order.id,
        customer_id: customer.id,
        order_total: order.total,
        base_points: basePoints,
        multiplier: multiplier,
        expected_points: expectedPoints,
        actual_points: actualPoints,
        is_vip: currentVipStatus,
      },
      depIds: ['vip_status_check'],
      validator: (data, ctx) => {
        // Access VIP status from dependency
        const vipCheck = ctx.deps.find(d => d.id === 'vip_status_check')
        const isVip = vipCheck?.data.is_vip || false

        // Business Rule: 1 point per dollar, 2x for VIP
        const expectedMultiplier = isVip ? 2 : 1
        const expectedPoints = Math.floor(data.order_total / 100) * expectedMultiplier

        return data.actual_points === expectedPoints
      },
      description: "Loyalty points: 1 point/dollar (2x for VIP)"
    })

    // Update customer metadata with new values
    await this.customerService.update(customer.id, {
      metadata: {
        ...customer.metadata,
        lifetime_spent: lifetimeSpent,
        order_count: orderCount,
        vip_status: shouldBeVip,
        loyalty_points: (customer.metadata?.loyalty_points || 0) + expectedPoints,
        points_earned_this_order: expectedPoints,
      },
    })

    console.log(`[Business-Use] ✅ Loyalty updated: ${customer.email} earned ${expectedPoints} points`)
  }

  // Handle points redemption
  async handlePointsRedemption(customerId: string, orderId: string, pointsUsed: number) {
    const customer = await this.customerService.retrieve(customerId)
    const order = await this.orderService.retrieve(orderId)

    const runId = this.businessUseService.getLoyaltyRunId(customerId, orderId)
    const pointsValue = pointsUsed // Assuming 1 point = $0.01 = 1 cent

    // BUSINESS RULE #3: Points redemption limit (max 50% of order)
    ensure({
      id: 'points_redeemed',
      flow: 'loyalty',
      runId,
      data: {
        customer_id: customerId,
        order_id: orderId,
        order_subtotal: order.subtotal,
        points_used: pointsUsed,
        points_value: pointsValue,
        available_points: customer.metadata?.loyalty_points || 0,
        redemption_percent: pointsValue / order.subtotal,
      },
      validator: (data) => {
        // Business Rule: Cannot redeem more than 50% of order value
        return data.points_value <= data.order_subtotal * 0.5
      },
      description: "Points redemption: limited to 50% of order value"
    })
  }
}

export default LoyaltyBusinessRulesSubscriber
```

#### 2. Test Endpoints for Loyalty
**File**: `backend/src/api/routes/admin/test-flows.ts`
**Changes**: Add loyalty test endpoints

```typescript
// Test: VIP upgrade
router.post("/test/vip-upgrade", async (req: MedusaRequest, res: MedusaResponse) => {
  const customerService = req.scope.resolve("customerService")
  const orderService = req.scope.resolve("orderService")

  // Create customer close to VIP threshold
  const customer = await customerService.create({
    email: "almost.vip@example.com",
    metadata: {
      order_count: 4,
      lifetime_spent: 95000, // $950
      vip_status: false,
      loyalty_points: 950,
    },
  })

  // Place order that should trigger VIP upgrade
  const order = await orderService.create({
    region_id: "default_region",
    email: customer.email,
    customer_id: customer.id,
    items: [{ variant_id: "variant_bluetooth_speaker", quantity: 1 }], // $89
    total: 8900,
  })

  res.json({
    success: true,
    message: "Should trigger VIP upgrade (5th order)",
    run_id: `loyalty_${customer.id}_${order.id}`,
    expected_vip_status: true,
    expected_points: 89 * 2, // VIP gets 2x points
  })
})

// Test: Points redemption abuse
router.post("/test/points-redemption-abuse", async (req: MedusaRequest, res: MedusaResponse) => {
  const customerService = req.scope.resolve("customerService")
  const loyaltyService = req.scope.resolve("loyaltyBusinessRulesSubscriber")

  const customer = await customerService.create({
    email: "points.abuser@example.com",
    metadata: {
      loyalty_points: 10000, // $100 worth of points
    },
  })

  const order = await orderService.create({
    region_id: "default_region",
    email: customer.email,
    customer_id: customer.id,
    items: [{ variant_id: "variant_tshirt", quantity: 2 }], // $48 total
    total: 4800,
  })

  // Try to redeem $60 worth of points on a $48 order (125% > 50% limit)
  await loyaltyService.handlePointsRedemption(customer.id, order.id, 6000)

  res.json({
    success: false,
    expected_violation: "points_redeemed",
    message: "Should prevent redeeming >50% of order value in points",
    run_id: `loyalty_${customer.id}_${order.id}`,
  })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] Loyalty subscriber loads successfully
- [ ] VIP upgrade test passes: `POST /admin/test/vip-upgrade`
- [ ] Points calculation verified in Business-Use dashboard
- [ ] Redemption limit enforced

#### Manual Verification:
- [ ] Customer with 4 orders gets VIP on 5th order
- [ ] Customer with $950 spent gets VIP at $1000
- [ ] VIP customers earn 2x points (verified in database)
- [ ] Regular customers earn 1x points
- [ ] Points redemption capped at 50% of order value
- [ ] Lifetime spend tracks accurately

---

## Phase 6: Inventory Management Flow

### Overview
Implement Flow 4 (Inventory) with stock alerts, oversell prevention, and reorder triggers.

### Changes Required:

#### 1. Inventory Business Rules Subscriber
**File**: `backend/src/subscribers/inventory-business-rules.ts`
**Changes**: Track inventory management logic

```typescript
import { EventBusService, ProductVariantService } from "@medusajs/medusa"
import { ensure } from '@desplega.ai/business-use'
import BusinessUseService from "../services/business-use.service"

class InventoryBusinessRulesSubscriber {
  constructor({
    eventBusService,
    productVariantService,
    businessUseService
  }) {
    eventBusService.subscribe("product-variant.updated", this.handleInventoryUpdate.bind(this))

    this.productVariantService = productVariantService
    this.businessUseService = businessUseService
  }

  async handleInventoryUpdate({ id }) {
    const variant = await this.productVariantService.retrieve(id, {
      relations: ["product"]
    })

    const runId = this.businessUseService.getInventoryRunId(variant.id)
    const reorderPoint = variant.metadata?.reorder_point || 20
    const avgMonthlySales = variant.metadata?.avg_monthly_sales || 10

    // BUSINESS RULE #1: Low stock alert threshold
    const isLowStock = variant.inventory_quantity <= reorderPoint * 0.2

    if (isLowStock) {
      ensure({
        id: 'low_stock_alert',
        flow: 'inventory',
        runId,
        data: {
          variant_id: variant.id,
          product_title: variant.product.title,
          current_stock: variant.inventory_quantity,
          reorder_point: reorderPoint,
          threshold: reorderPoint * 0.2,
          is_low_stock: isLowStock,
        },
        validator: (data) => {
          // Business Rule: Alert when stock below 20% of reorder point
          return data.current_stock <= data.threshold
        },
        description: `Low stock alert: ${variant.product.title} needs reordering`
      })
    }

    // BUSINESS RULE #2: Fulfillment validation
    ensure({
      id: 'stock_level_checked',
      flow: 'inventory',
      runId,
      data: {
        variant_id: variant.id,
        available_stock: variant.inventory_quantity,
        is_available: variant.inventory_quantity > 0,
      },
      validator: (data) => {
        // Business Rule: Stock level must be non-negative
        return data.available_stock >= 0
      },
      description: "Stock level validation: ensure non-negative inventory"
    })

    // BUSINESS RULE #3: Reorder quantity calculation
    if (isLowStock) {
      const reorderQuantity = avgMonthlySales * 3 // 3 months supply

      ensure({
        id: 'reorder_triggered',
        flow: 'inventory',
        runId,
        data: {
          variant_id: variant.id,
          product_title: variant.product.title,
          current_stock: variant.inventory_quantity,
          avg_monthly_sales: avgMonthlySales,
          reorder_quantity: reorderQuantity,
        },
        depIds: ['low_stock_alert'],
        validator: (data) => {
          // Business Rule: Reorder quantity must cover 3 months of avg sales
          return data.reorder_quantity >= data.avg_monthly_sales * 3
        },
        description: "Reorder calculation: 3 months supply based on sales history"
      })

      console.log(`[Business-Use] 🔔 Reorder alert: ${variant.product.title} - Order ${reorderQuantity} units`)
    }
  }
}

export default InventoryBusinessRulesSubscriber
```

#### 2. Test Endpoints for Inventory
**File**: `backend/src/api/routes/admin/test-flows.ts`
**Changes**: Add inventory test endpoints

```typescript
// Test: Low stock alert
router.post("/test/low-stock-alert", async (req: MedusaRequest, res: MedusaResponse) => {
  const productVariantService = req.scope.resolve("productVariantService")

  const variant = await productVariantService.retrieve("variant_smart_watch")

  // Update to trigger low stock alert
  await productVariantService.update(variant.id, {
    inventory_quantity: 3, // Below 20% of reorder point (20)
    metadata: {
      reorder_point: 20,
      avg_monthly_sales: 10,
    },
  })

  res.json({
    success: true,
    message: "Low stock alert should trigger",
    run_id: `inventory_${variant.id}`,
    expected_reorder_quantity: 30, // 3 months * 10/month
  })
})

// Test: Inventory oversell prevention
router.post("/test/inventory-oversell-prevention", async (req: MedusaRequest, res: MedusaResponse) => {
  const cartService = req.scope.resolve("cartService")
  const productVariantService = req.scope.resolve("productVariantService")

  // Set variant to low stock
  const variant = await productVariantService.update("variant_tshirt_small", {
    inventory_quantity: 5,
  })

  const cart = await cartService.create({
    region_id: "default_region",
    email: "test@example.com",
  })

  // Try to add more than available
  try {
    await cartService.addLineItem(cart.id, {
      variant_id: variant.id,
      quantity: 10, // Exceeds available (5)
    })
  } catch (error) {
    // Expected to fail
  }

  res.json({
    success: false,
    expected_violation: "inventory_reserved",
    message: "Should prevent adding more items than available stock",
  })
})
```

### Success Criteria:

#### Automated Verification:
- [ ] Inventory subscriber loads successfully
- [ ] Low stock alert triggers: `POST /admin/test/low-stock-alert`
- [ ] Oversell prevention works: `POST /admin/test/inventory-oversell-prevention`
- [ ] Reorder calculation verified in Business-Use

#### Manual Verification:
- [ ] Low stock alert appears when inventory < 20% of reorder point
- [ ] Reorder quantity calculated as 3x monthly average
- [ ] Cannot add to cart if stock insufficient
- [ ] Stock level stays non-negative
- [ ] Inventory updates tracked in Business-Use dashboard

---

## Phase 7: Testing & Documentation

### Overview
Create comprehensive test suite, business metrics dashboard, and documentation.

### Changes Required:

#### 1. Automated Test Suite
**File**: `scripts/test-business-rules.ts`
**Changes**: Comprehensive test scenarios

```typescript
#!/usr/bin/env ts-node

import { ensure } from '@desplega.ai/business-use'

async function runAllTests() {
  console.log("🧪 Running Business-Use validation tests...\n")

  const tests = [
    testSuccessfulCheckout,
    testDiscountAbuse,
    testInventoryOversell,
    testReturnWindow,
    testVIPUpgrade,
    testPointsRedemption,
    testLowStockAlert,
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test()
      passed++
      console.log(`✅ ${test.name} PASSED\n`)
    } catch (error) {
      failed++
      console.log(`❌ ${test.name} FAILED: ${error.message}\n`)
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

async function testSuccessfulCheckout() {
  // Hit test endpoint
  const response = await fetch('http://localhost:9000/admin/test/successful-checkout', {
    method: 'POST',
  })
  const data = await response.json()

  // Wait for Business-Use to process
  await new Promise(resolve => setTimeout(resolve, 6000))

  // Verify flow passed
  // TODO: Query Business-Use API to verify all nodes passed
}

async function testDiscountAbuse() {
  const response = await fetch('http://localhost:9000/admin/test/discount-abuse', {
    method: 'POST',
  })
  const data = await response.json()

  await new Promise(resolve => setTimeout(resolve, 6000))

  // Verify violation was caught
  // TODO: Query Business-Use API to verify violation
}

// ... similar for other tests

runAllTests()
```

#### 2. Business Metrics Dashboard
**File**: `backend/src/api/routes/admin/business-metrics.ts`
**Changes**: Create metrics endpoint

```typescript
import { Router } from "express"
import { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

const router = Router()

router.get("/business-violations", async (req: MedusaRequest, res: MedusaResponse) => {
  // Query Business-Use API for violations
  const response = await fetch(`${process.env.BUSINESS_USE_URL}/v1/runs`, {
    headers: { 'X-Api-Key': process.env.BUSINESS_USE_API_KEY },
  })
  const runs = await response.json()

  // Filter for failed validations
  const violations = runs.filter(run =>
    run.nodes?.some(node => node.type === 'assert' && node.status === 'failed')
  )

  // Calculate revenue impact
  const impactByRule = {
    discount_validation: { count: 0, prevented_loss: 0 },
    first_order_discount_check: { count: 0, prevented_loss: 0 },
    inventory_reserved: { count: 0, prevented_stockouts: 0 },
    return_requested: { count: 0, prevented_abuse: 0 },
  }

  for (const violation of violations) {
    const failedNode = violation.nodes.find(n => n.status === 'failed')
    if (!failedNode) continue

    switch (failedNode.id) {
      case 'discount_validation':
        const excessDiscount = failedNode.data.total_discount - (failedNode.data.subtotal * 0.30)
        impactByRule.discount_validation.count++
        impactByRule.discount_validation.prevented_loss += excessDiscount
        break

      case 'first_order_discount_check':
        impactByRule.first_order_discount_check.count++
        impactByRule.first_order_discount_check.prevented_loss += failedNode.data.discount_amount
        break

      case 'inventory_reserved':
        impactByRule.inventory_reserved.count++
        impactByRule.inventory_reserved.prevented_stockouts++
        break

      case 'return_requested':
        impactByRule.return_requested.count++
        impactByRule.return_requested.prevented_abuse++
        break
    }
  }

  const totalRevenueProtected =
    impactByRule.discount_validation.prevented_loss +
    impactByRule.first_order_discount_check.prevented_loss

  res.json({
    summary: {
      total_violations: violations.length,
      total_revenue_protected: totalRevenueProtected / 100, // Convert to dollars
      total_stockouts_prevented: impactByRule.inventory_reserved.prevented_stockouts,
      total_return_abuse_prevented: impactByRule.return_requested.prevented_abuse,
    },
    by_rule: impactByRule,
    recent_violations: violations.slice(0, 10).map(v => ({
      run_id: v.run_id,
      flow: v.flow,
      failed_rule: v.nodes.find(n => n.status === 'failed')?.id,
      timestamp: v.created_at,
    })),
  })
})

export default router
```

#### 3. Documentation
**File**: `README.md`
**Changes**: Comprehensive project documentation

```markdown
# Medusa.js E-commerce with Business-Use Flow Tracking

## Overview
Demonstration of Business-Use tracking critical e-commerce business rules using Medusa.js v2.

## Business Rules Tracked

### Checkout Flow (Flow 1)
- ✅ Discount stacking limit: Prevents >30% total discounts
- ✅ First-order discount: WELCOME10 only for new customers
- ✅ Free shipping: Only on orders $50+
- ✅ Inventory overselling: Prevents stockouts
- ✅ Payment validation: Amount must match total
- **Estimated Revenue Protection**: $X,XXX/month

### Returns Flow (Flow 2)
- ✅ 30-day return window enforcement
- ✅ Non-returnable items: Final sale policy
- ✅ Restocking fees: 15% for electronics
- **Customer Satisfaction**: Prevents policy abuse

### Loyalty Flow (Flow 3)
- ✅ VIP status: $1000 spent or 5 orders
- ✅ Points calculation: 1x regular, 2x VIP
- ✅ Redemption limit: Max 50% of order
- **Retention Impact**: Accurate rewards = higher loyalty

### Inventory Flow (Flow 4)
- ✅ Low stock alerts: At 20% of reorder point
- ✅ Reorder calculations: 3 months supply
- ✅ Fulfillment validation: Prevent overselling
- **Operational Excellence**: Never run out of stock

## Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../storefront && npm install

# Start Business-Use backend
docker run -p 13370:13370 desplega/business-use

# Start Medusa backend
cd backend
npm run seed  # Load demo data
npm run dev   # Port 9000

# Start storefront
cd storefront
npm run dev   # Port 8000
```

## Testing Business Rules

```bash
# Run automated test suite
npm run test:business-rules

# Test specific violations
curl -X POST http://localhost:9000/admin/test/discount-abuse
curl -X POST http://localhost:9000/admin/test/inventory-oversell
curl -X POST http://localhost:9000/admin/test/return-outside-window

# View metrics dashboard
curl http://localhost:9000/admin/business-violations
```

## Business-Use Dashboard

Access at http://localhost:13370 to see:
- Real-time flow tracking
- Violation alerts
- Revenue protection metrics
- Compliance monitoring

## Examples of Caught Violations

### Discount Abuse
```
❌ Violation: discount_validation
Customer attempted: SUMMER20 (20%) + VIP30 (30%) = 50% total
Policy limit: 30%
Prevented loss: $45
```

### Inventory Oversell
```
❌ Violation: inventory_reserved
Product: Smart Watch
Available: 30 units
Attempted order: 50 units
Prevented stockout: 20 units
```

## Revenue Impact (Estimated)

| Rule | Violations/Month | Prevented Loss |
|------|-----------------|----------------|
| Discount stacking | 12 | $540 |
| First-order abuse | 8 | $320 |
| Inventory oversell | 5 | Prevented stockouts |
| Return policy | 15 | Prevented abuse |

**Total Revenue Protection**: $860/month
```

### Success Criteria:

#### Automated Verification:
- [ ] Test suite runs: `npm run test:business-rules`
- [ ] All tests pass (7/7)
- [ ] Metrics endpoint responds: `GET /admin/business-violations`
- [ ] README renders correctly on GitHub

#### Manual Verification:
- [ ] Test suite output is clear and informative
- [ ] Metrics dashboard shows accurate data
- [ ] Documentation covers all features
- [ ] Examples demonstrate business value
- [ ] Revenue impact estimates are documented

---

## Testing Strategy

### Unit Tests:
- Business rule validators (pure functions)
- Service methods (mocked dependencies)
- Edge cases (boundary conditions)

### Integration Tests:
- End-to-end checkout flow
- Return and refund processing
- Loyalty point calculation
- Inventory management workflows

### Manual Testing Steps:
1. **Checkout Flow**:
   - Add items to cart
   - Apply multiple discounts
   - Verify 30% limit enforced
   - Complete purchase
   - Check Business-Use dashboard

2. **Returns Flow**:
   - Request return within 30 days → approved
   - Request return after 30 days → rejected
   - Return electronics → verify 15% fee
   - Return defective item → no fee

3. **Loyalty Flow**:
   - Make 5th purchase → VIP upgrade
   - Verify 2x points earned
   - Try to redeem >50% → blocked

4. **Inventory Flow**:
   - Reduce stock to trigger alert
   - Verify reorder quantity calculation
   - Attempt oversell → prevented

## Performance Considerations

- **Batching**: Business-Use uses 5s batching (100 events/batch)
- **Database**: PostgreSQL recommended for production (SQLite for dev)
- **Caching**: Consider Redis for high-traffic scenarios
- **Monitoring**: Business-Use dashboard provides real-time metrics

## Migration Notes

Not applicable (new project). For existing Medusa stores:
1. Install Business-Use package
2. Add subscribers incrementally
3. Test in staging environment first
4. Monitor performance impact
5. Gradually enable all flows

## References

- **Medusa.js Docs**: https://docs.medusajs.com/
- **Business-Use Docs**: https://docs.desplega.ai/business-use
- **Project Requirements**: See original specification document

---

**End of Implementation Plan**
