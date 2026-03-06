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
import { db, auth } from '../firebase/config';
import { CASIN_TEAM_ID, resolveToCanonicalCasin } from '../config/teams';
import { API_URL } from '../config/api';
import firebaseTeamService from '../services/firebaseTeamService';
import firebaseTeamStorageService from '../services/firebaseTeamStorageService';
import firebaseTableService from '../services/firebaseTableService';
import { setCurrentTeam } from '../services/firebaseService';

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [userTeam, setUserTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [needsTeamSetup, setNeedsTeamSetup] = useState(false);
  const [teamFirebaseConfig, setTeamFirebaseConfig] = useState(null);
  const [error, setError] = useState(null);

  // Cargar equipo del usuario cuando se autentica
  useEffect(() => {
    if (user?.email) {
      loadUserTeam();
    } else {
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
    firebaseTableService.setTeam(null);
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
      
      // Configurar el servicio de tablas para este equipo
      firebaseTableService.setTeam(teamId);
      console.log('📊 Team table service configured for team:', teamId);
      
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
      if (import.meta.env.DEV) console.log('🔍 Loading team for user:', user.email);
      
      // Solo estos usuarios pueden tener equipo distinto a CASIN (mismo criterio que el selector en top bar)
      const CAN_SWITCH_TEAM_EMAILS = ['z.t.marcos@gmail.com', 'ztmarcos@gmail.com', 'marcos@casin.com', '2012solitario@gmail.com', 'marcoszavala09@gmail.com', 'casinseguros@gmail.com'];
      const canSwitchTeam = CAN_SWITCH_TEAM_EMAILS.includes(user.email);
      let selectedTeamId = canSwitchTeam ? localStorage.getItem('selectedTeamId') : null;
      // Si tenía guardado un CASIN duplicado, usar siempre el canónico y actualizar localStorage
      if (selectedTeamId && resolveToCanonicalCasin(selectedTeamId) !== selectedTeamId) {
        console.log('🔄 Equipo guardado era CASIN duplicado, usando canónico:', CASIN_TEAM_ID);
        selectedTeamId = CASIN_TEAM_ID;
        localStorage.setItem('selectedTeamId', CASIN_TEAM_ID);
        localStorage.setItem('selectedTeamName', 'CASIN');
      }
      
      // Si puede cambiar equipo y tiene uno seleccionado distinto a CASIN, usar ese
      if (canSwitchTeam && selectedTeamId && selectedTeamId !== CASIN_TEAM_ID) {
        console.log('🔄 Admin CASIN con equipo seleccionado:', selectedTeamId);
        try {
          const teamDoc = await getDoc(doc(db, 'teams', selectedTeamId));
          console.log('📄 Team document exists?', teamDoc.exists());
          if (teamDoc.exists()) {
            const teamData = {
              id: selectedTeamId,
              ...teamDoc.data()
            };
            console.log('📋 Team data loaded:', teamData);
            setUserTeam(teamData);
            setUserRole('admin');
            await setupTeamFirebase(selectedTeamId, teamData);
            await loadTeamMembers(selectedTeamId);
            setNeedsTeamSetup(false);
            setIsLoadingTeam(false);
            console.log('✅ Cargado equipo seleccionado:', teamData.name);
            return;
          } else {
            console.warn('⚠️ Team document not found:', selectedTeamId);
            console.log('🗑️ Clearing invalid selectedTeamId from localStorage');
            localStorage.removeItem('selectedTeamId');
            localStorage.removeItem('selectedTeamName');
          }
        } catch (error) {
          console.error('❌ Error cargando equipo seleccionado:', error);
          console.log('🗑️ Clearing selectedTeamId from localStorage due to error');
          localStorage.removeItem('selectedTeamId');
          localStorage.removeItem('selectedTeamName');
          // Si falla, continuar con CASIN por defecto
        }
      }
      
      // Resto de usuarios: entrar siempre a CASIN (equipo principal)
      {
        
        const forcedTeamId = CASIN_TEAM_ID;
        
        try {
          // Verificar si el equipo existe en Firebase
          const teamDoc = await getDoc(doc(db, 'teams', forcedTeamId));
          
          let teamData;
          if (teamDoc.exists()) {
            // Usar el equipo existente
            teamData = {
              id: forcedTeamId,
              ...teamDoc.data(),
              isMainTeam: true
            };
            console.log('✅ Found existing CASIN team:', forcedTeamId);
          } else {
            // Crear el equipo CASIN si no existe
            console.log('🆕 Creating CASIN team with fixed ID');
            const newTeamData = {
              name: 'CASIN',
              description: 'Equipo principal CASIN con datos en Firebase Storage gs://casinbbdd.firebasestorage.app',
              owner: user.email,
              createdAt: new Date(),
              isMainTeam: true,
              firebaseStorageBucket: 'gs://casinbbdd.firebasestorage.app',
              settings: {
                allowInvites: true,
                maxMembers: 100,
                useDirectCollections: true,
                driveStorageEnabled: true
              }
            };
            
            await setDoc(doc(db, 'teams', forcedTeamId), newTeamData);
            teamData = {
              id: forcedTeamId,
              ...newTeamData,
              isMainTeam: true
            };
            console.log('✅ Created CASIN team with ID:', forcedTeamId);
          }
          
          setUserTeam(teamData);
          setUserRole('admin');
          
          // Configurar Firebase para este equipo
          await setupTeamFirebase(forcedTeamId, teamData);
          
          // Verificar si el usuario existe en team_members, si no, crearlo
          const memberQuery = query(
            collection(db, 'team_members'),
            where('email', '==', user.email),
            where('teamId', '==', forcedTeamId)
          );
          
          const memberSnapshot = await getDocs(memberQuery);
          
          if (memberSnapshot.empty) {
            console.log('👤 Creating team member record for admin user (via API)');
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            if (idToken) {
              const res = await fetch(`${API_URL}/team/ensure-casin-admin-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ teamId: forcedTeamId })
              });
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || res.statusText);
              }
              console.log('✅ Team member record created');
            } else {
              await addDoc(collection(db, 'team_members'), {
                userId: user.uid || user.email.replace(/[@.]/g, '_'),
                email: user.email,
                name: user.name || user.displayName || (user.email === 'z.t.marcos@gmail.com' ? 'Marquitos' : user.email === 'lorenacasin5@gmail.com' ? 'Lorena CASIN' : user.email === 'michelldiaz.casinseguros@gmail.com' ? 'Michelle Díaz' : user.email === 'marcoszavala09@gmail.com' ? 'Marcos Zavala' : user.email === 'casinseguros@gmail.com' ? 'CASIN Seguros' : '2012 Solitario'),
                teamId: forcedTeamId,
                role: 'admin',
                invitedBy: user.email,
                joinedAt: serverTimestamp(),
                status: 'active',
                isOwner: true
              });
              console.log('✅ Team member record created');
            }
          } else {
            console.log('✅ Team member record already exists');
          }
          
          // Cargar todos los miembros del equipo
          await loadTeamMembers(forcedTeamId);
          
          setNeedsTeamSetup(false);
          if (import.meta.env.DEV) console.log('🎉 Admin user setup complete for CASIN team:', forcedTeamId);
          return;
          
        } catch (teamError) {
          console.error('❌ Error setting up CASIN team:', teamError);
          setError('Error configurando equipo CASIN: ' + teamError.message);
          setNeedsTeamSetup(true);
          return;
        }
      }
      
      // Código existente para otros usuarios...
      
      // Buscar en team_members
      const memberQuery = query(
        collection(db, 'team_members'),
        where('email', '==', user.email)
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        console.log('👤 User not found in any team, needs setup');
        setNeedsTeamSetup(true);
        setUserTeam(null);
        setUserRole(null);
        return;
      }
      
      // Usuario tiene equipo, cargar datos
      const memberDoc = memberSnapshot.docs[0];
      const memberData = memberDoc.data();
      
      console.log('👤 Found team membership:', memberData);
      setUserRole(memberData.role);
      
      // Cargar datos del equipo
      const teamDoc = await getDoc(doc(db, 'teams', memberData.teamId));
      
      if (teamDoc.exists()) {
        const teamData = { id: teamDoc.id, ...teamDoc.data() };
        setUserTeam(teamData);
        
        // Configurar Firebase para este equipo
        await setupTeamFirebase(teamData.id, teamData);
        
        // Cargar miembros del equipo
        await loadTeamMembers(teamData.id);
        
        setNeedsTeamSetup(false);
        console.log('✅ Team loaded successfully:', teamData.name);
      } else {
        console.error('❌ Team document not found');
        setNeedsTeamSetup(true);
      }
      
    } catch (error) {
      console.error('❌ Error loading user team:', error);
      setError('Error cargando equipo: ' + error.message);
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

      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (idToken) {
        const res = await fetch(`${API_URL}/team/grant-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ email: emailToInvite, teamId: userTeam.id, role: 'member', name: emailToInvite })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
      } else {
        await addDoc(collection(db, 'team_members'), {
          userId: null,
          email: emailToInvite,
          name: emailToInvite,
          teamId: userTeam.id,
          role: 'member',
          invitedBy: user.email,
          joinedAt: serverTimestamp(),
          status: 'invited'
        });
      }

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

  // Función para cambiar de equipo (solo para admins CASIN)
  const switchTeam = async (teamId, teamData) => {
    try {
      console.log(`🔄 Switching to team: ${teamId}`, teamData);
      
      // Actualizar estado del equipo
      setUserTeam({
        id: teamId,
        ...teamData
      });
      
      // Configurar Firebase para el nuevo equipo
      await setupTeamFirebase(teamId, teamData);
      
      // Cargar miembros del nuevo equipo
      const membersSnapshot = await getDocs(
        query(collection(db, 'team_members'), where('teamId', '==', teamId))
      );
      
      const members = [];
      membersSnapshot.forEach((doc) => {
        members.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setTeamMembers(members);
      
      console.log(`✅ Successfully switched to team: ${teamData.name}`);
      return true;
    } catch (error) {
      console.error('Error switching team:', error);
      throw error;
    }
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
    switchTeam,
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