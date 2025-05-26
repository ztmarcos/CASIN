const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'crud_db',
  port: 3306
};

// Function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      data.push(row);
    }
  }
  
  return { headers, data };
}

// Function to clear and populate GMM table
async function importGMMData(connection) {
  console.log('Importing GMM data...');
  
  // Clear existing data
  await connection.execute('TRUNCATE TABLE gmm');
  
  // Read CSV file
  const csvPath = path.join(__dirname, 'cvs', 'GMM.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const { data } = parseCSV(csvContent);
  
  console.log(`Found ${data.length} GMM records to import`);
  
  for (const row of data) {
    try {
      await connection.execute(`
        INSERT INTO gmm (
          contratante, numero_de_poliza, aseguradora, vigencia_inicio, vigencia_fin,
          forma_de_pago, importe_total_a_pagar, prima_neta, derecho_de_poliza,
          recargo_por_pago_fraccionado, iva_16, e_mail, nombre_asegurado, rfc,
          direccion, telefono, codigo_cliente, duracion, fecha_de_expedicion,
          version, renovacion, pdf, agente
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        row.Contratante, row['Número De Póliza'], row.Aseguradora,
        row['Vigencia (Inicio)'], row['Vigencia (Fin)'], row['Forma De Pago'],
        row['Importe Total A Pagar'], row['Prima Neta'], row['Derecho De Póliza'],
        row['Recargo Por Pago Fraccionado'], row['I.V.A. 16%'], row['E-mail'],
        row['Nombre del Asegurado'], row.RFC, row.Dirección, row.Teléfono,
        row['Código Cliente'], row.Duración, row['Fecha De Expedición'],
        row.Versión, row.Renovacion, row.PDF, row.Responsable
      ]);
    } catch (error) {
      console.error('Error inserting GMM row:', error.message);
      console.log('Row data:', row);
    }
  }
  
  const [result] = await connection.execute('SELECT COUNT(*) as count FROM gmm');
  console.log(`GMM import completed. Total records: ${result[0].count}`);
}

// Function to clear and populate Vida table
async function importVidaData(connection) {
  console.log('Importing Vida data...');
  
  // Clear existing data
  await connection.execute('TRUNCATE TABLE vida');
  
  // Read CSV file
  const csvPath = path.join(__dirname, 'cvs', 'Vida.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const { data } = parseCSV(csvContent);
  
  console.log(`Found ${data.length} Vida records to import`);
  
  for (const row of data) {
    try {
      await connection.execute(`
        INSERT INTO vida (
          contratante, numero_de_poliza, compania, vigencia_inicio, vigencia_fin,
          forma_de_pago, importe_a_pagar, prima_neta, derecho_de_poliza,
          recargo_por_pago_fraccionado, iva, email, tipo_de_poliza, tipo_de_plan,
          rfc, direccion, telefono, fecha_de_expedicion, beneficiarios,
          edad_de_contratacion, tipo_de_riesgo, fumador, coberturas, pdf,
          responsable, cobrar_a
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        row.Contratante, row['Número De Póliza'], row.Compañía,
        row['Vigencia (Inicio)'], row['Vigencia (Fin)'], row['Forma De Pago'],
        row['Importe A Pagar (MXN)'], row['Prima Neta (MXN)'], row['Derecho de poliza'],
        row['Recargo por Pago Fraccionado'], row['I.V.A.'], row['E-mail'],
        row['Tipo De Póliza'], row['Tipo De Plan'], row.RFC, row.Dirección,
        row.Teléfono, row['Fecha De Expedición'], row.Beneficiarios,
        row['Edad De Contratación'], row['Tipo De Riesgo'], row.Fumador,
        row.Coberturas, row.PDF, row.Responsable, row['Cobrar A']
      ]);
    } catch (error) {
      console.error('Error inserting Vida row:', error.message);
      console.log('Row data:', row);
    }
  }
  
  const [result] = await connection.execute('SELECT COUNT(*) as count FROM vida');
  console.log(`Vida import completed. Total records: ${result[0].count}`);
}

// Function to clear and populate Autos table
async function importAutosData(connection) {
  console.log('Importing Autos data...');
  
  // Clear existing data
  await connection.execute('TRUNCATE TABLE autos');
  
  // Read CSV file
  const csvPath = path.join(__dirname, 'cvs', 'Autoss.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const { data } = parseCSV(csvContent);
  
  console.log(`Found ${data.length} Autos records to import`);
  
  for (const row of data) {
    try {
      await connection.execute(`
        INSERT INTO autos (
          nombre_contratante, numero_de_poliza, aseguradora, vigencia_inicio,
          vigencia_fin, forma_de_pago, pago_total, prima_neta, derecho_de_poliza,
          recargo_por_pago_fraccionado, iva, email, tipo_de_vehiculo, duracion,
          rfc, domicilio, descripcion_vehiculo, serie, modelo, placas, motor,
          uso, pdf, ramo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        row['Nombre Contratante'], row['Número de Póliza'], row.Aseguradora,
        row['Vigencia (Inicio)'], row['Vigencia (Fin)'], row['Forma de Pago'],
        row['Pago total o Prima Total'], row['Prima Neta'], row['Derecho de Póliza'],
        row['Recargo por Pago Fraccionado'], row['I.V.A'], row['E-mail'],
        row['Tipo de Vehículo'], row.Duración, row.RFC, row['Domicilio o Dirección'],
        row['Descripción del vehículo'], row.Serie, row.Modelo, row.Placas,
        row.Motor, row.Uso, row.PDF, row.Ramo
      ]);
    } catch (error) {
      console.error('Error inserting Autos row:', error.message);
      console.log('Row data:', row);
    }
  }
  
  const [result] = await connection.execute('SELECT COUNT(*) as count FROM autos');
  console.log(`Autos import completed. Total records: ${result[0].count}`);
}

// Main function
async function main() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully!');
    
    // Import data for each table
    await importGMMData(connection);
    await importVidaData(connection);
    await importAutosData(connection);
    
    console.log('\nAll CSV data imported successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the script
main(); 