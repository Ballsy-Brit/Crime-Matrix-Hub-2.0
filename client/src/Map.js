import React, { useState, useEffect } from 'react';
import './App.css';
import DhakaMap from './DhakaMap';

const allCrimes = [
  'Theft',
  'Robbery',
  'Fraud',
  'Assault',
  'Arson',
  'Burglary',
  'Vehicle Theft'
];

export default function MapPage({ user, userRole, isAdmin, onLogout, onNavigate }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    Theft: true,
    Robbery: true,
    Fraud: true,
    Assault: true,
    Arson: true,
    Burglary: true,
    'Vehicle Theft': true
  });

  const toggleFilter = (name) => {
    setFilters((f) => ({ ...f, [name]: !f[name] }));
  };

  const filtered = allCrimes.filter((c) => filters[c] && c.toLowerCase().includes(query.toLowerCase()));

  // fetch verified crimes and compute counts per region
  const [verifiedCrimes, setVerifiedCrimes] = useState([]);
  const [regionCounts, setRegionCounts] = useState({});
  const [regionFilteredCounts, setRegionFilteredCounts] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('http://localhost:3001/api/crime-reports');
        const data = await res.json();
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : [];
        setVerifiedCrimes(arr);
      } catch (err) {
        console.error('Error loading verified crimes:', err);
        if (mounted) setVerifiedCrimes([]);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // compute counts whenever verifiedCrimes or filters/query changes
  useEffect(() => {
    const counts = {};
    const fcounts = {};
    verifiedCrimes.forEach((c) => {
      const r = c.region || 'Unknown';
      counts[r] = (counts[r] || 0) + 1;

      // determine if this crime should count as filtered (matching selected crime types and query)
      const matchType = filters[c.crimeType];
      const matchQuery = !query || (c.title + ' ' + c.description).toLowerCase().includes(query.toLowerCase());
      if (matchType && matchQuery) {
        fcounts[r] = (fcounts[r] || 0) + 1;
      }
    });
    setRegionCounts(counts);
    setRegionFilteredCounts(fcounts);
  }, [verifiedCrimes, filters, query]);

  return (
    <div className="home-page">
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
              <input className="nav-search-input" placeholder="" aria-label="Search" />
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

      <div className="home-content">
        <aside className="map-sidebar">
          <h3>Crimes Near You</h3>
          <label className="search-by">Search By Crime Name</label>
          <input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search crimes..." />

          <div className="filter-title">Filter</div>
          <div className="filter-list">
            {allCrimes.map((c) => (
              <label key={c} className="filter-item">
                <input type="checkbox" checked={!!filters[c]} onChange={() => toggleFilter(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>

          <button className="search-button">Search</button>
          <p className="panel-note">Your Crime profile name will be shared. Never submit passwords.</p>
        </aside>

        <section className="map-area">
          <div className="map-placeholder large">
            <DhakaMap counts={regionCounts} filteredCounts={regionFilteredCounts} onRegionClick={(r) => { setQuery(''); /* clear text search */ console.log('Region clicked:', r); }} />
          </div>
        </section>
      </div>

      <div className="fade-overlay"></div>
    </div>
  );
}
