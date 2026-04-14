import { PrismaClient } from '@prisma/client'

const prisma = new (PrismaClient as any)({ adapter: undefined })

async function main() {
  // Create roles
  const superadmin = await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {},
    create: { name: 'SUPERADMIN' }
  })

  const finance = await prisma.role.upsert({
    where: { name: 'FINANCE' },
    update: {},
    create: { name: 'FINANCE' }
  })

  const cashier = await prisma.role.upsert({
    where: { name: 'CASHIER' },
    update: {},
    create: { name: 'CASHIER' }
  })

  console.log('Roles seeded:', { superadmin, finance, cashier })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
