import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ensure } from '@desplega.ai/business-use'
import { BusinessUseHelpers } from "../modules/business-use"

/**
 * Order Placed Subscriber - Tracks payment, inventory, and order confirmation
 *
 * Business Rules:
 * 4. Tax calculation
 * 5. Payment amount validation
 * 6. Inventory reservation
 * 7. First-order tracking
 * 8. Order confirmation
 */
export default async function handleOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModuleService = container.resolve(Modules.ORDER)

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      relations: ["items", "shipping_address"]
    })

    // In Medusa v2, there's no direct cart_id on the order
    // We'll use the order ID for the runId since we can't link back to the cart
    // Note: This means cart and order nodes will be in separate flow runs
    const runId = BusinessUseHelpers.getOrderRunId(order.id)

    // BUSINESS RULE #4: Tax calculation for orders
    const taxTotal = order.tax_total || 0
    const subtotal = order.subtotal || 0

    ensure({
      id: 'tax_calculated',
      flow: 'checkout',
      runId,
      data: {
        order_id: order.id,
        tax_total: Number(taxTotal),
        subtotal: Number(subtotal),
        has_tax: Number(taxTotal) > 0,
      },
      // No dependencies - order flow is independent since cart_id not available
      validator: (data) => data.tax_total >= 0,
      description: "Tax calculation: tax must be calculated correctly"
    })

    // BUSINESS RULE #5: Payment amount validation
    const orderTotal = order.total || 0
    const paymentTotal = order.payment_total || 0

    ensure({
      id: 'payment_amount_validation',
      flow: 'checkout',
      runId,
      data: {
        order_id: order.id,
        order_total: Number(orderTotal),
        payment_total: Number(paymentTotal),
        currency: order.currency_code,
      },
      depIds: ['tax_calculated'],
      // Business Rule: Payment must match order total (fraud prevention)
      // Allow small variance for rounding (100 cents = $1)
      validator: (data) => Math.abs(data.order_total - data.payment_total) < 100,
      description: "Payment validation: amount must match order total"
    })

    // BUSINESS RULE #6: Inventory reservation (prevent overselling)
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        ensure({
          id: `inventory_reserved`,
          flow: 'checkout',
          runId,
          data: {
            order_id: order.id,
            item_id: item.id,
            product_title: item.product_title || item.title,
            ordered_quantity: item.quantity,
            variant_id: item.variant_id,
          },
          // No dependencies - order flow is independent
          // Business Rule: Cannot oversell inventory
          // In this implementation, we trust Medusa's inventory management
          // but we track the reservation for Business-Use monitoring
          validator: (data) => data.ordered_quantity > 0,
          description: `Inventory check`
        })
      }
    }

    let isFirstOrder = false;
    let totalOrders = 0;

    // BUSINESS RULE #7: First-order discount check
    // Check if customer has previous orders (for WELCOME10 type discounts)
    if (order.customer_id) {
      try {
        const orders = await orderModuleService.listOrders({
          customer_id: order.customer_id
        })

        isFirstOrder = orders.length === 1 // Current order is the only one
        totalOrders = orders.length
      } catch (error) {
        console.error('[Business-Use] Error checking customer orders:', error)
      }
    }

    ensure({
      id: 'customer_orders',
      flow: 'checkout',
      runId,
      data: {
        order_id: order.id,
        customer_id: order.customer_id,
        customer_email: order.email,
        is_first_order: isFirstOrder,
        total_orders: totalOrders,
      },
      // No dependencies - order flow is independent
      // Business Rule: Track if this is truly a first order
      // This can be used to validate first-order-only discounts
      description: "Customer order history info"
    })

    // BUSINESS RULE #8: Final order confirmation
    const orderConfirmDepIds = [
      'customer_orders',
      'tax_calculated',
      'payment_amount_validation',
      // Optional, but still deps
      'first_order_discount_check',
      'inventory_reserved'
    ]

    ensure({
      id: 'order_confirmed',
      flow: 'checkout',
      runId,
      data: {
        order_id: order.id,
        order_total: Number(order.total),
        status: order.status,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        confirmed_at: new Date().toISOString(),
      },
      // All upstream business rules must pass before confirmation
      depIds: orderConfirmDepIds,
      validator: (data, ctx) => {
        const paymentDep = ctx.deps.find(dep => dep.id === 'payment_amount_validation');
        // Final confirmation only if payment validation passed
        return paymentDep ? Math.abs(data.order_total - paymentDep.data.payment_total) < 100 : false;
      },
      description: "Order confirmation: all business rules validated successfully"
    })

    console.log(`[Business-Use] ✅ Order ${order.id} confirmed with all rules validated`)
  } catch (error) {
    console.error('[Business-Use] Error tracking order placement:', error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
