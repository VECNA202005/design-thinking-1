import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import Message from '../components/Message';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function LocationPicker({ setPosition, position }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position.lat ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'donor', organization: '', phone: '' });
  const [position, setPosition] = useState({ lat: 13.0827, lng: 80.2707 }); // Default Chennai
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!position.lat) {
      setMessage({ type: 'error', text: 'Please select your location on the map.' });
      return;
    }
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password 
    });

    if (signUpError) {
      console.error("Auth Error:", signUpError);
      setMessage({ type: 'error', text: signUpError.message });
      setLoading(false);
      return;
    }

    // Small delay to allow Supabase background triggers to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: { session } } = await supabase.auth.getSession();
    
    // Attempt to save profile data
    const { error: dbError } = await supabase.from('users').upsert([{
      id: data.user.id,
      name: form.name,
      email: form.email,
      role: form.role,
      organization_details: form.organization,
      phone_number: form.phone,
      latitude: position.lat,
      longitude: position.lng
    }]);

    if (dbError) {
      console.error("Database Error:", dbError);
      setMessage({ type: 'error', text: `Profile error: ${dbError.message}` });
    } else {
      // Verify the record was created before redirecting
      const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).single();
      if (profile && profile.role === form.role) {
        window.location.href = `/${form.role}`;
      } else {
        setMessage({ type: 'error', text: 'Error finalizing profile, please login.' });
        setTimeout(() => navigate('/login'), 2000);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Join Feeding Forward</h2>
        
        <form onSubmit={handleSignup}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="text" placeholder="Full Name" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input type="email" placeholder="Email Address" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="password" placeholder="Password" className="input-field" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            <input type="text" placeholder="Phone Number" className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
          </div>
          
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>Choose Your Role</label>
            <select className="input-field" value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ margin: 0 }}>
              <option value="donor">Hotel / Restaurant (Donor)</option>
              <option value="receiver">NGO / Shelter (Receiver)</option>
              <option value="volunteer">Delivery Hero (Volunteer)</option>
            </select>
          </div>

          <input type="text" placeholder="Organization Name" className="input-field" value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} required />
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>Pin Your Location (Click to Pick)</label>
            <div style={{ height: '250px', borderRadius: '1rem', overflow: 'hidden', border: '2px solid var(--border)' }}>
              <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker setPosition={setPosition} position={position} />
              </MapContainer>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
      <Message type={message.type} text={message.text} onClear={() => setMessage({ type: '', text: '' })} />
    </div>
  );
}
