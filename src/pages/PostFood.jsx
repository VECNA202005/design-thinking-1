import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Sparkles, X } from 'lucide-react';
import Message from '../components/Message';
import { findBestShelter } from '../utils/smartMatching';
import { analyzeFoodDescription } from '../utils/aiService';

export default function PostFood() {
  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [position, setPosition] = useState({ lat: null, lng: null });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileLocation();
  }, []);

  const fetchProfileLocation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('users').select('latitude, longitude').eq('id', user.id).single();
      if (data) setPosition({ lat: data.latitude, lng: data.longitude });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 7 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size should be less than 7MB' });
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAIAnalysis = async () => {
    if (!foodType) return;
    setLoading(true);
    const result = await analyzeFoodDescription(foodType);
    if (result) setAiResult(result);
    setLoading(false);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    
    // Safety re-fetch if position is missing
    let currentLat = position.lat;
    let currentLng = position.lng;
    
    if (!currentLat) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('users').select('latitude, longitude').eq('id', user.id).single();
      if (data && data.latitude) {
        currentLat = data.latitude;
        currentLng = data.longitude;
      }
    }

    if (!currentLat) {
      setMessage({ type: 'error', text: 'Donor profile missing location. Please update your profile.' });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Image Upload
    let imageUrl = null;
    if (image) {
      const fileName = `${Date.now()}_${image.name}`;
      const { error: uploadError } = await supabase.storage.from('food-images').upload(`${user.id}/${fileName}`, image);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('food-images').getPublicUrl(`${user.id}/${fileName}`);
        imageUrl = publicUrl;
      }
    }

    // Auto-run AI if skipped
    let finalAiResult = aiResult;
    if (!finalAiResult) finalAiResult = await analyzeFoodDescription(foodType);

    const bestShelterId = await findBestShelter(currentLat, currentLng);

    const { error } = await supabase.from('food_posts').insert([{
      donor_id: user.id,
      food_type: foodType,
      quantity,
      latitude: currentLat,
      longitude: currentLng,
      assigned_shelter_id: bestShelterId,
      image_url: imageUrl,
      food_category: finalAiResult?.category,
      dietary_type: finalAiResult?.type,
      shelf_life_hours: finalAiResult?.shelfLifeHours,
      ai_reasoning: finalAiResult?.reasoning
    }]);

    setLoading(false);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Food posted and matched successfully!' });
      setTimeout(() => navigate('/donor'), 2000);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Share Surplus Food</h2>
        
        <form onSubmit={handlePost}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>What are you donating?</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" placeholder="e.g. 3 Trays of Biryani" className="input-field" style={{ marginBottom: 0 }} value={foodType} onChange={e => setFoodType(e.target.value)} required />
              <button type="button" onClick={handleAIAnalysis} className="btn" style={{ background: 'var(--bg-color)', border: '2px solid var(--border)', color: 'var(--primary)' }}>
                <Sparkles size={20} />
              </button>
            </div>
          </div>

          {aiResult && (
            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>AI Analysis</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: aiResult.type === 'Non-Veg' ? '#ef4444' : '#10b981' }}>{aiResult.type}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}><b>Category:</b> {aiResult.category} | <b>Life:</b> {aiResult.shelfLifeHours}h</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', fontStyle: 'italic' }}>"{aiResult.reasoning}"</p>
            </div>
          )}

          <input type="text" placeholder="Quantity (e.g. For 50 people)" className="input-field" value={quantity} onChange={e => setQuantity(e.target.value)} required />

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700 }}>Upload Food Photo (Help NGOs Trust Quality)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ 
                width: '100px', height: '100px', border: '2px dashed var(--border)', borderRadius: '1rem', display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden' 
              }}>
                {imagePreview ? <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera color="var(--text-muted)" />}
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </label>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <p>Max size: 7MB. Format: JPG, PNG.</p>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : 'Post and Find Matches'}
          </button>
        </form>
      </div>
      <Message type={message.type} text={message.text} onClear={() => setMessage({ type: '', text: '' })} />
    </div>
  );
}
