import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description } = req.body || {};

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on Vercel' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Analyze this project description: "${description}"
      Generate 4 to 6 logical software engineering milestone tasks to build this project.
      Return ONLY a raw JSON array matching this exact schema, without any markdown formatting or explanation:
      [
        {
          "title": "Task Name",
          "phase": "Frontend" | "Backend" | "Database" | "DevOps",
          "recommended_tools": ["Tool1", "Tool2"]
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const rawText = response.text || '';
    const cleanJsonText = rawText.replace(/```json|```/g, '').trim();
    const milestones = JSON.parse(cleanJsonText);

    return res.status(200).json(milestones);
  } catch (error) {
    console.error('Vercel AI Endpoint Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate milestones' });
  }
}