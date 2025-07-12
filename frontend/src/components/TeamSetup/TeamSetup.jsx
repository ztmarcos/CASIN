import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import './TeamSetup.css';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TeamSetup = () => {
  const { createTeam, isLoadingTeam } = useTeam();
  const { user, logout } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([{ email: '', name: '' }]);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState('welcome'); // welcome, create
  const [error, setError] = useState(null);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast.error('Por favor ingresa un nombre para el equipo');
      return;
    }

    // Validate team members emails
    const validMembers = teamMembers.filter(member => member.email.trim());
    const invalidEmails = validMembers.filter(member => !member.email.includes('@gmail.com'));
    
    if (invalidEmails.length > 0) {
      toast.error('Todos los emails deben ser de Gmail (@gmail.com)');
      return;
    }

    setIsCreating(true);
    
    try {
      await createTeam(teamName.trim(), validMembers);
      toast.success('¡Equipo creado exitosamente! Redirigiendo...');
      
      // Dar tiempo para que el contexto se actualice y mostrar la app automáticamente
      setTimeout(() => {
        // El ProtectedRoute debería detectar automáticamente que ya tiene equipo
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Error al crear el equipo: ' + error.message);
      setIsCreating(false);
    }
  };

  const addMember = () => {
    if (teamMembers.length < 10) {
      setTeamMembers([...teamMembers, { email: '', name: '' }]);
    }
  };

  const removeMember = (index) => {
    if (teamMembers.length > 1) {
      const newMembers = teamMembers.filter((_, i) => i !== index);
      setTeamMembers(newMembers);
    }
  };

  const updateMember = (index, field, value) => {
    const newMembers = [...teamMembers];
    newMembers[index][field] = value;
    setTeamMembers(newMembers);
  };

  const handleGetStarted = () => {
    setStep('create');
  };

  // Debug function to create MARQ team for testing
  const createMARQTeamForTesting = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('🏢 Creating MARQ team for testing...');
      
      const userEmail = 'bumtekateam@gmail.com';
      const userUid = 'cd5BAYELe4aq8SE3XDjQULiwW3w2';
      
      // Check if MARQ team already exists
      const teamsQuery = query(collection(db, 'teams'), where('name', '==', 'MARQ'));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      let teamId;
      
      if (teamsSnapshot.empty) {
        // Create MARQ team
        const teamData = {
          name: 'MARQ',
          owner: userEmail,
          createdAt: serverTimestamp(),
          firebaseProject: 'casinbbdd',
          settings: {
            allowInvites: true,
            maxMembers: 50
          },
          description: 'Equipo MARQ para pruebas'
        };
        
        const teamDocRef = await addDoc(collection(db, 'teams'), teamData);
        teamId = teamDocRef.id;
        console.log('✅ MARQ team created with ID:', teamId);
      } else {
        teamId = teamsSnapshot.docs[0].id;
        console.log('✅ MARQ team already exists with ID:', teamId);
      }
      
      // Check if user is already in team
      const membersQuery = query(
        collection(db, 'team_members'), 
        where('email', '==', userEmail),
        where('teamId', '==', teamId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      if (membersSnapshot.empty) {
        // Add user to MARQ team
        await addDoc(collection(db, 'team_members'), {
          userId: userUid,
          email: userEmail,
          name: 'bumteka team',
          teamId: teamId,
          role: 'admin',
          invitedBy: userEmail,
          joinedAt: serverTimestamp()
        });
        
        console.log('✅ User added to MARQ team');
      }
      
      console.log('🎉 MARQ team setup complete!');
      
      // Reload page to activate team system
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error creating MARQ team:', error);
      setError('Error creando equipo MARQ: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async (e) => {
    // Implementation of handleSubmit function
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 User logging out from team setup...');
      
      // Limpiar localStorage problemático de forma más completa
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('team') || key.includes('auth') || key.includes('user') || key.includes('firebase'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed: ${key}`);
      });
      
      // Limpiar sessionStorage también
      sessionStorage.clear();
      
      // Hacer logout de Firebase
      await logout();
      
      console.log('✅ Logout completed - account selection will be shown on next login');
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Forzar recarga de página como fallback
      console.log('🔄 Forcing page reload as fallback');
      window.location.reload();
    }
  };

  if (step === 'create') {
    return (
      <div className="team-setup">
        <div className="setup-container">
          <div className="setup-card create-card">
            <div className="setup-header">
              <div className="header-icon">🏢</div>
              <h1>Crear tu Equipo</h1>
              <p className="header-description">
                Crea un equipo para tu organización y comienza a gestionar tus seguros con la plataforma CASIN.
              </p>
            </div>

            <form onSubmit={handleCreateTeam} className="setup-form">
              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="teamName" className="form-label">
                    <span className="label-icon">✏️</span>
                    Nombre del Equipo
                  </label>
                  <input
                    id="teamName"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ej: CASIN Seguros, Mi Empresa, Grupo Asegurador..."
                    className="form-input form-input-large"
                    maxLength={50}
                    required
                  />
                  <div className="form-feedback">
                    <small className="form-hint">
                      <span className="hint-icon">💡</span>
                      Este será el nombre que verán todos los miembros del equipo.
                    </small>
                    <small className="char-counter">
                      {teamName.length}/50 caracteres
                    </small>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="members-header">
                  <label className="form-label">
                    <span className="label-icon">👥</span>
                    Miembros del Equipo
                  </label>
                  <div className="members-counter">
                    {teamMembers.filter(m => m.email.trim()).length + 1} miembros (incluye a ti)
                  </div>
                </div>

                <div className="admin-member">
                  <div className="member-card admin-card">
                    <div className="member-info">
                      <span className="member-icon">👑</span>
                      <div className="member-details">
                        <strong>{user?.name || 'Administrador'}</strong>
                        <span className="member-email">{user?.email}</span>
                        <span className="member-role">Administrador</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="team-members-list">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="member-input-group">
                      <div className="member-inputs">
                        <div className="input-group">
                          <label className="input-label">
                            <span className="input-icon">📧</span>
                            Email de Gmail
                          </label>
                          <input
                            type="email"
                            value={member.email}
                            onChange={(e) => updateMember(index, 'email', e.target.value)}
                            placeholder="ejemplo@gmail.com"
                            className="form-input member-input"
                          />
                        </div>
                        <div className="input-group">
                          <label className="input-label">
                            <span className="input-icon">👤</span>
                            Nombre (opcional)
                          </label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updateMember(index, 'name', e.target.value)}
                            placeholder="Nombre del miembro"
                            className="form-input member-input"
                          />
                        </div>
                      </div>
                      {teamMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMember(index)}
                          className="remove-member-btn"
                          title="Eliminar miembro"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="members-actions">
                  <button
                    type="button"
                    onClick={addMember}
                    className="btn-add-member"
                    disabled={teamMembers.length >= 10}
                  >
                    <span className="btn-icon">➕</span>
                    Agregar otro miembro
                  </button>
                  <small className="members-hint">
                    <span className="hint-icon">💡</span>
                    Máximo 10 miembros. Puedes agregar más después.
                  </small>
                </div>
              </div>

              <div className="benefits-section">
                <h3>🎯 Lo que incluye tu equipo:</h3>
                <div className="benefits-grid">
                  <div className="benefit-item">
                    <span className="benefit-icon">👤</span>
                    <div className="benefit-content">
                      <strong>Serás el administrador</strong>
                      <p>Control total sobre el equipo, usuarios y configuraciones</p>
                    </div>
                  </div>
                  
                  <div className="benefit-item">
                    <span className="benefit-icon">🔒</span>
                    <div className="benefit-content">
                      <strong>Base de datos privada</strong>
                      <p>Datos completamente aislados y seguros para tu organización</p>
                    </div>
                  </div>
                  
                  <div className="benefit-item">
                    <span className="benefit-icon">👥</span>
                    <div className="benefit-content">
                      <strong>Invita a tu equipo</strong>
                      <p>Agrega usuarios con emails de Google y gestiona permisos</p>
                    </div>
                  </div>

                  <div className="benefit-item">
                    <span className="benefit-icon">📊</span>
                    <div className="benefit-content">
                      <strong>15 tipos de seguros</strong>
                      <p>Autos, vida, hogar, GMM y más con estructura profesional</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="btn-secondary"
                  disabled={isCreating}
                >
                  <span className="btn-icon">←</span>
                  Atrás
                </button>
                
                <button
                  type="submit"
                  className="btn-primary btn-create"
                  disabled={isCreating || !teamName.trim()}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner">⏳</span>
                      Creando y entrando...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🚀</span>
                      Crear Equipo {teamMembers.filter(m => m.email.trim()).length > 0 && `con ${teamMembers.filter(m => m.email.trim()).length} miembros`}
                    </>
                  )}
                </button>
              </div>

              <div className="form-note">
                <div className="note-box">
                  <span className="note-icon">⚠️</span>
                  <div className="note-text">
                    <strong>Importante:</strong> Una vez creado, el nombre del equipo no se puede cambiar. 
                    Asegúrate de elegir un nombre apropiado para tu organización.
                  </div>
                </div>
              </div>

              {/* Logout button in create form */}
              <div className="logout-section">
                <button 
                  type="button"
                  className="btn-logout"
                  onClick={handleLogout}
                  title="Cerrar sesión y volver a intentar"
                >
                  🚪 Cerrar Sesión
                </button>
                <p className="logout-help">
                  Si tienes problemas, puedes cerrar sesión y volver a intentar
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Welcome step
  return (
    <div className="team-setup">
      <div className="setup-container">
        <div className="setup-card welcome-card">
          <div className="welcome-header">
            <h1>¡Bienvenido a CASIN!</h1>
            <p>Hola <strong>{user?.name || user?.email}</strong> 👋</p>
            <div className="auth-success">✅ Autenticación completada</div>
          </div>

          <div className="welcome-content">
            <div className="welcome-icon">🏢</div>
            
            <h2>Configura tu Equipo</h2>
            <p className="welcome-description">
              Para comenzar a usar CASIN, necesitas crear un equipo para tu organización.
              <br />
              <strong>Tu equipo tendrá acceso completo a todas las funcionalidades de CASIN.</strong>
            </p>
            
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <div className="feature-content">
                  <strong>Base de datos privada</strong>
                  <p>Tu equipo tendrá su propia base de datos completamente aislada y segura</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👥</span>
                <div className="feature-content">
                  <strong>Gestión de usuarios</strong>
                  <p>Invita miembros, asigna roles y gestiona permisos de tu equipo</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <div className="feature-content">
                  <strong>Colaboración en tiempo real</strong>
                  <p>Trabaja con tu equipo de forma simultánea y sincronizada</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <div className="feature-content">
                  <strong>Datos completamente aislados</strong>
                  <p>15 tipos de seguros con estructura idéntica a CASIN</p>
                </div>
              </div>
            </div>
          </div>

          <div className="welcome-actions">
            <button 
              className="btn-primary btn-large"
              onClick={handleGetStarted}
            >
              <span className="btn-icon">🚀</span>
              Crear mi Equipo Ahora
            </button>
            
            {/* Debug button for bumtekateam@gmail.com */}
            {user?.email === 'bumtekateam@gmail.com' && (
              <button 
                className="btn-debug"
                onClick={createMARQTeamForTesting}
                disabled={isCreating}
              >
                {isCreating ? '⏳ Creando MARQ...' : '🛠️ DEBUG: Crear Equipo MARQ'}
              </button>
            )}
          </div>

          <div className="user-info-section">
            <h3>👤 Tu información</h3>
            <div className="user-details">
              <div className="user-detail">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{user?.email}</span>
              </div>
              <div className="user-detail">
                <span className="detail-label">Nombre:</span>
                <span className="detail-value">{user?.name || 'No disponible'}</span>
              </div>
              <div className="user-detail">
                <span className="detail-label">Rol:</span>
                <span className="detail-value admin-role">Administrador del equipo</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="welcome-note">
            <div className="note-content">
              <span className="note-icon">💡</span>
              <div>
                <strong>Importante:</strong> Una vez creado el equipo, el nombre no se puede cambiar. 
                Asegúrate de usar un nombre apropiado para tu organización.
              </div>
            </div>
          </div>

          {/* Logout button */}
          <div className="logout-section">
            <button 
              className="btn-logout"
              onClick={handleLogout}
              title="Cerrar sesión y volver a intentar"
            >
              🚪 Cerrar Sesión
            </button>
            <p className="logout-help">
              Si tienes problemas, puedes cerrar sesión y volver a intentar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSetup; 