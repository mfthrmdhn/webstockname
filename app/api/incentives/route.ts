import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'

const incentiveSchema = z.object({
  salespersonId: z.string().cuid(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  note: z.string().min(1, 'Note is required'),
})

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['FINANCE', 'SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { searchParams } = new URL(request.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = 25

    const where: Record<string, unknown> = {}
    if (startStr && endStr) {
      // IMPORTANT: filter on `date` (period the incentive covers), NOT `createdAt` (entry timestamp)
      where.date = { gte: new Date(startStr), lte: new Date(endStr) }
    }

    const total = await prisma.incentive.count({ where })
    const incentives = await prisma.incentive.findMany({
      where,
      include: {
        salesperson: { select: { username: true } },
        enteredBy: { select: { username: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json(
      {
        data: incentives.map((i) => ({
          id: i.id,
          salesperson: i.salesperson.username,
          salespersonId: i.salespersonId,
          enteredBy: i.enteredBy.username,
          amount: Number(i.amount),
          date: i.date.toISOString().split('T')[0],
          note: i.note,
          createdAt: i.createdAt.toISOString(),
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Incentives GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const body = await request.json()

    const validation = incentiveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { salespersonId, amount, date, note } = validation.data
    const req = request as AuthenticatedRequest
    const enteredById = req.user!.userId

    const incentive = await prisma.incentive.create({
      data: { salespersonId, enteredById, amount, date: new Date(date), note },
    })

    // Audit log: INCENT-03, AUDIT-04
    await logAction(enteredById, 'INCENTIVE_CREATE', 'INCENTIVE', incentive.id, {
      salesperson_id: salespersonId,
      amount,
      date,
      note,
      entered_by: enteredById,
    })

    return NextResponse.json(
      { id: incentive.id, amount: Number(incentive.amount) },
      { status: 201 }
    )
  } catch (error) {
    console.error('Incentives POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
