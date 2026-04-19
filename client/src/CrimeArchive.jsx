import React, { useEffect, useState } from 'react';
import './App.css';

const categories = ['All', 'Theft', 'Robbery', 'Burglary', 'Assault', 'Fraud', 'Vehicle Theft', 'Arson', 'Other'];

export default function CrimeArchive({ user, userRole, isAdmin, onLogout, onNavigate, onCrimeSearch, initialSearchQuery }) {
  const themeClass = isAdmin ? 'theme-admin' : userRole === 'Officer' ? 'theme-officer' : 'theme-citizen';
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('All');
  const [sortBy, setSortBy] = useState('date'); // 'category' | 'date' | 'region'
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3001/api/crime-reports');
        const data = await res.json();
        if (mounted) setCrimes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading crimes:', err);
        if (mounted) setCrimes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setSearchQuery(initialSearchQuery || '');
  }, [initialSearchQuery]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filtered = crimes.filter((c) => {
    const matchesCategory = selectedTab === 'All' ? true : c.crimeType === selectedTab;
    const searchable = `${c.title || ''} ${c.description || ''} ${c.crimeType || ''}`.toLowerCase();
    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'category') {
      return (a.crimeType || '').localeCompare(b.crimeType || '');
    }
    if (sortBy === 'region') {
      return (a.region || '').localeCompare(b.region || '');
    }
    // date
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCrimeSearch(searchQuery);
                  }
                }}
              />
            </div>
            <div className="profile-dropdown">
              <button className={`profile-btn ${isAdmin ? 'admin' : userRole === 'Officer' ? 'officer' : ''}`}>{isAdmin ? '👨‍💼' : userRole === 'Officer' ? '👮' : '👤'}</button>
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
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <h3 style={{margin:0}}>Archive</h3>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{padding:'6px 8px', borderRadius:8}}>
              <option value="category">Sort: Crime Category</option>
              <option value="date">Sort: Date Reported</option>
              <option value="region">Sort: Region (A-Z)</option>
            </select>
          </div>

          <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
            {categories.map((cat) => (
              <button key={cat} className={`toggle-btn ${selectedTab===cat? 'active':''}`} onClick={() => setSelectedTab(cat)}>{cat}</button>
            ))}
          </div>

          <p className="panel-note" style={{marginTop:12}}>Click a tab to filter crimes by category. Use Sort to change ordering.</p>
        </aside>

        <section className="map-area">
          <div className="crime-list">
            {loading ? <p>Loading archive...</p> : (sorted.length === 0 ? <p>No crimes found for selected category.</p> : (
              sorted.map((crime) => (
                <div key={crime.id} className="crime-card">
                  <h2 className="crime-title">{crime.title}</h2>
                  <p className="crime-meta">Reported: {new Date(crime.createdAt).toLocaleString()}</p>
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
                  <p className="crime-description">{crime.description}</p>
                  <p className="crime-meta">Status: {crime.status === 'Closed' ? 'Closed' : 'Ongoing'}</p>
                  {userRole === 'Officer' && crime.status !== 'Closed' && (
                    <button className="verify-button" onClick={async () => {
                      try {
                        const res = await fetch(`http://localhost:3001/api/crime-reports/${crime.id}/close`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ closedByUsername: user }),
                        });
                        if (res.ok) {
                          alert('Case closed');
                          // update local state
                          setCrimes((prev) => prev.map((c) => c.id === crime.id ? { ...c, status: 'Closed' } : c));
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
            ))}
          </div>
        </section>
      </div>

      <div className="fade-overlay"></div>
    </div>
  );
}
