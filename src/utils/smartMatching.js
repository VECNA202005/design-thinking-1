import { supabase } from '../supabase';
import { calculateDistance } from './geo';

export const findBestShelter = async (pLat, pLon) => {
  try {
    const { data: shelters, error } = await supabase
      .from('users')
      .select('id, latitude, longitude')
      .eq('role', 'receiver');

    if (error || !shelters || shelters.length === 0) return null;

    let closest = null;
    let minDist = Infinity;

    shelters.forEach(s => {
      if (s.latitude && s.longitude) {
        const d = calculateDistance(pLat, pLon, s.latitude, s.longitude);
        if (d < minDist) {
          minDist = d;
          closest = s.id;
        }
      }
    });

    return closest;
  } catch (err) {
    console.error("Matching Error:", err);
    return null;
  }
};
