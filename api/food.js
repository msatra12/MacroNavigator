export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'You are a precise nutrition database. Always respond with valid JSON only — no markdown, no explanation, no extra text.',
        messages: [{
          role: 'user',
          content: `The user searched for: "${query}". Return a JSON array of exactly 6 foods or meals related to this search. Each object must have these exact keys: "name" (string), "serving" (string like "100g" or "1 cup"), "calories" (integer), "protein_g" (number with 1 decimal), "carbs_g" (number with 1 decimal), "fat_g" (number with 1 decimal), "note" (one helpful sentence about this food's nutrition). Return ONLY the JSON array, nothing else.`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    const text = data.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim();
    const results = JSON.parse(text);
    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
