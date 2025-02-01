// Crear grupo de tablas relacionadas
router.post('/group', async (req, res) => {
  try {
    const { mainTableName, secondaryTableName } = req.body;
    
    if (!mainTableName || !secondaryTableName) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los nombres de ambas tablas'
      });
    }

    const result = await databaseService.createTableGroup(mainTableName, secondaryTableName);
    res.json(result);
  } catch (error) {
    console.error('Error creating table group:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear el grupo de tablas'
    });
  }
}); 