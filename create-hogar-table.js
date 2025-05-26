const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crud_db',
  port: process.env.DB_PORT || '3306'
};

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      rows.push(row);
    }
  }
  
  return { headers, rows };
}

async function createHogarTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Creating hogar table...');
    
    // Drop table if exists
    await connection.execute('DROP TABLE IF EXISTS hogar');
    
    // Create table with appropriate columns based on CSV structure
    const createTableSQL = `
      CREATE TABLE hogar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contratante VARCHAR(255),
        numero_poliza VARCHAR(50),
        aseguradora VARCHAR(255),
        fecha_inicio DATE,
        fecha_fin DATE,
        forma_pago VARCHAR(50),
        importe_total_a_pagar DECIMAL(10,2),
        prima_neta DECIMAL(10,2),
        derecho_poliza DECIMAL(10,2),
        recargo_pago_fraccionado DECIMAL(10,2),
        iva_16 DECIMAL(10,2),
        email VARCHAR(255),
        rfc VARCHAR(20),
        direccion TEXT,
        telefono VARCHAR(20),
        duracion VARCHAR(50),
        version VARCHAR(10),
        renovacion VARCHAR(10),
        fecha_expedicion VARCHAR(50),
        pdf TEXT,
        responsable VARCHAR(255),
        cobrar_a VARCHAR(255),
        ramo VARCHAR(50) DEFAULT 'Hogar',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Hogar table created successfully');
    
    // Read and parse CSV file
    const csvPath = path.join(__dirname, 'csv', 'Hogars.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const { rows } = parseCSV(csvContent);
    
    console.log(`Found ${rows.length} records to import`);
    
    // Import data
    let imported = 0;
    for (const row of rows) {
      try {
        // Clean numeric values (remove commas and quotes)
        const cleanNumber = (value) => {
          if (!value || value === '') return null;
          return parseFloat(value.toString().replace(/[$,"]/g, '')) || null;
        };
        
        // Parse dates
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr === '') return null;
          try {
            // Handle different date formats
            if (dateStr.includes('-')) {
              const date = new Date(dateStr);
              return date.getFullYear() > 1900 ? date.toISOString().split('T')[0] : null;
            } else if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
              return date.getFullYear() > 1900 ? date.toISOString().split('T')[0] : null;
            }
          } catch (error) {
            console.log(`Date parsing error for "${dateStr}":`, error.message);
          }
          return null;
        };
        
        const insertSQL = `
          INSERT INTO hogar (
            contratante, numero_poliza, aseguradora, fecha_inicio, fecha_fin,
            forma_pago, importe_total_a_pagar, prima_neta, derecho_poliza,
            recargo_pago_fraccionado, iva_16, email, rfc, direccion, telefono,
            duracion, version, renovacion, fecha_expedicion, pdf, responsable,
            cobrar_a, ramo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          row['Contratante'] || null,
          row['Número De Póliza'] || null,
          row['Aseguradora'] || 'GNP',
          parseDate(row[''] || row['Fecha De Inicio']), // Date column seems unnamed
          parseDate(row[''] || row['Fecha De Fin']), // Date column seems unnamed
          row['Forma De Pago'] || null,
          cleanNumber(row['Importe Total A Pagar']),
          cleanNumber(row['Prima Neta']),
          cleanNumber(row['Derecho De Póliza']),
          cleanNumber(row['Recargo Por Pago Fraccionado']),
          cleanNumber(row['I.V.A. 16%']),
          row['E-mail'] || null,
          row['RFC'] || null,
          row['Dirección'] || null,
          row['Teléfono'] || null,
          row['Duración'] || null,
          row['Versión'] || null,
          row['Renovacion'] || null,
          row['Fecha De Expedición'] || null,
          row['PDF'] || null,
          row['Responsable'] || null,
          row['Cobrar A'] || null,
          'Hogar'
        ];
        
        await connection.execute(insertSQL, values);
        imported++;
        
      } catch (error) {
        console.log(`Error importing record ${imported + 1}:`, error.message);
        console.log('Row data:', row);
      }
    }
    
    console.log(`✅ Successfully imported ${imported} records into hogar table`);
    
    // Show final count
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM hogar');
    console.log(`Total records in hogar table: ${countResult[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createHogarTable(); 