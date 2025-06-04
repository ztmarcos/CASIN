// Migration script to upload real data from crud_db to Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';

// Your Firebase config (you'll need to add your actual values)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Real data from your crud_db_export.sql
const autosData = [
  {
    id: 1,
    nombre_contratante: 'Ricardo Oswaldo de la Parra Silva',
    numero_poliza: '4711747',
    aseguradora: 'Qualitas',
    vigencia_inicio: '19-Apr-2024',
    vigencia_fin: '19-Apr-2025',
    forma_de_pago: 'Anual',
    pago_total_o_prima_total: '1,691.86',
    prima_neta: '1,358.50',
    derecho_de_poliza: '100',
    recargo_por_pago_fraccionado: 0.00,
    i_v_a: 233.36,
    e_mail: 'ztmarcos@gmail.com',
    tipo_de_vehiculo: 'auto',
    duracion: '365 días',
    rfc: 'RENW850720QV4',
    domicilio_o_direccion: 'Playa Salagua Número. Exterior. 586 Número. Interior., Callep.: 08830 Municipio: Iztacalco Estado: Ciudad de Mexico',
    descripcion_del_vehiculo: 'HONDA PILOT LX 4X2 C/A AC EE AUT.',
    serie: '5FNYF18466B801296',
    modelo: '2006',
    placas: 'NXN3323',
    motor: 'J35A91514454',
    uso: 'Particular',
    pdf: 'https://drive.google.com/drive/folders/12muIe41tU2LoZYBDC7nkvfXFUgV70fZP?usp=sharing',
    ramo: 'Autos'
  },
  {
    id: 2,
    nombre_contratante: 'Leonardo Lopez Leon',
    numero_poliza: '4711550',
    aseguradora: 'Qualitas',
    vigencia_inicio: '4-May-2024',
    vigencia_fin: '4-May-2025',
    forma_de_pago: 'Anual',
    pago_total_o_prima_total: '4,010.82',
    prima_neta: '2,915.92',
    derecho_de_poliza: '600',
    recargo_por_pago_fraccionado: -58.32,
    i_v_a: 553.22,
    e_mail: null,
    tipo_de_vehiculo: 'auto',
    duracion: '365 días',
    rfc: 'LOLE800416T56',
    domicilio_o_direccion: 'U.h.fovissste San Pedro Martir Número. Exterior. 237 Número. Interior. Edi 14650 Tlalpan, Ciudad de Mexico',
    descripcion_del_vehiculo: '67536 (I)MO CARABELA VECTOR 250CC STD.',
    serie: 'LB425PCKXLC017909',
    modelo: '2020',
    placas: '6626G2',
    motor: '170FMM2L017909',
    uso: 'Particular',
    pdf: 'https://drive.google.com/drive/folders/1IcjdqU1cwdPnfdug_U1OW-tW2nJ2JdnS?usp=sharing',
    ramo: 'Autos'
  },
  {
    id: 3,
    nombre_contratante: 'Laura Hernandez Huitron',
    numero_poliza: '4763856',
    aseguradora: 'Qualitas',
    vigencia_inicio: '28-Jun-2024',
    vigencia_fin: '28-Jun-2025',
    forma_de_pago: 'Anual',
    pago_total_o_prima_total: '4,600.26',
    prima_neta: '3,434.43',
    derecho_de_poliza: '600',
    recargo_por_pago_fraccionado: -68.69,
    i_v_a: 634.52,
    e_mail: null,
    tipo_de_vehiculo: 'moto',
    duracion: '365 días',
    rfc: 'HEHL601229',
    domicilio_o_direccion: 'Lago Tanganica Número. Exterior. 5 Número. Interior. Callep.: 11520 Municipio: Miguel Hidalgo Estado: Ciudad de Mexico',
    descripcion_del_vehiculo: 'HONDA ELITE SCOOTER 125CC STD.',
    serie: 'LALJF7794J3002823',
    modelo: '2018',
    placas: '6F7ZR',
    motor: 'JF77E3002850',
    uso: 'Particular',
    pdf: 'https://drive.google.com/drive/folders/1N6pSgcBR0ADwMmfwSVL04NBzmLdFMRI6?usp=sharing',
    ramo: 'Autos'
  },
  // Add more records as needed...
];

// Sample of directorio_contactos data (first 10 records)
const contactosData = [
  {
    id: 1,
    origen: 'MZD',
    comentario: null,
    nombre_completo: 'Claudio El Gallo Vasconcelos',
    nombre_completo_oficial: 'Claudio El Gallo Vasconcelos',
    nickname: 'Claudio El Gallo',
    apellido: 'Vasconcelos',
    display_name: 'Claudio El Gallo Vasconcelos',
    empresa: null,
    telefono_oficina: null,
    telefono_casa: null,
    telefono_asistente: null,
    telefono_movil: '(55) 4128 6104',
    telefonos_corregidos: null,
    email: null,
    entidad: 'CIUDAD DE MÉXICO',
    genero: 'MASCULINO',
    status_social: 'OTRA',
    ocupacion: null,
    pais: 'MÉXICO',
    status: 'cliente',
    created_at: '2025-05-26 23:27:30',
    updated_at: '2025-05-26 23:27:30'
  },
  {
    id: 2,
    origen: 'MZD',
    comentario: null,
    nombre_completo: 'COLEGIO CIPRESES, S.C.',
    nombre_completo_oficial: 'Colegio Cipreses, S.C.',
    nickname: 'COLEGIO CIPRESES, S.C.',
    apellido: null,
    display_name: 'COLEGIO CIPRESES, S.C.',
    empresa: null,
    telefono_oficina: null,
    telefono_casa: null,
    telefono_asistente: null,
    telefono_movil: '56-71-56-63',
    telefonos_corregidos: null,
    email: 'c.cipreses@prodigy.net.mx',
    entidad: null,
    genero: null,
    status_social: null,
    ocupacion: 'Propietario de la empresa',
    pais: 'MÉXICO',
    status: 'cliente',
    created_at: '2025-05-26 23:27:30',
    updated_at: '2025-05-26 23:27:30'
  }
];

// RC data
const rcData = [
  {
    id: 1,
    asegurado: 'PANHEAD SA DE CV',
    numero_poliza: 609280466,
    aseguradora: 'GNP',
    fecha_inicio: '3/5/2024',
    fecha_fin: '3/5/2025',
    forma_pago: 'Prueba/Anual',
    importe_total: 2598.52,
    derecho_poliza: 75,
    prima_neta: 2062.50,
    recargo_pago_fraccionado: 102.60,
    iva: 358.42,
    email: 'ztmarcos@gmail.com',
    limite_maximo_responsabilidad: '1,000,000.00',
    responsable: null,
    ramo: 'Responsabilidad Civil'
  }
];

// Vida data
const vidaData = [
  {
    id: 1,
    contratante: 'Jorge Eduardo Aspron Pelayo',
    numero_poliza: 112354493,
    aseguradora: 'GNP',
    fecha_inicio: '11/3/2024',
    fecha_fin: '11/3/2025',
    forma_pago: 'Mensual',
    importe_a_pagar_mxn: 105708.63,
    prima_neta_mxn: 97878.36,
    derecho_poliza: 620,
    recargo_pago_fraccionado: 0,
    iva: 7830.27,
    email: 'ztmarcos@gmail.com',
    tipo_de_poliza: 'Seguro de Vida Proyecta',
    tipo_de_plan: 'Proyecta',
    rfc: 'AOPJ640928KX5',
    direccion: 'Calle Saturnino Herran 111, San Jose Insurgentes, Callep 03900, Benito Juarez, Distrito Federal',
    telefono: '55933347',
    fecha_expedicion: '2/2/2024',
    beneficiarios: 'Norma Luz Corredor Carrillo',
    edad_de_contratacion: '48 años',
    tipo_de_riesgo: 'ESTANDAR',
    fumador: 'No',
    coberturas: 'Protección para el Retiro (1,642,806.00 MXN, Pago único); Protección por Fallecimiento (1,642,806.00 MXN, Pago único); Últimos Gastos (Amparada); Seguridad en Vida (Amparada); Incremento No Fumador (15%, 246,420.90 MXN).',
    pdf: null,
    responsable: null,
    cobrar_a: null,
    ramo: 'Vida'
  },
  {
    id: 2,
    contratante: 'Martha Suarez Urquidi',
    numero_poliza: 374265783,
    aseguradora: 'GNP',
    fecha_inicio: '1/10/2025',
    fecha_fin: '1/10/2026',
    forma_pago: 'Anual',
    importe_a_pagar_mxn: 28017.46,
    prima_neta_mxn: 28017.46,
    derecho_poliza: 0,
    recargo_pago_fraccionado: 0,
    iva: 0.00,
    email: null,
    tipo_de_poliza: 'Vida',
    tipo_de_plan: 'Privilegio',
    rfc: 'SUUM7309057P7',
    direccion: 'Calle Amores 849-d-4 del Valle Centro Callep.03100 Alcaldia Benito Juarez Cd Mx',
    telefono: '39082485',
    fecha_expedicion: '1/10/2025',
    beneficiarios: 'Martha Antonia Clementina Urquidi Frisbie',
    edad_de_contratacion: '46',
    tipo_de_riesgo: 'Estandar',
    fumador: 'NO',
    coberturas: 'Protección por Fallecimiento',
    pdf: 'SI',
    responsable: 'Lore',
    cobrar_a: 'MATHA SUAREZ',
    ramo: 'Vida'
  }
];

// Migration function
async function migrateToFirebase() {
  try {
    console.log('🚀 Starting migration to Firebase...');

    // Migrate Autos
    console.log('📊 Migrating autos data...');
    const autosBatch = writeBatch(db);
    autosData.forEach((auto) => {
      const docRef = doc(collection(db, 'autos'));
      autosBatch.set(docRef, {
        ...auto,
        migratedAt: new Date(),
        originalMySQLId: auto.id
      });
    });
    await autosBatch.commit();
    console.log(`✅ Migrated ${autosData.length} autos records`);

    // Migrate Contactos (sample)
    console.log('📊 Migrating contactos data...');
    const contactosBatch = writeBatch(db);
    contactosData.forEach((contacto) => {
      const docRef = doc(collection(db, 'directorio_contactos'));
      contactosBatch.set(docRef, {
        ...contacto,
        migratedAt: new Date(),
        originalMySQLId: contacto.id
      });
    });
    await contactosBatch.commit();
    console.log(`✅ Migrated ${contactosData.length} contactos records (sample)`);

    // Migrate RC
    console.log('📊 Migrating RC data...');
    const rcBatch = writeBatch(db);
    rcData.forEach((rc) => {
      const docRef = doc(collection(db, 'rc'));
      rcBatch.set(docRef, {
        ...rc,
        migratedAt: new Date(),
        originalMySQLId: rc.id
      });
    });
    await rcBatch.commit();
    console.log(`✅ Migrated ${rcData.length} RC records`);

    // Migrate Vida
    console.log('📊 Migrating vida data...');
    const vidaBatch = writeBatch(db);
    vidaData.forEach((vida) => {
      const docRef = doc(collection(db, 'vida'));
      vidaBatch.set(docRef, {
        ...vida,
        migratedAt: new Date(),
        originalMySQLId: vida.id
      });
    });
    await vidaBatch.commit();
    console.log(`✅ Migrated ${vidaData.length} vida records`);

    // Create empty collections for other tables
    const emptyCollections = ['gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
    for (const collectionName of emptyCollections) {
      const docRef = doc(collection(db, collectionName), 'placeholder');
      await setDoc(docRef, {
        placeholder: true,
        message: `This collection is ready for ${collectionName} data`,
        createdAt: new Date()
      });
      console.log(`✅ Created empty collection: ${collectionName}`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Autos: ${autosData.length} records`);
    console.log(`   - Contactos: ${contactosData.length} records (sample)`);
    console.log(`   - RC: ${rcData.length} records`);
    console.log(`   - Vida: ${vidaData.length} records`);
    console.log(`   - Empty collections: ${emptyCollections.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
if (typeof window === 'undefined') {
  // Node.js environment
  migrateToFirebase();
} else {
  // Browser environment - expose function
  window.migrateToFirebase = migrateToFirebase;
}

export default migrateToFirebase; 
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';

// Your Firebase config (you'll need to add your actual values)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Real data from your crud_db_export.sql
const autosData = [
  {
    id: 1,
    nombre_contratante: 'Ricardo Oswaldo de la Parra Silva',
    numero_poliza: '4711747',
    aseguradora: 'Qualitas',
    vigencia_inicio: '19-Apr-2024',
    vigencia_fin: '19-Apr-2025',
    forma_de_pago: 'Anual',
    pago_total_o_prima_total: '1,691.86',
    prima_neta: '1,358.50',
    derecho_de_poliza: '100',
    recargo_por_pago_fraccionado: 0.00,
    i_v_a: 233.36,
    e_mail: 'ztmarcos@gmail.com',
    tipo_de_vehiculo: 'auto',
    duracion: '365 días',
    rfc: 'RENW850720QV4',
    domicilio_o_direccion: 'Playa Salagua Número. Exterior. 586 Número. Interior., Callep.: 08830 Municipio: Iztacalco Estado: Ciudad de Mexico',
    descripcion_del_vehiculo: 'HONDA PILOT LX 4X2 C/A AC EE AUT.',
    serie: '5FNYF18466B801296',
    modelo: '2006',
    placas: 'NXN3323',
    motor: 'J35A91514454',
    uso: 'Particular',
    pdf: 'https://drive.google.com/drive/folders/12muIe41tU2LoZYBDC7nkvfXFUgV70fZP?usp=sharing',
    ramo: 'Autos'
  },
  {
    id: 2,
    nombre_contratante: 'Leonardo Lopez Leon',
    numero_poliza: '4711550',
    aseguradora: 'Qualitas',
    vigencia_inicio: '4-May-2024',
    vigencia_fin: '4-May-2025',
    forma_de_pago: 'Anual',
    pago_total_o_prima_total: '4,010.82',
    prima_neta: '2,915.92',
    derecho_de_poliza: '600',
    recargo_por_pago_fraccionado: -58.32,
    i_v_a: 553.22,
    e_mail: null,
    tipo_de_vehiculo: 'auto',
    duracion: '365 días',
    rfc: 'LOLE800416T56',
    domicilio_o_direccion: 'U.h.fovissste San Pedro Martir Número. Exterior. 237 Número. Interior. Edi 14650 Tlalpan, Ciudad de Mexico',
    descripcion_del_vehiculo: '67536 (I)MO CARABELA VECTOR 250CC STD.',
    serie: 'LB425PCKXLC017909',
    modelo: '2020',
    placas: '6626G2',
    motor: '170FMM2L017909',
    uso: 'Particular',
    pdf: 'https://drive.google.com/drive/folders/1IcjdqU1cwdPnfdug_U1OW-tW2nJ2JdnS?usp=sharing',
    ramo: 'Autos'
  },
  {
    id: 3,
    nombre_contratante: 'Laura Hernandez Huitron',
    numero_poliza: '4763856',
    aseguradora: 'Qualitas',
    vigencia_inicio: '28-Jun-2024',
    vigencia_fin: '28-Jun-2025',
    forma_de_pago: 'Anual',
    pago_total_o_prima_total: '4,600.26',
    prima_neta: '3,434.43',
    derecho_de_poliza: '600',
    recargo_por_pago_fraccionado: -68.69,
    i_v_a: 634.52,
    e_mail: null,
    tipo_de_vehiculo: 'moto',
    duracion: '365 días',
    rfc: 'HEHL601229',
    domicilio_o_direccion: 'Lago Tanganica Número. Exterior. 5 Número. Interior. Callep.: 11520 Municipio: Miguel Hidalgo Estado: Ciudad de Mexico',
    descripcion_del_vehiculo: 'HONDA ELITE SCOOTER 125CC STD.',
    serie: 'LALJF7794J3002823',
    modelo: '2018',
    placas: '6F7ZR',
    motor: 'JF77E3002850',
    uso: 'Particular',
    pdf: 'https://drive.google.com/drive/folders/1N6pSgcBR0ADwMmfwSVL04NBzmLdFMRI6?usp=sharing',
    ramo: 'Autos'
  },
  // Add more records as needed...
];

// Sample of directorio_contactos data (first 10 records)
const contactosData = [
  {
    id: 1,
    origen: 'MZD',
    comentario: null,
    nombre_completo: 'Claudio El Gallo Vasconcelos',
    nombre_completo_oficial: 'Claudio El Gallo Vasconcelos',
    nickname: 'Claudio El Gallo',
    apellido: 'Vasconcelos',
    display_name: 'Claudio El Gallo Vasconcelos',
    empresa: null,
    telefono_oficina: null,
    telefono_casa: null,
    telefono_asistente: null,
    telefono_movil: '(55) 4128 6104',
    telefonos_corregidos: null,
    email: null,
    entidad: 'CIUDAD DE MÉXICO',
    genero: 'MASCULINO',
    status_social: 'OTRA',
    ocupacion: null,
    pais: 'MÉXICO',
    status: 'cliente',
    created_at: '2025-05-26 23:27:30',
    updated_at: '2025-05-26 23:27:30'
  },
  {
    id: 2,
    origen: 'MZD',
    comentario: null,
    nombre_completo: 'COLEGIO CIPRESES, S.C.',
    nombre_completo_oficial: 'Colegio Cipreses, S.C.',
    nickname: 'COLEGIO CIPRESES, S.C.',
    apellido: null,
    display_name: 'COLEGIO CIPRESES, S.C.',
    empresa: null,
    telefono_oficina: null,
    telefono_casa: null,
    telefono_asistente: null,
    telefono_movil: '56-71-56-63',
    telefonos_corregidos: null,
    email: 'c.cipreses@prodigy.net.mx',
    entidad: null,
    genero: null,
    status_social: null,
    ocupacion: 'Propietario de la empresa',
    pais: 'MÉXICO',
    status: 'cliente',
    created_at: '2025-05-26 23:27:30',
    updated_at: '2025-05-26 23:27:30'
  }
];

// RC data
const rcData = [
  {
    id: 1,
    asegurado: 'PANHEAD SA DE CV',
    numero_poliza: 609280466,
    aseguradora: 'GNP',
    fecha_inicio: '3/5/2024',
    fecha_fin: '3/5/2025',
    forma_pago: 'Prueba/Anual',
    importe_total: 2598.52,
    derecho_poliza: 75,
    prima_neta: 2062.50,
    recargo_pago_fraccionado: 102.60,
    iva: 358.42,
    email: 'ztmarcos@gmail.com',
    limite_maximo_responsabilidad: '1,000,000.00',
    responsable: null,
    ramo: 'Responsabilidad Civil'
  }
];

// Vida data
const vidaData = [
  {
    id: 1,
    contratante: 'Jorge Eduardo Aspron Pelayo',
    numero_poliza: 112354493,
    aseguradora: 'GNP',
    fecha_inicio: '11/3/2024',
    fecha_fin: '11/3/2025',
    forma_pago: 'Mensual',
    importe_a_pagar_mxn: 105708.63,
    prima_neta_mxn: 97878.36,
    derecho_poliza: 620,
    recargo_pago_fraccionado: 0,
    iva: 7830.27,
    email: 'ztmarcos@gmail.com',
    tipo_de_poliza: 'Seguro de Vida Proyecta',
    tipo_de_plan: 'Proyecta',
    rfc: 'AOPJ640928KX5',
    direccion: 'Calle Saturnino Herran 111, San Jose Insurgentes, Callep 03900, Benito Juarez, Distrito Federal',
    telefono: '55933347',
    fecha_expedicion: '2/2/2024',
    beneficiarios: 'Norma Luz Corredor Carrillo',
    edad_de_contratacion: '48 años',
    tipo_de_riesgo: 'ESTANDAR',
    fumador: 'No',
    coberturas: 'Protección para el Retiro (1,642,806.00 MXN, Pago único); Protección por Fallecimiento (1,642,806.00 MXN, Pago único); Últimos Gastos (Amparada); Seguridad en Vida (Amparada); Incremento No Fumador (15%, 246,420.90 MXN).',
    pdf: null,
    responsable: null,
    cobrar_a: null,
    ramo: 'Vida'
  },
  {
    id: 2,
    contratante: 'Martha Suarez Urquidi',
    numero_poliza: 374265783,
    aseguradora: 'GNP',
    fecha_inicio: '1/10/2025',
    fecha_fin: '1/10/2026',
    forma_pago: 'Anual',
    importe_a_pagar_mxn: 28017.46,
    prima_neta_mxn: 28017.46,
    derecho_poliza: 0,
    recargo_pago_fraccionado: 0,
    iva: 0.00,
    email: null,
    tipo_de_poliza: 'Vida',
    tipo_de_plan: 'Privilegio',
    rfc: 'SUUM7309057P7',
    direccion: 'Calle Amores 849-d-4 del Valle Centro Callep.03100 Alcaldia Benito Juarez Cd Mx',
    telefono: '39082485',
    fecha_expedicion: '1/10/2025',
    beneficiarios: 'Martha Antonia Clementina Urquidi Frisbie',
    edad_de_contratacion: '46',
    tipo_de_riesgo: 'Estandar',
    fumador: 'NO',
    coberturas: 'Protección por Fallecimiento',
    pdf: 'SI',
    responsable: 'Lore',
    cobrar_a: 'MATHA SUAREZ',
    ramo: 'Vida'
  }
];

// Migration function
async function migrateToFirebase() {
  try {
    console.log('🚀 Starting migration to Firebase...');

    // Migrate Autos
    console.log('📊 Migrating autos data...');
    const autosBatch = writeBatch(db);
    autosData.forEach((auto) => {
      const docRef = doc(collection(db, 'autos'));
      autosBatch.set(docRef, {
        ...auto,
        migratedAt: new Date(),
        originalMySQLId: auto.id
      });
    });
    await autosBatch.commit();
    console.log(`✅ Migrated ${autosData.length} autos records`);

    // Migrate Contactos (sample)
    console.log('📊 Migrating contactos data...');
    const contactosBatch = writeBatch(db);
    contactosData.forEach((contacto) => {
      const docRef = doc(collection(db, 'directorio_contactos'));
      contactosBatch.set(docRef, {
        ...contacto,
        migratedAt: new Date(),
        originalMySQLId: contacto.id
      });
    });
    await contactosBatch.commit();
    console.log(`✅ Migrated ${contactosData.length} contactos records (sample)`);

    // Migrate RC
    console.log('📊 Migrating RC data...');
    const rcBatch = writeBatch(db);
    rcData.forEach((rc) => {
      const docRef = doc(collection(db, 'rc'));
      rcBatch.set(docRef, {
        ...rc,
        migratedAt: new Date(),
        originalMySQLId: rc.id
      });
    });
    await rcBatch.commit();
    console.log(`✅ Migrated ${rcData.length} RC records`);

    // Migrate Vida
    console.log('📊 Migrating vida data...');
    const vidaBatch = writeBatch(db);
    vidaData.forEach((vida) => {
      const docRef = doc(collection(db, 'vida'));
      vidaBatch.set(docRef, {
        ...vida,
        migratedAt: new Date(),
        originalMySQLId: vida.id
      });
    });
    await vidaBatch.commit();
    console.log(`✅ Migrated ${vidaData.length} vida records`);

    // Create empty collections for other tables
    const emptyCollections = ['gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
    for (const collectionName of emptyCollections) {
      const docRef = doc(collection(db, collectionName), 'placeholder');
      await setDoc(docRef, {
        placeholder: true,
        message: `This collection is ready for ${collectionName} data`,
        createdAt: new Date()
      });
      console.log(`✅ Created empty collection: ${collectionName}`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Autos: ${autosData.length} records`);
    console.log(`   - Contactos: ${contactosData.length} records (sample)`);
    console.log(`   - RC: ${rcData.length} records`);
    console.log(`   - Vida: ${vidaData.length} records`);
    console.log(`   - Empty collections: ${emptyCollections.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
if (typeof window === 'undefined') {
  // Node.js environment
  migrateToFirebase();
} else {
  // Browser environment - expose function
  window.migrateToFirebase = migrateToFirebase;
}

export default migrateToFirebase; 