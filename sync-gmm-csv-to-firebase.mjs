import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mapeo de columnas CSV a Firebase
const columnMapping = {
  'Contratante': 'contratante',
  'Número De Póliza': 'numero_poliza',
  'Aseguradora': 'aseguradora',
  'Vigencia (Inicio)': 'vigencia_inicio',  // Usar vigencia_inicio, no fecha_inicio
  'Vigencia (Fin)': 'vigencia_fin',  // Usar vigencia_fin, no fecha_fin
  'Forma De Pago': 'forma_pago',
  'Importe Total A Pagar': 'importe_total',
  'Prima Neta': 'prima_neta',
  'Derecho De Póliza': 'derecho_poliza',
  'Recargo Por Pago Fraccionado': 'recargo_pago_fraccionado',
  'I.V.A. 16%': 'iva_16',
  'E-mail': 'email',
  'Nombre del Asegurado': 'nombre_del_asegurado',
  'RFC': 'rfc',
  'Dirección': 'direccion',
  'Teléfono': 'telefono',
  'Código Cliente': 'codigo_cliente',
  'Duración': 'duracion',
  'Fecha De Expedición': 'fecha_expedicion',
  'Fecha Nacimiento Asegurado': 'fecha_nacimiento_asegurado',
  'Versión': 'version',
  'Renovacion': 'renovacion',
  'PDF': 'pdf',
  'Responsable': 'responsable',
  'Ramo': 'ramo'
};

// Función para convertir timestamp de Excel/Google Sheets a fecha
function convertExcelTimestamp(timestamp) {
  if (typeof timestamp !== 'number') return null;
  
  // Excel/Google Sheets timestamps son días desde 1900-01-01
  // Pero Excel tiene un bug: considera 1900 como año bisiesto
  // Por eso usamos 1899-12-30 como base
  const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const date = new Date(excelEpoch.getTime() + (timestamp * millisecondsPerDay));
  
  // Verificar que la fecha sea válida
  if (isNaN(date.getTime())) return null;
  
  return date;
}

// Función para convertir fecha de formato CSV a formato estándar (dd/mmm/aaaa)
function normalizeDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === 'N/A') return null;
  
  // Primero intentar como número (timestamps de Excel/Google Sheets)
  // Puede venir como string "45931" o como número 45931
  const trimmed = String(dateStr).trim();
  if (!isNaN(trimmed) && !isNaN(parseFloat(trimmed)) && trimmed !== '') {
    const numValue = parseFloat(trimmed);
    
    // Timestamps de Excel/Google Sheets (1-100000 = días desde 1900-01-01)
    if (numValue >= 1 && numValue <= 100000) {
      const date = convertExcelTimestamp(numValue);
      if (date) {
        // Convertir a formato dd/mmm/aaaa
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${day}/${monthNames[month]}/${year}`;
      }
    }
  }
  
  // Formato: 20-Apr-2024 o 18/12/2024
  if (typeof dateStr === 'string') {
    // Formato DD-MMM-YYYY (20-Apr-2024)
    if (dateStr.includes('-') && dateStr.length > 8 && !dateStr.match(/^\d+$/)) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parts[0];
        const monthMap = {
          'Jan': 'ene', 'Feb': 'feb', 'Mar': 'mar', 'Apr': 'abr', 'May': 'may', 'Jun': 'jun',
          'Jul': 'jul', 'Aug': 'ago', 'Sep': 'sep', 'Oct': 'oct', 'Nov': 'nov', 'Dec': 'dic'
        };
        const month = monthMap[parts[1]] || parts[1].toLowerCase().substring(0, 3);
        const year = parts[2];
        return `${day}/${month}/${year}`;
      }
    }
    // Formato DD/MM/YYYY (18/12/2024) - convertir a dd/mmm/aaaa
    else if (dateStr.includes('/') && dateStr.match(/^\d+\/\d+\/\d+$/)) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthNum = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(monthNum) && !isNaN(year) && monthNum >= 1 && monthNum <= 12) {
          const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
          return `${day}/${monthNames[monthNum - 1]}/${year}`;
        }
      }
    }
    // Si ya está en formato dd/mmm/aaaa, devolverlo tal cual
    else if (dateStr.includes('/') && dateStr.match(/^\d+\/[a-z]{3}\/\d+$/i)) {
      return dateStr;
    }
  }
  
  return dateStr;
}

// Función para normalizar números (quitar comas)
function normalizeNumber(value) {
  if (!value || value === '' || value === 'N/A') return null;
  if (typeof value === 'string') {
    return value.replace(/,/g, '');
  }
  return value;
}

// Función para parsear CSV correctamente manejando comas dentro de comillas
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parsear headers
  const headerValues = [];
  let currentHeader = '';
  let inQuotes = false;
  for (let j = 0; j < lines[0].length; j++) {
    const char = lines[0][j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headerValues.push(currentHeader.trim().replace(/^"|"$/g, ''));
      currentHeader = '';
    } else {
      currentHeader += char;
    }
  }
  headerValues.push(currentHeader.trim().replace(/^"|"$/g, ''));
  const headers = headerValues.map(h => h.trim());
  
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let currentValue = '';
    inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));
    
    // Ajustar si hay menos valores que headers (llenar con vacío)
    while (values.length < headers.length) {
      values.push('');
    }
    
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  return rows;
}

async function syncGMMData() {
  try {
    console.log('🔄 Iniciando sincronización de GMM desde CSV...\n');
    
    // Leer CSV
    const csvPath = './Copia de CASINDBdic2024 - GMM (1).csv';
    const csvContent = readFileSync(csvPath, 'utf-8');
    const csvRows = parseCSV(csvContent);
    
    console.log(`📊 CSV leído: ${csvRows.length} registros\n`);
    
    // Obtener todos los documentos de Firebase GMM
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    const firebaseDocs = [];
    
    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      // Usar el ID real del documento de Firestore
      firebaseDocs.push({ firestoreId: docSnapshot.id, ...data });
    });
    
    console.log(`🔥 Firebase GMM: ${firebaseDocs.length} documentos\n`);
    
    // Crear mapa de Firebase por número de póliza
    const firebaseMap = new Map();
    firebaseDocs.forEach(doc => {
      const poliza = doc.numero_poliza || doc.numero_de_poliza;
      if (poliza) {
        firebaseMap.set(String(poliza).trim(), doc);
      }
    });
    
    let updated = 0;
    let created = 0;
    let skipped = 0;
    
    // Procesar cada fila del CSV
    for (const csvRow of csvRows) {
      const numeroPoliza = csvRow['Número De Póliza']?.trim();
      
      if (!numeroPoliza) {
        console.log(`⚠️  Fila sin número de póliza, saltando...`);
        skipped++;
        continue;
      }
      
      // Buscar en Firebase
      const existingDoc = firebaseMap.get(numeroPoliza);
      
      // Preparar datos para actualizar/crear
      const updateData = {};
      
      for (const [csvCol, firebaseCol] of Object.entries(columnMapping)) {
        const csvValue = csvRow[csvCol];
        
        // Para fechas, siempre intentar normalizar aunque esté vacío (puede ser número)
        if (firebaseCol.includes('fecha') || firebaseCol.includes('vigencia')) {
          const normalized = normalizeDate(csvValue);
          if (normalized) {
            updateData[firebaseCol] = normalized;
            // También limpiar fecha_inicio/fecha_fin si estamos usando vigencia_inicio/vigencia_fin
            if (firebaseCol === 'vigencia_inicio' && existingDoc?.fecha_inicio) {
              // No sobrescribir, solo asegurar que vigencia_inicio tenga valor
            }
            if (firebaseCol === 'vigencia_fin' && existingDoc?.fecha_fin) {
              // No sobrescribir, solo asegurar que vigencia_fin tenga valor
            }
          }
        }
        // Para otros campos, solo si tiene valor
        else if (csvValue !== undefined && csvValue !== '' && csvValue !== 'N/A') {
          // Normalizar números
          if (firebaseCol.includes('importe') || firebaseCol.includes('prima') || 
              firebaseCol.includes('derecho') || firebaseCol.includes('recargo') || 
              firebaseCol.includes('iva') || firebaseCol === 'version' || 
              firebaseCol === 'codigo_cliente') {
            updateData[firebaseCol] = normalizeNumber(csvValue);
          }
          // Otros campos
          else {
            updateData[firebaseCol] = csvValue;
          }
        }
      }
      
      if (existingDoc) {
        // SIEMPRE actualizar fechas de vigencia si están en el CSV (forzar actualización)
        const hasVigenciaUpdates = updateData.vigencia_inicio || updateData.vigencia_fin;
        
        // Verificar si las fechas actuales están vacías o son números (timestamps)
        const currentVigenciaInicio = existingDoc.vigencia_inicio;
        const currentVigenciaFin = existingDoc.vigencia_fin;
        const needsDateUpdate = hasVigenciaUpdates && (
          !currentVigenciaInicio || !currentVigenciaFin ||
          currentVigenciaInicio === '-' || currentVigenciaFin === '-' ||
          currentVigenciaInicio === 'undefined' || currentVigenciaFin === 'undefined' ||
          typeof currentVigenciaInicio === 'number' || typeof currentVigenciaFin === 'number'
        );
        
        // Actualizar documento existente solo si hay cambios
        const hasChanges = Object.keys(updateData).some(key => {
          const newValue = updateData[key];
          const oldValue = existingDoc[key];
          // Para fechas, comparar de forma más flexible
          if (key.includes('vigencia') || key.includes('fecha')) {
            const newStr = String(newValue || '').trim();
            const oldStr = String(oldValue || '').trim();
            // Si el nuevo valor existe y es diferente, hay cambio
            if (newStr && newStr !== oldStr) return true;
          } else {
            return String(newValue || '') !== String(oldValue || '');
          }
          return false;
        });
        
        // SIEMPRE actualizar si hay fechas en el CSV (forzar actualización de fechas)
        if (hasChanges || needsDateUpdate || hasVigenciaUpdates) {
          try {
            const docId = existingDoc.firestoreId;
            if (docId && docId !== 'undefined' && docId !== 'null') {
              const docRef = doc(db, 'gmm', docId);
              
              // Log para debugging de fechas
              if (updateData.vigencia_inicio || updateData.vigencia_fin) {
                console.log(`📅 ${numeroPoliza} - Fechas:`);
                if (updateData.vigencia_inicio) {
                  console.log(`  vigencia_inicio: "${updateData.vigencia_inicio}" (actual: "${existingDoc.vigencia_inicio}")`);
                }
                if (updateData.vigencia_fin) {
                  console.log(`  vigencia_fin: "${updateData.vigencia_fin}" (actual: "${existingDoc.vigencia_fin}")`);
                }
              }
              
              await updateDoc(docRef, updateData);
              console.log(`✅ Actualizado: ${numeroPoliza} (${docId})`);
              updated++;
            } else {
              console.log(`⚠️  Documento sin ID válido: ${numeroPoliza}`);
              skipped++;
            }
          } catch (error) {
            console.log(`❌ Error actualizando ${numeroPoliza}: ${error.message}`);
            skipped++;
          }
        } else {
          console.log(`⏭️  Sin cambios: ${numeroPoliza}`);
          skipped++;
        }
      } else {
        // Crear nuevo documento
        await addDoc(collection(db, 'gmm'), {
          ...updateData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`➕ Creado: ${numeroPoliza}`);
        created++;
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`  ✅ Actualizados: ${updated}`);
    console.log(`  ➕ Creados: ${created}`);
    console.log(`  ⏭️  Sin cambios: ${skipped}`);
    console.log(`\n✨ Sincronización completada!`);
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
  }
}

syncGMMData();

