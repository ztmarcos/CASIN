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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import firebaseTeamService from '../services/firebaseTeamService';
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
  const initializeTeamCollections = async (teamId) => {
    try {
      console.log('🗂️ Initializing collections for team:', teamId);

      // Intentar usar plantillas de CASIN primero
      const TeamTemplateService = (await import('../services/teamTemplateService')).default;
      
      try {
        console.log('🎨 Intentando usar plantillas CASIN...');
        const templates = await TeamTemplateService.extractCASINStructure();
        
        if (Object.keys(templates).length > 0) {
          console.log(`✅ Se encontraron ${Object.keys(templates).length} plantillas CASIN`);
          
          // Usar las plantillas para crear las colecciones
          const results = await TeamTemplateService.createTeamFromTemplate(
            teamId,
            'Nuevo Equipo',
            user?.email || 'admin',
            templates
          );
          
          console.log(`🎉 Colecciones creadas usando plantillas CASIN: ${results.length}`);
          return;
        }
      } catch (templateError) {
        console.warn('⚠️ No se pudieron usar plantillas CASIN, usando método básico:', templateError.message);
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
          },
          {
            clave: 'default_settings',
            valor: {
              notificaciones: true,
              autoBackup: true,
              maxContactos: 1000,
              tema: 'light'
            },
            descripcion: 'Configuraciones por defecto del equipo',
            fechaCreacion: serverTimestamp()
          }
        ]
      };

      // Crear cada colección con datos iniciales
      for (const collectionName of collectionsToCreate) {
        const teamCollectionName = `team_${teamId}_${collectionName}`;
        const collectionRef = collection(db, teamCollectionName);
        
        // Agregar datos iniciales
        const dataToAdd = initialData[collectionName] || [];
        for (const data of dataToAdd) {
          await addDoc(collectionRef, data);
        }
        
        console.log(`✅ Created collection: ${teamCollectionName} with ${dataToAdd.length} initial records`);
      }

      console.log('🎉 Team collections initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing team collections:', error);
      // No lanzar error para que no falle la creación del equipo
    }
  };

  const createTeam = async (teamName) => {
    if (!user?.email || !user?.uid) {
      throw new Error('User not properly authenticated - missing email or uid');
    }

    try {
      console.log('🏢 Creating new team:', teamName);
      console.log('👤 User data:', { email: user.email, uid: user.uid, name: user.name });
      
      // Crear el equipo
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

      const teamDocRef = await addDoc(collection(db, 'teams'), teamData);
      console.log('✅ Team created with ID:', teamDocRef.id);

      // Agregar al usuario como admin del equipo
      await addDoc(collection(db, 'team_members'), {
        userId: user.uid,
        email: user.email,
        name: user.name || user.email,
        teamId: teamDocRef.id,
        role: 'admin',
        invitedBy: user.email,
        joinedAt: serverTimestamp()
      });

      console.log('✅ User added as team admin');

      // Inicializar colecciones del equipo
      await initializeTeamCollections(teamDocRef.id);

      // Recargar datos del equipo
      await loadUserTeam();
      
      return teamDocRef.id;

    } catch (error) {
      console.error('❌ Error creating team:', error);
      throw error;
    }
  };

  const inviteUserToTeam = async (emailToInvite) => {
    if (!userTeam || userRole !== 'admin') {
      throw new Error('Only team admins can invite users');
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
    if (!userTeam || userRole !== 'admin') {
      throw new Error('Only team admins can remove users');
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
        await memberDoc.ref.delete();
        
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

  const isAdmin = () => userRole === 'admin';
  const isMember = () => userRole === 'member' || userRole === 'admin';

  const value = {
    userTeam,
    teamMembers,
    isLoadingTeam,
    needsTeamSetup,
    userRole,
    teamFirebaseConfig,
    isAdmin,
    isMember,
    createTeam,
    inviteUserToTeam,
    removeUserFromTeam,
    loadUserTeam,
    setupTeamFirebase,
    // Funciones para acceder a la configuración del equipo
    getTeamDb: () => firebaseTeamService.getCurrentDb(),
    getTeamAuth: () => firebaseTeamService.getCurrentAuth(),
    getTeamStats: () => firebaseTeamService.getStats()
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