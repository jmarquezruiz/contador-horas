'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: number
  name: string
  description: string | null
  createdAt: string
  _count: {
    sessions: number
  }
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ name?: string; email?: string }>({})
  const [notes, setNotes] = useState<Array<{ id: number; content: string; updatedAt: string }>>([])
  const [newNote, setNewNote] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const router = useRouter()

  // Solo se ejecuta en el cliente después del montaje
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/auth')
      return
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    fetchProjects(token)
    fetchNotes(token)
  }, [router])

  const fetchNotes = async (token: string) => {
    try {
      const response = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        console.error('Error al cargar notas')
        return
      }

      const data = await response.json()
      setNotes(data)
    } catch (err) {
      console.error('Error al cargar notas:', err)
    }
  }

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/auth')
        }
        throw new Error('Error al cargar proyectos')
      }

      const data = await response.json()
      setProjects(data)
    } catch (err) {
      setError('Error al cargar proyectos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects'
      const method = editingProject ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Error al guardar proyecto')

      setFormData({ name: '', description: '' })
      setShowCreateForm(false)
      setEditingProject(null)
      fetchProjects(token)
    } catch (err) {
      setError('Error al guardar proyecto')
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({ name: project.name, description: project.description || '' })
    setShowCreateForm(true)
  }

  const handleDelete = async (projectId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este proyecto?')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Error al eliminar proyecto')

      fetchProjects(token)
    } catch (err) {
      setError('Error al eliminar proyecto')
    }
  }

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newNote.trim() === '') return

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newNote.trim() })
      })

      if (!response.ok) throw new Error('Error al crear nota')

      setNewNote('')
      fetchNotes(token)
    } catch (err) {
      setError('Error al crear nota')
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Error al eliminar nota')

      fetchNotes(token)
    } catch (err) {
      setError('Error al eliminar nota')
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-foreground">Contador de Horas</h1>
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

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Mis Proyectos</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`px-4 py-2 rounded-md transition-colors ${
                showNotes 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/90'
              }`}
            >
              📝 Notas
            </button>
            <button
              onClick={() => {
                setShowCreateForm(true)
                setEditingProject(null)
                setFormData({ name: '', description: '' })
              }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Nuevo Proyecto
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {editingProject ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  {editingProject ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingProject(null)
                    setFormData({ name: '', description: '' })
                  }}
                  className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/90 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {showNotes && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">📝 Mis Notas</h3>
            
            <form onSubmit={handleCreateNote} className="mb-6">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Añadir nueva nota..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  type="submit"
                  disabled={newNote.trim() === ''}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Añadir
                </button>
              </div>
            </form>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No tienes notas aún</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-3 relative group">
                    <p className="text-sm text-foreground mb-2">{note.content}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleDateString('es', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-xs text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No tienes proyectos aún</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Crear Primer Proyecto
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <Link href={`/project/${project.id}`} className="block">
                  <h3 className="text-lg font-medium text-foreground mb-2 hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-muted-foreground text-sm mb-3">{project.description}</p>
                  )}
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{project._count.sessions} sesiones</span>
                    <span>{new Date(project.createdAt).toLocaleDateString('es')}</span>
                  </div>
                </Link>
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => handleEdit(project)}
                    className="flex-1 bg-muted text-muted-foreground px-3 py-1 rounded text-sm hover:bg-muted/90 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="flex-1 bg-destructive text-destructive-foreground px-3 py-1 rounded text-sm hover:bg-destructive/90 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
