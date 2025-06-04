export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Real tables from crud_db database with actual row counts
    const tables = [
      { name: 'directorio_contactos', row_count: 2701, description: 'Directorio de contactos/clientes' },
      { name: 'autos', row_count: 34, description: 'Seguros de autos' },
      { name: 'vida', row_count: 2, description: 'Seguros de vida' },
      { name: 'rc', row_count: 1, description: 'Responsabilidad civil' },
      { name: 'gmm', row_count: 0, description: 'Gastos médicos mayores' },
      { name: 'transporte', row_count: 0, description: 'Seguros de transporte' },
      { name: 'mascotas', row_count: 0, description: 'Seguros de mascotas' },
      { name: 'diversos', row_count: 0, description: 'Seguros diversos' },
      { name: 'negocio', row_count: 0, description: 'Seguros de negocio' },
      { name: 'gruposgmm', row_count: 0, description: 'Grupos GMM' }
    ];

    res.status(200).json({ 
      success: true,
      tables,
      total_tables: tables.length,
      total_records: tables.reduce((sum, table) => sum + table.row_count, 0),
      database: 'crud_db',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 