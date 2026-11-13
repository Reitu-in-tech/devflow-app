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
    const prompt = `
      Analyze this developer's project description: "${description}"
      Generate 4 to 6 logical software engineering milestone tasks to build this project from scratch.
      Return ONLY a raw JSON array matching this exact schema, without any markdown formatting or explanation:
      [
        {
          "title": "Clear Task Name",
          "phase": "Frontend",
          "recommended_tools": ["Tool1", "Tool2"]
        }
      ]
      Note: For "phase", strictly choose one of: "Frontend", "Backend", "Database", or "DevOps".
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API call failed' });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJsonText = rawText.replace(/```json|```/g, '').trim();
    const milestones = JSON.parse(cleanJsonText);

    return res.status(200).json(milestones);
  } catch (error) {
    console.error('Serverless Handler Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate milestones' });
  }
}