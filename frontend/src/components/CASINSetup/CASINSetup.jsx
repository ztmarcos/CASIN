import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import TeamTemplateService from '../../services/teamTemplateService';
import { toast } from 'react-hot-toast';
import './CASINSetup.css';

const CASINSetup = () => {
  const { user } = useAuth();
  const { loadUserTeam } = useTeam();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('check'); // check, templates, create, complete
  const [casinStructure, setCasinStructure] = useState(null);
  const [creationResult, setCreationResult] = useState(null);

  useEffect(() => {
    checkCASINStructure();
  }, []);

  const checkCASINStructure = async () => {
    try {
      setLoading(true);
      console.log('🔍 Verificando estructura CASIN...');
      
      const structure = await TeamTemplateService.extractCASINStructure();
      setCasinStructure(structure);
      
      if (Object.keys(structure).length > 0) {
        console.log('✅ Estructura CASIN encontrada');
        setStep('templates');
      } else {
        console.log('⚠️ No se encontró estructura CASIN');
        setStep('create');
      }
      
    } catch (error) {
      console.error('❌ Error verificando estructura:', error);
      toast.error('Error verificando estructura: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createCASINTeam = async () => {
    if (!user?.email) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      setLoading(true);
      console.log(`🏗️ Creando equipo CASIN para ${user.email}...`);
      
      const result = await TeamTemplateService.createCASINTeamForUser(
        user.email,
        user.name
      );
      
      setCreationResult(result);
      setStep('complete');
      
      toast.success('🎉 Equipo CASIN creado exitosamente!');
      
      // Recargar datos del usuario para que aparezca el equipo
      setTimeout(async () => {
        await loadUserTeam();
        // Recargar la página para que se actualice todo
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error creando equipo CASIN:', error);
      toast.error('Error creando equipo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createTeamFromTemplates = async () => {
    if (!user?.email) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      setLoading(true);
      console.log('🎨 Creando equipo CASIN con plantillas...');
      
      // Primero crear el equipo
      const teamResult = await TeamTemplateService.createCASINTeamForUser(
        user.email,
        user.name
      );
      
      // Luego crear las colecciones usando las plantillas
      const templatesResult = await TeamTemplateService.createTeamFromTemplate(
        teamResult.teamId,
        'CASIN Seguros',
        user.email,
        casinStructure
      );
      
      setCreationResult({
        ...teamResult,
        templatesCreated: templatesResult
      });
      
      setStep('complete');
      toast.success('🎉 Equipo CASIN creado con plantillas!');
      
      // Recargar todo
      setTimeout(async () => {
        await loadUserTeam();
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error creando equipo con plantillas:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 'check') {
    return (
      <div className="casin-setup">
        <div className="setup-container">
          <div className="loading-card">
            <div className="spinner"></div>
            <h2>Analizando estructura de datos...</h2>
            <p>Verificando las tablas migradas de CASIN</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'templates' && casinStructure) {
    return (
      <div className="casin-setup">
        <div className="setup-container">
          <div className="templates-card">
            <div className="templates-header">
              <h1>🎯 Estructura CASIN Detectada</h1>
              <p>Se encontraron <strong>{Object.keys(casinStructure).length} plantillas</strong> de las tablas migradas</p>
            </div>

            <div className="templates-overview">
              <h2>📋 Plantillas Disponibles</h2>
              <div className="templates-grid">
                {Object.entries(casinStructure).map(([name, structure]) => (
                  <div key={name} className="template-card">
                    <div className="template-header">
                      <h3>{name}</h3>
                      <span className="field-count">{structure.fields?.length || 0} campos</span>
                    </div>
                    <div className="template-details">
                      <div className="template-category">
                        📂 {structure.category || 'general'}
                      </div>
                      <div className="template-docs">
                        📄 {structure.totalDocuments || 0} documentos
                      </div>
                    </div>
                    <div className="template-fields">
                      <strong>Campos principales:</strong>
                      <div className="fields-preview">
                        {structure.fields?.slice(0, 5).map(field => (
                          <span key={field.name} className={`field-tag ${field.category}`}>
                            {field.name}
                          </span>
                        ))}
                        {structure.fields?.length > 5 && (
                          <span className="more-fields">+{structure.fields.length - 5} más</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="user-info">
              <h2>👤 Tu Información</h2>
              <div className="user-details">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Nombre:</strong> {user.name || 'No disponible'}</div>
                <div><strong>Rol:</strong> Administrador del equipo CASIN</div>
              </div>
            </div>

            <div className="action-section">
              <h2>🚀 Crear Equipo CASIN</h2>
              <p>Tu equipo tendrá acceso a todas las tablas con la misma estructura que las tablas migradas.</p>
              
              <div className="benefits">
                <h3>✅ Beneficios:</h3>
                <ul>
                  <li>Estructura idéntica a las tablas originales</li>
                  <li>Campos automáticamente configurados</li>
                  <li>Plantillas listas para usar</li>
                  <li>Acceso completo a los datos migrados</li>
                </ul>
              </div>

              <button 
                className="create-btn"
                onClick={createTeamFromTemplates}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Creando equipo...
                  </>
                ) : (
                  '🏗️ Crear Equipo CASIN con Plantillas'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="casin-setup">
        <div className="setup-container">
          <div className="create-card">
            <div className="create-header">
              <h1>🏢 Crear Equipo CASIN</h1>
              <p>No se encontraron plantillas, pero puedes crear el equipo básico</p>
            </div>

            <div className="user-info">
              <h2>👤 Tu Información</h2>
              <div className="user-details">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Nombre:</strong> {user.name || 'No disponible'}</div>
                <div><strong>Rol:</strong> Administrador del equipo CASIN</div>
              </div>
            </div>

            <div className="warning-box">
              <h3>⚠️ Nota Importante</h3>
              <p>
                No se detectaron las tablas migradas (team_CASIN_*). 
                Se creará un equipo básico que podrás configurar después.
              </p>
            </div>

            <button 
              className="create-btn"
              onClick={createCASINTeam}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Creando equipo...
                </>
              ) : (
                '🏗️ Crear Equipo CASIN Básico'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'complete' && creationResult) {
    return (
      <div className="casin-setup">
        <div className="setup-container">
          <div className="complete-card">
            <div className="complete-header">
              <h1>🎉 ¡Equipo CASIN Creado!</h1>
              <p>Tu equipo ha sido configurado exitosamente</p>
            </div>

            <div className="result-details">
              <h2>📊 Detalles del Equipo</h2>
              <div className="result-info">
                <div><strong>ID del Equipo:</strong> {creationResult.teamId}</div>
                <div><strong>Nombre:</strong> {creationResult.teamName}</div>
                <div><strong>Tu Rol:</strong> {creationResult.userRole}</div>
                {creationResult.templatesCreated && (
                  <div><strong>Plantillas Creadas:</strong> {creationResult.templatesCreated.length}</div>
                )}
              </div>

              {creationResult.templatesCreated && (
                <div className="templates-created">
                  <h3>🗂️ Colecciones Creadas</h3>
                  <div className="collections-list">
                    {creationResult.templatesCreated.map((template, index) => (
                      <div key={index} className="collection-item">
                        <span className="collection-name">{template.collection}</span>
                        <span className="collection-fields">{template.fields} campos</span>
                        {template.error && (
                          <span className="collection-error">❌ {template.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="next-steps">
              <h2>🎯 Próximos Pasos</h2>
              <ol>
                <li>La página se recargará automáticamente en unos segundos</li>
                <li>Verás el equipo CASIN en el header</li>
                <li>Podrás acceder a todas las funcionalidades</li>
                <li>Invita a otros usuarios si es necesario</li>
              </ol>
            </div>

            <div className="auto-redirect">
              <div className="countdown">
                Redirigiendo automáticamente...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CASINSetup; 