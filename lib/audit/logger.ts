/**
 * Audit logging utility for immutable audit trail
 * All state-changing operations should call logAction to maintain compliance audit trail
 *
 * Registered action types:
 *   USER_CREATE, USER_EDIT, USER_DEACTIVATE, ROLE_ASSIGN
 *   LOGIN, LOGOUT
 *   SALE_CREATE, INVENTORY_UPDATE
 *   INCENTIVE_CREATE  -- Phase 3: incentive record creation by Superadmin (INCENT-03, AUDIT-04)
 *   PRODUCT_CREATE, PRODUCT_UPDATE, PRODUCT_DELETE  -- Phase 4: product lifecycle management
 */

import { Prisma } from '@prisma/client'

export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const prisma = (await import('@/lib/db')).default

  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId || null,
      metadata: (metadata || null) as Prisma.InputJsonValue,
    }
  })
}
