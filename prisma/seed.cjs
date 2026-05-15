require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
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

  // Create sample products with warehouse stock
  const products = [
    { sku: 'PROD-001', name: 'Laptop Stand', category: 'Electronics', sellingPrice: 350000, cost: 200000, storeQty: 5, warehouseQty: 20 },
    { sku: 'PROD-002', name: 'Wireless Mouse', category: 'Electronics', sellingPrice: 150000, cost: 80000, storeQty: 10, warehouseQty: 30 },
    { sku: 'PROD-003', name: 'USB-C Hub', category: 'Electronics', sellingPrice: 250000, cost: 130000, storeQty: 8, warehouseQty: 15 },
    { sku: 'PROD-004', name: 'Mechanical Keyboard', category: 'Electronics', sellingPrice: 750000, cost: 400000, storeQty: 3, warehouseQty: 10 },
    { sku: 'PROD-005', name: 'Monitor Arm', category: 'Accessories', sellingPrice: 450000, cost: 250000, storeQty: 4, warehouseQty: 12 },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        sellingPrice: p.sellingPrice,
        cost: p.cost,
        storeQty: p.storeQty,
        warehouseQty: p.warehouseQty,
      }
    })
  }

  console.log('Products seeded:', products.length)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
