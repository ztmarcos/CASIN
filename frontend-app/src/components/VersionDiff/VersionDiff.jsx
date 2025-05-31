import React, { useState, useEffect } from 'react';
import { compareVersions } from '../../services/versionService';
import './VersionDiff.css';

const VersionDiff = ({ version1Id, version2Id, tableName }) => {
  const [changes, setChanges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (version1Id && version2Id && tableName) {
      loadChanges();
    }
  }, [version1Id, version2Id, tableName]);

  const loadChanges = async () => {
    try {
      setLoading(true);
      const changesData = await compareVersions(version1Id, version2Id, tableName);
      setChanges(changesData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (value) => {
    if (value === null) return <span className="null-value">null</span>;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderChanges = (type) => {
    if (!changes || !changes[type].length) return null;

    return (
      <div className={`diff-section ${type}`}>
        <h3>{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
        <div className="diff-list">
          {changes[type].map((item, index) => (
            <div key={index} className="diff-item">
              {type === 'modified' ? (
                <>
                  <div className="diff-before">
                    <h4>Antes:</h4>
                    {Object.entries(item.before).map(([key, value]) => (
                      <div key={key} className="diff-field">
                        <span className="field-name">{key}:</span>
                        <span className="field-value">{renderValue(value)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="diff-after">
                    <h4>Después:</h4>
                    {Object.entries(item.after).map(([key, value]) => (
                      <div key={key} className="diff-field">
                        <span className="field-name">{key}:</span>
                        <span className="field-value">{renderValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="diff-content">
                  {Object.entries(item).map(([key, value]) => (
                    <div key={key} className="diff-field">
                      <span className="field-name">{key}:</span>
                      <span className="field-value">{renderValue(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="diff-loading">Cargando cambios...</div>;
  }

  if (error) {
    return <div className="diff-error">Error: {error}</div>;
  }

  if (!changes) {
    return <div className="diff-empty">Selecciona dos versiones para comparar</div>;
  }

  return (
    <div className="version-diff">
      <h2>Cambios en {tableName}</h2>
      {renderChanges('added')}
      {renderChanges('modified')}
      {renderChanges('deleted')}
      {!changes.added.length && !changes.modified.length && !changes.deleted.length && (
        <div className="no-changes">No hay cambios entre estas versiones</div>
      )}
    </div>
  );
};

export default VersionDiff; 