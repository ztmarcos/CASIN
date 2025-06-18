import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import './TeamManagement.css';

const TeamManagement = () => {
  const { userTeam, teamMembers, isAdmin, inviteUserToTeam, removeUserFromTeam } = useTeam();
  const { user } = useAuth();
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [removingUser, setRemovingUser] = useState(null);

  if (!isAdmin()) {
    return (
      <div className="team-management">
        <div className="access-denied">
          <h2>🚫 Acceso Denegado</h2>
          <p>Solo los administradores pueden gestionar el equipo.</p>
        </div>
      </div>
    );
  }

  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    if (!newMemberEmail.trim()) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    if (newMemberEmail === user.email) {
      toast.error('No puedes invitarte a ti mismo');
      return;
    }

    setIsInviting(true);
    
    try {
      await inviteUserToTeam(newMemberEmail.trim());
      setNewMemberEmail('');
      toast.success(`Usuario ${newMemberEmail} invitado exitosamente`);
    } catch (error) {
      toast.error('Error al invitar usuario: ' + error.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveUser = async (memberEmail) => {
    if (!confirm(`¿Estás seguro de que quieres remover a ${memberEmail} del equipo?`)) {
      return;
    }

    setRemovingUser(memberEmail);
    
    try {
      await removeUserFromTeam(memberEmail);
      toast.success(`Usuario ${memberEmail} removido del equipo`);
    } catch (error) {
      toast.error('Error al remover usuario: ' + error.message);
    } finally {
      setRemovingUser(null);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'member': return '👤';
      default: return '❓';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'invited': return '📧';
      default: return '✅';
    }
  };

  return (
    <div className="team-management">
      <div className="team-header">
        <h1>Gestión de Equipo</h1>
        <p>Administra los miembros de <strong>{userTeam?.name}</strong></p>
      </div>

      {/* Invite Section */}
      <div className="invite-section">
        <h2>🎯 Invitar Nuevo Miembro</h2>
        <form onSubmit={handleInviteUser} className="invite-form">
          <div className="form-group">
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="email-input"
              required
            />
            <button 
              type="submit"
              className="invite-btn"
              disabled={isInviting}
            >
              {isInviting ? (
                <>
                  <span className="spinner">⏳</span>
                  Invitando...
                </>
              ) : (
                <>
                  <span>📧</span>
                  Invitar
                </>
              )}
            </button>
          </div>
          <small className="form-hint">
            El usuario recibirá acceso automático cuando inicie sesión con este email.
          </small>
        </form>
      </div>

      {/* Members List */}
      <div className="members-section">
        <h2>👥 Miembros del Equipo ({teamMembers.length})</h2>
        
        {teamMembers.length === 0 ? (
          <div className="no-members">
            <p>No hay miembros en el equipo aún.</p>
          </div>
        ) : (
          <div className="members-list">
            {teamMembers.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-info">
                  <div className="member-avatar">
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="member-details">
                    <div className="member-name">
                      {member.name || member.email}
                      {member.email === user.email && (
                        <span className="you-badge">(Tú)</span>
                      )}
                    </div>
                    <div className="member-email">{member.email}</div>
                    <div className="member-meta">
                      <span className="member-role">
                        {member.role === 'admin' ? 'Administrador' : 'Miembro'}
                      </span>
                      <span className="member-status">
                        {getStatusIcon(member.status)}
                        {member.status === 'invited' ? 'Invitado' : 'Activo'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="member-actions">
                  {member.email !== user.email && (
                    <button
                      onClick={() => handleRemoveUser(member.email)}
                      className="remove-btn"
                      disabled={removingUser === member.email}
                      title="Remover del equipo"
                    >
                      {removingUser === member.email ? (
                        <span className="spinner">⏳</span>
                      ) : (
                        '🗑️'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Info */}
      <div className="team-info">
        <h2>ℹ️ Información del Equipo</h2>
        <div className="info-grid">
          <div className="info-item">
            <strong>Nombre:</strong>
            <span>{userTeam?.name}</span>
          </div>
          <div className="info-item">
            <strong>Propietario:</strong>
            <span>{userTeam?.owner}</span>
          </div>
          <div className="info-item">
            <strong>Miembros:</strong>
            <span>{teamMembers.length}</span>
          </div>
          <div className="info-item">
            <strong>Proyecto Firebase:</strong>
            <code>{userTeam?.firebaseProject}</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement; 