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
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
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

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  // Remove common phone formatting and keep only numbers and +
  return phone.replace(/[^\d+\-\s()]/g, '').trim() || null;
}

function normalizeGender(gender) {
  if (!gender) return null;
  const g = gender.toUpperCase();
  if (g === 'MASCULINO' || g === 'M') return 'MASCULINO';
  if (g === 'FEMENINO' || g === 'F') return 'FEMENINO';
  return 'OTRO';
}

function normalizeStatus(status) {
  if (!status) return 'prospecto';
  const s = status.toLowerCase();
  if (s.includes('cliente')) return 'cliente';
  if (s.includes('prospecto')) return 'prospecto';
  return 'prospecto';
}

function cleanEmail(email) {
  if (!email) return null;
  // Remove brackets and clean email
  const cleaned = email.replace(/[<>]/g, '').trim();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : null;
}

async function importDirectorioContactos() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Creating directorio_contactos table...');
    
    // Create table first
    const createTableSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create_directorio_contactos.sql'), 
      'utf-8'
    );
    await connection.execute(createTableSQL);
    console.log('✅ Table created successfully');
    
    // Read and parse CSV file
    const csvPath = path.join(__dirname, 'directorio_casin.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const { rows } = parseCSV(csvContent);
    
    console.log(`Found ${rows.length} records to import`);
    
    // Clear existing data
    await connection.execute('TRUNCATE TABLE directorio_contactos');
    
    // Import data
    let imported = 0;
    let skipped = 0;
    
    for (const row of rows) {
      try {
        // Skip rows without essential data
        if (!row['Nombre completo'] && !row['(REF)Display Name']) {
          skipped++;
          continue;
        }
        
        const insertSQL = `
          INSERT INTO directorio_contactos (
            origen, comentario, nombre_completo, nombre_completo_oficial,
            nickname, apellido, display_name, empresa, telefono_oficina,
            telefono_casa, telefono_asistente, telefono_movil, telefonos_corregidos,
            email, entidad, genero, status_social, ocupacion, pais, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          row['ORIGEN'] || null,
          row['COMENTARIO'] || null,
          row['Nombre completo'] || row['(REF)Display Name'] || null,
          row['(Xrevisar)nombre completo oficial'] || null,
          row['Nickname'] || null,
          row['(REF)Last Name'] || null,
          row['(REF)Display Name'] || null,
          row['Empresa'] || null,
          cleanPhoneNumber(row['Teléfono Oficina']),
          cleanPhoneNumber(row['Teléfono Casa']),
          cleanPhoneNumber(row['Teléfono Asistente']),
          cleanPhoneNumber(row['Teléfono Móvil']),
          row['revisar telefonos corregidos'] || null,
          cleanEmail(row['E-mail Address']),
          row['Entidad'] || null,
          normalizeGender(row['Género']),
          row['Status Social'] || null,
          row['Ocupación'] || null,
          row['País'] || 'MÉXICO',
          normalizeStatus(row['STATUS'])
        ];
        
        await connection.execute(insertSQL, values);
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`Imported ${imported} records...`);
        }
        
      } catch (error) {
        console.log(`Error importing record ${imported + 1}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`✅ Import completed!`);
    console.log(`   - Successfully imported: ${imported} records`);
    console.log(`   - Skipped: ${skipped} records`);
    
    // Show final statistics
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM directorio_contactos');
    const [statusStats] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM directorio_contactos 
      GROUP BY status
    `);
    
    console.log(`\nFinal statistics:`);
    console.log(`Total records in directorio_contactos: ${countResult[0].count}`);
    console.log(`Status distribution:`);
    statusStats.forEach(stat => {
      console.log(`  - ${stat.status}: ${stat.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the import
importDirectorioContactos(); 