'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface ProjectStats {
  totalHours: number
  totalSessions: number
  uniqueDays: number
}

interface TimeSession {
  id: number
  startTime: string
  endTime: string | null
  comment: string | null
}

interface Project {
  id: number
  name: string
  description: string | null
}

export default function ProjectDetailPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [sessions, setSessions] = useState<TimeSession[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [sessionComment, setSessionComment] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }
    
    if (params.id) {
      fetchProject()
      fetchStats()
      fetchSessions()
    }
  }, [router, params.id])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && currentSession) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - new Date(currentSession.startTime).getTime())
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, currentSession])

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token')
      const projectId = params.id

      const response = await fetch(`/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Error al cargar proyecto')
      }

      const projects = await response.json()
      const projectData = projects.find((p: Project) => p.id === parseInt(projectId as string))
      
      if (!projectData) {
        throw new Error('Proyecto no encontrado')
      }

      setProject(projectData)
    } catch (error) {
      setError('Error al cargar proyecto')
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const projectId = params.id

      const response = await fetch(`/api/projects/${projectId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas')
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchSessions = async (page: number = 1) => {
    try {
      const token = localStorage.getItem('token')
      const projectId = params.id

      const response = await fetch(`/api/projects/${projectId}/sessions?page=${page}&limit=30`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Error al cargar sesiones')
      }

      const data = await response.json()
      setSessions(data.sessions)
      setTotalPages(data.pagination.totalPages)
      setCurrentPage(page)

      const activeSession = data.sessions.find((session: TimeSession) => !session.endTime)
      if (activeSession) {
        setCurrentSession(activeSession)
        setIsTimerRunning(true)
        setElapsedTime(Date.now() - new Date(activeSession.startTime).getTime())
      }
    } catch (error) {
      setError('Error al cargar sesiones')
    } finally {
      setLoading(false)
    }
  }

  const toggleTimer = async () => {
    try {
      const token = localStorage.getItem('token')
      const projectId = params.id

      if (isTimerRunning && currentSession) {
        const response = await fetch(`/api/projects/${projectId}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sessionId: currentSession.id,
            endTime: new Date().toISOString(),
            comment: sessionComment.trim() || null
          })
        })

        if (!response.ok) {
          throw new Error('Error al detener sesión')
        }

        setIsTimerRunning(false)
        setCurrentSession(null)
        setElapsedTime(0)
        setSessionComment('')
        setShowCommentInput(false)
        fetchStats()
        fetchSessions(currentPage)
      } else {
        const response = await fetch(`/api/projects/${projectId}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            comment: sessionComment.trim() || null
          })
        })

        if (!response.ok) {
          throw new Error('Error al iniciar sesión')
        }

        const newSession = await response.json()
        setCurrentSession(newSession)
        setIsTimerRunning(true)
        setElapsedTime(0)
        setSessionComment('')
        setShowCommentInput(false)
      }
    } catch (error) {
      setError('Error al gestionar temporizador')
    }
  }

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Cargando...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Proyecto no encontrado</h1>
          <Link href="/dashboard" className="text-primary hover:underline">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-primary hover:underline">
                ← Volver
              </Link>
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-foreground">Bienvenido, {user.name || user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-medium text-foreground mb-6">Cronómetro</h2>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-mono font-bold text-foreground mb-4">
                  {formatTime(elapsedTime)}
                </div>
                <button
                  onClick={toggleTimer}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                    isTimerRunning
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isTimerRunning ? 'Detener' : 'Iniciar'}
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">
                    Comentario de sesión (opcional)
                  </label>
                  <button
                    onClick={() => setShowCommentInput(!showCommentInput)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showCommentInput ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {showCommentInput && (
                  <textarea
                    value={sessionComment}
                    onChange={(e) => setSessionComment(e.target.value)}
                    placeholder="Añade notas sobre esta sesión..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                )}
              </div>

              {stats && (
                <div className="space-y-3 pt-6 border-t border-border">
                  <h3 className="font-medium text-foreground">Estadísticas</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total horas:</span>
                      <span className="font-medium text-foreground">{stats.totalHours.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total sesiones:</span>
                      <span className="font-medium text-foreground">{stats.totalSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Días trabajados:</span>
                      <span className="font-medium text-foreground">{stats.uniqueDays}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-medium text-foreground mb-6">Sesiones</h2>
              
              {sessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay sesiones registradas</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Inicio</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Fin</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Duración</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Comentario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((session) => {
                          const duration = session.endTime
                            ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
                            : Date.now() - new Date(session.startTime).getTime()
                          
                          return (
                             <tr key={session.id} className="border-b border-border">
                               <td className="py-3 px-4 text-sm text-foreground">
                                 {formatDate(session.startTime)}
                               </td>
                               <td className="py-3 px-4 text-sm text-foreground">
                                 {session.endTime ? formatDate(session.endTime) : 'En curso...'}
                               </td>
                               <td className="py-3 px-4 text-sm font-mono text-foreground">
                                 {formatTime(duration)}
                               </td>
                               <td className="py-3 px-4 text-sm text-foreground">
                                 {session.comment ? (
                                   <div className="max-w-xs truncate" title={session.comment}>
                                     {session.comment}
                                   </div>
                                 ) : (
                                   <span className="text-muted-foreground">-</span>
                                 )}
                               </td>
                             </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button
                        onClick={() => fetchSessions(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                      >
                        Anterior
                      </button>
                      <span className="px-3 py-1 text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => fetchSessions(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}