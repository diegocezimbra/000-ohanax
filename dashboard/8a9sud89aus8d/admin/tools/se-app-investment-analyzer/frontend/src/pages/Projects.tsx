import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsService, Project, CreateProjectDto } from '../services/projects.service'

export function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState<CreateProjectDto>({ name: '', description: '', allowedDomains: [] })
  const [newDomain, setNewDomain] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await projectsService.getAll(1, 100)
      setProjects(response.data)
    } catch (err) {
      setError('Failed to load projects')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingProject(null)
    setFormData({ name: '', description: '', allowedDomains: [] })
    setNewDomain('')
    setShowModal(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      allowedDomains: project.allowedDomains || [],
    })
    setNewDomain('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProject(null)
    setFormData({ name: '', description: '', allowedDomains: [] })
    setNewDomain('')
  }

  const addDomain = () => {
    if (!newDomain.trim()) return
    const domain = newDomain.trim().toLowerCase()
    if (formData.allowedDomains?.includes(domain)) return
    setFormData({ ...formData, allowedDomains: [...(formData.allowedDomains || []), domain] })
    setNewDomain('')
  }

  const removeDomain = (domain: string) => {
    setFormData({ ...formData, allowedDomains: formData.allowedDomains?.filter(d => d !== domain) || [] })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingProject) {
        await projectsService.update(editingProject.id, formData)
      } else {
        await projectsService.create(formData)
      }
      closeModal()
      loadProjects()
    } catch (err) {
      setError(editingProject ? 'Failed to update project' : 'Failed to create project')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will also delete all users and API keys associated with this project.`)) {
      return
    }

    try {
      await projectsService.delete(project.id)
      loadProjects()
    } catch (err) {
      setError('Failed to delete project')
      console.error(err)
    }
  }

  const viewProject = (project: Project) => {
    navigate(`/projects/${project.id}`)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Manage your authentication projects</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + New Project
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="section-card">
        <div className="section-content">
          {isLoading ? (
            <p>Loading...</p>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <p>No projects yet</p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                Create your first project
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Allowed Domains</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <strong
                        className="clickable"
                        onClick={() => viewProject(project)}
                        style={{ cursor: 'pointer', color: 'var(--primary)' }}
                      >
                        {project.name}
                      </strong>
                    </td>
                    <td>{project.description || '-'}</td>
                    <td>
                      {project.allowedDomains?.length > 0
                        ? project.allowedDomains.slice(0, 2).join(', ') + (project.allowedDomains.length > 2 ? ` (+${project.allowedDomains.length - 2})` : '')
                        : '-'}
                    </td>
                    <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => viewProject(project)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEditModal(project)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(project)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Prencher com AppName"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A brief description of your project"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Allowed Domains</label>
                  <div className="domain-input-row">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                      placeholder="myapp.com"
                    />
                    <button type="button" className="btn btn-secondary" onClick={addDomain}>
                      Add
                    </button>
                  </div>
                  <small>Domains allowed for redirect after authentication (e.g., localhost:3000, myapp.com)</small>
                  {formData.allowedDomains && formData.allowedDomains.length > 0 && (
                    <div className="domain-tags">
                      {formData.allowedDomains.map((domain) => (
                        <span key={domain} className="domain-tag">
                          {domain}
                          <button type="button" className="domain-tag-remove" onClick={() => removeDomain(domain)}>
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
