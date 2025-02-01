// Crear grupo de tablas relacionadas
router.post('/group', async (req, res) => {
  try {
    const { mainTableName, secondaryTableName, groupType } = req.body;
    
    if (!mainTableName || !secondaryTableName) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los nombres de ambas tablas'
      });
    }

    const result = await databaseService.createTableGroup(mainTableName, secondaryTableName, groupType);
    res.json(result);
  } catch (error) {
    console.error('Error creating table group:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear el grupo de tablas'
    });
  }
});

// Obtener estructura de una tabla específica
router.get('/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    const connection = await databaseService.getConnection();
    
    // Obtener la estructura de la tabla
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'crud_db', tableName]);

    // Obtener las relaciones de la tabla
    const [relationships] = await connection.execute(
      'SELECT * FROM table_relationships WHERE main_table_name = ? OR secondary_table_name = ?',
      [tableName, tableName]
    );

    const tableInfo = {
      name: tableName,
      columns: columns.map(col => ({
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE + (col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''),
        nullable: col.IS_NULLABLE === 'YES',
        default: col.COLUMN_DEFAULT,
        extra: col.EXTRA
      })),
      relationships: relationships.map(rel => ({
        type: rel.relationship_type,
        isMainTable: rel.main_table_name === tableName,
        relatedTableName: rel.main_table_name === tableName ? rel.secondary_table_name : rel.main_table_name
      }))
    };

    await connection.release();
    res.json(tableInfo);
  } catch (error) {
    console.error('Error getting table structure:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener la estructura de la tabla'
    });
  }
});

// Obtener todas las tablas con sus relaciones y columnas
router.get('/', async (req, res) => {
  try {
    const connection = await databaseService.getConnection();
    
    // Obtener todas las tablas
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME != 'table_relationships'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'crud_db']);

    // Obtener todas las relaciones
    const [relationships] = await connection.execute('SELECT * FROM table_relationships');

    // Obtener las columnas de todas las tablas
    const tablesWithInfo = await Promise.all(tables.map(async ({ TABLE_NAME }) => {
      // Obtener columnas de la tabla
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME || 'crud_db', TABLE_NAME]);

      // Encontrar relaciones para esta tabla
      const tableRelationships = relationships.filter(rel => 
        rel.main_table_name === TABLE_NAME || rel.secondary_table_name === TABLE_NAME
      );

      const isMainTable = tableRelationships.some(rel => rel.main_table_name === TABLE_NAME);
      const isSecondaryTable = tableRelationships.some(rel => rel.secondary_table_name === TABLE_NAME);
      const relatedTableName = isMainTable 
        ? tableRelationships[0]?.secondary_table_name
        : tableRelationships[0]?.main_table_name;

      // Filtrar columnas según si es una tabla relacionada o no
      let tableColumns = columns.map(col => ({
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE + (col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''),
        nullable: col.IS_NULLABLE === 'YES',
        default: col.COLUMN_DEFAULT,
        extra: col.EXTRA
      }));

      // Si no es una tabla relacionada, filtrar la columna status
      if (!isMainTable && !isSecondaryTable) {
        tableColumns = tableColumns.filter(col => col.name !== 'status');
      }

      return {
        name: TABLE_NAME,
        columns: tableColumns,
        isMainTable,
        isSecondaryTable,
        relatedTableName,
        relationshipType: tableRelationships[0]?.relationship_type
      };
    }));

    await connection.release();
    res.json(tablesWithInfo);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener las tablas'
    });
  }
});

// Obtener datos de una tabla específica
router.get('/:tableName/data', async (req, res) => {
  try {
    const { tableName } = req.params;
    const connection = await databaseService.getConnection();

    // Verificar si es una tabla relacionada
    const [relationships] = await connection.execute(
      'SELECT * FROM table_relationships WHERE main_table_name = ? OR secondary_table_name = ?',
      [tableName, tableName]
    );

    const isRelatedTable = relationships.length > 0;

    // Construir la consulta SQL
    let query = isRelatedTable 
      ? `SELECT * FROM \`${tableName}\``
      : `SELECT id, ${(await connection.execute(`
          SELECT GROUP_CONCAT(COLUMN_NAME) 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME != 'status'
        `, [tableName]))[0][0]} FROM \`${tableName}\``;

    const [rows] = await connection.execute(query);

    await connection.release();
    res.json({
      table: tableName,
      data: rows,
      isRelatedTable
    });
  } catch (error) {
    console.error('Error getting table data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener los datos de la tabla'
    });
  }
}); 