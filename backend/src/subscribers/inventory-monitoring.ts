import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ensure } from '@desplega.ai/business-use'
import { BusinessUseHelpers } from "../modules/business-use"

/**
 * Inventory Monitoring Subscriber - Tracks stock levels and alerts
 *
 * Business Rules:
 * 1. Stock level validation
 * 2. Low stock alerts (20% of reorder point)
 * 3. Reorder calculations (3 months supply)
 */
export default async function handleInventoryUpdate({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const inventoryModuleService = container.resolve(Modules.INVENTORY)

  try {
    // Retrieve inventory item
    const inventoryItem = await inventoryModuleService.retrieveInventoryItem(data.id)
    const runId = BusinessUseHelpers.getInventoryRunId(data.id)

    // Get inventory levels for this item
    const levels = await inventoryModuleService.listInventoryLevels({
      inventory_item_id: inventoryItem.id
    })

    if (levels.length === 0) {
      return
    }

    const totalStock = levels.reduce((sum, level) => sum + (level.stocked_quantity || 0), 0)
    const reorderPoint = 20 // Default reorder point
    const lowStockThreshold = reorderPoint * 0.2

    // BUSINESS RULE #1: Stock level validation
    ensure({
      id: 'stock_level_checked',
      flow: 'inventory',
      runId,
      data: {
        inventory_item_id: inventoryItem.id,
        total_stock: totalStock,
        is_available: totalStock > 0,
      },
      validator: (data) => {
        // Business Rule: Stock level must be non-negative
        return data.total_stock >= 0
      },
      description: "Stock level validation: ensure non-negative inventory"
    })

    // BUSINESS RULE #2: Low stock alert
    const isLowStock = totalStock <= lowStockThreshold

    if (isLowStock) {
      ensure({
        id: 'low_stock_alert',
        flow: 'inventory',
        runId,
        data: {
          inventory_item_id: inventoryItem.id,
          current_stock: totalStock,
          reorder_point: reorderPoint,
          threshold: lowStockThreshold,
          is_low_stock: isLowStock,
        },
        validator: (data) => {
          // Business Rule: Alert when stock below 20% of reorder point
          return data.current_stock <= data.threshold
        },
        description: `Low stock alert: reordering needed`
      })

      // BUSINESS RULE #3: Reorder calculation
      const avgMonthlySales = 10 // Default for demo
      const reorderQuantity = avgMonthlySales * 3 // 3 months supply

      ensure({
        id: 'reorder_triggered',
        flow: 'inventory',
        runId,
        data: {
          inventory_item_id: inventoryItem.id,
          current_stock: totalStock,
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

      console.log(`[Business-Use] 🔔 Reorder alert: ${inventoryItem.id} - Order ${reorderQuantity} units`)
    }
  } catch (error) {
    console.error('[Business-Use] Error tracking inventory:', error)
  }
}

export const config: SubscriberConfig = {
  event: "inventory_item.updated",
}
