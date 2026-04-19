import React, { useState } from 'react';
import './App.css';
import regions from './regions';

const crimeTypes = ['Theft', 'Robbery', 'Burglary', 'Assault', 'Fraud', 'Vehicle Theft', 'Arson', 'Other'];

export default function Report({ user, userRole, isAdmin, onLogout, onNavigate, onCrimeSearch }) {
  const themeClass = isAdmin ? 'theme-admin' : userRole === 'Officer' ? 'theme-officer' : 'theme-citizen';
  const [navSearch, setNavSearch] = useState('');
  const [formData, setFormData] = useState({
    crimeType: 'Theft',
    region: '',
    phone: '',
    description: '',
    title: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const payload = {
        ...formData,
        reportedByUsername: user,
      };

      console.log('Sending crime report:', payload);

      const response = await fetch('http://localhost:3001/api/crime-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('Response:', responseData);

      if (response.ok) {
        setMessage('Crime reported successfully! Awaiting officer verification.');
        setFormData({ crimeType: 'Theft', region: '', phone: '', description: '', title: '' });
        setTimeout(() => onNavigate('home'), 2000);
      } else {
        setMessage(`Error: ${responseData.error || responseData.details || 'Failed to report crime'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
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

      <div className="report-container">
        <div className="report-panel">
          <h2 className="report-title">Report a Crime</h2>
          <form onSubmit={handleSubmit} className="report-form">
            <label className="field-label">
              Crime Type*
              <select name="crimeType" value={formData.crimeType} onChange={handleChange} className="field-input">
                {crimeTypes.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Region*
              <select name="region" value={formData.region} onChange={handleChange} required className="field-input">
                <option value="">Select region</option>
                {regions.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </label>

            <label className="field-label">
              Phone Number*
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="field-input" />
            </label>

            <label className="field-label">
              Crime Title*
              <input type="text" name="title" value={formData.title} onChange={handleChange} required className="field-input" />
            </label>

            <label className="field-label">
              Description*
              <textarea name="description" value={formData.description} onChange={handleChange} required className="field-input textarea-input" rows="5"></textarea>
            </label>

            <button type="submit" className="login-button" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Report Crime'}
            </button>

            {message && <p className="report-message">{message}</p>}
          </form>
        </div>
      </div>

      <div className="fade-overlay"></div>
    </div>
  );
}
