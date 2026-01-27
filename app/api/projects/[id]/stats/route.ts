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

    const sessions = await prisma.timeSession.findMany({
      where: { projectId, endTime: { not: null } },
      select: { startTime: true, endTime: true }
    })

    let totalMilliseconds = 0
    for (const session of sessions) {
      if (session.startTime && session.endTime) {
        totalMilliseconds += session.endTime.getTime() - session.startTime.getTime()
      }
    }

    const uniqueDays = new Set(
      sessions.map(s => s.startTime.toISOString().split('T')[0])
    ).size

    const totalSessionsResult = await prisma.timeSession.count({
      where: { projectId }
    });

    return NextResponse.json({
      totalHours: totalMilliseconds / (1000 * 60 * 60),
      totalSessions: totalSessionsResult,
      uniqueDays
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
