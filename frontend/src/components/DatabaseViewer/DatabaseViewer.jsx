import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-hot-toast';
import './DatabaseViewer.css';

const DatabaseViewer = () => {
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState('view');
  const [migrating, setMigrating] = useState(false);

  // Función para obtener todas las colecciones dinámicamente
  const getAllCollections = async () => {
    try {
      // En Firestore Web SDK no hay listCollections(), pero podemos intentar acceder a las conocidas
      // y también buscar dinámicamente algunas más comunes
      const knownCollections = [
        'autos', 'vida', 'gmm', 'directorio_contactos', 'directorio_policy_links',
        'diversos', 'emant', 'emant_caratula', 'emant_listado', 'hogar',
        'listadogmm', 'mascotas', 'negocio', 'perros', 'policy_status',
        'prospeccion_cards', 'rc', 'sharepoint_tasks', 'table_order',
        'table_relationships', 'transporte', 'users', 'teams', 'team_members',
        // Agregar más colecciones potenciales
        'salud', 'dental', 'accidentes', 'incendio', 'robo', 'responsabilidad_civil',
        'fianzas', 'credito', 'agricola', 'maritimo', 'aviacion', 'cyber',
        'diversos_otros', 'comercial', 'industrial', 'profesional'
      ];
      
      return knownCollections;
    } catch (error) {
      console.error('Error obteniendo colecciones:', error);
      return [];
    }
  };

  // Cargar datos de todas las colecciones
  const loadCollections = async () => {
    setLoading(true);
    const collectionsData = {};
    
    try {
      const collectionsList = await getAllCollections();
      
      for (const collectionName of collectionsList) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          const docs = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            docs.push({ 
              id: doc.id, 
              ...data,
              // Mostrar campos principales
              preview: getDocumentPreview(data, collectionName)
            });
          });

          collectionsData[collectionName] = {
            count: docs.length,
            documents: docs.slice(0, 3), // Solo primeros 3 para preview
            fields: docs.length > 0 ? Object.keys(docs[0]).filter(key => key !== 'id' && key !== 'preview') : [],
            category: getCollectionCategory(collectionName)
          };

        } catch (error) {
          console.warn(`No se pudo cargar ${collectionName}:`, error.message);
          collectionsData[collectionName] = {
            count: 0,
            documents: [],
            fields: [],
            error: error.message,
            category: 'error'
          };
        }
      }

      setCollections(collectionsData);
      
    } catch (error) {
      console.error('Error cargando colecciones:', error);
      toast.error('Error cargando base de datos');
    } finally {
      setLoading(false);
    }
  };

  // Obtener preview de documento
  const getDocumentPreview = (data, collectionName) => {
    switch (collectionName) {
      case 'autos':
      case 'vida':
      case 'gmm':
      case 'hogar':
        return `${data.numeroPoliza || data.numero || 'N/A'} - ${data.asegurado || data.cliente || 'Sin nombre'}`;
      case 'directorio_contactos':
        return `${data.nombre || 'Sin nombre'} - ${data.email || data.telefono || 'Sin contacto'}`;
      case 'teams':
        return `${data.name || 'Sin nombre'} - ${data.owner || 'Sin owner'}`;
      case 'team_members':
        return `${data.email || 'Sin email'} - ${data.role || 'Sin role'}`;
      default:
        const firstValue = Object.values(data)[0];
        return typeof firstValue === 'string' ? firstValue.slice(0, 50) : 'Datos disponibles';
    }
  };

  // Categorizar colecciones
  const getCollectionCategory = (name) => {
    if (name.startsWith('team_')) return 'equipos';
    if (['teams', 'team_members'].includes(name)) return 'sistema';
    if (['autos', 'vida', 'gmm', 'hogar', 'mascotas', 'negocio', 'rc', 'transporte', 'salud', 'dental', 'accidentes', 'incendio', 'robo', 'responsabilidad_civil', 'fianzas', 'credito', 'agricola', 'maritimo', 'aviacion', 'cyber', 'comercial', 'industrial', 'profesional'].includes(name)) return 'polizas';
    if (['directorio_contactos'].includes(name)) return 'contactos';
    if (['sharepoint_tasks'].includes(name)) return 'tareas';
    if (name.includes('emant')) return 'emant';
    if (['policy_status', 'prospeccion_cards'].includes(name)) return 'workflow';
    if (['table_order', 'table_relationships', 'listadogmm'].includes(name)) return 'configuracion';
    return 'otros';
  };

  // Detectar qué colecciones necesitan migración
  const getCollectionsToMigrate = () => {
    return Object.entries(collections).filter(([name, data]) => {
      // Excluir colecciones del sistema de equipos
      if (name === 'teams' || name === 'team_members') return false;
      // Excluir colecciones que ya están en formato team_
      if (name.startsWith('team_')) return false;
      // Excluir colecciones con error
      if (data.error) return false;
      // Incluir el resto
      return data.count > 0;
    });
  };

  // Obtener icono para cada tipo de colección
  const getCollectionIcon = (name) => {
    if (name.includes('contactos') || name.includes('directorio')) return '👥';
    if (['autos'].includes(name)) return '🚗';
    if (['vida'].includes(name)) return '❤️';
    if (['gmm', 'salud'].includes(name)) return '🏥';
    if (['hogar'].includes(name)) return '🏠';
    if (['mascotas', 'perros'].includes(name)) return '🐕';
    if (['negocio', 'comercial', 'industrial'].includes(name)) return '🏢';
    if (['rc', 'responsabilidad_civil'].includes(name)) return '⚖️';
    if (['transporte'].includes(name)) return '🚛';
    if (['emant'].includes(name)) return '📋';
    if (['sharepoint'].includes(name)) return '📋';
    if (['policy_status'].includes(name)) return '📊';
    if (['users'].includes(name)) return '👤';
    if (name.includes('table_')) return '⚙️';
    return '📄';
  };

  // Obtener etiqueta del tipo de datos
  const getCollectionTypeLabel = (name) => {
    if (name.includes('contactos') || name.includes('directorio')) return 'contactos';
    if (['autos', 'vida', 'gmm', 'hogar', 'mascotas', 'negocio', 'rc', 'transporte'].includes(name)) return 'pólizas';
    if (name.includes('emant')) return 'registros';
    if (['sharepoint_tasks'].includes(name)) return 'tareas';
    if (['policy_status'].includes(name)) return 'estados';
    if (['users'].includes(name)) return 'usuarios';
    if (name.includes('table_')) return 'config';
    return 'docs';
  };

  // Función para ejecutar la migración
  const executeMigration = async () => {
    if (!window.confirm('⚠️ IMPORTANTE: Esta operación va a migrar TODAS las colecciones al formato team_CASIN_*. Los datos originales se preservarán como backup. ¿Continuar?')) {
      return;
    }

    setMigrating(true);
    const collectionsToMigrate = getCollectionsToMigrate();
    let successCount = 0;
    let errorCount = 0;

    try {
      toast.loading(`Iniciando migración de ${collectionsToMigrate.length} colecciones...`);

      for (const [collectionName, collectionData] of collectionsToMigrate) {
        try {
          console.log(`🔄 Migrando ${collectionName}...`);
          
          // Obtener todos los documentos de la colección original
          const originalCollection = collection(db, collectionName);
          const snapshot = await getDocs(originalCollection);
          
          // Crear la nueva colección con prefijo team_CASIN_
          const newCollectionName = `team_CASIN_${collectionName}`;
          
          let docCount = 0;
          for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            
            // Agregar metadatos de migración
            const migratedData = {
              ...data,
              _migrated: true,
              _migratedAt: new Date().toISOString(),
              _originalCollection: collectionName,
              _migratedBy: 'auto-migration-system'
            };

            // Crear documento en la nueva colección manteniendo el mismo ID
            const newDocRef = doc(db, newCollectionName, docSnapshot.id);
            await setDoc(newDocRef, migratedData);
            
            docCount++;
          }

          console.log(`✅ ${collectionName} migrado: ${docCount} documentos`);
          successCount++;
          
        } catch (error) {
          console.error(`❌ Error migrando ${collectionName}:`, error);
          errorCount++;
        }
      }

      toast.dismiss();
      
      if (errorCount === 0) {
        toast.success(`🎉 Migración completada! ${successCount} colecciones migradas exitosamente.`);
      } else {
        toast.error(`⚠️ Migración parcial: ${successCount} exitosas, ${errorCount} con errores.`);
      }

      // Recargar datos para ver los resultados
      await loadCollections();
      
    } catch (error) {
      console.error('Error en migración:', error);
      toast.error('Error durante la migración: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  // Agrupar colecciones por categoría
  const groupedCollections = Object.entries(collections).reduce((acc, [name, data]) => {
    const category = data.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ name, ...data });
    return acc;
  }, {});

  useEffect(() => {
    loadCollections();
  }, []);

  const categoryIcons = {
    sistema: '⚙️',
    equipos: '🏢',
    polizas: '📄',
    contactos: '👥',
    tareas: '✅',
    otros: '📂',
    error: '❌'
  };

  const categoryNames = {
    sistema: 'Sistema de Equipos',
    equipos: 'Datos de Equipos',
    polizas: 'Pólizas de Seguros',
    contactos: 'Contactos y Clientes',
    tareas: 'Tareas y Workflow',
    emant: 'EMANT Sistema',
    workflow: 'Workflow y Estados',
    configuracion: 'Configuración y Metadatos',
    otros: 'Otras Colecciones',
    error: 'Colecciones con Error'
  };

  return (
    <div className="database-viewer">
      <div className="viewer-header">
        <h1>🗄️ Estado Actual de la Base de Datos</h1>
        <p>Visualiza tus datos existentes y las opciones de organización por equipos</p>
        
        <div className="action-tabs">
          <button 
            className={selectedOption === 'view' ? 'active' : ''}
            onClick={() => setSelectedOption('view')}
          >
            👀 Ver Datos Actuales
          </button>
          <button 
            className={selectedOption === 'plan' ? 'active' : ''}
            onClick={() => setSelectedOption('plan')}
          >
            📋 Plan de Migración
          </button>
          <button 
            className={selectedOption === 'demo' ? 'active' : ''}
            onClick={() => setSelectedOption('demo')}
          >
            🎯 Ver Resultado Final
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando datos de Firebase...</p>
        </div>
      )}

      {!loading && selectedOption === 'view' && (
        <div className="current-state">
          <div className="summary-stats">
            <div className="stat-box">
              <span className="stat-number">{Object.keys(collections).length}</span>
              <span className="stat-label">Colecciones Total</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">
                {Object.values(collections).reduce((sum, col) => sum + col.count, 0)}
              </span>
              <span className="stat-label">Documentos Total</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">
                {Object.values(collections).filter(col => col.category === 'polizas').length}
              </span>
              <span className="stat-label">Tipos de Pólizas</span>
            </div>
          </div>

          <div className="collections-by-category">
            {Object.entries(groupedCollections).map(([category, collections]) => (
              <div key={category} className="category-section">
                <h2>
                  {categoryIcons[category]} {categoryNames[category]}
                  <span className="collection-count">({collections.length})</span>
                </h2>
                
                <div className="collections-grid">
                  {collections.map(({ name, count, documents, fields, error }) => (
                    <div key={name} className={`collection-card ${error ? 'error' : ''}`}>
                      <div className="collection-header">
                        <h3>{name}</h3>
                        <span className="document-count">{count} docs</span>
                      </div>
                      
                      {error ? (
                        <div className="error-message">
                          <p>❌ Error: {error}</p>
                        </div>
                      ) : (
                        <>
                          <div className="fields-list">
                            <strong>Campos:</strong> {fields.slice(0, 4).join(', ')}
                            {fields.length > 4 && <span>... +{fields.length - 4}</span>}
                          </div>
                          
                          {documents.length > 0 && (
                            <div className="documents-preview">
                              <strong>Ejemplos:</strong>
                              {documents.map((doc, index) => (
                                <div key={index} className="doc-preview">
                                  {doc.preview}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && selectedOption === 'plan' && (
        <div className="migration-plan">
          <h2>📋 Plan de Migración Recomendado</h2>
          
          <div className="plan-options">
            <div className="option-card recommended">
              <h3>🎯 Opción A: Migración Completa (RECOMENDADA)</h3>
              <div className="plan-details">
                <h4>🏢 Crear Equipo CASIN como principal:</h4>
                <p className="migration-summary">
                  Se migrarán <strong>{getCollectionsToMigrate().length} colecciones</strong> al formato team_CASIN_*
                </p>
                <div className="migrations">
                  {getCollectionsToMigrate().map(([name, data]) => (
                    <div key={name} className="migration-item">
                      <span className="from">
                        {name} 
                        <small>({data.count} docs)</small>
                      </span>
                      <span className="arrow">→</span>
                      <span className="to">team_CASIN_{name}</span>
                    </div>
                  ))}
                </div>
                
                {getCollectionsToMigrate().length === 0 && (
                  <div className="no-migrations">
                    ⚠️ No se detectaron colecciones para migrar. 
                    Asegúrate de que la base de datos esté cargada.
                  </div>
                )}
                
                <div className="benefits">
                  <h4>✅ Beneficios:</h4>
                  <ul>
                    <li>Estructura uniforme para todos los equipos</li>
                    <li>Aislamiento completo de datos por equipo</li>
                    <li>Fácil escalabilidad para nuevos clientes</li>
                    <li>Datos originales preservados como backup</li>
                  </ul>
                </div>

                {getCollectionsToMigrate().length > 0 && (
                  <div className="migration-actions">
                    <button 
                      className="execute-migration-btn"
                      onClick={executeMigration}
                      disabled={migrating}
                    >
                      {migrating ? (
                        <>
                          <div className="spinner"></div>
                          Migrando...
                        </>
                      ) : (
                        <>
                          🚀 Ejecutar Migración Automática
                        </>
                      )}
                    </button>
                    <p className="migration-warning">
                      ⚠️ Esta operación creará nuevas colecciones con formato team_CASIN_*. 
                      Los datos originales no se eliminarán.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="option-card">
              <h3>🔧 Opción B: Híbrida</h3>
              <div className="plan-details">
                <p>CASIN usa colecciones originales, nuevos equipos usan formato team_*</p>
                <div className="benefits">
                  <h4>⚖️ Pros y Contras:</h4>
                  <ul>
                    <li>✅ No requiere migración inmediata</li>
                    <li>❌ Estructura inconsistente</li>
                    <li>❌ Más complejo de mantener</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && selectedOption === 'demo' && (
        <div className="final-result">
          <h2>🎯 Resultado Final con Equipo CASIN</h2>
          
          <div className="result-structure">
            <div className="structure-section">
              <h3>🏢 Estructura de Equipos</h3>
              <div className="team-structure">
                <div className="team-item">
                  <strong>CASIN Seguros</strong> (Equipo Principal)
                  <div className="team-collections">
                    {getCollectionsToMigrate().map(([name, data]) => {
                      const icon = getCollectionIcon(name);
                      return (
                        <div key={name}>
                          {icon} team_CASIN_{name} ({data.count} {getCollectionTypeLabel(name)})
                        </div>
                      );
                    })}
                    {getCollectionsToMigrate().length === 0 && (
                      <div>📄 Esperando datos...</div>
                    )}
                  </div>
                </div>
                
                <div className="team-item future">
                  <strong>Cliente ABC</strong> (Futuro)
                  <div className="team-collections">
                    <div>📧 team_ABC123_contactos</div>
                    <div>🚗 team_ABC123_autos</div>
                    <div>❤️ team_ABC123_vida</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="access-control">
              <h3>🔐 Control de Acceso</h3>
              <div className="access-example">
                <div className="user-access">
                  <strong>Usuario CASIN:</strong> Solo ve datos de CASIN
                </div>
                <div className="user-access">
                  <strong>Usuario Cliente ABC:</strong> Solo ve datos de ABC
                </div>
                <div className="user-access">
                  <strong>Admin General:</strong> Puede acceder a configuración global
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="action-buttons">
        <button onClick={loadCollections} disabled={loading}>
          🔄 Recargar Datos
        </button>
        <button onClick={() => window.open('/migration', '_blank')}>
          🚀 Ir a Migración
        </button>
      </div>
    </div>
  );
};

export default DatabaseViewer; 