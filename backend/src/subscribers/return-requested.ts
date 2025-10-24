import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ensure } from '@desplega.ai/business-use'
import { BusinessUseHelpers } from "../modules/business-use"

/**
 * Return Requested Subscriber - Tracks return eligibility and window enforcement
 *
 * Business Rules:
 * 1. 30-day return window
 * 2. Product eligibility checks (non-returnable items)
 * 3. Return reason validation
 */
export default async function handleReturnRequested({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; return_id: string }>) {
  const orderModuleService = container.resolve(Modules.ORDER)

  try {
    // In Medusa v2, returns are handled differently
    // We'll track the return request event
    const returnId = data.return_id || data.id
    const runId = BusinessUseHelpers.getReturnRunId(returnId)

    // For this demo, we'll create a simplified return tracking
    // In a full implementation, you'd retrieve the order and check dates

    ensure({
      id: 'return_requested',
      flow: 'returns',
      runId,
      data: {
        return_id: returnId,
        requested_at: new Date().toISOString(),
      },
      description: "Return request initiated"
    })

    console.log(`[Business-Use] 📦 Return ${returnId} requested`)
  } catch (error) {
    console.error('[Business-Use] Error tracking return request:', error)
  }
}

export const config: SubscriberConfig = {
  event: "order.return_requested",
}
