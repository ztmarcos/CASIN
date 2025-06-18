import React from 'react';

const CASINSetupTest = () => {
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
          🎯 CASIN Setup Test
        </h1>
        
        <p style={{ fontSize: '1.2rem', color: '#4a5568', marginBottom: '2rem' }}>
          ¡La ruta funciona correctamente!
        </p>
        
        <div style={{
          background: '#f0fff4',
          border: '2px solid #68d391',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#2d3748', marginBottom: '1rem' }}>✅ Próximos pasos:</h3>
          <ol style={{ color: '#4a5568', textAlign: 'left', lineHeight: '1.6' }}>
            <li>Verificar que el TeamTemplateService funcione</li>
            <li>Testear la conexión a Firebase</li>
            <li>Crear tu equipo CASIN</li>
            <li>Aplicar las plantillas automáticamente</li>
          </ol>
        </div>
        
        <button 
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '1.1rem',
            cursor: 'pointer'
          }}
          onClick={() => window.location.href = '/'}
        >
          🏠 Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

export default CASINSetupTest; 