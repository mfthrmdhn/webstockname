import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-unused-vars
  var prisma: any
}

const prisma: any =
  global.prisma ||
  (new (PrismaClient as any)({ adapter: undefined }))

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
