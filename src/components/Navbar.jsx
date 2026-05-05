import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LogOut, Home, PlusCircle, User } from 'lucide-react';

export default function Navbar({ session, userRole }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav style={{ 
      padding: '1rem 2rem', 
      background: 'var(--surface)', 
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 800 }}>F</div>
        <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>Feeding Forward</h2>
      </Link>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {session ? (
          <>
            <Link to={`/${userRole}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
            {userRole === 'donor' && (
              <Link to="/donor/post" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Post Food</Link>
            )}
            <button onClick={handleLogout} className="btn" style={{ background: 'transparent', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
              <LogOut size={18} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
            <Link to="/signup" className="btn btn-primary" style={{ textDecoration: 'none' }}>Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
