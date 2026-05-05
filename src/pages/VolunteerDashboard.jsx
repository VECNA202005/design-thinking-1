import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Message from '../components/Message';
import { calculateDistance } from '../utils/geo';
import { getRouteEfficiency } from '../utils/aiService';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function VolunteerDashboard() {
  const [availableTasks, setAvailableTasks] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [enteredOtp, setEnteredOtp] = useState({});

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const fetchAllTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Available Tasks (Accepted by NGOs but no volunteer yet)
    const { data: available } = await supabase
      .from('food_posts')
      .select('*, donor:users!donor_id(*), receiver:users!assigned_shelter_id(*)')
      .eq('status', 'accepted')
      .is('volunteer_id', null);
    setAvailableTasks(available || []);

    // 2. Active Tasks (Assigned to this volunteer)
    const { data: active } = await supabase
      .from('food_posts')
      .select('*, donor:users!donor_id(*), receiver:users!assigned_shelter_id(*)')
      .eq('volunteer_id', user.id)
      .in('status', ['accepted', 'picked_up']);
    setActiveTasks(active || []);

    // 3. History (Completed by this volunteer)
    const { data: past } = await supabase
      .from('food_posts')
      .select('*, donor:users!donor_id(*), receiver:users!assigned_shelter_id(*)')
      .eq('volunteer_id', user.id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });
    setHistory(past || []);
  };

  const handlePickUp = async (postId) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('food_posts').update({ 
      status: 'picked_up', 
      volunteer_id: user.id,
      otp: otp
    }).eq('id', postId);

    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Food picked up! Give the OTP to the receiver upon arrival.' });
      fetchAllTasks();
    }
  };

  const handleDeliver = async (postId, correctOtp) => {
    if (enteredOtp[postId] !== correctOtp) {
      setMessage({ type: 'error', text: 'Invalid OTP!' });
      return;
    }
    const { error } = await supabase.from('food_posts').update({ status: 'delivered' }).eq('id', postId);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Heroic work! Food delivered successfully.' });
      fetchAllTasks();
    }
  };

  const renderTaskCard = (task, type) => {
    const pLat = task.donor?.latitude;
    const pLon = task.donor?.longitude;
    const dLat = task.receiver?.latitude;
    const dLon = task.receiver?.longitude;
    const dist = (pLat && dLat) ? calculateDistance(pLat, pLon, dLat, dLon) : 5;
    const efficiency = getRouteEfficiency(dist, task.quantity);

    return (
      <div key={task.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {type !== 'history' && (
          <div style={{ height: '180px', borderBottom: '1px solid var(--border)' }}>
            <MapContainer center={[pLat, pLon]} zoom={12} style={{ height: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[pLat, pLon]}><Popup>Pickup</Popup></Marker>
              <Marker position={[dLat, dLon]}><Popup>Dropoff</Popup></Marker>
            </MapContainer>
          </div>
        )}

        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{task.food_type}</h3>
            <span style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 800 }}>
              {dist.toFixed(1)} KM
            </span>
          </div>

          <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
            <p style={{ margin: '0 0 0.25rem' }}><b>From:</b> {task.donor?.organization_details}</p>
            <p style={{ margin: 0 }}><b>To:</b> {task.receiver?.organization_details}</p>
          </div>

          {type === 'available' && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handlePickUp(task.id)}>Claim Delivery</button>
          )}

          {type === 'active' && (
            task.status === 'accepted' ? (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handlePickUp(task.id)}>Mark Picked Up</button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="OTP" className="input-field" style={{ margin: 0, textAlign: 'center', width: '80px' }} maxLength={6} onChange={(e) => setEnteredOtp({...enteredOtp, [task.id]: e.target.value})} />
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleDeliver(task.id, task.otp)}>Deliver</button>
              </div>
            )
          )}

          {type === 'history' && (
            <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center' }}>✓ Delivered Successfully</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Volunteer Command Center</h2>
        <div style={{ background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--border)', fontSize: '0.9rem' }}>
          ⭐ Impact Score: <b>{history.length * 10} pts</b>
        </div>
      </div>

      <Message type={message.type} text={message.text} onClear={() => setMessage({ type: '', text: '' })} />
      
      {activeTasks.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🚀 Active Missions <span style={{ background: '#ef4444', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem' }}>{activeTasks.length}</span></h3>
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {activeTasks.map(task => renderTaskCard(task, 'active'))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>📦 Available Orders</h3>
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {availableTasks.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              All food has been claimed! Check back soon for new missions.
            </div>
          ) : (
            availableTasks.map(task => renderTaskCard(task, 'available'))
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <h3 style={{ marginBottom: '1rem' }}>📜 Heroic History</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {history.map(task => renderTaskCard(task, 'history'))}
          </div>
        </section>
      )}
    </div>
  );
}
