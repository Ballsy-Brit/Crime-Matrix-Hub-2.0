import React, { useState, useEffect } from 'react';
import './App.css';
import regions from './regions';

export default function Profile({ user, userRole, isAdmin, onLogout, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', region: '', photoUrl: '' });
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/api/users/${user}`);
        const userData = await res.json();
        if (res.ok) {
          if (mounted) {
            setProfile(userData);
            setForm({ name: userData.name || '', email: userData.email || '', phone: userData.phone || '', region: userData.region || '', photoUrl: userData.photoUrl || '' });
          }
        }

        // fetch history
        const histRes = await fetch(`http://localhost:3001/api/users/${user}/history`);
        const histData = await histRes.json();
        if (histRes.ok) {
          if (mounted) setHistory(histData.reports || []);
        }

        // Fetch all users if admin
        if (isAdmin) {
          const usersRes = await fetch(`http://localhost:3001/api/admin/users?adminUsername=${user}`);
          const usersData = await usersRes.json();
          if (usersRes.ok && Array.isArray(usersData)) {
            if (mounted) setUsers(usersData);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user, isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`http://localhost:3001/api/users/${user}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Profile updated successfully');
        setProfile((p) => ({ ...p, ...data.user }));
      } else {
        setMessage(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage('Failed to save profile');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/admin/users/${userId}?adminUsername=${user}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setMessage('User removed successfully');
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to remove user');
      }
    } catch (err) {
      console.error('Error removing user:', err);
      setMessage('Error removing user');
    }
  };

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

      <div className="profile-container">
        <div className="profile-panel">
          <h2 className="panel-heading">{isAdmin ? 'Admin Profile' : 'Profile'}</h2>
          {loading ? (
            <p>Loading profile...</p>
          ) : (
            <div className="profile-grid">
              <div className="profile-left">
                <div className="avatar-wrap">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="Profile" className="profile-avatar" />
                  ) : (
                    <div className="avatar-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                  <label className="add-photo-btn">
                    + Add Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        // For now, just update the photoUrl field
                        // In production, you'd upload to a server
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setForm((f) => ({ ...f, photoUrl: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="profile-username">Username: <strong>{profile?.username}</strong></p>
                <p className="profile-role">Role: <strong>{isAdmin ? 'Admin' : profile?.role}</strong></p>
                {isAdmin && profile?.adminId && (
                  <p className="profile-admin-id">Admin ID: <strong>{profile.adminId}</strong></p>
                )}
                {isAdmin && profile?.adminSignupDate && (
                  <p className="profile-admin-date">Since: <strong>{new Date(profile.adminSignupDate).toLocaleDateString()}</strong></p>
                )}
              </div>

              <div className="profile-right">
                <form onSubmit={handleSave} className="profile-form">
                  <label className="field-label">Full Name
                    <input name="name" className="field-input" value={form.name} onChange={handleChange} />
                  </label>

                  <label className="field-label">Email
                    <input name="email" className="field-input" value={form.email} onChange={handleChange} />
                  </label>

                  <label className="field-label">Phone
                    <input name="phone" className="field-input" value={form.phone} onChange={handleChange} />
                  </label>

                  {!isAdmin && (
                    <label className="field-label">Region
                      <select name="region" className="field-input" value={form.region} onChange={handleChange}>
                        <option value="">Select region</option>
                        {regions.map((r) => (<option key={r} value={r}>{r}</option>))}
                      </select>
                    </label>
                  )}

                  <label className="field-label">Photo URL
                    <input name="photoUrl" className="field-input" value={form.photoUrl} onChange={handleChange} />
                  </label>

                  <button type="submit" className="login-button">Save Profile</button>
                  {message && <p className="report-message">{message}</p>}
                </form>
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="users-management-panel">
            <h3 className="panel-heading">
              Users Management
              <button className="toggle-users-btn" onClick={() => setShowUsers(!showUsers)}>
                {showUsers ? 'Hide' : 'Show'} Users
              </button>
            </h3>
            {showUsers && (
              <div className="users-list">
                {users.length === 0 ? (
                  <p>No users found.</p>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className="user-item">
                      <div className="user-info">
                        <div className="user-name">{u.name}</div>
                        <div className="user-meta">{u.role} • {u.region}</div>
                        <div className="user-email">{u.email}</div>
                      </div>
                      <button 
                        className="btn-remove-user"
                        onClick={() => handleRemoveUser(u.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className="history-panel">
            <h3 className="panel-heading">History</h3>
            {history.length === 0 ? (
              <p>No history available.</p>
            ) : (
              history.map((r) => (
                <div key={r.id} className="history-item">
                  <div className="history-row">
                    <div className="history-left">
                      <div className="history-title">{r.title}</div>
                      <div className="history-meta">{r.crimeType} — {r.region}</div>
                    </div>
                    <div className="history-right">
                      <div className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</div>
                    </div>
                  </div>
                  <div className="history-sub">Reported by: {r.reportedByUser?.name || r.reportedById} {r.verifiedByOfficer ? `• Verified by: ${r.verifiedByOfficer.name}` : ''}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="fade-overlay"></div>
    </div>
  );
}
