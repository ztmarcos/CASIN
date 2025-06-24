import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import developerAnalyticsService from '../../services/developerAnalyticsService';
import toast from 'react-hot-toast';
import './DeveloperDashboard.css';

const DeveloperDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Verificar si el usuario tiene acceso de desarrollador
  const isDeveloper = user?.email === 'z.t.marcos@gmail.com' || user?.email === '2012solitario@gmail.com';

  useEffect(() => {
    if (isDeveloper) {
      loadAnalytics();
    }
  }, [isDeveloper]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading developer analytics...');
      const data = await developerAnalyticsService.getGlobalAnalytics();
      setAnalytics(data);
      console.log('✅ Analytics loaded:', data.totals);
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      toast.error('Error cargando analíticas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamDetails = async (teamId) => {
    setIsLoadingTeam(true);
    setSelectedTeam(teamId);
    try {
      console.log(`🔍 Loading details for team: ${teamId}`);
      const details = await developerAnalyticsService.getTeamDetails(teamId);
      setTeamDetails(details);
      console.log('✅ Team details loaded:', details.stats);
    } catch (error) {
      console.error('❌ Error loading team details:', error);
      toast.error('Error cargando detalles del equipo: ' + error.message);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const refreshData = async () => {
    developerAnalyticsService.clearCache();
    await loadAnalytics();
    if (selectedTeam) {
      await loadTeamDetails(selectedTeam);
    }
    toast.success('Datos actualizados');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCollectionTypeIcon = (baseType) => {
    const icons = {
      contactos: '👥', polizas: '📄', autos: '🚗', vida: '❤️',
      gmm: '🏥', hogar: '🏠', diversos: '📋', mascotas: '🐕',
      rc: '🛡️', negocio: '💼', emant: '📊', tareas: '✅',
      reportes: '📈', configuracion: '⚙️', directorio_contactos: '📱',
      gruposgmm: '🏥', gruposautos: '🚗', gruposvida: '❤️'
    };
    return icons[baseType] || '📦';
  };

  if (!isDeveloper) {
    return (
      <div className="developer-dashboard">
        <div className="access-denied">
          <h1>🔒 Acceso Restringido</h1>
          <p>Solo los desarrolladores pueden acceder a este panel.</p>
          <div className="user-info">
            <p>Usuario actual: <code>{user?.email}</code></p>
            <p>Desarrolladores autorizados:</p>
            <ul>
              <li>z.t.marcos@gmail.com</li>
              <li>2012solitario@gmail.com</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="developer-dashboard">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <h2>Cargando Analytics del Sistema...</h2>
          <p>Escaneando equipos, usuarios y colecciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="developer-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🔧 Panel de Desarrolladores</h1>
          <p>Monitoreo global del sistema multi-tenant</p>
          <div className="header-stats">
            {analytics && (
              <>
                <span className="stat-pill">
                  🏢 {analytics.totals.teams} equipos
                </span>
                <span className="stat-pill">
                  👥 {analytics.totals.users} usuarios
                </span>
                <span className="stat-pill">
                  🗂️ {analytics.totals.collections} colecciones
                </span>
              </>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button onClick={refreshData} className="refresh-btn">
            🔄 Actualizar
          </button>
          <span className="last-update">
            {analytics && `Última actualización: ${formatDate(analytics.timestamp)}`}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📊 Resumen General
        </button>
        <button 
          className={activeTab === 'teams' ? 'active' : ''}
          onClick={() => setActiveTab('teams')}
        >
          🏢 Equipos
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuarios
        </button>
        <button 
          className={activeTab === 'collections' ? 'active' : ''}
          onClick={() => setActiveTab('collections')}
        >
          🗂️ Colecciones
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && analytics && (
          <div className="overview-section">
            {/* Estadísticas principales */}
            <div className="stats-grid">
              <div className="stat-card primary">
                <h3>🏢 Equipos Totales</h3>
                <div className="stat-number">{analytics.totals.teams}</div>
                <div className="stat-detail">
                  {analytics.totals.activeTeams} activos
                </div>
              </div>
              
              <div className="stat-card success">
                <h3>👥 Usuarios Totales</h3>
                <div className="stat-number">{analytics.totals.users}</div>
                <div className="stat-detail">
                  {analytics.usage.avgUsersPerTeam} promedio por equipo
                </div>
              </div>
              
              <div className="stat-card info">
                <h3>🗂️ Colecciones</h3>
                <div className="stat-number">{analytics.totals.collections}</div>
                <div className="stat-detail">
                  {analytics.usage.globalCollections} globales, {analytics.totals.collections - analytics.usage.globalCollections} de equipos
                </div>
              </div>
              
              <div className="stat-card warning">
                <h3>📈 Promedio Colecciones</h3>
                <div className="stat-number">{analytics.usage.avgCollectionsPerTeam}</div>
                <div className="stat-detail">por equipo</div>
              </div>
            </div>

            {/* Top Equipos */}
            <div className="top-teams-section">
              <h2>🏆 Equipos Más Activos</h2>
              <div className="teams-ranking">
                {analytics.topTeams.slice(0, 5).map((team, index) => (
                  <div key={team.id} className="team-rank-card">
                    <div className="rank-number">#{index + 1}</div>
                    <div className="team-info">
                      <h4>{team.name}</h4>
                      <p>{team.description || 'Sin descripción'}</p>
                    </div>
                    <div className="team-stats">
                      <span className="stat">👥 {team.userCount}</span>
                      <span className="stat">🗂️ {team.collectionCount}</span>
                      <span className="stat">📄 {team.totalDocuments}</span>
                    </div>
                    <button 
                      onClick={() => loadTeamDetails(team.id)}
                      className="view-details-btn"
                    >
                      Ver Detalles
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribución de Colecciones */}
            <div className="collections-breakdown">
              <h2>📊 Distribución de Colecciones</h2>
              <div className="breakdown-grid">
                <div className="breakdown-card">
                  <h3>🌐 Globales</h3>
                  <div className="collections-list">
                    {analytics.collectionsByType.global.map(collection => (
                      <div key={collection.name} className="collection-item">
                        <span className="collection-name">{collection.name}</span>
                        <span className="collection-count">{collection.documentCount} docs</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="breakdown-card">
                  <h3>🏢 Por Tipo de Equipo</h3>
                  <div className="type-distribution">
                    {Object.entries(analytics.collectionsByType.teamByType).map(([type, collections]) => (
                      <div key={type} className="type-row">
                        <span className="type-icon">{getCollectionTypeIcon(type)}</span>
                        <span className="type-name">{type}</span>
                        <span className="type-count">{collections.length} equipos</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && analytics && (
          <div className="teams-section">
            <div className="section-header">
              <h2>🏢 Todos los Equipos ({analytics.totals.teams})</h2>
            </div>
            
            <div className="teams-grid">
              {analytics.teams.map(team => (
                <div key={team.id} className="team-card">
                  <div className="team-header">
                    <h3>{team.name}</h3>
                    <div className="team-badges">
                      {team.isMainTeam && <span className="badge main">Principal</span>}
                      {!team.isActive && <span className="badge inactive">Inactivo</span>}
                    </div>
                  </div>
                  
                  <div className="team-description">
                    {team.description || 'Sin descripción'}
                  </div>
                  
                  <div className="team-meta">
                    <div className="meta-row">
                      <span className="meta-label">Propietario:</span>
                      <span className="meta-value">{team.owner}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-label">Creado:</span>
                      <span className="meta-value">{formatDate(team.createdAt)}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-label">Proyecto Firebase:</span>
                      <span className="meta-value">{team.firebaseProject || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="team-stats-row">
                    <span className="stat">👥 {team.memberCount} usuarios</span>
                    <span className="stat">🗂️ {team.collectionCount} colecciones</span>
                  </div>
                  
                  <button 
                    onClick={() => loadTeamDetails(team.id)}
                    className="team-details-btn"
                    disabled={isLoadingTeam && selectedTeam === team.id}
                  >
                    {isLoadingTeam && selectedTeam === team.id ? '⏳ Cargando...' : '🔍 Ver Detalles'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && analytics && (
          <div className="users-section">
            <div className="section-header">
              <h2>👥 Todos los Usuarios ({analytics.totals.users})</h2>
            </div>
            
            <div className="users-by-team">
              {Object.entries(analytics.usersByTeam).map(([teamId, users]) => {
                const team = analytics.teams.find(t => t.id === teamId);
                return (
                  <div key={teamId} className="team-users-group">
                    <div className="team-users-header">
                      <h3>🏢 {team?.name || 'Equipo Desconocido'}</h3>
                      <span className="users-count">{users.length} usuarios</span>
                    </div>
                    
                    <div className="users-grid">
                      {users.map(user => (
                        <div key={user.id} className="user-card">
                          <div className="user-info">
                            <div className="user-avatar">
                              {user.role === 'admin' ? '👑' : '👤'}
                            </div>
                            <div className="user-details">
                              <h4>{user.name || user.email}</h4>
                              <p className="user-email">{user.email}</p>
                            </div>
                          </div>
                          
                          <div className="user-badges">
                            <span className={`role-badge ${user.role}`}>
                              {user.role === 'admin' ? 'Admin' : 'Miembro'}
                            </span>
                            <span className={`status-badge ${user.status}`}>
                              {user.status === 'invited' ? 'Invitado' : 'Activo'}
                            </span>
                            {user.isOwner && <span className="badge owner">Propietario</span>}
                            {user.isTestUser && <span className="badge test">Test</span>}
                          </div>
                          
                          <div className="user-meta">
                            <div className="meta-item">
                              <span>Se unió:</span>
                              <span>{formatDate(user.joinedAt)}</span>
                            </div>
                            {user.invitedBy && (
                              <div className="meta-item">
                                <span>Invitado por:</span>
                                <span>{user.invitedBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'collections' && analytics && (
          <div className="collections-section">
            <div className="section-header">
              <h2>🗂️ Todas las Colecciones ({analytics.totals.collections})</h2>
            </div>
            
            {/* Colecciones Globales */}
            <div className="collections-group">
              <h3>🌐 Colecciones Globales</h3>
              <div className="collections-grid">
                {analytics.collectionsByType.global.map(collection => (
                  <div key={collection.name} className="collection-card global">
                    <div className="collection-header">
                      <span className="collection-icon">🌐</span>
                      <h4>{collection.name}</h4>
                    </div>
                    <div className="collection-stats">
                      <span className="doc-count">{collection.documentCount} documentos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Colecciones por Equipo */}
            <div className="collections-group">
              <h3>🏢 Colecciones de Equipos</h3>
              {Object.entries(analytics.collectionsByType.teamByType).map(([type, collections]) => (
                <div key={type} className="type-collections-group">
                  <h4>{getCollectionTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                  <div className="collections-grid">
                    {collections.map(collection => (
                      <div key={collection.name} className="collection-card team">
                        <div className="collection-header">
                          <span className="collection-icon">{getCollectionTypeIcon(type)}</span>
                          <h5>{collection.teamName}</h5>
                        </div>
                        <div className="collection-info">
                          <code>{collection.name}</code>
                        </div>
                        <div className="collection-stats">
                          <span className="doc-count">{collection.documentCount} docs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Details Modal */}
      {teamDetails && (
        <div className="modal-overlay" onClick={() => setTeamDetails(null)}>
          <div className="team-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔍 Detalles del Equipo: {teamDetails.team.name}</h2>
              <button onClick={() => setTeamDetails(null)} className="close-btn">×</button>
            </div>
            
            <div className="modal-content">
              <div className="team-overview">
                <div className="overview-stats">
                  <div className="stat-item">
                    <span className="stat-label">👥 Usuarios</span>
                    <span className="stat-value">{teamDetails.stats.userCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">🗂️ Colecciones</span>
                    <span className="stat-value">{teamDetails.stats.collectionCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">📄 Documentos</span>
                    <span className="stat-value">{teamDetails.stats.totalDocuments}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">👑 Admins</span>
                    <span className="stat-value">{teamDetails.stats.admins}</span>
                  </div>
                </div>
              </div>
              
              <div className="modal-sections">
                <div className="modal-section">
                  <h3>👥 Usuarios del Equipo</h3>
                  <div className="modal-users-list">
                    {teamDetails.users.map(user => (
                      <div key={user.id} className="modal-user-item">
                        <span className="user-role-icon">
                          {user.role === 'admin' ? '👑' : '👤'}
                        </span>
                        <div className="user-info">
                          <strong>{user.name || user.email}</strong>
                          <span className="user-email">{user.email}</span>
                        </div>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="modal-section">
                  <h3>🗂️ Colecciones del Equipo</h3>
                  <div className="modal-collections-list">
                    {teamDetails.collections.map(collection => (
                      <div key={collection.name} className="modal-collection-item">
                        <span className="collection-icon">
                          {getCollectionTypeIcon(collection.baseType)}
                        </span>
                        <div className="collection-info">
                          <strong>{collection.baseType}</strong>
                          <code>{collection.name}</code>
                        </div>
                        <span className="doc-count">
                          {collection.documentCount} docs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperDashboard; 