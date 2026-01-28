import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const { id } = await context.params

    const projectId = parseInt(id)

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: decoded.userId
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    const [sessions, total] = await Promise.all([
      prisma.timeSession.findMany({
        where: { projectId },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit
      }),
      prisma.timeSession.count({
        where: { projectId }
      })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Error al obtener sesiones' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { endTime, sessionId, comment } = await request.json()
    const { id } = await context.params
    const projectId = parseInt(id)

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: decoded.userId
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    if (sessionId && endTime) {
      const session = await prisma.timeSession.findFirst({
        where: {
          id: sessionId,
          projectId,
          userId: decoded.userId,
          endTime: null
        }
      })

      if (!session) {
        return NextResponse.json(
          { error: 'Sesión no encontrada o ya finalizada' },
          { status: 404 }
        )
      }

      const updatedSession = await prisma.timeSession.update({
        where: { id: sessionId },
        data: { 
          endTime: new Date(endTime),
          ...(comment && { comment })
        }
      })

      return NextResponse.json(updatedSession)
    } else {
      const newSession = await prisma.timeSession.create({
        data: {
          projectId,
          userId: decoded.userId,
          startTime: new Date(),
          ...(comment && { comment })
        }
      })

      return NextResponse.json(newSession)
    }
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Error al gestionar sesión' },
      { status: 500 }
    )
  }
}
