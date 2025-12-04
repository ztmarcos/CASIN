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
  'Vigencia (Inicio)': 'vigencia_inicio',
  'Vigencia (Fin)': 'vigencia_fin',
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

// Función para convertir fecha de formato CSV a formato estándar
function normalizeDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === 'N/A') return null;
  
  // Formato: 20-Apr-2024 o 18/12/2024
  if (typeof dateStr === 'string') {
    // Formato DD-MMM-YYYY (20-Apr-2024)
    if (dateStr.includes('-') && dateStr.length > 8) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parts[0];
        const monthMap = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
          'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const month = monthMap[parts[1]] || parts[1];
        const year = parts[2];
        return `${day}/${month}/${year}`;
      }
    }
    // Formato DD/MM/YYYY (18/12/2024)
    else if (dateStr.includes('/')) {
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

// Función para parsear CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
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
    
    if (values.length === headers.length) {
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
        
        if (csvValue !== undefined && csvValue !== '' && csvValue !== 'N/A') {
          // Normalizar fechas
          if (firebaseCol.includes('fecha') || firebaseCol.includes('vigencia')) {
            updateData[firebaseCol] = normalizeDate(csvValue);
          }
          // Normalizar números
          else if (firebaseCol.includes('importe') || firebaseCol.includes('prima') || 
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
        // Actualizar documento existente solo si hay cambios
        const hasChanges = Object.keys(updateData).some(key => {
          const newValue = updateData[key];
          const oldValue = existingDoc[key];
          return String(newValue || '') !== String(oldValue || '');
        });
        
        if (hasChanges) {
          try {
            const docId = existingDoc.firestoreId;
            if (docId && docId !== 'undefined' && docId !== 'null') {
              const docRef = doc(db, 'gmm', docId);
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

