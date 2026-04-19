import React, { useState, useEffect } from 'react';
import './App.css';

export default function PendingCrimes({ user, userRole, isAdmin, onLogout, onNavigate, onCrimeSearch }) {
  const themeClass = isAdmin ? 'theme-admin' : userRole === 'Officer' ? 'theme-officer' : 'theme-citizen';
  const [navSearch, setNavSearch] = useState('');
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState({});

  useEffect(() => {
    // Fetch pending crimes
    fetch('http://localhost:3001/api/crime-reports/pending')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCrimes(data);
        } else {
          console.warn('API returned non-array data:', data);
          setCrimes([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching pending crimes:', err);
        setCrimes([]);
        setLoading(false);
      });
  }, []);

  const handleVerify = async (crimeId) => {
    setVerifying((prev) => ({ ...prev, [crimeId]: true }));
    try {
      const response = await fetch(`http://localhost:3001/api/crime-reports/${crimeId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiedByUsername: user }),
      });

      if (response.ok) {
        setCrimes((prev) => prev.filter((c) => c.id !== crimeId));
        alert('Crime verified successfully!');
      } else {
        alert('Error verifying crime');
      }
    } catch (error) {
      console.error('Error verifying crime:', error);
      alert('Error verifying crime');
    } finally {
      setVerifying((prev) => ({ ...prev, [crimeId]: false }));
    }
  };

  return (
    <div className={`home-page ${themeClass}`}>
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-buttons">
            <button className="nav-btn" onClick={() => onNavigate('home')}>Home</button>
            <button className="nav-btn" onClick={() => onNavigate('crime')}>Crime</button>
            <button className="nav-btn" onClick={() => onNavigate('map')}>Map</button>
            <button className="nav-btn" onClick={() => onNavigate('report')}>Report</button>
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
              <button className={`profile-btn ${userRole === 'Officer' ? 'officer' : ''}`}>
                {userRole === 'Officer' ? '👮' : '👤'}
              </button>
              <div className="dropdown-menu">
                <a href="#profile" onClick={() => onNavigate('profile')}>Profile</a>
                {userRole === 'Officer' && (
                  <a href="#pending" onClick={() => onNavigate('pending')}>Pending Crimes</a>
                )}
                <a href="#report" onClick={() => onNavigate('report')}>Report a Crime</a>
                <a href="#logout" onClick={onLogout}>Logout</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="home-content">
        <div className="crime-list">
          <h2>Pending Crime Reports for Verification</h2>
          {loading ? (
            <p>Loading pending crimes...</p>
          ) : crimes.length === 0 ? (
            <p>No pending crimes to verify.</p>
          ) : (
            crimes.map((crime) => (
              <div key={crime.id} className="crime-card">
                <h3 className="crime-title">{crime.title}</h3>
                <p className="crime-meta">Reported By - {crime.reportedByUser?.name || 'Anonymous'}</p>
                <p className="crime-location">Location - {crime.region}</p>
                <p className="crime-type">Crime Type - {crime.crimeType}</p>
                <p className="crime-meta">Contact - {crime.reportedByUser?.phone || 'N/A'}</p>
                <h4 className="crime-desc-title">Crime Description</h4>
                <p className="crime-description">{crime.description}</p>
                <button 
                  className="verify-button" 
                  onClick={() => handleVerify(crime.id)}
                  disabled={verifying[crime.id]}
                >
                  {verifying[crime.id] ? 'Verifying...' : 'Verify & Post'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="fade-overlay"></div>
    </div>
  );
}
