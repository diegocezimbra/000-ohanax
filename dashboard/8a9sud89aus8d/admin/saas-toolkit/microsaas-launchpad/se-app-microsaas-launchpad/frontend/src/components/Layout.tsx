import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  NavItem,
  SidebarFooter,
  SidebarUserSection,
  SidebarProvider,
  MobileHeader,
  Layout as DSLayout,
  MainContent,
  Spinner,
} from '../design-system'

// Icons as SVG components
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
  </svg>
)

const ProjectsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
)

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="currentColor" />
    <path d="M16 8L8 12v8l8 4 8-4v-8l-8-4z" fill="white" opacity="0.9" />
    <path d="M16 14v6m-3-3h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export function Layout() {
  const { user, isLoading, logout } = useAuth()

  // Auth redirect is handled by useAuth hook

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary)'
      }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <DSLayout>
        <MobileHeader logo={<LogoIcon />} title="Preencher com app-name" />

        <Sidebar>
          <SidebarHeader
            logo={<LogoIcon />}
            title="Preencher com app-name"
          />

          <SidebarUserSection
            name={user.name || 'User'}
            email={user.email}
          />

          <SidebarNav>
            <NavLink to="/" end>
              {({ isActive }) => (
                <NavItem icon={<DashboardIcon />} active={isActive}>
                  Overview
                </NavItem>
              )}
            </NavLink>
            <NavLink to="/projects">
              {({ isActive }) => (
                <NavItem icon={<ProjectsIcon />} active={isActive}>
                  Projects
                </NavItem>
              )}
            </NavLink>
          </SidebarNav>

          <SidebarFooter onLogout={logout} />
        </Sidebar>

        <MainContent>
          <Outlet />
        </MainContent>
      </DSLayout>
    </SidebarProvider>
  )
}
