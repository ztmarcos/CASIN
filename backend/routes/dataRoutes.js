const express = require('express');
const router = express.Router();
const mysqlDatabase = require('../services/mysqlDatabase');

// Get all tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await mysqlDatabase.getTables();
    res.json(tables);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new table
router.post('/tables', async (req, res) => {
  try {
    const { name, columns } = req.body;
    
    if (!name || !columns || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'Name and columns array are required' });
    }
    
    await mysqlDatabase.createTable({ 
      name: name.toLowerCase().trim(),
      columns 
    });

    res.json({ 
      success: true,
      message: `Table ${name} created successfully`
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table data
router.get('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = await mysqlDatabase.getData(tableName);
    res.json(data);
  } catch (error) {
    console.error('Error getting data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert data into table
router.post('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    
    // Get table structure first
    const [columns] = await mysqlDatabase.executeQuery(
      `SHOW COLUMNS FROM \`${tableName}\``,
      []
    );
    
    // Filter out the id field from the data if it exists
    const cleanData = { ...data };
    delete cleanData.id;
    
    const result = await mysqlDatabase.insertData(tableName, cleanData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update column order
router.put('/tables/:tableName/columns/order', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { columnOrder } = req.body;
    
    if (!columnOrder || !Array.isArray(columnOrder)) {
      return res.status(400).json({ error: 'Column order must be an array' });
    }

    const result = await mysqlDatabase.updateColumnOrder(tableName, columnOrder);
    res.json(result);
  } catch (error) {
    console.error('Error updating column order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modify table structure
router.post('/tables/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await mysqlDatabase.modifyTableStructure(tableName);
    res.json(result);
  } catch (error) {
    console.error('Error modifying table structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update cell data
router.patch('/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const { column, value } = req.body;
    
    if (!column || value === undefined) {
      return res.status(400).json({ error: 'Column and value are required' });
    }

    const result = await mysqlDatabase.updateData(tableName, id, column, value);
    res.json(result);
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new column to table
router.post('/tables/:tableName/columns/add', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { name, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Column name and type are required' });
    }
    
    const result = await mysqlDatabase.addColumn(tableName, { name, type });
    res.json(result);
  } catch (error) {
    console.error('Error adding column:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete column
router.delete('/tables/:tableName/columns/:columnName', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    
    if (!tableName || !columnName) {
      return res.status(400).json({ error: 'Table name and column name are required' });
    }
    
    const result = await mysqlDatabase.deleteColumn(tableName, columnName);
    res.json(result);
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename column
router.patch('/tables/:tableName/columns/:columnName/rename', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { newName } = req.body;
    
    if (!tableName || !columnName || !newName) {
      return res.status(400).json({ error: 'Table name, column name, and new name are required' });
    }
    
    // Get column type first
    const [columnInfo] = await mysqlDatabase.executeQuery(
      `SHOW COLUMNS FROM \`${tableName}\` WHERE Field = ?`,
      [columnName]
    );
    
    if (!columnInfo) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Clean the new name to match MySQL naming conventions
    const cleanNewName = newName.toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Rename column while preserving its type
    await mysqlDatabase.executeQuery(
      `ALTER TABLE \`${tableName}\` CHANGE \`${columnName}\` \`${cleanNewName}\` ${columnInfo.Type}`,
      []
    );
    
    res.json({ success: true, message: `Column renamed successfully` });
  } catch (error) {
    console.error('Error renaming column:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set column tag
router.put('/tables/:tableName/columns/:columnName/tag', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { tag } = req.body;
    
    if (!tableName || !columnName || !tag) {
      return res.status(400).json({ error: 'Table name, column name, and tag are required' });
    }
    
    const result = await mysqlDatabase.setColumnTag(tableName, columnName, tag);
    res.json(result);
  } catch (error) {
    console.error('Error setting column tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table
router.delete('/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    
    await mysqlDatabase.deleteTable(tableName);
    res.json({ success: true, message: `Table ${tableName} deleted successfully` });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete row
router.delete('/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    if (!tableName || !id) {
      return res.status(400).json({ error: 'Table name and row ID are required' });
    }
    
    const result = await mysqlDatabase.deleteRow(tableName, id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import CSV and create table automatically
router.post('/import-csv', async (req, res) => {
  try {
    const { tableName, data } = req.body;
    
    if (!tableName || !data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Table name and non-empty data array are required' });
    }

    // Clean table name (remove special characters and spaces)
    const cleanTableName = tableName.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Get column definitions from the first row
    const sampleRow = data[0];
    const columns = Object.keys(sampleRow).map(key => {
      // Clean column name
      const cleanKey = key.toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Infer column type from data
      let type = 'VARCHAR(255)';
      const value = sampleRow[key];
      
      if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          type = 'INT';
        } else {
          type = 'DECIMAL(12,2)';
        }
      } else if (value instanceof Date) {
        type = 'DATE';
      } else if (typeof value === 'boolean') {
        type = 'BOOLEAN';
      } else if (typeof value === 'string') {
        // Check if it's a date string
        const dateValue = new Date(value);
        if (!isNaN(dateValue) && value.includes('/') || value.includes('-')) {
          type = 'DATE';
        } else if (value.length > 255) {
          type = 'TEXT';
        }
      }

      return {
        name: cleanKey,
        type,
        nullable: true
      };
    });

    // Add id column
    columns.unshift({
      name: 'id',
      type: 'INT',
      isPrimary: true,
      autoIncrement: true,
      nullable: false
    });

    // Create table
    await mysqlDatabase.createTable({
      name: cleanTableName,
      columns
    });

    // Clean and insert data
    const cleanData = data.map(row => {
      const cleanRow = {};
      Object.entries(row).forEach(([key, value]) => {
        const cleanKey = key.toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        // Convert dates to MySQL format if needed
        if (value && columns.find(col => col.name === cleanKey)?.type === 'DATE') {
          try {
            const date = new Date(value);
            if (!isNaN(date)) {
              value = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn(`Failed to parse date: ${value}`);
          }
        }
        
        cleanRow[cleanKey] = value;
      });
      return cleanRow;
    });

    // Insert data in batches
    const batchSize = 100;
    for (let i = 0; i < cleanData.length; i += batchSize) {
      const batch = cleanData.slice(i, i + batchSize);
      await Promise.all(batch.map(row => mysqlDatabase.insertData(cleanTableName, row)));
    }

    res.json({
      success: true,
      message: `Table ${cleanTableName} created and ${cleanData.length} rows imported successfully`,
      tableName: cleanTableName,
      columns: columns.map(col => ({ name: col.name, type: col.type }))
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename table
router.put('/tables/rename', async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    
    if (!oldName || !newName) {
      return res.status(400).json({
        success: false,
        error: 'Both old and new table names are required'
      });
    }

    const result = await mysqlDatabase.renameTable(oldName, newName);
    res.json(result);
  } catch (error) {
    console.error('Error renaming table:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error renaming table'
    });
  }
});

// Get table relationships
router.get('/table-relationships', async (req, res) => {
  try {
    const relationships = await mysqlDatabase.getTableRelationships();
    res.json(relationships);
  } catch (error) {
    console.error('Error getting table relationships:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create table relationship
router.post('/table-relationships', async (req, res) => {
  try {
    const { mainTableName, secondaryTableName } = req.body;
    
    if (!mainTableName || !secondaryTableName) {
      return res.status(400).json({ 
        error: 'Main table name and secondary table name are required' 
      });
    }
    
    const result = await mysqlDatabase.createTableRelationship(
      mainTableName, 
      secondaryTableName
    );
    res.json(result);
  } catch (error) {
    console.error('Error creating table relationship:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table relationship
router.delete('/table-relationships', async (req, res) => {
  try {
    const { mainTableName, secondaryTableName } = req.body;
    
    if (!mainTableName || !secondaryTableName) {
      return res.status(400).json({ 
        error: 'Main table name and secondary table name are required' 
      });
    }
    
    const result = await mysqlDatabase.deleteTableRelationship(
      mainTableName, 
      secondaryTableName
    );
    res.json(result);
  } catch (error) {
    console.error('Error deleting table relationship:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear grupo de tablas relacionadas
router.post('/tables/group', async (req, res) => {
  try {
    const { mainTableName, secondaryTableName } = req.body;
    
    if (!mainTableName || !secondaryTableName) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los nombres de ambas tablas'
      });
    }

    const result = await mysqlDatabase.createTableGroup(mainTableName, secondaryTableName);
    res.json(result);
  } catch (error) {
    console.error('Error creating table group:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear el grupo de tablas'
    });
  }
});

// Update column type
router.patch('/tables/:tableName/columns/:columnName/type', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { type } = req.body;
    
    if (!tableName || !columnName || !type) {
      return res.status(400).json({ error: 'Table name, column name, and type are required' });
    }

    // For date type, we'll use VARCHAR to store DD/MM/YYYY format
    if (type.toUpperCase() === 'DATE') {
      try {
        // Convert column to VARCHAR to store dates in DD/MM/YYYY format
        await mysqlDatabase.executeQuery(
          `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` VARCHAR(10)`,
          []
        );

        // Ensure all dates are in DD/MM/YYYY format
        await mysqlDatabase.executeQuery(
          `UPDATE \`${tableName}\` 
           SET \`${columnName}\` = DATE_FORMAT(STR_TO_DATE(\`${columnName}\`, '%d/%m/%Y'), '%d/%m/%Y')
           WHERE \`${columnName}\` REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'`,
          []
        );

        res.json({ success: true, message: `Column type updated successfully` });
        return;
      } catch (error) {
        console.error('Error converting date format:', error);
        throw error;
      }
    }
    
    // For non-DATE types, just execute the ALTER TABLE command
    await mysqlDatabase.executeQuery(
      `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` ${type}`,
      []
    );
    
    res.json({ success: true, message: `Column type updated successfully` });
  } catch (error) {
    console.error('Error updating column type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table types
router.get('/table-types', async (req, res) => {
  try {
    const tables = await mysqlDatabase.getTables();
    
    // Group tables by type
    const tableTypes = tables.reduce((acc, table) => {
      // Extract type from relationship or table name
      let type = null;
      let isGroup = false;
      let child = null;

      if (table.isMainTable) {
        // For main tables, determine type from name
        if (table.name.toLowerCase().includes('gmm')) {
          type = 'GMM';
          isGroup = true;
          child = 'GMMListado';
        } else if (table.name.toLowerCase().includes('autos') && table.name === 'GruposAutos') {
          type = 'AUTOS';
          isGroup = true;
          child = 'AutosListado';
        } else if (table.name.toLowerCase().includes('vida')) {
          type = 'VIDA';
          isGroup = true;
          child = 'VidaListado';
        }
      } else if (!table.isSecondaryTable) {
        // For individual tables
        if (table.name.toLowerCase().includes('mascotas')) {
          type = 'MASCOTAS';
        } else if (table.name.toLowerCase().includes('transporte')) {
          type = 'TRANSPORTE';
        } else if (table.name.toLowerCase().includes('negocio')) {
          type = 'NEGOCIO';
        } else if (table.name.toLowerCase().includes('hogar')) {
          type = 'HOGAR';
        } else if (table.name.toLowerCase().includes('responsabilidad')) {
          type = 'RC';
        } else if (table.name.toLowerCase().includes('autos')) {
          type = 'AUTOS';
        }
      }

      if (type) {
        acc[table.name] = {
          type,
          isGroup: isGroup || false
        };
        if (child) {
          acc[table.name].child = child;
        }
      }

      return acc;
    }, {});

    res.json(tableTypes);
  } catch (error) {
    console.error('Error getting table types:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 