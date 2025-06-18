import React, { useState, useEffect } from 'react';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import teamDataService from '../../services/teamDataService';
import teamDirectorioService from '../../services/teamDirectorioService';
import teamTemplateService from '../../services/teamTemplateService';
import toast from 'react-hot-toast';
import './TeamDataDemo.css';

const TeamDataDemo = () => {
  const { currentTeam, currentTeamMembers, userTeam } = useTeam();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  
  // Estados para datos
  const [stats, setStats] = useState(null);
  const [contactos, setContactos] = useState([]);
  const [teamInfo, setTeamInfo] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState([]);
  
  // Estados para formularios
  const [newContacto, setNewContacto] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: '',
    cargo: ''
  });

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

  const loadContactos = async () => {
    try {
      setLoading(true);
      const contactosData = await teamDirectorioService.getAllContactos();
      setContactos(contactosData);
      console.log('👥 Contacts loaded:', contactosData);
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      toast.error('Error cargando contactos');
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

  // ================== Operaciones CRUD ==================

  const handleCreateContacto = async (e) => {
    e.preventDefault();
    if (!newContacto.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      setLoading(true);
      const createdContacto = await teamDirectorioService.createContacto(newContacto);
      toast.success('Contacto creado exitosamente');
      
      setNewContacto({
        nombre: '',
        email: '',
        telefono: '',
        empresa: '',
        cargo: ''
      });
      
      // Actualizar lista
      await loadContactos();
      await loadStats();
      
      console.log('✅ Contact created:', createdContacto);
    } catch (error) {
      console.error('❌ Error creating contact:', error);
      toast.error('Error creando contacto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteContacto = async (contactoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este contacto?')) return;

    try {
      setLoading(true);
      await teamDirectorioService.deleteContacto(contactoId);
      toast.success('Contacto eliminado');
      
      await loadContactos();
      await loadStats();
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      toast.error('Error eliminando contacto');
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

  // ================== Datos de prueba ==================

  const createSampleData = async () => {
    try {
      setLoading(true);
      const sampleContactos = [
        {
          nombre: 'Juan Pérez',
          email: 'juan.perez@example.com',
          telefono: '5551234567',
          empresa: 'Empresa ABC',
          cargo: 'Gerente'
        },
        {
          nombre: 'María García',
          email: 'maria.garcia@example.com',
          telefono: '5559876543',
          empresa: 'Corporativo XYZ',
          cargo: 'Directora'
        },
        {
          nombre: 'Carlos López',
          email: 'carlos.lopez@example.com',
          telefono: '5555555555',
          empresa: 'Startup DEF',
          cargo: 'CEO'
        }
      ];

      for (const contacto of sampleContactos) {
        await teamDirectorioService.createContacto(contacto);
      }

      toast.success('Datos de prueba creados');
      await loadContactos();
      await loadStats();
    } catch (error) {
      console.error('❌ Error creating sample data:', error);
      toast.error('Error creando datos de prueba');
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
        <h1>🏢 Demo de Datos por Equipo</h1>
        <p>Gestión de datos aislada por equipo para {team.name}</p>
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
          className={activeTab === 'contactos' ? 'active' : ''}
          onClick={() => {
            setActiveTab('contactos');
            if ((contactos?.length || 0) === 0) loadContactos();
          }}
        >
          👥 Contactos
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
                  <h3>🏢 Equipo</h3>
                  <div className="stat-number">{currentTeamMembers?.length || 0}</div>
                  <div className="stat-detail">miembros</div>
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
              <button onClick={createSampleData} disabled={loading}>
                📝 Crear Datos de Prueba
              </button>
              <button onClick={loadStats} disabled={loading}>
                🔄 Actualizar Estadísticas
              </button>
            </div>
          </div>
        )}

        {/* Contactos Tab */}
        {activeTab === 'contactos' && (
          <div className="demo-section">
            <h2>👥 Gestión de Contactos</h2>
            
            {/* Formulario crear contacto */}
            <div className="form-section">
              <h3>➕ Nuevo Contacto</h3>
              <form onSubmit={handleCreateContacto} className="create-form">
                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="Nombre *"
                    value={newContacto.nombre}
                    onChange={(e) => setNewContacto({...newContacto, nombre: e.target.value})}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newContacto.email}
                    onChange={(e) => setNewContacto({...newContacto, email: e.target.value})}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={newContacto.telefono}
                    onChange={(e) => setNewContacto({...newContacto, telefono: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Empresa"
                    value={newContacto.empresa}
                    onChange={(e) => setNewContacto({...newContacto, empresa: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Cargo"
                    value={newContacto.cargo}
                    onChange={(e) => setNewContacto({...newContacto, cargo: e.target.value})}
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Contacto'}
                </button>
              </form>
            </div>

            {/* Lista de contactos */}
            <div className="list-section">
              <div className="list-header">
                <h3>📋 Lista de Contactos ({contactos?.length || 0})</h3>
                <button onClick={loadContactos} disabled={loading}>
                  🔄 Recargar
                </button>
              </div>
              
              {loading ? (
                <div className="loading">Cargando contactos...</div>
              ) : (
                <div className="contacts-list">
                  {contactos.map((contacto) => (
                    <div key={contacto.id} className="contact-card">
                      <div className="contact-info">
                        <h4>{contacto.nombre}</h4>
                        {contacto.email && <p>📧 {contacto.email}</p>}
                        {contacto.telefono && <p>📱 {contacto.telefono}</p>}
                        {contacto.empresa && <p>🏢 {contacto.empresa}</p>}
                        {contacto.cargo && <p>💼 {contacto.cargo}</p>}
                      </div>
                      <div className="contact-actions">
                        <button 
                          onClick={() => handleDeleteContacto(contacto.id)}
                          className="delete-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {(contactos?.length || 0) === 0 && (
                    <div className="empty-state">
                      <p>No hay contactos en este equipo</p>
                      <p>Crea algunos datos de prueba para comenzar</p>
                    </div>
                  )}
                </div>
              )}
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