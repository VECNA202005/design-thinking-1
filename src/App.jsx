import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import DonorDashboard from './pages/DonorDashboard';
import ReceiverDashboard from './pages/ReceiverDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import PostFood from './pages/PostFood';

// Components
import Navbar from './components/Navbar';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: If database takes > 3s, stop loading anyway
    const timer = setTimeout(() => setLoading(false), 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else {
        setLoading(false);
        clearTimeout(timer);
      }
    }).catch(() => {
      setLoading(false);
      clearTimeout(timer);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data } = await supabase.from('users').select('role').eq('id', userId).single();
      if (data) setUserRole(data.role);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Helper to prevent redirecting to /null
  const getDashboardPath = () => {
    if (!userRole) return '/login';
    return `/${userRole}`;
  };

  return (
    <Router>
      <Navbar session={session} userRole={userRole} />
      <main style={{ padding: '2rem' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={!session ? <Login /> : (userRole ? <Navigate to={getDashboardPath()} replace /> : <div className="loading-spinner"></div>)} />
          <Route path="/signup" element={!session ? <Signup /> : (userRole ? <Navigate to={getDashboardPath()} replace /> : <div className="loading-spinner"></div>)} />
          
          {/* Role Based Routes */}
          <Route path="/donor" element={session && userRole === 'donor' ? <DonorDashboard /> : <Navigate to="/login" replace />} />
          <Route path="/donor/post" element={session && userRole === 'donor' ? <PostFood /> : <Navigate to="/login" replace />} />
          <Route path="/receiver" element={session && userRole === 'receiver' ? <ReceiverDashboard /> : <Navigate to="/login" replace />} />
          <Route path="/volunteer" element={session && userRole === 'volunteer' ? <VolunteerDashboard /> : <Navigate to="/login" replace />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
