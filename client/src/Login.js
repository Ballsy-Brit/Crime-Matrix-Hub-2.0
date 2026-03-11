import React, { useState } from 'react';
import './App.css';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminSignUp, setIsAdminSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const regions = require('./regions').default;
  const [role, setRole] = useState('Citizen');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      try {
        const response = await fetch(`http://localhost:3001/api/users/${username}`);
        const userData = await response.json();
        
        if (response.ok) {
          localStorage.setItem('user', username);
          localStorage.setItem('userRole', userData.role);
          localStorage.setItem('isAdmin', String(userData.isAdmin));
          onLoginSuccess(username, userData.role, userData.isAdmin);
        } else {
          setMessage('User not found');
        }
      } catch (error) {
        console.error('Login error:', error);
        setMessage('Error logging in');
      }
    } else {
      setMessage('Please enter username and password');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage('');

    if (isAdminSignUp) {
      // Admin signup
      if (!name || !email || !phone || !username || !password) {
        setMessage('All fields are required');
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            region: 'All',
            role: 'Admin',
            username,
            password,
            isAdmin: true,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage(`Admin account created successfully! Admin ID: ${data.adminId}`);
          setName('');
          setEmail('');
          setPhone('');
          setUsername('');
          setPassword('');
          setIsAdminSignUp(false);
          setIsSignUp(false);
          setTimeout(() => {
            localStorage.setItem('user', data.username);
            localStorage.setItem('userRole', 'Admin');
            localStorage.setItem('isAdmin', 'true');
            onLoginSuccess(data.username, 'Admin', true);
          }, 2000);
        } else {
          setMessage(data.error || 'Error creating admin account');
        }
      } catch (error) {
        console.error('Admin sign up error:', error);
        setMessage('Error creating admin account');
      }
    } else {
      // Regular signup
      if (!name || !email || !phone || !region || !username || !password) {
        setMessage('All fields are required');
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            region,
            role,
            username,
            password,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage(`Account created successfully! Your ID: ${data.userId}`);
          setName('');
          setEmail('');
          setPhone('');
          setRegion('');
          setUsername('');
          setPassword('');
          setRole('Citizen');
          setTimeout(() => setIsSignUp(false), 2000);
        } else {
          setMessage(data.error || 'Error creating account');
        }
      } catch (error) {
        console.error('Sign up error:', error);
        setMessage('Error creating account');
      }
    }
  };

  return (
    <div className="page-bg">
      <header className="title-bar">
        <div className="title-plate">
          <span className="title-text">Welcome To Crime Matrix Hub</span>
        </div>
      </header>

      <aside className="login-panel">
        <div className="login-toggle">
          <button 
            className={`toggle-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(false);
              setIsAdminSignUp(false);
            }}
          >
            Log In
          </button>
          <button 
            className={`toggle-btn ${isSignUp && !isAdminSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setIsAdminSignUp(false);
            }}
          >
            Sign Up
          </button>
          <button 
            className={`toggle-btn ${isAdminSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setIsAdminSignUp(true);
            }}
          >
            Admin
          </button>
        </div>

        {!isSignUp ? (
          // Login Form
          <>
            <h3 className="panel-heading">Log In</h3>
            <form onSubmit={handleLogin} className="login-form">
              <label className="field-label">User Name*
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Password*
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <button type="submit" className="login-button">Log In</button>
              {message && <p className="auth-message">{message}</p>}
            </form>
          </>
        ) : isAdminSignUp ? (
          // Admin Sign Up Form
          <>
            <h3 className="panel-heading">Create Admin Account</h3>
            <form onSubmit={handleSignUp} className="login-form">
              <label className="field-label">Full Name*
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Email*
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Phone Number*
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Username*
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Password*
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <button type="submit" className="login-button">Create Admin Account</button>
              {message && <p className="auth-message">{message}</p>}
            </form>
          </>
        ) : (
          // Regular Sign Up Form
          <>
            <h3 className="panel-heading">Create Account</h3>
            <form onSubmit={handleSignUp} className="login-form">
              <label className="field-label">Full Name*
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Email*
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Phone Number*
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Region*
                <select value={region} onChange={(e) => setRegion(e.target.value)} required className="field-input">
                  <option value="">Select region</option>
                  {regions.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </label>

              <label className="field-label">Category*
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="field-input"
                >
                  <option value="Citizen">General Citizen</option>
                  <option value="Officer">Police Officer</option>
                </select>
              </label>

              <label className="field-label">Username*
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <label className="field-label">Password*
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="field-input" 
                />
              </label>

              <button type="submit" className="login-button">Create Account</button>
              {message && <p className="auth-message">{message}</p>}
            </form>
          </>
        )}
        <p className="panel-note">Your Crime profile name will be honored. Never submit passwords.</p>
      </aside>
    </div>
  );
}
