import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'

/**
 * GET /api/audit - Retrieve audit trail (SUPERADMIN only)
 * Query parameters:
 *   - action: Filter by action (e.g., USER_CREATE, LOGIN, USER_EDIT)
 *   - start_date: ISO8601 start date for date range filtering
 *   - end_date: ISO8601 end date for date range filtering
 *   - user_id: Filter by user who performed the action
 *   - page: Page number (default 1)
 *   - limit: Results per page (default 50)
 */
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const action = searchParams.get('action')
    const startDateStr = searchParams.get('start_date')
    const endDateStr = searchParams.get('end_date')
    const userId = searchParams.get('user_id')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    // Build where clause for filters
    const where: any = {}

    if (action) {
      where.action = action
    }

    if (userId) {
      where.userId = userId
    }

    // Date range filtering
    if (startDateStr || endDateStr) {
      where.createdAt = {}

      if (startDateStr) {
        try {
          const startDate = new Date(startDateStr)
          if (!isNaN(startDate.getTime())) {
            where.createdAt.gte = startDate
          }
        } catch {
          // Invalid date format, skip
        }
      }

      if (endDateStr) {
        try {
          const endDate = new Date(endDateStr)
          if (!isNaN(endDate.getTime())) {
            where.createdAt.lte = endDate
          }
        } catch {
          // Invalid date format, skip
        }
      }
    }

    // Get total count for pagination
    const total = await prisma.auditLog.count({ where })

    // Fetch audit logs with filters, pagination, and user info
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Format response with readable timestamps
    const formattedLogs = auditLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      username: log.user.username,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      createdAt: log.createdAt.toISOString(),
      timestamp: log.createdAt.getTime()
    }))

    return NextResponse.json(
      {
        data: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Audit log retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
