import { initialize } from '@desplega.ai/business-use'

let initialized = false

/**
 * Initialize Business-Use tracking with configuration from environment variables.
 * This module is loaded once when the Medusa application starts.
 */
export function initializeBusinessUse() {
  if (initialized) {
    console.log('[Business-Use] Already initialized, skipping...')
    return
  }

  initialize({
    apiKey: process.env.BUSINESS_USE_API_KEY || 'test-key',
    url: process.env.BUSINESS_USE_URL || 'http://localhost:13370',
    batchSize: 100,
    batchInterval: 5000, // 5 seconds (default)
    maxQueueSize: 1000
  })

  initialized = true
  console.log('[Business-Use] ✅ Initialized successfully')
  console.log(`[Business-Use] Using URL: ${process.env.BUSINESS_USE_URL || 'http://localhost:13370'}`)
}

/**
 * Helper functions to generate consistent run IDs for tracking flows
 */
export const BusinessUseHelpers = {
  // Generate consistent run IDs for tracking order flows
  getOrderRunId(orderId: string): string {
    return `order_${orderId}`
  },

  // Generate run IDs for return flows
  getReturnRunId(returnId: string): string {
    return `return_${returnId}`
  },

  // Generate run IDs for loyalty flows
  getLoyaltyRunId(customerId: string, orderId: string): string {
    return `loyalty_${customerId}_${orderId}`
  },

  // Generate run IDs for inventory flows
  getInventoryRunId(variantId: string): string {
    return `inventory_${variantId}`
  }
}

// Initialize on module load
initializeBusinessUse()
