import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import './TeamSetup.css';

const TeamSetup = () => {
  const { createTeam, isLoadingTeam } = useTeam();
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState('welcome'); // welcome, create, success

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast.error('Por favor ingresa un nombre para el equipo');
      return;
    }

    setIsCreating(true);
    
    try {
      await createTeam(teamName.trim());
      setStep('success');
      toast.success('¡Equipo creado exitosamente!');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Error al crear el equipo: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGetStarted = () => {
    setStep('create');
  };

  if (step === 'success') {
    return (
      <div className="team-setup">
        <div className="setup-container">
          <div className="setup-card success-card">
            <div className="success-icon">🎉</div>
            <h1>¡Equipo Creado!</h1>
            <p>Tu equipo "{teamName}" ha sido creado exitosamente.</p>
            <p>Ahora puedes invitar a otros usuarios para que se unan a tu equipo.</p>
            
            <div className="success-actions">
              <button 
                className="btn-primary"
                onClick={() => window.location.reload()}
              >
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                      Creando...
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
            <p>Hola <strong>{user?.name || user?.email}</strong></p>
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
          </div>

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