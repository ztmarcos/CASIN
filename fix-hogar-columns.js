const mysql = require('mysql2/promise');

async function fixHogarColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'crud_db'
  });
  
  // Fix column sizes
  await connection.execute('ALTER TABLE hogar MODIFY COLUMN renovacion VARCHAR(50)');
  await connection.execute('ALTER TABLE hogar MODIFY COLUMN ramo VARCHAR(50)');
  
  // Insert the missing records that failed due to column size
  const missingRecords = [
    ['Raul Noris Perez De Alva', '639178938', 'GNP', '2024-11-15', '2025-11-15', 'Anual', 2833.26, 2192.46, 250.01, 0, 390.79, null, 'NOPR43080131A', 'CALLE GIORGIONE, 42Int1, SANTA MARIA NONOALCO BENITO JUAREZ, DISTRITO FEDERAL, C.P. 03700', '31315171', '365', '0', 'EMISION NUEVA', '15/11/2024', 'SI', 'LORE', 'Raul Noris Perez de Alva', 'Hogar'],
    ['Raul Noris Perez De Alva', '639179548', 'GNP', '2024-11-15', '2025-11-15', 'Anual', 3031.78, 2363.61, 249.99, 0, 418.18, null, 'NOPR43080131A', 'CALLE GIORGIONE, 42Int4, SANTA MARIA NONOALCO BENITO JUAREZ, DISTRITO FEDERAL, C.P. 03700', '31315171', '365', '0', 'EMISION NUEVA', '15/11/2024', 'SI', 'LORE', 'Raul Noris Perez De Alva', 'Hogar'],
    ['Raul Noris Perez De Alva', '640263950', 'GNP', '2024-11-15', '2025-11-15', 'Anual', 2798.05, 2162.1, 385.94, 0, 2798.05, null, 'XEXX010101000', 'CALLE GIORGIONE, 42-2, SANTA MARIA NONOALCO BENITO JUAREZ, CIUDAD DE MEXICO, C.P. 03700', '31315171', '365', '0', 'EMISION NUEVA', '15/11/2024', 'SI', 'LORE', 'RAUL NORIS', 'Hogar'],
    ['Raul Noris Perez De Alva', '640419925', 'GNP', '2024-11-15', '2025-11-15', 'Anual', 3027.2, 2359.65, 250.01, 0, 417.54, null, 'XEXX010101000', 'CALLE GIORGIONE, 42-2, SANTA MARIA NONOALCO BENITO JUAREZ, CIUDAD DE MEXICO, C.P. 03700', '31315171', '365', '0', 'EMISION NUEVA', '15/11/2024', 'SI', 'LORE', 'RAUL NORIS', 'Hogar']
  ];
  
  const insertSQL = `INSERT INTO hogar (contratante, numero_poliza, aseguradora, fecha_inicio, fecha_fin, forma_pago, importe_total_a_pagar, prima_neta, derecho_poliza, recargo_pago_fraccionado, iva_16, email, rfc, direccion, telefono, duracion, version, renovacion, fecha_expedicion, pdf, responsable, cobrar_a, ramo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  for (const record of missingRecords) {
    await connection.execute(insertSQL, record);
  }
  
  const [count] = await connection.execute('SELECT COUNT(*) as count FROM hogar');
  console.log(`✅ Fixed hogar table. Total records: ${count[0].count}`);
  
  await connection.end();
}

fixHogarColumns(); 