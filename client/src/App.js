import './App.css';
import { useState, useEffect } from 'react';
import Login from './Login';
import Home from './Home';
import MapPage from './Map';
import Report from './Report';
import PendingCrimes from './PendingCrimes';
import Profile from './Profile';
import CrimeArchive from './CrimeArchive';
import Officers from './Officers';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    const storedRole = localStorage.getItem('userRole');
    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    if (storedUser) {
      setUser(storedUser);
      setUserRole(storedRole || 'Citizen');
      setIsAdmin(storedIsAdmin);
    }
  }, []);

  const handleLoginSuccess = (username, role, adminStatus) => {
    setUser(username);
    setUserRole(role || 'Citizen');
    setIsAdmin(adminStatus || false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAdmin');
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
  };

  const [view, setView] = useState('home');

  const handleNavigate = (v) => {
    if (v === 'logout') {
      handleLogout();
      setView('home');
    } else {
      setView(v);
    }
  };

  return (
    <div className="App-root">
      {user ? (
        <>
          {view === 'home' && (
            <Home user={user} userRole={userRole} isAdmin={isAdmin} onLogout={() => { handleLogout(); setView('home'); }} onNavigate={handleNavigate} />
          )}

          {view === 'map' && (
            <MapPage user={user} userRole={userRole} isAdmin={isAdmin} onLogout={() => { handleLogout(); setView('home'); }} onNavigate={handleNavigate} />
          )}

          {view === 'report' && (
            <Report user={user} userRole={userRole} isAdmin={isAdmin} onLogout={() => { handleLogout(); setView('home'); }} onNavigate={handleNavigate} />
          )}

          {view === 'pending' && (
            <PendingCrimes user={user} userRole={userRole} isAdmin={isAdmin} onLogout={() => { handleLogout(); setView('home'); }} onNavigate={handleNavigate} />
          )}
          {view === 'profile' && (
            <Profile user={user} userRole={userRole} isAdmin={isAdmin} onLogout={() => { handleLogout(); setView('home'); }} onNavigate={handleNavigate} />
          )}
          {view === 'crime' && (
            <CrimeArchive user={user} userRole={userRole} isAdmin={isAdmin} onLogout={() => { handleLogout(); setView('home'); }} onNavigate={handleNavigate} />
          )}
          {view === 'officers' && isAdmin && (
            <Officers user={user} onNavigate={handleNavigate} />
          )}
        </>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
