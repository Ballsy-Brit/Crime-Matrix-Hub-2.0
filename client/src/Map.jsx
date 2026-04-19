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

const REGION_ALIASES = {
  narayanganj: 'Narayangonj',
  narayangonj: 'Narayangonj',
};

function normalizeRegionName(region) {
  const raw = String(region || '').trim();
  const key = raw.toLowerCase();
  return REGION_ALIASES[key] || raw;
}

export default function MapPage({ user, userRole, isAdmin, onLogout, onNavigate, onCrimeSearch }) {
  const themeClass = isAdmin ? 'theme-admin' : userRole === 'Officer' ? 'theme-officer' : 'theme-citizen';
  const [navSearch, setNavSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [filters, setFilters] = useState({
    Theft: false,
    Robbery: false,
    Fraud: false,
    Assault: false,
    Arson: false,
    Burglary: false,
    'Vehicle Theft': false
  });

  const hasActiveFilter = Object.values(filters).some(Boolean);
  const hasSearchQuery = query.trim().length > 0;
  const shouldHighlight = hasActiveFilter || hasSearchQuery;

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
      const r = normalizeRegionName(c.region || 'Unknown');
      counts[r] = (counts[r] || 0) + 1;

      // Highlights should appear only when user applies type filter or text search.
      const matchType = hasActiveFilter ? !!filters[c.crimeType] : true;
      const matchQuery = !query || (c.title + ' ' + c.description).toLowerCase().includes(query.toLowerCase());
      const matchRegion = !selectedRegion || r === selectedRegion;
      const matchOngoing = c.status !== 'Closed';
      if (shouldHighlight && matchType && matchQuery && matchRegion && matchOngoing) {
        fcounts[r] = (fcounts[r] || 0) + 1;
      }
    });
    setRegionCounts(counts);
    setRegionFilteredCounts(fcounts);
  }, [verifiedCrimes, filters, query, selectedRegion, hasActiveFilter, shouldHighlight]);

  const selectedRegionCrimes = selectedRegion
    ? verifiedCrimes
        .filter((c) => normalizeRegionName(c.region) === selectedRegion && c.status !== 'Closed')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  return (
    <div className={`home-page ${themeClass}`}>
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

          {selectedRegion && (
            <div className="panel-note" style={{ marginBottom: 10 }}>
              Selected Thana: <strong>{selectedRegion}</strong>{' '}
              <button className="toggle-btn" onClick={() => setSelectedRegion('')} style={{ marginLeft: 8 }}>
                Clear
              </button>
            </div>
          )}

          {selectedRegion && (
            <div className="thana-crimes-panel">
              <div className="thana-crimes-title">Ongoing In {selectedRegion}</div>
              {selectedRegionCrimes.length === 0 ? (
                <p className="no-thana-crimes">No ongoing crimes in this thana.</p>
              ) : (
                <div className="thana-crimes-list">
                  {selectedRegionCrimes.map((crime) => (
                    <button
                      key={crime.id}
                      className="thana-crime-link"
                      onClick={() => onCrimeSearch(crime.title || crime.crimeType || 'Crime')}
                    >
                      <span>{crime.title || 'Untitled Crime'}</span>
                      <small className="thana-crime-meta">{crime.crimeType} • {new Date(crime.createdAt).toLocaleDateString()}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button className="search-button">Search</button>
          <p className="panel-note">Your Crime profile name will be shared. Never submit passwords.</p>
        </aside>

        <section className="map-area">
          <div className="map-placeholder large">
            <DhakaMap
              counts={regionCounts}
              filteredCounts={regionFilteredCounts}
              crimes={verifiedCrimes}
              shouldHighlight={shouldHighlight}
              selectedRegion={selectedRegion}
              onRegionClick={(r) => {
                setQuery('');
                setSelectedRegion((prev) => (prev === r ? '' : r));
              }}
            />
          </div>
        </section>
      </div>

      <div className="fade-overlay"></div>
    </div>
  );
}
