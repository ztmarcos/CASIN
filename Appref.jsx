import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './styles/themeSIS.css';
import Dashboard from './components/Dashboard';
import Drive from './components/Drive';
import DataTable from './components/DataTable';
import Pool from './components/Pool';
import Sharepoint from './components/Sharepoint';
import TeamManagement from './pages/TeamManagement';
import UserManagementPage from './pages/UserManagementPage';
import { isAdmin } from './utils/userRoles';
import EmailSystem from './components/EmailSystem';
import Reports from './components/Reports';

const AppSIS = ({ currentUser }) => {
  const [currentModule, setCurrentModule] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('theme');
    return savedMode ? savedMode === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    const theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    root.setAttribute('data-theme', theme);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const modules = [
    {
      id: 'data',
      label: 'Data',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'pool',
      label: 'Pool',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'drive',
      label: 'Drive',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    },
    {
      id: 'sharepoint',
      label: 'Sharepoint',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'email',
      label: 'Email',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'teams',
      label: 'Teams',
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'users',
      label: 'Users',
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }
  ];

  // Filtrar módulos basado en permisos de admin
  const filteredModules = modules.filter(module => 
    !module.adminOnly || (module.adminOnly && isAdmin(currentUser))
  );

  return (
    <div className="min-h-screen bg-surface/30 theme-transition relative">
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border-subtle backdrop-blur-sm z-[48] theme-transition">
        <div className="flex h-full items-center px-6">
          {/* Logo */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-hover transition-all">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-muted">C</span>
                <span className="text-2xl font-black text-muted">-</span>
                <span className="text-2xl font-black text-muted">H</span>
              </div>
              <span className="text-[9px] font-medium tracking-[0.2em] text-muted uppercase">Cambiando Historias</span>
            </div>
          </div>

          {/* Dashboard Info - Now in the center */}
          <div className="flex-1 flex justify-center">
            <Dashboard currentUser={currentUser} />
          </div>

          {/* Acciones y Perfil */}
          <div className="flex items-center gap-4">
            {/* Tema */}
            <button
              onClick={toggleTheme}
              className="p-2 text-muted hover:text-primary hover:bg-surface-hover rounded-lg transition-all"
              aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Perfil */}
            <div className="flex items-center gap-3 pl-4 pr-2 py-2 hover:bg-surface-hover rounded-xl transition-all cursor-pointer">
              <div>
                <p className="text-sm font-medium text-secondary">{currentUser}</p>
                <p className="text-xs text-muted">Online</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary text-control-text flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {currentUser.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-16 bottom-0 bg-surface border-r border-border-subtle backdrop-blur-sm transition-all theme-transition z-[49] ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="p-4">
          <div className="flex flex-col gap-2">
            {filteredModules.map(module => (
              <button
                key={module.id}
                onClick={() => setCurrentModule(module.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  currentModule === module.id
                    ? 'bg-primary text-control-text'
                    : 'text-muted hover:text-primary hover:bg-surface-hover'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                {module.icon}
                {!isSidebarCollapsed && <span className="font-medium">{module.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Sidebar */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-4 p-1.5 bg-surface text-muted hover:text-primary rounded-full border border-border-subtle shadow-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
              isSidebarCollapsed
                ? "M13 5l7 7-7 7M5 5l7 7-7 7"
                : "M11 19l-7-7 7-7m8 14l-7-7 7-7"
            } />
          </svg>
        </button>
      </aside>

      {/* Main content */}
      <main className={`pt-20 transition-all ${
        isSidebarCollapsed ? 'ml-20' : 'ml-64'
      } p-6`}>
        <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6 min-h-[calc(100vh-7rem)] theme-transition">
          {currentModule === '' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map(module => (
                <button
                  key={module.id}
                  onClick={() => setCurrentModule(module.id)}
                  className="flex flex-col items-center p-6 bg-surface hover:bg-surface-hover rounded-2xl border border-border-subtle transition-all group"
                >
                  <div className="w-16 h-16 mb-4 rounded-2xl bg-primary text-control-text flex items-center justify-center group-hover:scale-110 transition-all">
                    {module.icon}
                  </div>
                  <h3 className="text-lg font-medium text-secondary mb-2">{module.label}</h3>
                  <p className="text-sm text-muted text-center">
                    Accede al módulo de {module.label.toLowerCase()}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-secondary">
                  {modules.find(m => m.id === currentModule)?.label}
                </h1>
              </div>
              <div className="text-secondary">
                {currentModule === 'data' ? (
                  <DataTable currentUser={currentUser} />
                ) : currentModule === 'pool' ? (
                  <Pool currentUser={currentUser} sessions={JSON.parse(localStorage.getItem(`tableTurnerSessions_${currentUser}`) || '[]')} />
                ) : currentModule === 'drive' ? (
                  <Drive currentUser={currentUser} />
                ) : currentModule === 'sharepoint' ? (
                  <Sharepoint currentUser={currentUser} />
                ) : currentModule === 'teams' ? (
                  <TeamManagement user={{ name: currentUser }} isAuthenticated={true} />
                ) : currentModule === 'users' ? (
                  <div className="bg-surface/30 backdrop-blur-sm rounded-xl border border-border-subtle">
                    <UserManagementPage currentUser={currentUser} />
                  </div>
                ) : currentModule === 'email' ? (
                  <EmailSystem 
                    initialData={{
                      recipientName: '',
                      recipientEmail: 'ztmarcos@gmail.com',
                      fields: []
                    }}
                    onClose={() => setCurrentModule('')}
                  />
                ) : currentModule === 'reports' ? (
                  <Reports 
                    sessions={
                      JSON.parse(localStorage.getItem(`tableTurnerSessions_${currentUser}`) || '[]')
                        .map(sessionName => ({
                          name: sessionName,
                          data: JSON.parse(localStorage.getItem(`tableData_${currentUser}_${sessionName}`) || '[]'),
                          columns: JSON.parse(localStorage.getItem(`tableColumns_${currentUser}_${sessionName}`) || '[]')
                        }))
                    } 
                  />
                ) : (
                  <div>Contenido del módulo {modules.find(m => m.id === currentModule)?.label}</div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

AppSIS.propTypes = {
  currentUser: PropTypes.string.isRequired,
};

export default AppSIS; 