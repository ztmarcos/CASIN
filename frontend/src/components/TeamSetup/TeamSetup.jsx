import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import './TeamSetup.css';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TeamSetup = () => {
  const { createTeam, isLoadingTeam } = useTeam();
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState('welcome'); // welcome, create
  const [error, setError] = useState(null);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast.error('Por favor ingresa un nombre para el equipo');
      return;
    }

    setIsCreating(true);
    
    try {
      await createTeam(teamName.trim());
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

  if (step === 'create') {
    return (
      <div className="team-setup">
        <div className="setup-container">
          <div className="setup-card">
            <div className="setup-header">
              <h1>Crear tu Equipo</h1>
              <p>Crea un equipo para tu organización y comienza a gestionar tus seguros.</p>
            </div>

            <form onSubmit={handleCreateTeam} className="setup-form">
              <div className="form-group">
                <label htmlFor="teamName">Nombre del Equipo</label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej: CASIN Seguros, Mi Empresa..."
                  className="form-input"
                  maxLength={50}
                  required
                />
                <small className="form-hint">
                  Este será el nombre que verán todos los miembros del equipo.
                </small>
              </div>

              <div className="setup-info">
                <div className="info-item">
                  <span className="info-icon">👤</span>
                  <div>
                    <strong>Serás el administrador</strong>
                    <p>Tendrás control total sobre el equipo y podrás invitar usuarios.</p>
                  </div>
                </div>
                
                <div className="info-item">
                  <span className="info-icon">🔒</span>
                  <div>
                    <strong>Base de datos privada</strong>
                    <p>Tu equipo tendrá su propia base de datos completamente aislada.</p>
                  </div>
                </div>
                
                <div className="info-item">
                  <span className="info-icon">👥</span>
                  <div>
                    <strong>Invita a tu equipo</strong>
                    <p>Después podrás invitar a otros usuarios con sus emails de Google.</p>
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
                  Atrás
                </button>
                
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isCreating || !teamName.trim()}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner">⏳</span>
                      Creando y entrando...
                    </>
                  ) : (
                    'Crear Equipo'
                  )}
                </button>
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
            <p className="auth-success">✅ Autenticación completada</p>
          </div>

          <div className="welcome-content">
            <div className="welcome-icon">🏢</div>
            
            <h2>Configura tu Equipo</h2>
            <p>Para comenzar, necesitas crear un equipo para tu organización.</p>
            
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">✅</span>
                <span>Base de datos privada y segura</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✅</span>
                <span>Gestión de usuarios y permisos</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✅</span>
                <span>Colaboración en tiempo real</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✅</span>
                <span>Datos completamente aislados</span>
              </div>
            </div>
          </div>

          <div className="welcome-actions">
            <button 
              className="btn-primary"
              onClick={handleGetStarted}
            >
              Crear mi Equipo
            </button>
            
            {/* Debug button for bumtekateam@gmail.com */}
            {user?.email === 'bumtekateam@gmail.com' && (
              <button 
                className="btn-secondary"
                onClick={createMARQTeamForTesting}
                disabled={isCreating}
                style={{ marginTop: '10px', backgroundColor: '#ff6b6b', color: 'white' }}
              >
                {isCreating ? '⏳ Creando MARQ...' : '🛠️ DEBUG: Crear Equipo MARQ'}
              </button>
            )}
          </div>

          <div className="user-info-section">
            <h3>👤 Tu información</h3>
            <div className="user-details">
              <div className="user-detail">
                <strong>Email:</strong> {user?.email}
              </div>
              <div className="user-detail">
                <strong>Nombre:</strong> {user?.name || 'No disponible'}
              </div>
              <div className="user-detail">
                <strong>Rol:</strong> Administrador del equipo
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ color: 'red', margin: '10px 0', padding: '10px', backgroundColor: '#ffebee', borderRadius: '5px' }}>
              {error}
            </div>
          )}

          <div className="welcome-note">
            <p>
              <strong>Nota:</strong> Una vez creado el equipo, este no se puede cambiar. 
              Asegúrate de usar un nombre apropiado para tu organización.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSetup; 