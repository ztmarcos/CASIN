const mysqlDatabase = require('./mysqlDatabase');

const fileRelationService = {
  // Get all files for a specific record
  async getFilesForRecord(tableName, recordId) {
    try {
      const query = `
        SELECT f.* 
        FROM file_metadata f
        WHERE f.table_name = ? 
        AND f.record_id = ?
      `;
      return await mysqlDatabase.query(query, [tableName, recordId]);
    } catch (error) {
      console.error('Error getting files for record:', error);
      throw error;
    }
  },

  // Update file metadata with record relationship
  async linkFileToRecord(fileId, tableName, recordId) {
    try {
      await mysqlDatabase.updateData('file_metadata', 
        { record_id: recordId },
        { id: fileId }
      );
      return { success: true };
    } catch (error) {
      console.error('Error linking file to record:', error);
      throw error;
    }
  },

  // Special handler for GMM PDF files
  async updateGmmPdf(gmmId, fileUrl) {
    try {
      await mysqlDatabase.updateData('gmm',
        { pdf: fileUrl },
        { id: gmmId }
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating GMM PDF:', error);
      throw error;
    }
  },

  // Get all files for a specific table
  async getFilesForTable(tableName) {
    try {
      const query = `
        SELECT f.*, r.record_data
        FROM file_metadata f
        LEFT JOIN (
          SELECT id as record_id, 
            CASE 
              WHEN '${tableName}' = 'gmm' THEN CONCAT(contratante, ' - ', n__mero_de_p__liza)
              WHEN '${tableName}' = 'prospeccion_cards' THEN title
              WHEN '${tableName}' = 'sharepoint_tasks' THEN title
              ELSE 'Unknown'
            END as record_data
          FROM ${tableName}
        ) r ON f.record_id = r.record_id
        WHERE f.table_name = ?
      `;
      return await mysqlDatabase.query(query, [tableName]);
    } catch (error) {
      console.error('Error getting files for table:', error);
      throw error;
    }
  }
};

module.exports = fileRelationService; 