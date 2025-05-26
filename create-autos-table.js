const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Function to clean column names
function cleanColumnName(columnName) {
  return columnName
    .toLowerCase()
    // Remove or replace Spanish special characters
    .replace(/ñ/g, 'n')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ç/g, 'c')
    // Remove special characters and spaces, replace with underscore
    .replace(/[^a-z0-9]/g, '_')
    // Remove multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_|_$/g, '')
    // Apply specific mappings for consistency
    .replace(/numero_de_poliza|n_mero_de_p_liza/g, 'numero_poliza')
    .replace(/nombre_contratante/g, 'contratante')
    .replace(/aseguradora|compania|compañia/g, 'aseguradora')
    .replace(/vigencia_inicio_|vigencia__inicio_/g, 'fecha_inicio')
    .replace(/vigencia_fin_|vigencia__fin_/g, 'fecha_fin')
    .replace(/pago_total_o_prima_total/g, 'prima_total')
    .replace(/derecho_de_poliza/g, 'derecho_poliza')
    .replace(/recargo_por_pago_fraccionado/g, 'recargo_pago_fraccionado')
    .replace(/i_v_a|iva_16_/g, 'iva')
    .replace(/e_mail/g, 'email')
    .replace(/tipo_de_vehiculo/g, 'tipo_vehiculo')
    .replace(/domicilio_o_direccion/g, 'direccion')
    .replace(/descripcion_del_vehiculo/g, 'descripcion_vehiculo');
}

// Function to parse CSV and clean data
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Parse headers
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const cleanHeaders = rawHeaders.map(cleanColumnName);
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (handles basic cases)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Don't forget the last value
    
    // Skip rows with insufficient data or header-like content
    if (values.length < cleanHeaders.length / 2 || 
        values[0].toLowerCase().includes('nombre') || 
        values[0].toLowerCase().includes('contratante')) {
      continue;
    }
    
    rows.push(values);
  }
  
  return { headers: cleanHeaders, rows };
}

// Function to get MySQL data type for a value
function getDataType(value, maxLength = 255) {
  if (!value || value.trim() === '') return 'VARCHAR(255)';
  
  // Remove quotes and clean value
  const cleanValue = value.replace(/"/g, '').trim();
  
  // Check for dates (various formats)
  if (/^\d{1,2}[-\/]\w{3}[-\/]\d{4}$/.test(cleanValue) || // 29-Apr-2024
      /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(cleanValue) || // 29/04/2024
      /^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) { // 2024-04-29
    return 'DATE';
  }
  
  // Check for decimal numbers
  if (/^\d{1,3}(,\d{3})*(\.\d{2})?$/.test(cleanValue) || 
      /^\d+\.\d+$/.test(cleanValue)) {
    return 'DECIMAL(10,2)';
  }
  
  // Check for integers
  if (/^\d+$/.test(cleanValue)) {
    return 'INT';
  }
  
  // Default to VARCHAR with appropriate length
  const length = Math.min(Math.max(cleanValue.length * 1.5, 50), 500);
  return `VARCHAR(${Math.ceil(length)})`;
}

async function createAutosTable() {
  console.log('🚗 Creating autos table from CSV data...');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'crud_db'
  });

  try {
    // Read CSV file
    const csvPath = path.join(__dirname, 'csv', 'Autoss.csv');
    console.log(`📁 Reading CSV file: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const { headers, rows } = parseCSV(csvContent);
    console.log(`📊 Found ${headers.length} columns and ${rows.length} data rows`);
    console.log('📋 Column headers:', headers.slice(0, 10)); // Show first 10 headers
    
    // Drop existing table
    console.log('🗑️ Dropping existing autos table if exists...');
    await connection.execute('DROP TABLE IF EXISTS autos');
    
    // Analyze data to determine column types
    const columnTypes = {};
    headers.forEach((header, index) => {
      if (!header || header === '') return;
      
      const sampleValues = rows.slice(0, 100).map(row => row[index]).filter(v => v);
      if (sampleValues.length === 0) {
        columnTypes[header] = 'VARCHAR(255)';
        return;
      }
      
      // Determine the most appropriate type
      const maxLength = Math.max(...sampleValues.map(v => (v || '').length));
      columnTypes[header] = getDataType(sampleValues[0], maxLength);
    });
    
    // Create table schema
    const validHeaders = headers.filter(h => h && h !== '');
    const columnDefinitions = validHeaders.map(header => {
      const type = columnTypes[header] || 'VARCHAR(255)';
      return `${header} ${type}`;
    });
    
    // Add auto-increment ID
    columnDefinitions.unshift('id INT AUTO_INCREMENT PRIMARY KEY');
    
    const createTableSQL = `
      CREATE TABLE autos (
        ${columnDefinitions.join(',\n        ')}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    console.log('🏗️ Creating table with schema:');
    console.log(createTableSQL);
    
    await connection.execute(createTableSQL);
    console.log('✅ Table "autos" created successfully');
    
    // Insert data
    console.log('📥 Inserting data...');
    let insertedCount = 0;
    
    for (const row of rows) {
      if (!row[0] || row[0].trim() === '') continue; // Skip empty rows
      
      // Prepare values, ensuring we have the right number
      const values = validHeaders.map((header, index) => {
        let value = row[index] || '';
        
        // Clean and format value
        value = value.replace(/"/g, '').trim();
        
        // Handle specific data types
        if (columnTypes[header] === 'DATE') {
          // Convert date formats
          if (/^\d{1,2}[-\/]\w{3}[-\/]\d{4}$/.test(value)) {
            // Convert "29-Apr-2024" to "2024-04-29"
            const [day, month, year] = value.split(/[-\/]/);
            const monthMap = {
              'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
              'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
              'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            value = `${year}-${monthMap[month] || '01'}-${day.padStart(2, '0')}`;
          } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
            // Convert "29/04/2024" to "2024-04-29"
            const [day, month, year] = value.split('/');
            value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else if (columnTypes[header].includes('DECIMAL')) {
          // Clean decimal values
          value = value.replace(/,/g, '').replace(/[^\d.-]/g, '') || '0';
        }
        
        return value || null;
      });
      
      // Insert row
      const placeholders = validHeaders.map(() => '?').join(', ');
      const insertSQL = `INSERT INTO autos (${validHeaders.join(', ')}) VALUES (${placeholders})`;
      
      try {
        await connection.execute(insertSQL, values);
        insertedCount++;
      } catch (error) {
        console.log(`⚠️ Error inserting row ${insertedCount + 1}:`, error.message);
        console.log('📄 Problematic row:', values.slice(0, 5)); // Show first 5 values
      }
    }
    
    console.log(`✅ Successfully inserted ${insertedCount} records into autos table`);
    
    // Verify the data
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM autos');
    console.log(`📊 Total records in autos table: ${countResult[0].count}`);
    
    // Show sample data
    const [sampleData] = await connection.execute('SELECT * FROM autos LIMIT 3');
    console.log('📋 Sample data:');
    sampleData.forEach((row, index) => {
      console.log(`   Row ${index + 1}:`, {
        id: row.id,
        contratante: row.contratante,
        numero_poliza: row.numero_poliza,
        aseguradora: row.aseguradora,
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin
      });
    });
    
  } catch (error) {
    console.error('❌ Error creating autos table:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the function
createAutosTable().catch(console.error); 