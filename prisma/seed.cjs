const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

  // Create test users
  const hashedPassword = await bcrypt.hash('TestPass123!', 10)

  const superadminUser = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      passwordHash: hashedPassword,
      roleId: superadmin.id
    }
  })

  const financeUser = await prisma.user.upsert({
    where: { username: 'finance' },
    update: {},
    create: {
      username: 'finance',
      passwordHash: hashedPassword,
      roleId: finance.id
    }
  })

  const cashierUser = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      passwordHash: hashedPassword,
      roleId: cashier.id
    }
  })

  console.log('Users seeded:', { superadminUser, financeUser, cashierUser })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
