import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

export const analyzeFoodDescription = async (description) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Analyze the food description for a surplus food redistribution app.
      BE EXTREMELY ACCURATE with the "type" (Veg vs Non-Veg). 
      If the description contains ANY meat, poultry, seafood, or eggs (e.g., chicken, fish, mutton, egg, beef, prawn), it MUST be "Non-Veg".
      
      Return a JSON object with:
      {
        "category": "One of [Main Course, Side Dish, Bakery, Snacks, Beverages, Dessert, Other]",
        "type": "One of [Veg, Non-Veg, Vegan]",
        "shelfLifeHours": number,
        "reasoning": "A helpful safety tip for the receiver (max 15 words)"
      }

      Description: "${description}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const calculatePriority = (shelfLifeHours, createdAt) => {
  if (!shelfLifeHours) return { label: 'Fresh Post', color: '#10b981', icon: '🌟' };
  
  const createdDate = new Date(createdAt);
  const expiryDate = new Date(createdDate.getTime() + shelfLifeHours * 60 * 60 * 1000);
  const now = new Date();
  
  const hoursLeft = (expiryDate - now) / (1000 * 60 * 60);
  
  if (hoursLeft < 2) return { label: 'Save Now (Critical)', color: '#ef4444', icon: '🔥' };
  if (hoursLeft < 6) return { label: 'Moving Fast (Action Needed)', color: '#f97316', icon: '⚠️' };
  return { label: 'Safe Haven (Stable)', color: '#3b82f6', icon: '❄️' };
};

export const getRouteEfficiency = (distance, quantity) => {
  const qtyVal = parseFloat(quantity) || 5;
  const score = (qtyVal / distance).toFixed(1);
  const co2Saved = (qtyVal * 2.5).toFixed(1);
  
  if (score > 10) return { label: 'Planet Protector (High Impact)', color: '#10b981', tip: `Heroic Choice! You're saving ${co2Saved}kg of CO2 over a short hop.`, icon: '🌍' };
  if (score > 5) return { label: 'Flash Saver (Efficient)', color: '#3b82f6', tip: `Smart Pickup! This delivery efficiently saves ${co2Saved}kg of CO2 emissions.`, icon: '⚡' };
  return { label: 'City Navigator (Standard)', color: '#6b7280', tip: `Solid Work! This route ensures ${co2Saved}kg of food doesn't go to waste.`, icon: '🛣️' };
};

export const calculateEnvironmentalImpact = (foodType, quantity, dietaryType) => {
  const qtyVal = parseFloat(quantity) || 5;
  // AI Heuristic: Non-Veg has a much higher carbon footprint (approx 3.5kg CO2/kg saved from waste)
  // Veg has approx 2.1kg CO2/kg saved from waste.
  const multiplier = dietaryType === 'Non-Veg' ? 3.5 : 2.1;
  const co2Saved = (qtyVal * multiplier).toFixed(1);
  
  return {
    co2: co2Saved,
    points: Math.round(qtyVal * 10),
    level: co2Saved > 50 ? 'Elite' : co2Saved > 20 ? 'Champion' : 'Helper'
  };
};
