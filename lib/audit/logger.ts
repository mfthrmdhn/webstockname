/**
 * Audit logging utility for immutable audit trail
 * All state-changing operations should call logAction to maintain compliance audit trail
 */

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
      metadata: metadata || null,
    }
  })
}
