export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authKey = req.headers['x-api-key'] || req.query.key;
  if (authKey !== 'Ephesians6:10-17') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPA_URL = "https://lrunckedeivvrkaoxede.supabase.co";
  const SUPA_KEY = "sb_publishable_83gDs8jIpsD9gXu1evFwFA_NPR6bLvO";

  try {
    const data = req.body;
    const response = await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main`, {
      method: "PATCH",
      headers: {
        "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ data, updated_at: new Date().toISOString() })
    });
    if (response.ok) return res.status(200).json({ success: true });
    const err = await response.text();
    return res.status(response.status).json({ error: err });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
