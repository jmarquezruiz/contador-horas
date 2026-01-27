import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function connectToDatabase() {
  if (!prisma) {
    throw new Error('Prisma client no inicializado')
  }
  try {
    await prisma.$connect()
    return prisma
  } catch (error) {
    console.error('Error conectando a la base de datos:', error)
    throw error
  }
}

export default prisma
