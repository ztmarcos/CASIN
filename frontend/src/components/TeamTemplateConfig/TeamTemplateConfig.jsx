import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import SchemaTemplateManager from '../../services/schemaTemplateManager';
import './TeamTemplateConfig.css';

const TeamTemplateConfig = () => {
  const { userTeam, isAdmin } = useTeam();
  const { user } = useAuth();
  const [templateManager] = useState(new SchemaTemplateManager());
  const [templates, setTemplates] = useState({});
  const [teamConfig, setTeamConfig] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('polizas');

  useEffect(() => {
    if (userTeam?.id) {
      loadTemplateConfiguration();
    }
  }, [userTeam]);

  const loadTemplateConfiguration = async () => {
    try {
      setIsLoading(true);
      
      // Cargar plantillas disponibles
      const allTemplates = templateManager.templates;
      setTemplates(allTemplates);
      
      // Cargar configuración actual del equipo
      const config = await templateManager.getTeamTemplateConfig(userTeam.id);
      setTeamConfig(config);
      
      // Preparar estado de selecciones
      const selections = {
        required: config.enabledCollections.required || [],
        recommended: config.enabledCollections.recommended || [],
        optional_simple: config.enabledCollections.optional_simple || [],
        optional_combined: config.enabledCollections.optional_combined || [],
        custom: config.enabledCollections.custom || []
      };
      
      setSelectedCollections(selections);
      
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error('Error cargando configuración de plantillas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionToggle = (collectionName, type) => {
    if (type === 'required') {
      // Los campos obligatorios no se pueden desactivar
      toast.info('Los campos obligatorios no se pueden desactivar');
      return;
    }
    
    setSelectedCollections(prev => {
      const newSelections = { ...prev };
      const currentList = [...newSelections[type]];
      
      if (currentList.includes(collectionName)) {
        // Desactivar
        newSelections[type] = currentList.filter(name => name !== collectionName);
        toast.success(`${templates[collectionName]?.name || collectionName} desactivado`);
      } else {
        // Activar
        newSelections[type] = [...currentList, collectionName];
        toast.success(`${templates[collectionName]?.name || collectionName} activado`);
      }
      
      return newSelections;
    });
  };

  const saveConfiguration = async () => {
    if (!isAdmin()) {
      toast.error('Solo los administradores pueden guardar configuraciones');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Preparar configuración actualizada
      const updatedConfig = {
        ...teamConfig,
        enabledCollections: selectedCollections,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.email
      };
      
      // Guardar configuración
      await templateManager.saveTeamTemplateConfig(userTeam.id, updatedConfig, user.email);
      setTeamConfig(updatedConfig);
      
      toast.success('Configuración guardada exitosamente');
      
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error guardando configuración: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const createCollectionsFromTemplate = async () => {
    if (!isAdmin()) {
      toast.error('Solo los administradores pueden crear colecciones');
      return;
    }
    
    try {
      setIsSaving(true);
      toast.loading('Creando colecciones desde plantillas...', { id: 'create-collections' });
      
      // Obtener todas las colecciones seleccionadas
      const allSelected = [
        ...selectedCollections.required,
        ...selectedCollections.recommended,
        ...selectedCollections.optional_simple,
        ...selectedCollections.optional_combined,
        ...selectedCollections.custom
      ];
      
      if (allSelected.length === 0) {
        toast.error('No hay colecciones seleccionadas para crear', { id: 'create-collections' });
        return;
      }
      
      // Crear colecciones
      const results = await templateManager.createCollectionsFromTemplates(
        userTeam.id, 
        allSelected, 
        user.email
      );
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        toast.success(`✅ ${successCount} colecciones creadas exitosamente`, { id: 'create-collections' });
      } else {
        toast.error(`⚠️ ${successCount}/${totalCount} colecciones creadas. Revisa la consola para detalles.`, { id: 'create-collections' });
      }
      
      // Guardar configuración después de crear colecciones
      await saveConfiguration();
      
    } catch (error) {
      console.error('Error creando colecciones:', error);
      toast.error('Error creando colecciones: ' + error.message, { id: 'create-collections' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderCollectionGroup = (groupType, title, description, canToggle = true) => {
    const groupTemplates = Object.entries(templates).filter(([key, template]) => 
      template.type === groupType
    );
    
    if (groupTemplates.length === 0) return null;
    
    return (
      <div className="collection-group">
        <div className="group-header">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        
        <div className="collection-grid">
          {groupTemplates.map(([key, template]) => {
            const isSelected = selectedCollections[groupType]?.includes(key);
            const isRequired = groupType === 'required';
            
            return (
              <div 
                key={key} 
                className={`collection-card ${isSelected ? 'selected' : ''} ${isRequired ? 'required' : ''}`}
              >
                <div className="card-header">
                  <div className="card-title">
                    <h4>{template.name}</h4>
                    <span className={`card-badge ${template.category}`}>
                      {template.category}
                    </span>
                  </div>
                  
                  {canToggle && (
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCollectionToggle(key, groupType)}
                        disabled={isRequired || isSaving}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  )}
                </div>
                
                <p className="card-description">{template.description}</p>
                
                <div className="field-preview">
                  <h5>Campos principales:</h5>
                  <div className="fields-list">
                    {Object.entries(template.fields)
                      .filter(([fieldKey, field]) => field.required)
                      .slice(0, 4)
                      .map(([fieldKey, field]) => (
                        <span key={fieldKey} className="field-tag">
                          {fieldKey}
                        </span>
                      ))}
                    {Object.keys(template.fields).length > 4 && (
                      <span className="field-tag more">
                        +{Object.keys(template.fields).length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPolizasTab = () => (
    <div className="polizas-config">
      <div className="tab-header">
        <h2>🏆 Sistema de Pólizas</h2>
        <p>Configura qué tipos de pólizas manejará tu equipo</p>
      </div>
      
      {renderCollectionGroup(
        'required',
        '📋 Pólizas Principales (Obligatorias)',
        'Estas colecciones son fundamentales y se crean automáticamente para todos los equipos.',
        false
      )}
      
      {renderCollectionGroup(
        'recommended',
        '⭐ Gestión Recomendada',
        'Herramientas de gestión recomendadas para un mejor control de pólizas.'
      )}
      
      {renderCollectionGroup(
        'optional_simple',
        '🎯 Tipos de Seguros',
        'Selecciona qué tipos de seguros maneja tu equipo. Puedes activar solo los que necesites.'
      )}
      
      {renderCollectionGroup(
        'optional_combined',
        '🔧 Sistemas Avanzados',
        'Sistemas combinados para equipos con procesos más complejos.'
      )}
    </div>
  );

  const renderOtherTab = () => (
    <div className="other-config">
      <div className="tab-header">
        <h2>⚙️ Otras Configuraciones</h2>
        <p>Contactos, tareas y configuraciones del sistema</p>
      </div>
      
      <div className="info-section">
        <div className="info-card">
          <h3>🏢 Sistema Base</h3>
          <p>Las siguientes colecciones son parte del sistema base y se crean automáticamente:</p>
          <ul>
            <li><strong>Contactos:</strong> Base de datos de clientes y contactos</li>
            <li><strong>Tareas:</strong> Sistema de gestión de tareas</li>
            <li><strong>Reportes:</strong> Generación de reportes y análisis</li>
            <li><strong>Configuración:</strong> Configuraciones del equipo</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const getSelectedCount = () => {
    return Object.values(selectedCollections).reduce((total, arr) => total + arr.length, 0);
  };

  if (!userTeam) {
    return (
      <div className="template-config-error">
        <h2>⚠️ Equipo Requerido</h2>
        <p>Necesitas estar en un equipo para configurar plantillas.</p>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="template-config-error">
        <h2>🔒 Acceso Restringido</h2>
        <p>Solo los administradores del equipo pueden configurar plantillas.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="template-config-loading">
        <div className="loading-spinner">⏳</div>
        <p>Cargando configuración de plantillas...</p>
      </div>
    );
  }

  return (
    <div className="team-template-config">
      <div className="config-header">
        <div className="header-info">
          <h1>🎨 Configuración de Plantillas</h1>
          <p>Equipo: <strong>{userTeam.name}</strong></p>
          <div className="config-stats">
            <span className="stat">
              📊 {getSelectedCount()} colecciones seleccionadas
            </span>
            <span className="stat">
              📅 Última actualización: {teamConfig?.lastUpdated ? 
                new Date(teamConfig.lastUpdated).toLocaleDateString() : 
                'Nunca'
              }
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="save-btn"
            onClick={saveConfiguration}
            disabled={isSaving}
          >
            {isSaving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
          </button>
          
          <button 
            className="create-btn primary"
            onClick={createCollectionsFromTemplate}
            disabled={isSaving}
          >
            {isSaving ? '⏳ Creando...' : '🚀 Crear Colecciones'}
          </button>
        </div>
      </div>

      <div className="config-tabs">
        <button 
          className={`tab ${activeTab === 'polizas' ? 'active' : ''}`}
          onClick={() => setActiveTab('polizas')}
        >
          🏆 Sistema de Pólizas
        </button>
        <button 
          className={`tab ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => setActiveTab('other')}
        >
          ⚙️ Otras Configuraciones
        </button>
      </div>

      <div className="config-content">
        {activeTab === 'polizas' && renderPolizasTab()}
        {activeTab === 'other' && renderOtherTab()}
      </div>
    </div>
  );
};

export default TeamTemplateConfig; 