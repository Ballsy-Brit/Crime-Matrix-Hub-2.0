import React, { useState, useEffect } from 'react';
import './App.css';
import { apiUrl } from './api';

export default function Officers({ user, onNavigate, onCrimeSearch }) {
  const [officers, setOfficers] = useState([]);
  const [navSearch, setNavSearch] = useState('');
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCrimeId, setSelectedCrimeId] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    // Fetch all officers
    fetch(apiUrl(`/api/admin/officers?adminUsername=${user}`))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOfficers(data);
        } else if (data.error) {
          console.error('Error:', data.error);
          setOfficers([]);
        } else {
          setOfficers([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching officers:', err);
        setOfficers([]);
        setLoading(false);
      });

    // Fetch all crimes for assignment
      fetch(apiUrl('/api/crime-reports'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCrimes(data);
        } else if (data.crimes && Array.isArray(data.crimes)) {
          setCrimes(data.crimes);
        }
      })
      .catch((err) => console.error('Error fetching crimes:', err));
  }, [user]);

  const handleAssignOfficer = async () => {
    if (!selectedOfficer || !selectedCrimeId) {
      setMessage('Please select both an officer and a crime');
      setMessageType('error');
      return;
    }

    const crime = crimes.find(c => c.id === selectedCrimeId);
    if (crime && crime.region !== selectedOfficer.region) {
      setMessage(`Officer region (${selectedOfficer.region}) does not match crime region (${crime.region})`);
      setMessageType('error');
      return;
    }

    setAssignmentLoading(true);
    try {
      const response = await fetch(apiUrl('/api/admin/appoint-officer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUsername: user,
          officerId: selectedOfficer.id,
          crimeReportId: selectedCrimeId
        })
      });

      const result = await response.json();
      if (response.ok) {
        setMessage('Officer assigned to crime successfully!');
        setMessageType('success');
        setShowAssignModal(false);
        setSelectedCrimeId(null);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.error || 'Failed to assign officer');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error assigning officer: ' + error.message);
      setMessageType('error');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleDeleteOfficer = async () => {
    if (!selectedOfficer) return;

    setAssignmentLoading(true);
    try {
      const response = await fetch(
        apiUrl(`/api/admin/users/${selectedOfficer.id}?adminUsername=${user}`),
        { method: 'DELETE' }
      );

      const result = await response.json();
      if (response.ok) {
        setOfficers(officers.filter(o => o.id !== selectedOfficer.id));
        setMessage('Officer removed successfully!');
        setMessageType('success');
        setShowDeleteModal(false);
        setSelectedOfficer(null);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.error || 'Failed to remove officer');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error removing officer: ' + error.message);
      setMessageType('error');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const getUnassignedCrimes = () => {
    return crimes.filter(c => !c.officerInCharge && c.region === selectedOfficer?.region);
  };

  return (
    <div className="officers-page theme-admin">
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-buttons">
            <button className="nav-btn" onClick={() => onNavigate('home')}>Home</button>
            <button className="nav-btn" onClick={() => onNavigate('crime')}>Crime</button>
            <button className="nav-btn" onClick={() => onNavigate('map')}>Map</button>
            <button className="nav-btn" onClick={() => onNavigate('report')}>Report</button>
            <button className="nav-btn active" onClick={() => onNavigate('officers')}>Officers</button>
          </div>
          <div className="nav-icons">
            <div className="nav-search">
              <input
                className="nav-search-input"
                placeholder="Search title, description, type..."
                aria-label="Search crimes"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCrimeSearch(navSearch);
                  }
                }}
              />
            </div>
            <div className="profile-dropdown">
              <button className="profile-btn admin">👨‍💼</button>
              <div className="dropdown-menu">
                <a href="#profile" onClick={() => onNavigate('profile')}>Profile</a>
                <a href="#officers" onClick={() => onNavigate('officers')}>Officers</a>
                <a href="#logout" onClick={() => onNavigate('logout')}>Logout</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="officers-sticky-header">
        <div className="officers-header">
          <h1>Officers Management</h1>
          <p>Manage and assign officers to crime cases</p>
        </div>
      </div>

      {message && (
        <div className={`message-banner ${messageType}`}>
          {message}
        </div>
      )}

      <div className="officers-content">
        <div className="officers-container">
          {loading ? (
            <p className="loading">Loading officers...</p>
          ) : officers.length === 0 ? (
            <p className="no-officers">No officers found in the system.</p>
          ) : (
            <div className="officers-list">
              {officers.map((officer) => (
                <div
                  key={officer.id}
                  className="officer-card"
                  onClick={() => setSelectedOfficer(selectedOfficer?.id === officer.id ? null : officer)}
                >
                  <div className="officer-header">
                    <h3>{officer.name}</h3>
                    <span className="officer-region">{officer.region}</span>
                  </div>
                  <div className="officer-details">
                    <p><strong>Username:</strong> {officer.username}</p>
                    <p><strong>Email:</strong> {officer.email}</p>
                    <p><strong>Phone:</strong> {officer.phone || 'N/A'}</p>
                    <p><strong>Joined:</strong> {new Date(officer.createdAt).toLocaleDateString()}</p>
                  </div>
                  {selectedOfficer?.id === officer.id && (
                    <div className="officer-actions">
                      <button 
                        className="btn-assign"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAssignModal(true);
                        }}
                      >
                        Assign to Case
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(true);
                        }}
                      >
                        Remove Officer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Officer Modal */}
      {showAssignModal && selectedOfficer && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Officer to Crime</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Officer:</strong> {selectedOfficer.name} ({selectedOfficer.region})</p>
              <p><strong>Available Crimes in {selectedOfficer.region}:</strong></p>
              
              {getUnassignedCrimes().length === 0 ? (
                <p className="no-crimes">No unassigned crimes in this region.</p>
              ) : (
                <select 
                  value={selectedCrimeId || ''} 
                  onChange={(e) => setSelectedCrimeId(e.target.value)}
                  className="crime-select"
                >
                  <option value="">Select a crime...</option>
                  {getUnassignedCrimes().map((crime) => (
                      <option key={crime.id} value={crime.id}>
                        {crime.crimeType} - {crime.title || crime.description?.slice(0,40) || 'Report'} ({new Date(crime.createdAt).toLocaleDateString()})
                      </option>
                  ))}
                </select>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm"
                onClick={handleAssignOfficer}
                disabled={assignmentLoading || !selectedCrimeId}
              >
                {assignmentLoading ? 'Assigning...' : 'Assign Officer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Officer Modal */}
      {showDeleteModal && selectedOfficer && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remove Officer</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove <strong>{selectedOfficer.name}</strong> from the system?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-delete-confirm"
                onClick={handleDeleteOfficer}
                disabled={assignmentLoading}
              >
                {assignmentLoading ? 'Removing...' : 'Remove Officer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fade-overlay"></div>

      <style jsx>{`
        .message-banner {
          position: fixed;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          z-index: 2000;
          animation: slideDown 0.3s ease;
          max-width: 90%;
        }

        .message-banner.success {
          background: linear-gradient(135deg, #2f5a46 0%, #1f4a38 100%);
          color: #f5eec0;
          box-shadow: 0 4px 12px rgba(47, 90, 70, 0.3);
        }

        .message-banner.error {
          background: linear-gradient(135deg, #d84040 0%, #c03030 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(216, 64, 64, 0.3);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .officers-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0b6b3b 0%, #052819 100%);
        }

        .officers-sticky-header {
          position: sticky;
          top: 65px;
          background: linear-gradient(135deg, #0b6b3b 0%, #052819 100%);
          z-index: 999;
          padding: 20px 0;
          border-bottom: 3px solid #f5eec0;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .officers-header {
          text-align: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .officers-header h1 {
          font-size: 2em;
          color: #f5eec0;
          margin: 0;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .officers-header p {
          color: #d4c896;
          font-size: 0.95em;
          margin: 10px 0 0 0;
        }

        .officers-content {
          padding: 40px 20px 20px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .officers-container {
          width: 100%;
        }

        .officers-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .officer-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 238, 192, 0.9) 100%);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          padding: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          backdrop-filter: blur(10px);
        }

        .officer-card:hover {
          box-shadow: 0 16px 40px rgba(7, 43, 32, 0.25);
          transform: translateY(-8px) scale(1.02);
          border-color: #2f5a46;
          background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(245, 238, 192, 0.98) 100%);
        }

        .officer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 3px solid #2f5a46;
          padding-bottom: 8px;
          gap: 10px;
        }

        .officer-header h3 {
          margin: 0;
          color: #072b20;
          font-size: 1.1em;
          word-break: break-word;
          font-weight: 700;
        }

        .officer-region {
          background: linear-gradient(135deg, #2f5a46 0%, #1f4a38 100%);
          color: #f5eec0;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.75em;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(7, 43, 32, 0.25);
          transition: all 0.3s ease;
        }

        .officer-card:hover .officer-region {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(7, 43, 32, 0.35);
        }

        .officer-details {
          margin: 12px 0;
        }

        .officer-details p {
          margin: 6px 0;
          color: #333;
          font-size: 0.85em;
          transition: all 0.3s ease;
        }

        .officer-details strong {
          color: #072b20;
          font-weight: 700;
        }

        .officer-card:hover .officer-details p {
          color: #1f4a38;
        }

        .officer-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }

        .btn-assign,
        .btn-delete {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          font-size: 0.8em;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .btn-assign {
          background: linear-gradient(135deg, #2f5a46 0%, #1f4a38 100%);
          color: #f5eec0;
        }

        .btn-assign:hover {
          background: linear-gradient(135deg, #1f4a38 0%, #072b20 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(7, 43, 32, 0.3);
          border-color: #f5eec0;
        }

        .btn-delete {
          background: linear-gradient(135deg, #d84040 0%, #c03030 100%);
          color: #fff;
          border-color: #c03030;
        }

        .btn-delete:hover {
          background: linear-gradient(135deg, #c03030 0%, #a02020 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(216, 64, 64, 0.3);
          border-color: #fff;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(7, 43, 32, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1500;
          backdrop-filter: blur(5px);
        }

        .modal-content {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 238, 192, 0.95) 100%);
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          border: 2px solid #2f5a46;
        }

        .modal-content.danger {
          border-color: #d84040;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #2f5a46;
          background: linear-gradient(135deg, #2f5a46 0%, #1f4a38 100%);
          border-radius: 10px 10px 0 0;
        }

        .modal-content.danger .modal-header {
          background: linear-gradient(135deg, #d84040 0%, #c03030 100%);
          border-color: #d84040;
        }

        .modal-header h2 {
          color: #f5eec0;
          margin: 0;
          font-size: 1.3em;
        }

        .modal-content.danger .modal-header h2 {
          color: #fff;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5em;
          color: #f5eec0;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-content.danger .modal-close {
          color: #fff;
        }

        .modal-close:hover {
          transform: scale(1.2);
          color: #fff;
        }

        .modal-body {
          padding: 20px;
          color: #333;
        }

        .modal-body p {
          margin: 12px 0;
          color: #072b20;
        }

        .modal-body strong {
          color: #1f4a38;
          font-weight: bold;
        }

        .warning-text {
          color: #d84040;
          font-style: italic;
        }

        .no-crimes {
          color: #d84040;
          font-style: italic;
          text-align: center;
          padding: 20px 0;
        }

        .crime-select {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: 2px solid #2f5a46;
          border-radius: 6px;
          background: linear-gradient(135deg, rgba(245, 238, 192, 0.9) 0%, rgba(241, 228, 195, 0.85) 100%);
          color: #072b20;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .crime-select:hover,
        .crime-select:focus {
          border-color: #1f4a38;
          background: linear-gradient(135deg, rgba(245, 238, 192, 1) 0%, rgba(241, 228, 195, 0.95) 100%);
          box-shadow: 0 4px 12px rgba(47, 90, 70, 0.2);
          outline: none;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 2px solid #e0e0e0;
          justify-content: flex-end;
        }

        .btn-cancel,
        .btn-confirm,
        .btn-delete-confirm {
          padding: 10px 20px;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          font-size: 0.9em;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .btn-cancel {
          background: linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%);
          color: #333;
          border-color: #999;
        }

        .btn-cancel:hover:not(:disabled) {
          background: linear-gradient(135deg, #d0d0d0 0%, #c0c0c0 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .btn-confirm {
          background: linear-gradient(135deg, #2f5a46 0%, #1f4a38 100%);
          color: #f5eec0;
          border-color: #1f4a38;
        }

        .btn-confirm:hover:not(:disabled) {
          background: linear-gradient(135deg, #1f4a38 0%, #072b20 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(7, 43, 32, 0.3);
        }

        .btn-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-delete-confirm {
          background: linear-gradient(135deg, #d84040 0%, #c03030 100%);
          color: #fff;
          border-color: #c03030;
        }

        .btn-delete-confirm:hover:not(:disabled) {
          background: linear-gradient(135deg, #c03030 0%, #a02020 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(216, 64, 64, 0.3);
        }

        .btn-delete-confirm:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading,
        .no-officers {
          text-align: center;
          color: #f5eec0;
          font-size: 1em;
          padding: 40px;
          background: transparent;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
