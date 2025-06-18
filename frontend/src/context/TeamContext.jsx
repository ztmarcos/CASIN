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

const TeamContext = createContext();

export const TeamProvider = ({ children }) => {
  const { user } = useAuth();
  const [userTeam, setUserTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [needsTeamSetup, setNeedsTeamSetup] = useState(false);

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
    setIsLoadingTeam(false);
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

  const createTeam = async (teamName) => {
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('🏢 Creating new team:', teamName);
      
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
    isAdmin,
    isMember,
    createTeam,
    inviteUserToTeam,
    removeUserFromTeam,
    loadUserTeam
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