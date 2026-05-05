import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { calculateDistance } from '../utils/geo';
import { calculateEnvironmentalImpact } from '../utils/aiService';

export default function DonorDashboard() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('food_posts')
        .select('*, receiver:users!assigned_shelter_id(name, organization_details, latitude, longitude)')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setPosts(data);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#d97706' };
      case 'accepted': return { bg: '#dbeafe', text: '#2563eb' };
      case 'picked_up': return { bg: '#f3e8ff', text: '#9333ea' };
      case 'delivered': return { bg: '#dcfce7', text: '#16a34a' };
      default: return { bg: '#f3f4f6', text: '#4b5563' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Your Food Donations</h2>
        <Link to="/donor/post" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Post New Food
        </Link>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>No food posts yet. Start by sharing some surplus food!</p>
        ) : (
          posts.map(post => {
            const impact = calculateEnvironmentalImpact(post.food_type, post.quantity, post.dietary_type);
            
            return (
              <div key={post.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>{post.food_type}</span>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700, 
                    background: getStatusColor(post.status).bg, color: getStatusColor(post.status).text 
                  }}>
                    {post.status.replace('_', ' ')}
                  </span>
                </div>
                
                {post.image_url && (
                  <img src={post.image_url} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '0.75rem', marginBottom: '1rem' }} />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{post.quantity}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{post.food_type}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', display: 'block' }}>🌱 AI Impact Score</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>+{impact.co2} kg CO2</span>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: post.status === 'pending' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: post.status === 'pending' ? 800 : 400 }}>
                      {post.status === 'pending' ? '📡 Broadcasting to All Partners' : '🤝 Assigned To'}
                    </span>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>
                      {post.status === 'pending' ? 'Available for any Ashram or Organization' : (post.receiver?.organization_details || 'Finding Partner...')}
                    </p>
                  </div>
                  {post.status !== 'pending' && post.receiver && post.latitude && post.receiver.latitude && (
                    <div style={{ background: 'var(--bg-color)', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: 800, border: '1px solid var(--border)' }}>
                      {calculateDistance(post.latitude, post.longitude, post.receiver.latitude, post.receiver.longitude).toFixed(1)} KM
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
