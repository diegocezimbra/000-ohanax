import { useState, useEffect } from 'react'
import { adminService, DashboardData } from '../services'
import {
  Page,
  Button,
  Card,
  CardHeader,
  CardContent,
  StatCard,
  Spinner,
  Alert,
} from '../design-system'

// Icons
const ProjectsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
)

const ApiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
)

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const dashboardData = await adminService.getDashboard()
      setData(dashboardData)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Failed to load dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Page>
      <header className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Monitor your application metrics</p>
        </div>
        <Button variant="secondary" onClick={loadData}>
          Refresh
        </Button>
      </header>

      {error && (
        <Alert
          variant="danger"
          title="Error"
          dismissible
          onDismiss={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 'var(--space-xl)',
          }}
        >
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              title="Projects"
              value={data?.stats.totalProjects ?? 0}
              icon={<ProjectsIcon />}
            />
            <StatCard
              title="API Calls"
              value={data?.stats.apiCalls ?? 0}
              icon={<ApiIcon />}
              trend="up"
              change={{ value: 8, label: 'vs last week' }}
            />
          </div>

          <Card>
            <CardHeader title="Recent Projects" />
            <CardContent>
              {!data?.recentProjects || data.recentProjects.length === 0 ? (
                <p
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    padding: 'var(--space-xl)',
                  }}
                >
                  No projects yet
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {data.recentProjects.map((project) => (
                    <li
                      key={project.id}
                      style={{
                        padding: 'var(--space-md)',
                        borderBottom: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{project.name}</div>
                      {project.description && (
                        <div
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {project.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Page>
  )
}
