import React, { useState, useEffect } from 'react';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import teamDataService from '../../services/teamDataService';
import teamDirectorioService from '../../services/teamDirectorioService';
import teamTemplateService from '../../services/teamTemplateService';
import toast from 'react-hot-toast';
import './TeamDataDemo.css';

const TeamDataDemo = () => {
  const { currentTeam, currentTeamMembers, userTeam, inviteUserToTeam, removeUserFromTeam, canManageUsers, isAdmin } = useTeam();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  
  // Estados para datos
  const [stats, setStats] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState([]);
  
  // Estados para gestión de usuarios
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    const team = currentTeam || userTeam;
    if (team) {
      loadTeamInfo();
      loadStats();
      loadMigrationStatus();
    }
  }, [currentTeam, userTeam]);

  // ================== Cargar datos ==================

  const loadTeamInfo = async () => {
    try {
      const info = teamDataService.getCurrentTeamInfo();
      setTeamInfo(info);
      console.log('📊 Team info loaded:', info);
    } catch (error) {
      console.error('❌ Error loading team info:', error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsData = await teamDirectorioService.getDirectorioStats();
      setStats(statsData);
      console.log('📊 Stats loaded:', statsData);
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      toast.error('Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadMigrationStatus = async () => {
    try {
      setLoading(true);
      const migrationData = await teamTemplateService.getMigrationStatus();
      setMigrationStatus(migrationData);
      console.log('📊 Migration status loaded:', migrationData);
    } catch (error) {
      console.error('❌ Error loading migration status:', error);
      toast.error('Error cargando estado de migración');
    } finally {
      setLoading(false);
    }
  };

  // ================== Gestión de usuarios ==================

  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    if (!newUserEmail.trim()) {
      toast.error('El email es requerido');
      return;
    }

    if (!newUserEmail.includes('@gmail.com')) {
      toast.error('Solo se permiten emails de Gmail (@gmail.com)');
      return;
    }

    // Todos los usuarios pueden invitar

    try {
      setInviteLoading(true);
      await inviteUserToTeam(newUserEmail.trim());
      toast.success(`Usuario ${newUserEmail} invitado exitosamente`);
      
      setNewUserEmail('');
      setNewUserName('');
      
      console.log('✅ User invited:', newUserEmail);
    } catch (error) {
      console.error('❌ Error inviting user:', error);
      toast.error('Error invitando usuario: ' + error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveUser = async (memberEmail) => {
    // Todos los usuarios pueden remover usuarios (excepto a sí mismos)

    if (memberEmail === user?.email) {
      toast.error('No puedes eliminarte a ti mismo');
      return;
    }

    if (!window.confirm(`¿Estás seguro de remover a ${memberEmail} del equipo?`)) {
      return;
    }

    try {
      setLoading(true);
      await removeUserFromTeam(memberEmail);
      toast.success(`Usuario ${memberEmail} removido del equipo`);
    } catch (error) {
      console.error('❌ Error removing user:', error);
      toast.error('Error removiendo usuario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ================== Inicializar colecciones ==================

  const initializeAllCollections = async () => {
    const team = currentTeam || userTeam;
    if (!team) {
      toast.error('No hay equipo seleccionado');
      return;
    }

    if (!window.confirm('¿Inicializar todas las colecciones con la estructura de CASIN? Esto puede tomar unos minutos.')) {
      return;
    }

    try {
      setLoading(true);
      console.log('🗂️ Inicializando colecciones CASIN para el equipo:', team.id);
      
      toast.loading('Inicializando colecciones...', { id: 'init' });
      
      // Usar el nuevo servicio de plantillas
      const result = await teamTemplateService.initializeAllTeamCollections();
      
      toast.dismiss('init');
      
      if (result.successful > 0) {
        toast.success(`✅ ${result.successful} colecciones inicializadas correctamente`);
        
        if (result.failed > 0) {
          toast.error(`⚠️ ${result.failed} colecciones fallaron`);
        }
      } else {
        toast.error('❌ No se pudieron inicializar las colecciones');
      }
      
      // Actualizar estadísticas
      await loadStats();
      
      console.log('🎯 Initialization complete:', result);
      
    } catch (error) {
      console.error('❌ Error inicializando colecciones:', error);
      toast.error('Error inicializando colecciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const team = currentTeam || userTeam;
  
  if (!team) {
    return (
      <div className="team-data-demo">
        <div className="demo-section">
          <h2>🔒 Acceso Restringido</h2>
          <p>Necesitas ser parte de un equipo para acceder a los datos.</p>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            <p>Debug Info:</p>
            <p>currentTeam: {currentTeam ? 'Existe' : 'No existe'}</p>
            <p>userTeam: {userTeam ? 'Existe' : 'No existe'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-data-demo">
      <div className="demo-header">
        <h1>🏢 Gestión del Equipo</h1>
        <p>Gestión de usuarios y datos del equipo {team.name}</p>
      </div>

      {/* Tabs */}
      <div className="demo-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📊 Resumen
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Gestión de Usuarios
        </button>
        <button 
          className={activeTab === 'config' ? 'active' : ''}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configuración
        </button>
      </div>

      {/* Content */}
      <div className="demo-content">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="demo-section">
            <h2>📊 Estadísticas del Equipo</h2>
            {loading ? (
              <div className="loading">Cargando...</div>
            ) : stats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>👥 Contactos</h3>
                  <div className="stat-number">{stats.totalContactos}</div>
                  <div className="stat-detail">({stats.contactosActivos} activos)</div>
                </div>

                <div className="stat-card">
                  <h3>🏢 Miembros</h3>
                  <div className="stat-number">{currentTeamMembers?.length || 0}</div>
                  <div className="stat-detail">usuarios activos</div>
                </div>
                <div className="stat-card">
                  <h3>💾 Base de Datos</h3>
                  <div className="stat-detail">
                    {teamInfo?.isTeamDatabase ? 'Equipo' : 'Desarrollo'}
                  </div>
                  <div className="stat-detail">{teamInfo?.projectId}</div>
                </div>
              </div>
            ) : (
              <div>
                <p>No hay estadísticas disponibles</p>
                <button onClick={loadStats}>Cargar Estadísticas</button>
              </div>
            )}

            <div className="demo-actions">
              <button onClick={loadStats} disabled={loading}>
                🔄 Actualizar Estadísticas
              </button>
              <button onClick={initializeAllCollections} disabled={loading}>
                🗂️ Inicializar Colecciones
              </button>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="demo-section">
            <h2>👥 Gestión de Usuarios del Equipo</h2>
            
            {canManageUsers() ? (
              <>
                {/* Formulario invitar usuario - solo para usuarios con permisos */}
                <div className="form-section">
                  <h3>📧 Invitar Nuevo Usuario</h3>
                  <form onSubmit={handleInviteUser} className="invite-form">
                    <div className="form-grid">
                      <div className="input-group">
                        <label htmlFor="userEmail">
                          <span className="input-icon">📧</span>
                          Email de Gmail *
                        </label>
                        <input
                          id="userEmail"
                          type="email"
                          placeholder="usuario@gmail.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                        />
                        <small className="input-hint">
                          Solo emails de Gmail (@gmail.com) son permitidos
                        </small>
                      </div>
                      <div className="input-group">
                        <label htmlFor="userName">
                          <span className="input-icon">👤</span>
                          Nombre (opcional)
                        </label>
                        <input
                          id="userName"
                          type="text"
                          placeholder="Nombre del usuario"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={inviteLoading} className="btn-invite">
                      {inviteLoading ? '📤 Enviando invitación...' : '📤 Invitar Usuario'}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="permission-notice">
                <h3>ℹ️ Solo Lectura</h3>
                <p>Puedes ver la lista de miembros del equipo, pero no tienes permisos para invitar o remover usuarios.</p>
                <p>Contacta a un administrador si necesitas gestionar miembros del equipo.</p>
              </div>
            )}

            {/* Lista de usuarios del equipo - visible para todos */}
            <div className="users-section">
              <div className="section-header">
                <h3>👥 Miembros del Equipo ({currentTeamMembers?.length || 0})</h3>
                <div className="admin-badge">
                  {canManageUsers() ? '👑 Puedes gestionar usuarios' : '👤 Solo lectura'}
                </div>
              </div>
              
              <div className="users-list">
                {(currentTeamMembers || []).map((member) => (
                  <div key={member.id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">
                        {member.role === 'admin' ? '👑' : '👤'}
                      </div>
                      <div className="user-details">
                        <h4>{member.name || member.email}</h4>
                        <p className="user-email">📧 {member.email}</p>
                        <div className="user-meta">
                          <span className={`role-badge ${member.role}`}>
                            {member.role === 'admin' ? '👑 Administrador' : '👤 Miembro'}
                          </span>
                          <span className={`status-badge ${member.status || 'active'}`}>
                            {member.status === 'invited' ? '📤 Invitado' : '✅ Activo'}
                          </span>
                        </div>
                        {member.invitedBy && (
                          <p className="invited-by">Invitado por: {member.invitedBy}</p>
                        )}
                      </div>
                    </div>
                    
                    {canManageUsers() && member.email !== user?.email && (
                      <div className="user-actions">
                        <button 
                          onClick={() => handleRemoveUser(member.email)}
                          className="remove-user-btn"
                          title="Remover del equipo"
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {(currentTeamMembers?.length || 0) === 0 && (
                  <div className="empty-state">
                    <p>No se encontraron miembros del equipo</p>
                    {canManageUsers() && <p>Invita usuarios para comenzar a colaborar</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="demo-section">
            <h2>⚙️ Configuración del Equipo</h2>
            
            <div className="config-info">
              <h3>📊 Información Técnica</h3>
              {teamInfo && (
                <div className="config-details">
                  <div className="config-item">
                    <strong>ID del Equipo:</strong> {teamInfo.teamId}
                  </div>
                  <div className="config-item">
                    <strong>Proyecto Firebase:</strong> {teamInfo.projectId}
                  </div>
                  <div className="config-item">
                    <strong>Tipo de Base de Datos:</strong> 
                    {teamInfo.isTeamDatabase ? ' Equipo (Aislada)' : ' Desarrollo (Compartida)'}
                  </div>
                </div>
              )}
            </div>

            <div className="config-info">
              <h3>🗂️ Colecciones del Equipo</h3>
              <div className="collections-list">
                {migrationStatus.length > 0 ? (
                  migrationStatus.map((collection) => (
                    <div key={collection.collection} className="collection-item">
                      <span className="collection-name">
                        {collection.icon} team_{teamInfo?.teamId}_{collection.collection}
                      </span>
                      <span className="collection-desc">{collection.title}</span>
                      <span className="collection-count">
                        {collection.teamCount > 0 ? (
                          <span className="count-badge">{collection.teamCount} docs</span>
                        ) : (
                          <span className="empty-badge">Vacía</span>
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="loading">Cargando colecciones...</div>
                )}
              </div>
            </div>

            <div className="config-info">
              <h3>👥 Miembros del Equipo</h3>
              <div className="members-list">
                {(currentTeamMembers || []).map((member) => (
                  <div key={member.id} className="member-item">
                    <span>{member.email}</span>
                    <span className={`role-badge ${member.role}`}>
                      {member.role === 'admin' ? '👑 Admin' : '👤 Miembro'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="config-info">
              <h3>🔧 Herramientas de Desarrollo</h3>
              <div className="dev-tools">
                <button onClick={() => window.open('/team-firebase', '_blank')}>
                  🚀 Abrir Visor Firebase
                </button>
                <button onClick={loadStats}>
                  📊 Actualizar Estadísticas
                </button>
                <button onClick={loadMigrationStatus}>
                  📋 Estado de Migración
                </button>
                <button onClick={initializeAllCollections}>
                  🗂️ Inicializar Colecciones
                </button>
                <button onClick={() => {
                  console.log('Current team:', currentTeam);
                  console.log('Team info:', teamInfo);
                  console.log('Stats:', stats);
                  console.log('Migration status:', migrationStatus);
                }}>
                  🐛 Debug en Consola
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDataDemo; 