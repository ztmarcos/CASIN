#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBe8jgFgGG4VCOjYzlPVNLEgJzZrFHIEKs",
  authDomain: "casinbbdd.firebaseapp.com",
  databaseURL: "https://casinbbdd-default-rtdb.firebaseio.com",
  projectId: "casinbbdd",
  storageBucket: "casinbbdd.firebasestorage.app",
  messagingSenderId: "990053961044",
  appId: "1:990053961044:web:b5f5c8d5e6f7a8b9c0d1e2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔍 VERIFICANDO USUARIOS Y EQUIPOS EN FIREBASE');
console.log('='.repeat(60));

async function checkUserTeams() {
  try {
    // 1. Verificar todos los equipos
    console.log('\n📋 1. EQUIPOS DISPONIBLES:');
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const teams = [];
    
    teamsSnapshot.forEach(doc => {
      const teamData = { id: doc.id, ...doc.data() };
      teams.push(teamData);
      console.log(`   🏢 ${teamData.name} (ID: ${teamData.id})`);
      console.log(`      Owner: ${teamData.owner}`);
      console.log(`      Created: ${teamData.createdAt?.toDate?.() || teamData.createdAt}`);
    });

    // 2. Verificar todos los miembros de equipos
    console.log('\n👥 2. MIEMBROS DE EQUIPOS:');
    const membersSnapshot = await getDocs(collection(db, 'team_members'));
    const members = [];
    
    membersSnapshot.forEach(doc => {
      const memberData = { id: doc.id, ...doc.data() };
      members.push(memberData);
    });

    // Agrupar por equipo
    const membersByTeam = {};
    members.forEach(member => {
      if (!membersByTeam[member.teamId]) {
        membersByTeam[member.teamId] = [];
      }
      membersByTeam[member.teamId].push(member);
    });

    // Mostrar miembros por equipo
    for (const [teamId, teamMembers] of Object.entries(membersByTeam)) {
      const team = teams.find(t => t.id === teamId);
      const teamName = team ? team.name : 'Equipo Desconocido';
      
      console.log(`\n   🏢 ${teamName} (${teamId}):`);
      teamMembers.forEach(member => {
        console.log(`      👤 ${member.name || member.email}`);
        console.log(`         📧 ${member.email}`);
        console.log(`         👑 ${member.role}`);
        console.log(`         📅 ${member.joinedAt?.toDate?.() || member.joinedAt}`);
        console.log(`         🔗 Invitado por: ${member.invitedBy}`);
      });
    }

    // 3. Verificar específicamente marcoszavala09 y z.t.marcos
    console.log('\n🎯 3. VERIFICACIÓN ESPECÍFICA DE USUARIOS:');
    
    const targetUsers = ['marcoszavala09@gmail.com', 'z.t.marcos@gmail.com'];
    
    for (const userEmail of targetUsers) {
      console.log(`\n   🔍 Verificando: ${userEmail}`);
      
      const userMembers = members.filter(m => m.email === userEmail);
      
      if (userMembers.length === 0) {
        console.log(`      ❌ Usuario NO encontrado en ningún equipo`);
      } else {
        console.log(`      ✅ Usuario encontrado en ${userMembers.length} equipo(s):`);
        
        userMembers.forEach(member => {
          const team = teams.find(t => t.id === member.teamId);
          console.log(`         🏢 Equipo: ${team ? team.name : 'Desconocido'} (${member.teamId})`);
          console.log(`         👑 Rol: ${member.role}`);
          console.log(`         📅 Unido: ${member.joinedAt?.toDate?.() || member.joinedAt}`);
          console.log(`         🔗 Invitado por: ${member.invitedBy}`);
        });
      }
    }

    // 4. Verificar si comparten equipos
    console.log('\n🤝 4. VERIFICACIÓN DE EQUIPOS COMPARTIDOS:');
    
    const marcosMembers = members.filter(m => m.email === 'marcoszavala09@gmail.com');
    const ztMarcosMembers = members.filter(m => m.email === 'z.t.marcos@gmail.com');
    
    if (marcosMembers.length === 0) {
      console.log('   ❌ marcoszavala09@gmail.com NO está en ningún equipo');
    }
    
    if (ztMarcosMembers.length === 0) {
      console.log('   ❌ z.t.marcos@gmail.com NO está en ningún equipo');
    }

    if (marcosMembers.length > 0 && ztMarcosMembers.length > 0) {
      const marcosTeamIds = marcosMembers.map(m => m.teamId);
      const ztMarcosTeamIds = ztMarcosMembers.map(m => m.teamId);
      
      const sharedTeams = marcosTeamIds.filter(teamId => ztMarcosTeamIds.includes(teamId));
      
      if (sharedTeams.length > 0) {
        console.log(`   ✅ COMPARTEN ${sharedTeams.length} EQUIPO(S):`);
        sharedTeams.forEach(teamId => {
          const team = teams.find(t => t.id === teamId);
          console.log(`      🏢 ${team ? team.name : 'Desconocido'} (${teamId})`);
        });
      } else {
        console.log('   ❌ NO COMPARTEN NINGÚN EQUIPO');
      }
    }

    // 5. Verificar colecciones disponibles para equipos CASIN
    console.log('\n📊 5. VERIFICACIÓN DE COLECCIONES CASIN:');
    
    const casinTeams = teams.filter(t => t.name.includes('CASIN') || t.owner === 'z.t.marcos@gmail.com');
    
    for (const team of casinTeams) {
      console.log(`\n   🏢 Equipo CASIN: ${team.name} (${team.id})`);
      
      // Verificar colecciones directas (sin prefijo team_)
      const directCollections = [
        'directorio_contactos', 'autos', 'vida', 'gmm', 'hogar', 
        'mascotas', 'rc', 'negocio', 'transporte', 'diversos'
      ];
      
      console.log('      📁 Colecciones directas:');
      for (const collectionName of directCollections) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(query(collectionRef, orderBy('__name__'), limit(1)));
          
          if (!snapshot.empty) {
            const fullSnapshot = await getDocs(collectionRef);
            console.log(`         ✅ ${collectionName} (${fullSnapshot.size} documentos)`);
          } else {
            console.log(`         ❌ ${collectionName} (vacía)`);
          }
        } catch (error) {
          console.log(`         ❌ ${collectionName} (no accesible)`);
        }
      }
      
      // Verificar colecciones con prefijo team_
      console.log('      📁 Colecciones con prefijo team_:');
      for (const collectionName of directCollections) {
        const teamCollectionName = `team_${team.id}_${collectionName}`;
        try {
          const collectionRef = collection(db, teamCollectionName);
          const snapshot = await getDocs(query(collectionRef, orderBy('__name__'), limit(1)));
          
          if (!snapshot.empty) {
            const fullSnapshot = await getDocs(collectionRef);
            console.log(`         ✅ ${teamCollectionName} (${fullSnapshot.size} documentos)`);
          } else {
            console.log(`         ❌ ${teamCollectionName} (vacía)`);
          }
        } catch (error) {
          console.log(`         ❌ ${teamCollectionName} (no accesible)`);
        }
      }
    }

    // 6. Resumen y recomendaciones
    console.log('\n📋 6. RESUMEN Y RECOMENDACIONES:');
    console.log('='.repeat(60));
    
    const marcosInTeam = marcosMembers.length > 0;
    const ztMarcosInTeam = ztMarcosMembers.length > 0;
    
    if (!marcosInTeam && !ztMarcosInTeam) {
      console.log('❌ PROBLEMA: Ninguno de los dos usuarios está en un equipo');
      console.log('💡 SOLUCIÓN: Asignar ambos usuarios al mismo equipo CASIN');
    } else if (!marcosInTeam) {
      console.log('❌ PROBLEMA: marcoszavala09 no está asignado a ningún equipo');
      console.log('💡 SOLUCIÓN: Asignar marcoszavala09 al equipo CASIN de z.t.marcos');
    } else if (!ztMarcosInTeam) {
      console.log('❌ PROBLEMA: z.t.marcos no está asignado a ningún equipo');
      console.log('💡 SOLUCIÓN: Asignar z.t.marcos al equipo CASIN');
    } else {
      const marcosTeamIds = marcosMembers.map(m => m.teamId);
      const ztMarcosTeamIds = ztMarcosMembers.map(m => m.teamId);
      const sharedTeams = marcosTeamIds.filter(teamId => ztMarcosTeamIds.includes(teamId));
      
      if (sharedTeams.length > 0) {
        console.log('✅ CORRECTO: Ambos usuarios están en el mismo equipo');
        console.log('🔍 VERIFICAR: Si ven datos diferentes, el problema está en el frontend');
      } else {
        console.log('❌ PROBLEMA: Los usuarios están en equipos diferentes');
        console.log('💡 SOLUCIÓN: Mover marcoszavala09 al equipo de z.t.marcos');
      }
    }

  } catch (error) {
    console.error('❌ Error verificando usuarios y equipos:', error);
  }
}

// Agregar limit import
import { limit } from 'firebase/firestore';

checkUserTeams().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error en la verificación:', error);
  process.exit(1);
}); 