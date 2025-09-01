export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { table, id } = req.query;

  if (!table || !id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Table name and document ID are required',
      timestamp: new Date().toISOString()
    });
  }

  console.log(`📝 API Request: ${req.method} /api/data/${table}/${id}`);

  try {
    if (req.method === 'PUT') {
      // Handle policy status updates
      const updateData = req.body;
      console.log(`🔄 Updating document ${id} in collection ${table}:`, updateData);

      // For now, we'll simulate a successful update
      // In a real implementation, this would update the Firebase document
      const updatedDocument = {
        id,
        collection: table,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      console.log(`✅ Document ${id} updated successfully in ${table}`);
      
      return res.status(200).json({
        success: true,
        message: 'Document updated successfully',
        data: updatedDocument,
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'GET') {
      // Handle document retrieval
      console.log(`📖 Getting document ${id} from collection ${table}`);
      
      // For now, return a mock document
      // In a real implementation, this would fetch from Firebase
      const document = {
        id,
        collection: table,
        // Add mock data based on table type
        ...(table === 'gastos médicos' && {
          numero_poliza: `GMM-${id.slice(-6)}`,
          estado_pago: 'No Pagado',
          ramo: 'Gastos Médicos'
        }),
        ...(table === 'autos' && {
          numero_poliza: `AUTO-${id.slice(-6)}`,
          estado_pago: 'No Pagado',
          ramo: 'Autos'
        }),
        ...(table === 'hogar' && {
          numero_poliza: `HOGAR-${id.slice(-6)}`,
          estado_pago: 'No Pagado',
          ramo: 'Hogar'
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        data: document,
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'DELETE') {
      // Handle document deletion
      console.log(`🗑️ Deleting document ${id} from collection ${table}`);
      
      return res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
        timestamp: new Date().toISOString()
      });

    } else {
      return res.status(405).json({ 
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'PUT', 'DELETE'],
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error(`❌ Error in /api/data/${table}/${id}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
