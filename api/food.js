export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const { query } = await req.json();
  if (!query) return new Response(JSON.stringify({ error: 'No query provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const prompt = `You are a nutrition database. Return ONLY a valid JSON array (no markdown, no explanation) of 6 food items matching "${query}". Each item must have exactly these fields: name (string), serving (string like "100g" or "1 cup"), calories (number), protein_g (number), carbs_g (number), fat_g (number), note (short string tip). Be accurate and realistic with nutrition values.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
  });

  if (!response.ok) {
    const err = await response.json();
    return new Response(JSON.stringify({ error: err.error?.message || 'Anthropic API error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const data = await response.json();
  const text = data.content[0].text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(text);
    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
