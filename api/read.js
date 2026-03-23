export default async function handler(req, res) {
  const authKey = req.headers['x-api-key'] || req.query.key;
  if (authKey !== 'Ephesians6:10-17') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPA_URL = "https://lrunckedeivvrkaoxede.supabase.co";
  const SUPA_KEY = "sb_publishable_83gDs8jIpsD9gXu1evFwFA_NPR6bLvO";

  try {
    const response = await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main&select=data`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    if (response.ok) {
      const rows = await response.json();
      if (rows.length > 0 && rows[0].data) return res.status(200).json(rows[0].data);
    }
    return res.status(404).json({ error: 'No data found' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
