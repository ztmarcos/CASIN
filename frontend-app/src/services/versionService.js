import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

export const loadVersionData = async (backupId, tableName) => {
  try {
    // Obtener los registros de una tabla específica en un backup
    const recordsRef = collection(db, 'backups', backupId, 'tables', tableName, 'records');
    const snapshot = await getDocs(recordsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error loading version data for ${tableName}:`, error);
    throw error;
  }
};

export const loadVersionMetadata = async (backupId) => {
  try {
    const metadataRef = doc(db, 'backups_metadata', backupId);
    const metadataSnap = await getDoc(metadataRef);
    
    if (!metadataSnap.exists()) {
      throw new Error('Version metadata not found');
    }

    return {
      id: metadataSnap.id,
      ...metadataSnap.data()
    };
  } catch (error) {
    console.error('Error loading version metadata:', error);
    throw error;
  }
};

export const compareVersions = async (version1Id, version2Id, tableName) => {
  try {
    const data1 = await loadVersionData(version1Id, tableName);
    const data2 = await loadVersionData(version2Id, tableName);

    const changes = {
      added: [],
      modified: [],
      deleted: []
    };

    // Crear mapas para comparación eficiente
    const map1 = new Map(data1.map(item => [item.id, item]));
    const map2 = new Map(data2.map(item => [item.id, item]));

    // Encontrar registros añadidos y modificados
    for (const [id, item2] of map2) {
      if (!map1.has(id)) {
        changes.added.push(item2);
      } else {
        const item1 = map1.get(id);
        if (JSON.stringify(item1) !== JSON.stringify(item2)) {
          changes.modified.push({
            before: item1,
            after: item2
          });
        }
      }
    }

    // Encontrar registros eliminados
    for (const [id, item1] of map1) {
      if (!map2.has(id)) {
        changes.deleted.push(item1);
      }
    }

    return changes;
  } catch (error) {
    console.error('Error comparing versions:', error);
    throw error;
  }
}; 