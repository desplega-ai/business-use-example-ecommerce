import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ensure } from '@desplega.ai/business-use'
import { BusinessUseHelpers } from "../modules/business-use"

/**
 * Loyalty Tracking Subscriber - Tracks VIP status and points calculation
 *
 * Business Rules:
 * 1. VIP status calculation ($1000 spent or 5 orders)
 * 2. Points earning (1x regular, 2x VIP)
 * 3. Lifetime spend tracking
 */
export default async function handleLoyaltyTracking({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModuleService = container.resolve(Modules.ORDER)
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  try {
    const order = await orderModuleService.retrieveOrder(data.id)

    if (!order.customer_id) {
      return // Guest checkout, no loyalty tracking
    }

    const customer = await customerModuleService.retrieveCustomer(order.customer_id)
    const runId = BusinessUseHelpers.getLoyaltyRunId(customer.id, order.id)

    // Get customer's order history
    const orders = await orderModuleService.listOrders({
      customer_id: customer.id
    })

    const lifetimeSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const orderCount = orders.length

    // BUSINESS RULE #1: VIP status calculation
    const shouldBeVip = lifetimeSpent >= 100000 || orderCount >= 5 // $1000 or 5 orders

    ensure({
      id: 'vip_status_check',
      flow: 'loyalty',
      runId,
      data: {
        customer_id: customer.id,
        customer_email: customer.email,
        lifetime_spent: lifetimeSpent,
        order_count: orderCount,
        should_be_vip: shouldBeVip,
        order_total: order.total,
      },
      validator: (data) => {
        // Business Rule: VIP status at $1000 spent OR 5+ orders
        const expectedVip = data.lifetime_spent >= 100000 || data.order_count >= 5
        return expectedVip === data.should_be_vip
      },
      description: "VIP status: granted at $1000 lifetime spend or 5 orders"
    })

    // BUSINESS RULE #2: Points earning calculation
    const basePoints = Math.floor((order.total || 0) / 100) // 1 point per dollar
    const multiplier = shouldBeVip ? 2 : 1
    const earnedPoints = basePoints * multiplier

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
        earned_points: earnedPoints,
        is_vip: shouldBeVip,
      },
      depIds: ['vip_status_check'],
      validator: (data) => {
        // Business Rule: 1 point per dollar, 2x for VIP
        const expected = Math.floor(data.order_total / 100) * data.multiplier
        return data.earned_points === expected
      },
      description: "Loyalty points: 1 point/dollar (2x for VIP)"
    })

    console.log(`[Business-Use] 🎁 Loyalty tracked: ${customer.email} earned ${earnedPoints} points`)
  } catch (error) {
    console.error('[Business-Use] Error tracking loyalty:', error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
