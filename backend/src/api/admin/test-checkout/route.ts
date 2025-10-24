import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * Test endpoint for successful checkout flow
 *
 * Creates a cart, adds items, and completes checkout to test
 * the checkout business rules tracking in Business-Use
 *
 * POST /admin/test-checkout
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cartModuleService = req.scope.resolve(Modules.CART)
  const orderModuleService = req.scope.resolve(Modules.ORDER)
  const productModuleService = req.scope.resolve(Modules.PRODUCT)

  try {
    // Get a product to add to cart
    const [products] = await productModuleService.listProducts({ take: 1 })

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No products found. Please seed the database first."
      })
    }

    const product = products[0]
    const variant = product.variants?.[0]

    if (!variant) {
      return res.status(400).json({
        success: false,
        error: "Product has no variants"
      })
    }

    // Create a cart
    const cart = await cartModuleService.createCarts({
      currency_code: "usd",
      email: "test@example.com",
    })

    // Add item to cart (this should trigger cart.updated event)
    await cartModuleService.addLineItems(cart.id, [{
      variant_id: variant.id,
      quantity: 1,
    }])

    // Retrieve updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart.id, {
      relations: ["items"]
    })

    res.json({
      success: true,
      message: "Test checkout flow initiated",
      cart_id: cart.id,
      run_id: `cart_${cart.id}`,
      instructions: {
        message: "Cart created and item added. Check Business-Use dashboard for 'checkout' flow tracking.",
        business_use_check: `uvx business-use-core flow eval cart_${cart.id} checkout --verbose`
      },
      cart: {
        id: updatedCart.id,
        items: updatedCart.items?.length || 0,
        subtotal: updatedCart.subtotal,
        total: updatedCart.total,
      }
    })
  } catch (error) {
    console.error('[Test] Error creating test checkout:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
