import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-hot-toast';

const CASINSetupSimple = () => {
  const { user } = useAuth();
  const { loadUserTeam } = useTeam();
  const [loading, setLoading] = useState(false);
  const [teamCreated, setTeamCreated] = useState(false);

  const createCASINTeam = async () => {
    if (!user?.email) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      setLoading(true);
      console.log(`🏢 Creando equipo CASIN para ${user.email}...`);
      
      // 1. Crear el equipo CASIN
      const teamData = {
        name: 'CASIN Seguros',
        owner: user.email,
        createdAt: new Date(),
        firebaseProject: 'casinbbdd',
        settings: {
          allowInvites: true,
          maxMembers: 50,
          isMainTeam: true
        },
        description: 'Equipo principal CASIN Seguros'
      };

      const teamDocRef = await addDoc(collection(db, 'teams'), teamData);
      console.log('✅ Equipo CASIN creado con ID:', teamDocRef.id);

      // 2. Agregar al usuario como admin del equipo
      await addDoc(collection(db, 'team_members'), {
        userId: user.email.replace('@', '_').replace('.', '_'), // UID simple
        email: user.email,
        name: user.name || user.email,
        teamId: teamDocRef.id,
        role: 'admin',
        invitedBy: user.email,
        joinedAt: new Date(),
        isOwner: true
      });

      console.log('✅ Usuario agregado como admin del equipo CASIN');
      
      setTeamCreated(true);
      toast.success('🎉 Equipo CASIN creado exitosamente!');
      
      // Recargar datos del usuario para que aparezca el equipo
      setTimeout(async () => {
        await loadUserTeam();
        // Recargar la página para que se actualice todo
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error creando equipo CASIN:', error);
      toast.error('Error creando equipo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (teamCreated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8faff 0%, #e8f4f8 50%, #f0f8ff 100%)',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '2rem'
          }}>
            🎉 ¡Equipo CASIN Creado!
          </h1>
          
          <p style={{ fontSize: '1.2rem', color: '#4a5568', marginBottom: '2rem' }}>
            Tu equipo ha sido configurado exitosamente. Redirigiendo...
          </p>
          
          <div style={{
            background: '#e6fffa',
            border: '2px solid #38b2ac',
            borderRadius: '12px',
            padding: '1.5rem',
            color: '#38b2ac',
            fontWeight: '600',
            fontSize: '1.1rem'
          }}>
            Redirigiendo automáticamente...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8faff 0%, #e8f4f8 50%, #f0f8ff 100%)',
      padding: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '2rem'
        }}>
          🏢 Crear Equipo CASIN
        </h1>
        
        <p style={{ fontSize: '1.2rem', color: '#4a5568', marginBottom: '2rem' }}>
          Hola <strong>{user?.name || user?.email}</strong> 👋
        </p>
        
        <div style={{
          background: '#edf2f7',
          borderRadius: '12px',
          padding: '1.5rem',
          margin: '2rem 0',
          textAlign: 'left'
        }}>
          <h3 style={{ color: '#2d3748', marginBottom: '1rem', textAlign: 'center' }}>👤 Tu Información</h3>
          <div style={{ color: '#4a5568' }}>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Nombre:</strong> {user?.name || 'No disponible'}</div>
            <div><strong>Rol:</strong> Administrador del equipo CASIN</div>
          </div>
        </div>
        
        <div style={{
          background: '#f0fff4',
          border: '2px solid #68d391',
          borderRadius: '12px',
          padding: '1.5rem',
          margin: '1.5rem 0'
        }}>
          <h3 style={{ color: '#2d3748', marginBottom: '1rem' }}>✅ Lo que se creará:</h3>
          <ul style={{ color: '#4a5568', lineHeight: '1.6', textAlign: 'left' }}>
            <li>Equipo CASIN Seguros</li>
            <li>Acceso como administrador</li>
            <li>Base de datos privada</li>
            <li>Gestión de usuarios</li>
          </ul>
        </div>

        <button 
          style={{
            background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '1.1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            margin: '2rem auto 0',
            minWidth: '280px'
          }}
          onClick={createCASINTeam}
          disabled={loading}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Creando equipo...
            </>
          ) : (
            '🏗️ Crear Equipo CASIN'
          )}
        </button>
      </div>
    </div>
  );
};

export default CASINSetupSimple; 