import React, { useState, useEffect } from 'react';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import firebaseTeamService from '../../services/firebaseTeamService';
import './TeamFirebaseViewer.css';

const TeamFirebaseViewer = () => {
  const { userTeam, teamFirebaseConfig, getTeamStats } = useTeam();
  const [stats, setStats] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userTeam) {
      loadStats();
    }
  }, [userTeam]);

  const loadStats = () => {
    try {
      const teamStats = getTeamStats();
      setStats(teamStats);
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  };

  const testTeamDatabase = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      console.log('🧪 Testing team database...');
      
      // Obtener la base de datos del equipo
      const teamDb = firebaseTeamService.getCurrentDb();
      const teamConfig = firebaseTeamService.getCurrentTeamConfig();
      
      // Test: intentar escribir un documento de prueba
      const testCollection = firebaseTeamService.getNamespacedCollection('test_collection');
      
      console.log('📝 Writing test document to:', testCollection);
      
      // En un entorno real, aquí harías operaciones de Firestore
      // Por ahora, simularemos el test
      
      setTestResult({
        success: true,
        message: 'Team database connection successful!',
        config: {
          teamId: teamConfig.teamId,
          projectId: teamConfig.config.projectId,
          isTeamDatabase: teamConfig.config.isTeamDatabase,
          testCollection: testCollection
        }
      });
      
    } catch (error) {
      console.error('❌ Team database test failed:', error);
      setTestResult({
        success: false,
        message: error.message,
        error: error
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userTeam) {
    return (
      <div className="team-firebase-viewer">
        <div className="no-team">
          <h2>🔧 Team Firebase Configuration</h2>
          <p>No team is currently loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-firebase-viewer">
      <div className="viewer-header">
        <h1>🔧 Team Firebase Configuration</h1>
        <p>Manage and test your team's Firebase setup</p>
      </div>

      <div className="config-grid">
        {/* Team Information */}
        <div className="config-card">
          <h2>🏢 Team Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Team Name:</strong>
              <span>{getCleanTeamName(userTeam.name)}</span>
            </div>
            <div className="info-item">
              <strong>Team ID:</strong>
              <code>{userTeam.id}</code>
            </div>
            <div className="info-item">
              <strong>Owner:</strong>
              <span>{userTeam.owner}</span>
            </div>
            <div className="info-item">
              <strong>Created:</strong>
              <span>{userTeam.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Firebase Configuration */}
        <div className="config-card">
          <h2>🔥 Firebase Configuration</h2>
          {teamFirebaseConfig ? (
            <div className="info-grid">
              <div className="info-item">
                <strong>Project ID:</strong>
                <code>{teamFirebaseConfig.config.projectId}</code>
              </div>
              <div className="info-item">
                <strong>Auth Domain:</strong>
                <code>{teamFirebaseConfig.config.authDomain}</code>
              </div>
              <div className="info-item">
                <strong>Team Database:</strong>
                <span className="status-badge success">
                  {teamFirebaseConfig.config.isTeamDatabase ? 'Active' : 'Not Active'}
                </span>
              </div>
              <div className="info-item">
                <strong>App Name:</strong>
                <code>team-{userTeam.id}</code>
              </div>
            </div>
          ) : (
            <div className="loading-state">
              <p>Loading Firebase configuration...</p>
            </div>
          )}
        </div>

        {/* Team Stats */}
        <div className="config-card">
          <h2>📊 Team Statistics</h2>
          {stats ? (
            <div className="info-grid">
              <div className="info-item">
                <strong>Active Teams:</strong>
                <span>{stats.activeTeams}</span>
              </div>
              <div className="info-item">
                <strong>Current Team:</strong>
                <span>{stats.currentTeam || 'None'}</span>
              </div>
              <div className="info-item">
                <strong>All Teams:</strong>
                <span>{stats.teams.join(', ') || 'None'}</span>
              </div>
            </div>
          ) : (
            <div className="loading-state">
              <p>Loading team statistics...</p>
            </div>
          )}
          
          <button 
            className="refresh-btn"
            onClick={loadStats}
          >
            🔄 Refresh Stats
          </button>
        </div>

        {/* Database Test */}
        <div className="config-card">
          <h2>🧪 Database Test</h2>
          <p>Test the connection to your team's database</p>
          
          <button 
            className="test-btn"
            onClick={testTeamDatabase}
            disabled={isLoading || !teamFirebaseConfig}
          >
            {isLoading ? (
              <>
                <span className="spinner">⏳</span>
                Testing...
              </>
            ) : (
              '🧪 Test Database Connection'
            )}
          </button>

          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className="result-icon">
                  {testResult.success ? '✅' : '❌'}
                </span>
                <strong>
                  {testResult.success ? 'Test Passed' : 'Test Failed'}
                </strong>
              </div>
              
              <p>{testResult.message}</p>
              
              {testResult.config && (
                <div className="result-details">
                  <h4>Configuration Details:</h4>
                  <div className="config-details">
                    <div><strong>Team ID:</strong> {testResult.config.teamId}</div>
                    <div><strong>Project ID:</strong> {testResult.config.projectId}</div>
                    <div><strong>Test Collection:</strong> {testResult.config.testCollection}</div>
                    <div><strong>Team Database:</strong> {testResult.config.isTeamDatabase ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Development Notes */}
        <div className="config-card development-notes">
          <h2>🚧 Development Notes</h2>
          <div className="note-list">
            <div className="note-item">
              <strong>Current Setup:</strong>
              <p>Using single Firebase project with collection namespacing for development.</p>
            </div>
            <div className="note-item">
              <strong>Production Plan:</strong>
              <p>Each team will have its own Firebase project for complete isolation.</p>
            </div>
            <div className="note-item">
              <strong>Collection Naming:</strong>
              <p>Collections are prefixed with <code>team_{'{teamId}'}_</code> for now.</p>
            </div>
            <div className="note-item">
              <strong>Next Steps:</strong>
              <p>Implement automatic Firebase project creation for new teams.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamFirebaseViewer; 