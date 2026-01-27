import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { name, description } = await request.json()
    const projectId = parseInt(params.id)

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

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { name, description }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proyecto' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const projectId = parseInt(params.id)

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

    await prisma.project.delete({
      where: { id: projectId }
    })

    return NextResponse.json({ message: 'Proyecto eliminado' })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar proyecto' },
      { status: 500 }
    )
  }
}
