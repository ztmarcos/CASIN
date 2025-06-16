// Utility functions for data update notifications
export const notifyDataUpdate = (tableName = 'all', action = 'update') => {
  console.log('📢 Notifying data update:', { tableName, action });
  
  // Dispatch custom event
  const event = new CustomEvent('dataTableUpdate', {
    detail: { tableName, action, type: action, timestamp: Date.now() }
  });
  window.dispatchEvent(event);
  
  // Also set localStorage for cross-tab communication
  localStorage.setItem('dataTableUpdate', JSON.stringify({
    tableName,
    action,
    timestamp: Date.now()
  }));
  
  // Clear after a short delay to avoid duplicate triggers
  setTimeout(() => {
    localStorage.removeItem('dataTableUpdate');
  }, 2000);
};

export const notifyDataInsert = (tableName) => {
  notifyDataUpdate(tableName, 'insert');
};

export const notifyDataEdit = (tableName) => {
  notifyDataUpdate(tableName, 'edit');
};

export const notifyDataDelete = (tableName) => {
  notifyDataUpdate(tableName, 'delete');
}; 