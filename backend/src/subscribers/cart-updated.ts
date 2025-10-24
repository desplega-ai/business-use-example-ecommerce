import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ensure } from '@desplega.ai/business-use'
import { argv0 } from "process"

/**
 * Cart Updated Subscriber - Tracks cart validation and discount rules
 *
 * Business Rules:
 * 1. Cart must have items and valid total
 * 2. Discount stacking limits (max 30%)
 * 3. Free shipping eligibility ($50+)
 */
export default async function handleCartUpdated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const cartModuleService = container.resolve(Modules.CART)

  try {
    const cart = await cartModuleService.retrieveCart(data.id, {
      relations: ["items", "shipping_methods"]
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
        subtotal: Number(cart.subtotal || 0),
        total: Number(cart.total || 0),
      },
      validator: (data) => {
        return data.item_count > 0;
      },
      description: "Cart validation: must have items and positive total"
    })

    // Calculate discount percentage if there are items
    if (cart.items && cart.items.length > 0) {
      const subtotal = cart.subtotal || 0
      const total = cart.total || 0
      const discountAmount = subtotal - total
      const discountPercent = subtotal > 0 ? discountAmount / subtotal : 0

      // BUSINESS RULE #2: Discount stacking limit (max 30%)
      if (discountAmount > 0) {
        ensure({
          id: 'discount_validation',
          flow: 'checkout',
          runId,
          data: {
            cart_id: cart.id,
            subtotal: Number(subtotal),
            total: Number(total),
            total_discount: discountAmount,
            discount_percent: discountPercent,
          },
          depIds: ['cart_validated'],
          validator: (data) => data.discount_percent <= 0.30,
          description: "Discount stacking limit: prevent >30% total discount abuse"
        })
      }
    }

    // BUSINESS RULE #3: Free shipping eligibility ($50 minimum = 5000 cents)
    if (cart.shipping_methods && cart.shipping_methods.length > 0) {
      const freeShipping = cart.shipping_methods.find((m: any) =>
        m.amount === 0 || m.price === 0
      )

      if (freeShipping) {
        ensure({
          id: 'free_shipping_eligibility',
          flow: 'checkout',
          runId,
          data: {
            cart_id: cart.id,
            subtotal: Number(cart.subtotal),
            has_free_shipping: !!freeShipping,
            shipping_total: Number(cart.shipping_total || 0),
          },
          depIds: ['cart_validated'],
          validator: (data) => data.has_free_shipping ? data.subtotal >= 5000 : true,
          description: "Free shipping threshold: $50 minimum order value"
        })
      }
    }
  } catch (error) {
    console.error('[Business-Use] Error tracking cart update:', error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
