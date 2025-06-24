import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import firebaseTeamService from '../services/firebaseTeamService';
import firebaseTeamStorageService from '../services/firebaseTeamStorageService';
import { setCurrentTeam } from '../services/firebaseService';

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  console.log('🏢 TeamProvider: Component initializing...');
  
  const { user } = useAuth();
  console.log('🏢 TeamProvider: Got user from AuthContext:', user);
  
  const [userTeam, setUserTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [needsTeamSetup, setNeedsTeamSetup] = useState(false);
  const [teamFirebaseConfig, setTeamFirebaseConfig] = useState(null);

  // Cargar equipo del usuario cuando se autentica
  useEffect(() => {
    console.log('🔄 TeamContext: useEffect triggered, user:', user);
    
    if (user?.email) {
      console.log('🔍 User authenticated, loading team data for:', user.email);
      console.log('👤 User details:', { email: user.email, uid: user.uid, name: user.name });
      loadUserTeam();
    } else {
      console.log('👤 User not authenticated, resetting team state');
      console.log('👤 User value:', user);
      resetTeamState();
    }
  }, [user]);

  const resetTeamState = () => {
    setUserTeam(null);
    setTeamMembers([]);
    setUserRole(null);
    setNeedsTeamSetup(false);
    setTeamFirebaseConfig(null);
    setIsLoadingTeam(false);
    
    // 🚫 DESACTIVAR SISTEMA DE EQUIPOS EN FIREBASE SERVICE
    setCurrentTeam(null);
    console.log('🏢 Team system DEACTIVATED in FirebaseService');
  };

  const setupTeamFirebase = async (teamId, teamData) => {
    try {
      console.log('🔧 Setting up Firebase for team:', teamData.name);
      
      // Configurar Firebase para este equipo específico
      const firebaseConfig = await firebaseTeamService.switchToTeam(teamId, teamData);
      setTeamFirebaseConfig(firebaseConfig);
      
      // ✨ ACTIVAR SISTEMA DE EQUIPOS EN FIREBASE SERVICE
      setCurrentTeam(teamId);
      console.log('🏢 Team system ACTIVATED in FirebaseService for team:', teamId);
      
      // Configurar el servicio de almacenamiento para este equipo
      firebaseTeamStorageService.setCurrentTeam(teamId);
      console.log('🗂️ Team storage service configured for team:', teamId);
      
      console.log('✅ Team Firebase configuration ready');
      
      return firebaseConfig;
    } catch (error) {
      console.error('❌ Error setting up team Firebase:', error);
      throw error;
    }
  };

  const loadUserTeam = async () => {
    setIsLoadingTeam(true);
    
    try {
      console.log('🔍 Loading team for user:', user.email);
      
      // Para usuarios específicos, asignar directamente al equipo CASIN
      if (user.email === 'z.t.marcos@gmail.com' || user.email === '2012solitario@gmail.com') {
        console.log('🎯 Special user detected, assigning to CASIN team ngXzjqxlBy8Bsv8ks3vc');
        
        const teamId = 'ngXzjqxlBy8Bsv8ks3vc';
        const teamData = {
          id: teamId,
          name: 'CASIN Team',
          description: 'Equipo principal CASIN',
          createdAt: new Date(),
          isMainTeam: true
        };
        
        setUserTeam(teamData);
        setUserRole('admin');
        
        // Configurar Firebase para este equipo
        await setupTeamFirebase(teamId, teamData);
        
        // Verificar si el usuario existe en team_members, si no, crearlo
        const memberQuery = query(
          collection(db, 'team_members'),
          where('email', '==', user.email),
          where('teamId', '==', teamId)
        );
        
        const memberSnapshot = await getDocs(memberQuery);
        
        if (memberSnapshot.empty) {
          console.log('👤 Creating team member record for special user');
          // Crear el registro del miembro del equipo
          await addDoc(collection(db, 'team_members'), {
            userId: user.uid || user.email.replace(/[@.]/g, '_'),
            email: user.email,
            name: user.name || user.displayName || (user.email === 'z.t.marcos@gmail.com' ? 'Marcos Zavala' : '2012 Solitario'),
            teamId: teamId,
            role: 'admin',
            invitedBy: user.email,
            joinedAt: new Date(),
            status: 'active',
            isOwner: true
          });
          console.log('✅ Team member record created');
        }
        
        // Cargar todos los miembros del equipo
        await loadTeamMembers(teamId);
        
        console.log('✅ Special team assignment completed for CASIN');
        setIsLoadingTeam(false);
        return;
      }
      
      // Buscar al usuario en team_members
      const membersQuery = query(
        collection(db, 'team_members'),
        where('email', '==', user.email)
      );
      
      const memberSnapshot = await getDocs(membersQuery);
      
      if (memberSnapshot.empty) {
        console.log('👤 User not found in any team - needs setup');
        setNeedsTeamSetup(true);
        setIsLoadingTeam(false);
        return;
      }

      // Usuario existe en un equipo
      const memberDoc = memberSnapshot.docs[0];
      const memberData = memberDoc.data();
      
      console.log('👥 User found in team:', memberData.teamId);
      setUserRole(memberData.role);

      // Cargar datos completos del equipo
      const teamDoc = await getDoc(doc(db, 'teams', memberData.teamId));
      
      if (teamDoc.exists()) {
        const teamData = { id: teamDoc.id, ...teamDoc.data() };
        setUserTeam(teamData);
        
        // Configurar Firebase para este equipo
        await setupTeamFirebase(teamDoc.id, teamData);
        
        // Cargar todos los miembros del equipo
        await loadTeamMembers(memberData.teamId);
        
        console.log('✅ Team loaded successfully:', teamData.name);
      } else {
        console.error('❌ Team document not found');
        setNeedsTeamSetup(true);
      }

    } catch (error) {
      console.error('❌ Error loading user team:', error);
      setNeedsTeamSetup(true);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const loadTeamMembers = async (teamId) => {
    try {
      const membersQuery = query(
        collection(db, 'team_members'),
        where('teamId', '==', teamId)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const members = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTeamMembers(members);
      console.log(`👥 Loaded ${members.length} team members`);
      
    } catch (error) {
      console.error('❌ Error loading team members:', error);
    }
  };

  // Inicializar colecciones usando plantillas CASIN cuando sea posible
  const initializeTeamCollections = async (teamId, teamName, ownerEmail) => {
    try {
      console.log('🗂️ Initializing collections for team:', teamId);

      // Usar el nuevo servicio automático de inicialización
      const AutoTeamInitializer = (await import('../services/autoTeamInitializer')).default;
      
      try {
        console.log('🚀 Usando inicialización automática avanzada...');
        const results = await AutoTeamInitializer.initializeNewTeam(teamId, teamName, ownerEmail);
        
        if (results.length > 0) {
          console.log(`✅ Equipo inicializado automáticamente con ${results.length} colecciones`);
          
          // Inicializar colección de tareas también
          await initializeTasksCollection(teamId);
          
          return results;
        }
      } catch (autoError) {
        console.warn('⚠️ Error en inicialización automática, usando método básico:', autoError.message);
      }

      // Fallback: método básico original
      console.log('📋 Usando inicialización básica...');
      
      // Colecciones que cada equipo debe tener
      const collectionsToCreate = [
        'contactos',
        'polizas', 
        'tareas',
        'reportes',
        'configuracion'
      ];

      // Datos iniciales para cada colección
      const initialData = {
        contactos: [
          {
            nombre: 'Contacto de Ejemplo',
            email: 'ejemplo@empresa.com',
            telefono: '555-0123',
            empresa: 'Empresa Demo',
            cargo: 'Gerente',
            fechaCreacion: serverTimestamp(),
            activo: true,
            notas: 'Contacto de ejemplo para empezar'
          }
        ],
        polizas: [
          {
            numeroPoliza: 'DEMO-001',
            tipoPoliza: 'vida',
            compania: 'Seguros Demo',
            prima: 1000,
            fechaInicio: new Date(),
            fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            status: 'vigente',
            fechaCreacion: serverTimestamp()
          }
        ],
        tareas: [
          {
            titulo: 'Bienvenido a tu equipo',
            descripcion: 'Configura tu equipo y comienza a trabajar',
            prioridad: 'alta',
            status: 'pendiente',
            fechaCreacion: serverTimestamp(),
            asignadoA: user?.email || 'admin'
          }
        ],
        reportes: [
          {
            nombre: 'Reporte Inicial',
            tipo: 'general',
            fechaCreacion: serverTimestamp(),
            generadoPor: user?.email || 'admin',
            datos: { mensaje: 'Tu primer reporte está listo' }
          }
        ],
        configuracion: [
          {
            clave: 'team_initialized',
            valor: true,
            descripcion: 'Indica que el equipo ha sido inicializado',
            fechaCreacion: serverTimestamp()
          }
        ]
      };

      // Crear las colecciones y sus datos iniciales
      const TeamDataService = (await import('../services/teamDataService')).default;
      const results = [];

      for (const collectionName of collectionsToCreate) {
        try {
          console.log(`📝 Creando colección: ${collectionName}`);
          
          const data = initialData[collectionName];
          if (data && data.length > 0) {
            for (const item of data) {
              const result = await TeamDataService.createDocument(collectionName, item);
              results.push(result);
            }
          }
          
          console.log(`✅ Colección ${collectionName} creada exitosamente`);
        } catch (error) {
          console.error(`❌ Error creando colección ${collectionName}:`, error);
        }
      }

      // Inicializar colección de tareas con Firebase Tasks Service
      await initializeTasksCollection(teamId);

      console.log(`🎉 Inicialización completada. ${results.length} documentos creados.`);
      return results;

    } catch (error) {
      console.error('❌ Error durante la inicialización de colecciones:', error);
      throw error;
    }
  };

  // Inicializar colección de tareas específicamente
  const initializeTasksCollection = async (teamId) => {
    try {
      console.log('📋 Initializing Firebase Tasks collection...');
      
      const firebaseTaskService = (await import('../services/firebaseTaskService')).default;
      await firebaseTaskService.initializeTasksCollection();
      
      console.log('✅ Firebase Tasks collection initialized');
    } catch (error) {
      console.warn('⚠️ Could not initialize tasks collection:', error.message);
      // No lanzar error para que no interrumpa la creación del equipo
    }
  };

  const createTeam = async (teamName, teamMembers = []) => {
    if (!user?.email || !user?.uid) {
      throw new Error('User not properly authenticated - missing email or uid');
    }

    try {
      console.log('🏢 Creating new team:', teamName);
      console.log('👤 User data:', { email: user.email, uid: user.uid, name: user.name });
      console.log('👥 Team members to add:', teamMembers);
      
      // Generar ID simple y legible basado en el nombre del equipo
      const generateTeamId = (name) => {
        // Convertir a minúsculas y limpiar
        const cleanName = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s]/g, '') // Quitar caracteres especiales
          .replace(/\s+/g, '_') // Reemplazar espacios por guiones bajos
          .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos por uno solo
          .replace(/^_|_$/g, ''); // Quitar guiones bajos al inicio y final
        
        // Si el nombre queda vacío, usar un fallback
        const finalName = cleanName || 'equipo';
        
        // Retornar directamente el nombre sin prefijo "team_" adicional
        // Ya que las colecciones usarán el patrón team_{teamId}_{collection}
        return finalName;
      };

      const teamId = generateTeamId(teamName);
      console.log('🆔 Generated team ID:', teamId);

      // Verificar que el ID no esté ya en uso
      const existingTeamDoc = await getDoc(doc(db, 'teams', teamId));
      let finalTeamId = teamId;
      
      if (existingTeamDoc.exists()) {
        // Si existe, agregar timestamp para hacerlo único
        const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos
        finalTeamId = `${teamId}_${timestamp}`;
        console.log('⚠️ Team ID exists, using unique ID:', finalTeamId);
      }

      // Crear el equipo con el ID personalizado
      const teamData = {
        name: teamName,
        owner: user.email,
        createdAt: serverTimestamp(),
        firebaseProject: `casin-${Date.now()}`, // Temporal - luego será proyecto real
        settings: {
          allowInvites: true,
          maxMembers: 50
        }
      };

      await setDoc(doc(db, 'teams', finalTeamId), teamData);
      console.log('✅ Team created with ID:', finalTeamId);
      
      const teamDocRef = { id: finalTeamId };

      // Agregar al usuario como admin del equipo
      await addDoc(collection(db, 'team_members'), {
        userId: user.uid,
        email: user.email,
        name: user.name || user.email,
        teamId: finalTeamId,
        role: 'admin',
        invitedBy: user.email,
        joinedAt: serverTimestamp(),
        status: 'active'
      });

      console.log('✅ User added as team admin');

      // Agregar miembros del equipo
      for (const member of teamMembers) {
        if (member.email && member.email.trim()) {
          try {
            await addDoc(collection(db, 'team_members'), {
              userId: null, // Se llenará cuando el usuario haga login
              email: member.email.trim(),
              name: member.name || member.email.trim(),
              teamId: finalTeamId,
              role: 'member',
              invitedBy: user.email,
              joinedAt: serverTimestamp(),
              status: 'invited'
            });
            console.log(`✅ Member invited: ${member.email}`);
          } catch (memberError) {
            console.warn(`⚠️ Could not invite member ${member.email}:`, memberError);
          }
        }
      }

      console.log(`✅ Team created with ${teamMembers.length} invited members`);

      // Inicializar colecciones del equipo con estructura automática
      await initializeTeamCollections(finalTeamId, teamName, user.email);

      // Crear estructura de almacenamiento para el equipo
      try {
        console.log('🗂️ Creating Firebase Storage structure for team...');
        const storageResult = await firebaseTeamStorageService.createTeamStorageStructure(
          finalTeamId, 
          teamName
        );
        console.log('✅ Team storage structure created:', storageResult);
      } catch (storageError) {
        console.warn('⚠️ Could not create team storage structure:', storageError);
        // No lanzar error aquí - el equipo puede funcionar sin storage inicialmente
      }

      // Recargar datos del equipo
      await loadUserTeam();
      
      return finalTeamId;

    } catch (error) {
      console.error('❌ Error creating team:', error);
      throw error;
    }
  };

  const inviteUserToTeam = async (emailToInvite) => {
    if (!userTeam) {
      throw new Error('No team available');
    }

    try {
      console.log('📧 Inviting user to team:', emailToInvite);
      
      // Verificar que el usuario no esté ya en el equipo
      const existingMemberQuery = query(
        collection(db, 'team_members'),
        where('email', '==', emailToInvite),
        where('teamId', '==', userTeam.id)
      );
      
      const existingMember = await getDocs(existingMemberQuery);
      if (!existingMember.empty) {
        throw new Error('User is already a member of this team');
      }

      // Por ahora, agregar directamente (en producción sería un sistema de invitaciones)
      await addDoc(collection(db, 'team_members'), {
        userId: null, // Se llenará cuando el usuario haga login
        email: emailToInvite,
        name: emailToInvite,
        teamId: userTeam.id,
        role: 'member',
        invitedBy: user.email,
        joinedAt: serverTimestamp(),
        status: 'invited' // pending invitation
      });

      console.log('✅ User invited successfully');
      
      // Recargar miembros del equipo
      await loadTeamMembers(userTeam.id);
      
      return true;

    } catch (error) {
      console.error('❌ Error inviting user:', error);
      throw error;
    }
  };

  const removeUserFromTeam = async (memberEmail) => {
    if (!userTeam) {
      throw new Error('No team available');
    }

    if (memberEmail === user.email) {
      throw new Error('Cannot remove yourself from the team');
    }

    try {
      console.log('🗑️ Removing user from team:', memberEmail);
      
      const memberQuery = query(
        collection(db, 'team_members'),
        where('email', '==', memberEmail),
        where('teamId', '==', userTeam.id)
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        const memberDoc = memberSnapshot.docs[0];
        await deleteDoc(memberDoc.ref);
        
        console.log('✅ User removed successfully');
        
        // Recargar miembros del equipo
        await loadTeamMembers(userTeam.id);
        
        return true;
      }

    } catch (error) {
      console.error('❌ Error removing user:', error);
      throw error;
    }
  };

  // Función para crear usuarios de prueba (solo para desarrollo)
  const createTestUsers = async () => {
    if (!userTeam) {
      console.error('No team available for creating test users');
      return;
    }

    const testUsers = [
      {
        email: 'maria.garcia@example.com',
        name: 'María García',
        role: 'member'
      },
      {
        email: 'carlos.lopez@example.com', 
        name: 'Carlos López',
        role: 'member'
      },
      {
        email: 'ana.martinez@example.com',
        name: 'Ana Martínez', 
        role: 'admin'
      },
      {
        email: 'pedro.sanchez@example.com',
        name: 'Pedro Sánchez',
        role: 'member'
      }
    ];

    try {
      console.log('👥 Creating test users for team:', userTeam.id);
      
      for (const testUser of testUsers) {
        // Verificar si el usuario ya existe
        const existingQuery = query(
          collection(db, 'team_members'),
          where('email', '==', testUser.email),
          where('teamId', '==', userTeam.id)
        );
        
        const existing = await getDocs(existingQuery);
        
        if (existing.empty) {
          await addDoc(collection(db, 'team_members'), {
            userId: testUser.email.replace(/[@.]/g, '_'),
            email: testUser.email,
            name: testUser.name,
            teamId: userTeam.id,
            role: testUser.role,
            invitedBy: user.email,
            joinedAt: new Date(),
            status: 'active',
            isTestUser: true
          });
          console.log(`✅ Created test user: ${testUser.name}`);
        } else {
          console.log(`ℹ️ Test user already exists: ${testUser.name}`);
        }
      }
      
      // Recargar miembros del equipo
      await loadTeamMembers(userTeam.id);
      
      console.log('🎉 Test users creation completed');
      
    } catch (error) {
      console.error('❌ Error creating test users:', error);
    }
  };

  const isAdmin = () => userRole === 'admin';
  const isMember = () => userRole === 'member' || userRole === 'admin';
  
  // Función para determinar si puede gestionar aspectos básicos del equipo
  const canManageTeam = () => {
    // Los admins siempre pueden gestionar
    if (userRole === 'admin') return true;
    
    // Los miembros regulares pueden ver datos del equipo, pero no gestionar configuraciones críticas
    if (userRole === 'member') return true;
    
    // Para otros usuarios (invitados), permitir acceso de solo lectura
    return false;
  };
  
  // Función para verificar si puede gestionar usuarios del equipo
  const canManageUsers = () => {
    // Solo los administradores pueden gestionar usuarios
    return userRole === 'admin';
  };

  // Nueva función para verificar si puede acceder a datos críticos del equipo
  const canAccessTeamData = () => {
    // Solo administradores pueden acceder a datos críticos del equipo y DB viewer
    return userRole === 'admin';
  };

  // Función para verificar si es miembro activo del equipo (incluye admin y member)
  const isActiveMember = () => {
    return userRole === 'admin' || userRole === 'member';
  };

  const value = {
    userTeam,
    teamMembers,
    currentTeamMembers: teamMembers, // Alias para compatibilidad
    isLoadingTeam,
    needsTeamSetup,
    userRole,
    teamFirebaseConfig,
    isAdmin,
    isMember,
    canManageTeam,
    canManageUsers,
    canAccessTeamData,
    isActiveMember,
    createTeam,
    inviteUserToTeam,
    removeUserFromTeam,
    loadUserTeam,
    setupTeamFirebase,
    // Funciones para acceder a la configuración del equipo
    getTeamDb: () => firebaseTeamService.getCurrentDb(),
    getTeamAuth: () => firebaseTeamService.getCurrentAuth(),
    getTeamStats: () => firebaseTeamService.getStats(),
    createTestUsers
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export default TeamContext; 