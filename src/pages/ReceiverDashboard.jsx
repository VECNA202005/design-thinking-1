import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Message from '../components/Message';
import { calculateDistance } from '../utils/geo';
import { calculatePriority, calculateEnvironmentalImpact } from '../utils/aiService';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = null;
try {
  DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
  if (L.Marker.prototype.options) {
    L.Marker.prototype.options.icon = DefaultIcon;
  }
} catch (e) {
  console.warn("Leaflet icon failed to load:", e);
}

export default function ReceiverDashboard() {
  const [requests, setRequests] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch NGO's own profile for distance tracking
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    setCurrentUser(profile);

    fetchRequests(user.id);
    fetchActiveDeliveries(user.id);
    fetchHistory(user.id);
  };

  const fetchRequests = async (userId) => {
    const { data } = await supabase
      .from('food_posts')
      .select('*, donor:users!donor_id(*)')
      .or(`assigned_shelter_id.eq.${userId},assigned_shelter_id.is.null`)
      .eq('status', 'pending');
    if (data) setRequests(data);
  };

  const fetchActiveDeliveries = async (userId) => {
    const { data } = await supabase
      .from('food_posts')
      .select('*, donor:users!donor_id(*), volunteer:users!volunteer_id(*)')
      .eq('assigned_shelter_id', userId)
      .in('status', ['accepted', 'picked_up']);
    if (data) setActiveDeliveries(data);
  };

  const fetchHistory = async (userId) => {
    const { data } = await supabase
      .from('food_posts')
      .select('*, donor:users!donor_id(*)')
      .eq('assigned_shelter_id', userId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const handleAccept = async (postId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('food_posts')
      .update({ 
        status: 'accepted',
        assigned_shelter_id: user.id 
      })
      .eq('id', postId);
    
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Request accepted! A volunteer will be notified.' });
      fetchRequests(user.id);
      fetchActiveDeliveries(user.id);
      fetchHistory(user.id);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Organization Hub</h2>
        <div style={{ background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--border)', fontSize: '0.9rem' }}>
          📦 Total Meals Received: <b>{history.length}</b>
        </div>
      </div>

      <Message type={message.type} text={message.text} onClear={() => setMessage({ type: '', text: '' })} />
      
      <section style={{ marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📍 Incoming Food Matches 
          {requests.length > 0 && <span style={{ background: 'var(--primary)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem' }}>{requests.length}</span>}
        </h3>
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {requests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matches right now. We'll notify you when food is available.
            </div>
          ) : (
            requests.map(req => {
              const priority = calculatePriority(req.shelf_life_hours, req.created_at);
              const dist = currentUser ? calculateDistance(currentUser.latitude, currentUser.longitude, req.latitude, req.longitude) : 0;

              return (
                <div key={req.id} className="glass-panel" style={{ borderTop: `5px solid ${priority.color}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Donor Map Preview */}
                  <div style={{ height: '180px', borderBottom: '1px solid var(--border)' }}>
                    <MapContainer center={[req.latitude, req.longitude]} zoom={13} style={{ height: '100%' }} scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[req.latitude, req.longitude]}>
                        <Popup>Donor: {req.donor?.organization_details}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Donor</span>
                        <h3 style={{ margin: '0' }}>{req.donor?.organization_details}</h3>
                      </div>
                      <div style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 800 }}>
                        {dist.toFixed(1)} KM
                      </div>
                    </div>
                    
                    {req.image_url && <img src={req.image_url} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '0.75rem', marginBottom: '1rem' }} />}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{req.food_category || 'General'}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: req.dietary_type === 'Non-Veg' ? '#ef4444' : '#10b981' }}>{req.dietary_type || 'Veg'}</p>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--primary)', marginBottom: '1.5rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', display: 'block' }}>💡 AI Kitchen Tip</span>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', fontStyle: 'italic' }}>"{req.ai_reasoning || 'Fresh food; prioritize for immediate serving.'}"</p>
                    </div>

                    <p style={{ fontWeight: 700, margin: '0 0 1rem' }}>{req.food_type} ({req.quantity})</p>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleAccept(req.id)}>Accept Request</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>🚚 Active Deliveries</h3>
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {activeDeliveries.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No active deliveries right now.
            </div>
          ) : (
            activeDeliveries.map(item => (
              <div key={item.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.75rem' }}>OTP: {item.otp || 'Generating...'}</span>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 700, background: '#dbeafe', color: '#2563eb' }}>{item.status.toUpperCase()}</span>
                </div>
                {item.image_url && (
                  <img src={item.image_url} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '0.75rem', marginBottom: '1rem' }} />
                )}
                <p style={{ marginBottom: '0.5rem' }}><b>Food:</b> {item.food_type} ({item.quantity})</p>
                <p style={{ marginBottom: '0.5rem' }}><b>From:</b> {item.donor?.organization_details}</p>
                <p style={{ margin: 0 }}><b>Volunteer:</b> {item.volunteer?.name || 'Searching...'}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📜 Detailed Donation History</h3>
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {history.map(item => (
              <div key={item.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: '5px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 800 }}>DELIVERED</span>
                </div>

                {item.image_url && (
                  <img src={item.image_url} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '0.75rem', marginBottom: '1rem' }} />
                )}

                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{item.food_type}</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantity</span>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{item.quantity}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Impact</span>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
                       +{calculateEnvironmentalImpact(item.food_type, item.quantity, item.dietary_type).co2}kg CO2
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: '24px', height: '24px', background: 'var(--surface)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '0.8rem', border: '1px solid var(--border)' }}>🏢</div>
                  <span style={{ color: 'var(--text-muted)' }}>From:</span>
                  <span style={{ fontWeight: 700 }}>{item.donor?.organization_details}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
