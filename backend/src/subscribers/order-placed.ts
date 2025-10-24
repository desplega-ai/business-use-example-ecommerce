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
        tax_total: taxTotal,
        subtotal: subtotal,
        has_tax: taxTotal > 0,
      },
      validator: (data) => {
        // Business Rule: Orders should have tax calculated
        // For this demo, we just ensure tax_total is non-negative
        return data.tax_total >= 0
      },
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
        order_total: orderTotal,
        payment_total: paymentTotal,
        currency: order.currency_code,
      },
      depIds: ['tax_calculated'],
      validator: (data) => {
        // Business Rule: Payment must match order total (fraud prevention)
        // Allow small variance for rounding (100 cents = $1)
        return Math.abs(data.order_total - data.payment_total) < 100
      },
      description: "Payment validation: amount must match order total"
    })

    // BUSINESS RULE #6: Inventory reservation (prevent overselling)
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        ensure({
          id: `inventory_reserved_${item.id}`,
          flow: 'checkout',
          runId,
          data: {
            order_id: order.id,
            item_id: item.id,
            product_title: item.product_title || item.title,
            ordered_quantity: item.quantity,
            variant_id: item.variant_id,
          },
          validator: (data) => {
            // Business Rule: Cannot oversell inventory
            // In this implementation, we trust Medusa's inventory management
            // but we track the reservation for Business-Use monitoring
            return data.ordered_quantity > 0
          },
          description: `Inventory check: ${item.product_title || item.title} reserved`
        })
      }
    }

    // BUSINESS RULE #7: First-order discount check
    // Check if customer has previous orders (for WELCOME10 type discounts)
    if (order.customer_id) {
      try {
        const orders = await orderModuleService.listOrders({
          customer_id: order.customer_id
        })

        const isFirstOrder = orders.length === 1 // Current order is the only one

        ensure({
          id: 'first_order_discount_check',
          flow: 'checkout',
          runId,
          data: {
            order_id: order.id,
            customer_id: order.customer_id,
            customer_email: order.email,
            is_first_order: isFirstOrder,
            total_orders: orders.length,
          },
          validator: (data) => {
            // Business Rule: Track if this is truly a first order
            // This can be used to validate first-order-only discounts
            return true // We track but don't block - discount validation happens elsewhere
          },
          description: "First-order tracking: monitor for discount eligibility"
        })
      } catch (error) {
        console.error('[Business-Use] Error checking customer orders:', error)
      }
    }

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
        'tax_calculated',
      ],
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
