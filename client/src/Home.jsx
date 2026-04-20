import React, { useState, useEffect } from 'react';
import './App.css';
import DhakaMap from './DhakaMap';
import { apiUrl } from './api';

export default function Home({ user, userRole, isAdmin, onLogout, onNavigate, onCrimeSearch }) {
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navSearch, setNavSearch] = useState('');
  const themeClass = isAdmin ? 'theme-admin' : userRole === 'Officer' ? 'theme-officer' : 'theme-citizen';

  useEffect(() => {
    // Fetch verified crimes from API
    fetch(apiUrl('/api/crime-reports'))
      .then((res) => res.json())
      .then((data) => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setCrimes(data);
        } else {
          console.warn('API returned non-array data:', data);
          setCrimes([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching crimes:', err);
        setCrimes([]);
        setLoading(false);
      });
  }, []);
  // compute region counts for the map
  const [regionCounts, setRegionCounts] = useState({});
  useEffect(() => {
    const counts = {};
    crimes.forEach((c) => {
      const r = c.region || 'Unknown';
      counts[r] = (counts[r] || 0) + 1;
    });
    setRegionCounts(counts);
  }, [crimes]);
  return (
    <div className={`home-page ${themeClass}`}>
      {/* Fixed Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-buttons">
            <button className="nav-btn" onClick={() => onNavigate('home')}>Home</button>
            <button className="nav-btn" onClick={() => onNavigate('crime')}>Crime</button>
            <button className="nav-btn" onClick={() => onNavigate('map')}>Map</button>
            <button className="nav-btn" onClick={() => onNavigate('report')}>Report</button>
            {isAdmin && (
              <button className="nav-btn" onClick={() => onNavigate('officers')}>Officers</button>
            )}
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
              <button className={`profile-btn ${isAdmin ? 'admin' : userRole === 'Officer' ? 'officer' : ''}`}>
                {isAdmin ? '👨‍💼' : userRole === 'Officer' ? '👮' : '👤'}
              </button>
              <div className="dropdown-menu">
                <a href="#profile" onClick={() => onNavigate('profile')}>Profile</a>
                {userRole === 'Officer' && (
                  <a href="#pending" onClick={() => onNavigate('pending')}>Pending Crimes</a>
                )}
                {isAdmin && (
                  <a href="#officers" onClick={() => onNavigate('officers')}>Officers</a>
                )}
                <a href="#report" onClick={() => onNavigate('report')}>Report a Crime</a>
                <a href="#logout" onClick={onLogout}>Logout</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="home-content">
        {/* Left Section: Crime List */}
        <div className="crime-list">
          {loading ? (
            <p>Loading crimes...</p>
          ) : crimes.length === 0 ? (
            <p>No verified crimes to display.</p>
          ) : (
            crimes.map((crime) => (
              <div key={crime.id} className="crime-card">
                <h2 className="crime-title">{crime.title}</h2>
                <p className="crime-meta">Posted By - {crime.reportedByUser?.name || 'Anonymous'}</p>
                {userRole === 'Officer' && (
                  <p className="crime-meta">Contact: {crime.reportedByUser?.phone || 'N/A'}</p>
                )}
                <p className="crime-location">Location - {crime.region}</p>
                <p className="crime-type">Crime Type - {crime.crimeType}</p>
                {crime.officerAssigned && (
                  <p className="crime-officer">Officer in Charge - {crime.officerAssigned.name}</p>
                )}
                {!crime.officerAssigned && (
                  <p className="crime-officer" style={{color: '#999'}}>Officer in Charge - Not Yet Assigned</p>
                )}
                <h4 className="crime-desc-title">Crime Description</h4>
                <p className="crime-description">{crime.description}</p>
                {userRole === 'Officer' && crime.status !== 'Closed' && (
                  <button className="verify-button" onClick={async () => {
                    try {
                      const res = await fetch(apiUrl(`/api/crime-reports/${crime.id}/close`), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ closedByUsername: user }),
                      });
                      if (res.ok) {
                        // update local list to mark closed
                        setCrimes((prev) => prev.map((c) => c.id === crime.id ? { ...c, status: 'Closed' } : c));
                        alert('Case closed');
                      } else {
                        const d = await res.json();
                        alert(d.error || 'Failed to close case');
                      }
                    } catch (err) {
                      console.error('Close error:', err);
                      alert('Error closing case');
                    }
                  }}>Close Case</button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Section: Map */}
        <div className="map-section">
          <div className="map-placeholder">
            <DhakaMap counts={regionCounts} filteredCounts={{}} />
          </div>
        </div>
      </div>

      {/* Fading Overlay */}
      <div className="fade-overlay"></div>
    </div>
  );
}
