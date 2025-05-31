import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './VersionHistory.css';

const VersionHistory = ({ onVersionSelect }) => {
  const [backups, setBackups] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const backupsRef = collection(db, 'backups_metadata');
      const q = query(backupsRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const backupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      setBackups(backupsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading backups:', error);
      setLoading(false);
    }
  };

  const handleVersionSelect = async (backup) => {
    setSelectedVersion(backup.id);
    if (onVersionSelect) {
      onVersionSelect(backup);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getChangeSummary = (backup) => {
    if (!backup.tables) return '';
    
    const changes = backup.tables.reduce((acc, table) => {
      if (table.changes) {
        acc.added += table.changes.added || 0;
        acc.modified += table.changes.modified || 0;
        acc.deleted += table.changes.deleted || 0;
      }
      return acc;
    }, { added: 0, modified: 0, deleted: 0 });

    return `+${changes.added} -${changes.deleted} ~${changes.modified}`;
  };

  if (loading) {
    return <div className="version-history-loading">Cargando historial...</div>;
  }

  return (
    <div className="version-history">
      <h2>Historial de Versiones</h2>
      <div className="version-list">
        {backups.map((backup) => (
          <div
            key={backup.id}
            className={`version-item ${selectedVersion === backup.id ? 'selected' : ''}`}
            onClick={() => handleVersionSelect(backup)}
          >
            <div className="version-date">{formatDate(backup.timestamp)}</div>
            <div className="version-changes">{getChangeSummary(backup)}</div>
            <div className="version-status">{backup.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VersionHistory; 