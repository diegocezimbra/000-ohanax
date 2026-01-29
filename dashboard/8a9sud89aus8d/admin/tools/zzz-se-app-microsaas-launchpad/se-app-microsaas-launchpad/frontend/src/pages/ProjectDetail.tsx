import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsService, Project, ThemeSettings, EmailTemplatesSettings } from '../services/projects.service'
import { api } from '../services/api'
import { Tabs, TabsList, TabsTrigger } from '../design-system/components'

interface ProjectUser {
  id: string
  email: string
  name?: string
  provider: string
  emailVerified: boolean
  createdAt: string
  lastLoginAt?: string
}

interface UsersResponse {
  data: ProjectUser[]
  total: number
  page: number
  limit: number
}

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt?: string
  active: boolean
  createdAt: string
}

const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '#7c3aed',
  backgroundColor: '#f5f3ff',
  logoUrl: '',
}

const DEFAULT_VERIFY_EMAIL_SUBJECT = 'Código de Verificação - {{projectName}}'
const DEFAULT_VERIFY_EMAIL_BODY = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - {{projectName}}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .code-box { background: #fff; border: 2px dashed #2563eb; padding: 30px; text-align: center; margin: 20px 0; border-radius: 10px; }
    .verification-code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin: 10px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bem-vindo ao {{projectName}}!</h1>
    </div>
    <div class="content">
      <h2>Olá, {{userName}}!</h2>
      <p>Obrigado por se cadastrar no {{projectName}}. Para começar a usar sua conta, precisamos verificar seu endereço de email.</p>

      <p>Use o código de verificação abaixo:</p>

      <div class="code-box">
        <p style="margin: 0; font-size: 16px; color: #666;">Seu código de verificação é:</p>
        <div class="verification-code">{{verificationCode}}</div>
        <p style="margin: 0; font-size: 14px; color: #999;">Digite este código na página de verificação</p>
      </div>

      <div style="text-align: center;">
        <a href="{{verifyUrl}}" class="button">Ir para Verificação</a>
      </div>

      <p><strong>Este código expira em 30 minutos.</strong></p>

      <p>Se você não criou uma conta no {{projectName}}, pode ignorar este email.</p>
    </div>
    <div class="footer">
      <p>© 2024 {{projectName}}. Todos os direitos reservados.</p>
      <p>Este é um email automático, não responda a esta mensagem.</p>
    </div>
  </div>
</body>
</html>`

const DEFAULT_RESET_PASSWORD_SUBJECT = 'Redefinir Senha - {{projectName}}'
const DEFAULT_RESET_PASSWORD_BODY = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - {{projectName}}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .code-box { background: #fff; border: 2px dashed #dc2626; padding: 30px; text-align: center; margin: 20px 0; border-radius: 10px; }
    .otp-code { font-size: 36px; font-weight: bold; color: #dc2626; letter-spacing: 8px; margin: 10px 0; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Redefinir Senha</h1>
    </div>
    <div class="content">
      <h2>Olá, {{userName}}!</h2>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta {{projectName}}.</p>

      <p>Use o código abaixo para redefinir sua senha:</p>

      <div class="code-box">
        <p style="margin: 0; font-size: 16px; color: #666;">Seu código de redefinição é:</p>
        <div class="otp-code">{{resetCode}}</div>
        <p style="margin: 0; font-size: 14px; color: #999;">Digite este código na página de redefinição</p>
      </div>

      <div style="text-align: center;">
        <a href="{{resetUrl}}" class="button">Ir para Redefinição</a>
      </div>

      <p><strong>Este código expira em 15 minutos.</strong></p>

      <p>Se você não solicitou a redefinição de senha, pode ignorar este email. Sua senha permanecerá inalterada.</p>
    </div>
    <div class="footer">
      <p>© 2024 {{projectName}}. Todos os direitos reservados.</p>
      <p>Este é um email automático, não responda a esta mensagem.</p>
    </div>
  </div>
</body>
</html>`

const DEFAULT_EMAIL_TEMPLATES: EmailTemplatesSettings = {
  verifyEmail: { subject: DEFAULT_VERIFY_EMAIL_SUBJECT, body: DEFAULT_VERIFY_EMAIL_BODY },
  resetPassword: { subject: DEFAULT_RESET_PASSWORD_SUBJECT, body: DEFAULT_RESET_PASSWORD_BODY },
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [users, setUsers] = useState<ProjectUser[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'api-keys' | 'settings' | 'branding' | 'emails'>('users')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Theme state
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME)

  // Email template state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplatesSettings>(DEFAULT_EMAIL_TEMPLATES)

  useEffect(() => {
    if (id) {
      loadProject()
      loadUsers()
      loadApiKeys()
    }
  }, [id])

  useEffect(() => {
    if (project?.settings?.theme) {
      setThemeSettings({
        primaryColor: project.settings.theme.primaryColor || DEFAULT_THEME.primaryColor,
        backgroundColor: project.settings.theme.backgroundColor || DEFAULT_THEME.backgroundColor,
        logoUrl: project.settings.theme.logoUrl || '',
      })
    }
    if (project?.settings?.emailTemplates) {
      setEmailTemplates({
        verifyEmail: project.settings.emailTemplates.verifyEmail || DEFAULT_EMAIL_TEMPLATES.verifyEmail,
        resetPassword: project.settings.emailTemplates.resetPassword || DEFAULT_EMAIL_TEMPLATES.resetPassword,
      })
    } else {
      setEmailTemplates(DEFAULT_EMAIL_TEMPLATES)
    }
  }, [project])

  const loadProject = async () => {
    setIsLoadingProject(true)
    try {
      const data = await projectsService.getById(id!)
      setProject(data)
    } catch (err) {
      setError('Failed to load project')
      console.error(err)
    } finally {
      setIsLoadingProject(false)
    }
  }

  const loadUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await api.get<UsersResponse>(`/users?projectId=${id}&page=1&limit=100`)
      setUsers(response.data)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadApiKeys = async () => {
    try {
      const response = await api.get<{ data: ApiKey[] }>(`/projects/${id}/api-keys`)
      setApiKeys(response.data || [])
    } catch (err) {
      console.error('Failed to load API keys:', err)
    }
  }

  const createApiKey = async () => {
    if (!newApiKeyName.trim()) return

    try {
      const response = await api.post<{ plainKey: string; apiKey: ApiKey }>(`/projects/${id}/api-keys`, {
        name: newApiKeyName,
      })
      setCreatedApiKey(response.plainKey)
      setNewApiKeyName('')
      setShowApiKeyModal(false)
      loadApiKeys()
    } catch (err) {
      setError('Failed to create API key')
      console.error(err)
    }
  }

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/projects/${id}/api-keys/${keyId}`)
      loadApiKeys()
    } catch (err) {
      setError('Failed to revoke API key')
      console.error(err)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return
    }

    try {
      await api.delete(`/users/${userId}`)
      loadUsers()
    } catch (err) {
      setError('Failed to delete user')
      console.error(err)
    }
  }

  const addDomain = async () => {
    if (!newDomain.trim() || !project) return
    const domain = newDomain.trim().toLowerCase()
    if (project.allowedDomains?.includes(domain)) return

    setIsSaving(true)
    try {
      const updatedDomains = [...(project.allowedDomains || []), domain]
      await projectsService.update(project.id, { allowedDomains: updatedDomains })
      setProject({ ...project, allowedDomains: updatedDomains })
      setNewDomain('')
    } catch (err) {
      setError('Failed to add domain')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const removeDomain = async (domain: string) => {
    if (!project) return

    setIsSaving(true)
    try {
      const updatedDomains = project.allowedDomains?.filter(d => d !== domain) || []
      await projectsService.update(project.id, { allowedDomains: updatedDomains })
      setProject({ ...project, allowedDomains: updatedDomains })
    } catch (err) {
      setError('Failed to remove domain')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = async (settings: Partial<Project['settings']>) => {
    if (!project) return

    setIsSaving(true)
    try {
      const updatedSettings = { ...project.settings, ...settings }
      await projectsService.update(project.id, { settings: updatedSettings })
      setProject({ ...project, settings: updatedSettings })
    } catch (err) {
      setError('Failed to update settings')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const saveTheme = async () => {
    if (!project) return

    setIsSaving(true)
    try {
      const updatedSettings = { ...project.settings, theme: themeSettings }
      await projectsService.update(project.id, { settings: updatedSettings })
      setProject({ ...project, settings: updatedSettings })
    } catch (err) {
      setError('Failed to save theme')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const saveEmailTemplates = async () => {
    if (!project) return

    setIsSaving(true)
    try {
      const updatedSettings = { ...project.settings, emailTemplates }
      await projectsService.update(project.id, { settings: updatedSettings })
      setProject({ ...project, settings: updatedSettings })
    } catch (err) {
      setError('Failed to save email templates')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingProject) {
    return (
      <div className="page">
        <p>Loading project...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="page">
        <div className="error-message">Project not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
          Back to Projects
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="breadcrumb">
            <span className="breadcrumb-link" onClick={() => navigate('/projects')}>
              Projects
            </span>
            <span className="breadcrumb-separator">/</span>
            <span>{project?.name || 'Loading...'}</span>
          </div>
          <h1>{project?.name || 'Loading...'}</h1>
          <p>{project?.description || 'No description'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
          Back
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList variant="default" style={{ marginBottom: '24px' }}>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys ({apiKeys.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'users' && (
        <div className="section-card">
          <div className="section-header">
            <h2>Project Users</h2>
          </div>
          <div className="section-content">
            {isLoadingUsers ? (
              <p>Loading...</p>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <p>No users registered in this project yet</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-small">
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </div>
                          <div>
                            <div className="user-name">{user.name || 'No name'}</div>
                            <div className="user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{user.provider}</td>
                      <td>
                        <span className={`badge ${user.emailVerified ? 'badge-success' : 'badge-warning'}`}>
                          {user.emailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'api-keys' && (
        <div className="section-card">
          <div className="section-header">
            <h2>API Keys</h2>
            <button className="btn btn-primary" onClick={() => setShowApiKeyModal(true)}>
              + New API Key
            </button>
          </div>
          <div className="section-content">
            {createdApiKey && (
              <div className="alert alert-success">
                <strong>New API Key Created!</strong>
                <p>Copy this key now. You won't be able to see it again:</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <code className="api-key-display" style={{ flex: 1 }}>{createdApiKey}</code>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(createdApiKey)
                      alert('API key copied to clipboard!')
                    }}
                  >
                    Copy
                  </button>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => setCreatedApiKey(null)}>
                  Dismiss
                </button>
              </div>
            )}
            {apiKeys.length === 0 ? (
              <div className="empty-state">
                <p>No API keys created yet</p>
                <button className="btn btn-primary" onClick={() => setShowApiKeyModal(true)}>
                  Create your first API key
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td>{key.name}</td>
                      <td><code>{key.keyPrefix}...</code></td>
                      <td>
                        <span className={`badge ${key.active ? 'badge-success' : 'badge-danger'}`}>
                          {key.active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                      <td>
                        {key.active && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => revokeApiKey(key.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="section-card">
          <div className="section-header">
            <h2>Project Settings</h2>
            {isSaving && <span className="text-muted">Saving...</span>}
          </div>
          <div className="section-content">
            <div className="settings-group">
              <div className="setting-item">
                <label>Project ID</label>
                <code>{project?.id}</code>
              </div>
              <div className="setting-item">
                <label>Created At</label>
                <span>{project?.createdAt ? new Date(project.createdAt).toLocaleString() : '-'}</span>
              </div>
            </div>

            <h4 className="section-title">Allowed Domains</h4>
            <p className="text-muted" style={{ marginBottom: '12px' }}>
              Users can only be redirected to these domains after authentication.
            </p>
            <div className="domain-input-row">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                placeholder="example.com or localhost:3000"
                disabled={isSaving}
              />
              <button className="btn btn-primary" onClick={addDomain} disabled={isSaving}>
                Add Domain
              </button>
            </div>
            {project?.allowedDomains && project.allowedDomains.length > 0 ? (
              <div className="domain-tags" style={{ marginTop: '12px' }}>
                {project.allowedDomains.map((domain) => (
                  <span key={domain} className="domain-tag">
                    {domain}
                    <button
                      type="button"
                      className="domain-tag-remove"
                      onClick={() => removeDomain(domain)}
                      disabled={isSaving}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ marginTop: '12px' }}>
                No domains configured. Add at least one domain to allow redirects.
              </p>
            )}

            <h4 className="section-title">Authentication Settings</h4>
            <div className="settings-group">
              <div className="setting-item setting-row">
                <div>
                  <label>Allow Signup</label>
                  <small className="text-muted" style={{ display: 'block' }}>Allow new users to register</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={project?.settings?.allowSignup ?? true}
                    onChange={(e) => updateSettings({ allowSignup: e.target.checked })}
                    disabled={isSaving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item setting-row">
                <div>
                  <label>Require Email Verification</label>
                  <small className="text-muted" style={{ display: 'block' }}>Users must verify email before access</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={project?.settings?.requireEmailVerification ?? true}
                    onChange={(e) => updateSettings({ requireEmailVerification: e.target.checked })}
                    disabled={isSaving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-item setting-row">
                <div>
                  <label>Allow Password Reset</label>
                  <small className="text-muted" style={{ display: 'block' }}>Users can reset their password via email</small>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={project?.settings?.allowPasswordReset ?? true}
                    onChange={(e) => updateSettings({ allowPasswordReset: e.target.checked })}
                    disabled={isSaving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="section-card">
          <div className="section-header">
            <h2>Branding & Theme</h2>
            {isSaving && <span className="text-muted">Saving...</span>}
          </div>
          <div className="section-content">
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              Customize the look and feel of your hosted authentication pages.
            </p>

            <div className="branding-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
              <div className="branding-form">
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="primaryColor">Primary Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      id="primaryColor"
                      value={themeSettings.primaryColor || '#7c3aed'}
                      onChange={(e) => setThemeSettings({ ...themeSettings, primaryColor: e.target.value })}
                      style={{ width: '60px', height: '40px', padding: '4px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={themeSettings.primaryColor || '#7c3aed'}
                      onChange={(e) => setThemeSettings({ ...themeSettings, primaryColor: e.target.value })}
                      placeholder="#7c3aed"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <small className="text-muted">Used for buttons, links, and accents</small>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="backgroundColor">Background Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      id="backgroundColor"
                      value={themeSettings.backgroundColor || '#f5f3ff'}
                      onChange={(e) => setThemeSettings({ ...themeSettings, backgroundColor: e.target.value })}
                      style={{ width: '60px', height: '40px', padding: '4px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={themeSettings.backgroundColor || '#f5f3ff'}
                      onChange={(e) => setThemeSettings({ ...themeSettings, backgroundColor: e.target.value })}
                      placeholder="#f5f3ff"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <small className="text-muted">Background color for the authentication pages</small>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="logoUrl">Logo URL</label>
                  <input
                    type="text"
                    id="logoUrl"
                    value={themeSettings.logoUrl || ''}
                    onChange={(e) => setThemeSettings({ ...themeSettings, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  <small className="text-muted">URL to your logo image (recommended: 50x50px or larger)</small>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={saveTheme}
                  disabled={isSaving}
                  style={{ marginTop: '16px' }}
                >
                  {isSaving ? 'Saving...' : 'Save Theme'}
                </button>
              </div>

              <div className="branding-preview">
                <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Preview</h4>
                <div
                  style={{
                    background: themeSettings.backgroundColor || DEFAULT_THEME.backgroundColor,
                    borderRadius: '8px',
                    padding: '24px',
                    minHeight: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '24px',
                      width: '100%',
                      maxWidth: '250px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      {themeSettings.logoUrl ? (
                        <img
                          src={themeSettings.logoUrl}
                          alt="Logo"
                          style={{ maxWidth: '50px', maxHeight: '50px', borderRadius: '8px' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            background: themeSettings.primaryColor || DEFAULT_THEME.primaryColor,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            color: 'white',
                            fontSize: '20px',
                          }}
                        >
                          {project?.name?.charAt(0) || 'A'}
                        </div>
                      )}
                      <h3 style={{ fontSize: '16px', marginTop: '12px', color: '#0a2540' }}>Sign in</h3>
                    </div>
                    <div
                      style={{
                        background: '#f8f9fa',
                        height: '32px',
                        borderRadius: '4px',
                        marginBottom: '12px',
                      }}
                    />
                    <div
                      style={{
                        background: '#f8f9fa',
                        height: '32px',
                        borderRadius: '4px',
                        marginBottom: '16px',
                      }}
                    />
                    <div
                      style={{
                        background: themeSettings.primaryColor || DEFAULT_THEME.primaryColor,
                        height: '36px',
                        borderRadius: '6px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      Sign in
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="section-card">
          <div className="section-header">
            <h2>Email Templates</h2>
            {isSaving && <span className="text-muted">Saving...</span>}
          </div>
          <div className="section-content">
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              Customize the emails sent to your users. Use placeholders like <code>{'{{projectName}}'}</code>, <code>{'{{verifyUrl}}'}</code>, or <code>{'{{resetUrl}}'}</code>.
            </p>

            <div className="email-templates">
              <div className="email-template-section" style={{ marginBottom: '32px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Email Verification</h4>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="verifySubject">Subject</label>
                  <input
                    type="text"
                    id="verifySubject"
                    value={emailTemplates.verifyEmail?.subject || ''}
                    onChange={(e) =>
                      setEmailTemplates({
                        ...emailTemplates,
                        verifyEmail: { ...emailTemplates.verifyEmail, subject: e.target.value },
                      })
                    }
                    placeholder="Verify your email for {{projectName}}"
                  />
                  <small className="text-muted">Leave empty to use default</small>
                </div>
                <div className="form-group">
                  <label htmlFor="verifyBody">Body (HTML)</label>
                  <textarea
                    id="verifyBody"
                    value={emailTemplates.verifyEmail?.body || ''}
                    onChange={(e) =>
                      setEmailTemplates({
                        ...emailTemplates,
                        verifyEmail: { ...emailTemplates.verifyEmail, body: e.target.value },
                      })
                    }
                    rows={16}
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                  <small className="text-muted">
                    Available placeholders: <code>{'{{projectName}}'}</code>, <code>{'{{userName}}'}</code>, <code>{'{{verifyUrl}}'}</code>, <code>{'{{verificationCode}}'}</code>
                  </small>
                </div>
              </div>

              <div className="email-template-section">
                <h4 style={{ marginBottom: '16px', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Password Reset</h4>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="resetSubject">Subject</label>
                  <input
                    type="text"
                    id="resetSubject"
                    value={emailTemplates.resetPassword?.subject || ''}
                    onChange={(e) =>
                      setEmailTemplates({
                        ...emailTemplates,
                        resetPassword: { ...emailTemplates.resetPassword, subject: e.target.value },
                      })
                    }
                    placeholder="Reset your password for {{projectName}}"
                  />
                  <small className="text-muted">Leave empty to use default</small>
                </div>
                <div className="form-group">
                  <label htmlFor="resetBody">Body (HTML)</label>
                  <textarea
                    id="resetBody"
                    value={emailTemplates.resetPassword?.body || ''}
                    onChange={(e) =>
                      setEmailTemplates({
                        ...emailTemplates,
                        resetPassword: { ...emailTemplates.resetPassword, body: e.target.value },
                      })
                    }
                    rows={16}
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                  <small className="text-muted">
                    Available placeholders: <code>{'{{projectName}}'}</code>, <code>{'{{userName}}'}</code>, <code>{'{{resetUrl}}'}</code>, <code>{'{{resetCode}}'}</code>
                  </small>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={saveEmailTemplates}
                disabled={isSaving}
                style={{ marginTop: '24px' }}
              >
                {isSaving ? 'Saving...' : 'Save Email Templates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showApiKeyModal && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create API Key</h2>
              <button className="modal-close" onClick={() => setShowApiKeyModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="keyName">Key Name</label>
                <input
                  type="text"
                  id="keyName"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="Production API Key"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowApiKeyModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={createApiKey}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
