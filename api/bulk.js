export default async function handler(req, res) {
  const authKey = req.headers['x-api-key'] || req.query.key;
  if (authKey !== 'Ephesians6:10-17') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPA_URL = "https://lrunckedeivvrkaoxede.supabase.co";
  const SUPA_KEY = "sb_publishable_83gDs8jIpsD9gXu1evFwFA_NPR6bLvO";

  try {
    const items = req.body;
    if (!items) return res.status(400).json({ error: 'No body' });

    const readRes = await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main&select=data`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    const rows = await readRes.json();
    let data = rows.length > 0 && rows[0].data ? rows[0].data : {
      reminders: [], tasks: [], notes: [], records: [], meetings: [],
      meetingSections: ["Morning Huddles", "1:1 Meetings", "Facility Services"],
      tags: [], archived: []
    };

    const id = () => Math.random().toString(36).slice(2, 10);
    let count = 0;

    (items.tasks || []).forEach(t => { data.tasks.push({ id: id(), done: false, ...t }); count++; });
    (items.reminders || []).forEach(r => { data.reminders.push({ id: id(), done: false, ...r }); count++; });
    (items.notes || []).forEach(n => { data.notes.push({ id: id(), ...n }); count++; });
    (items.meetings || []).forEach(m => { data.meetings.push({ id: id(), ...m }); count++; });

    const writeRes = await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main`, {
      method: "PATCH",
      headers: {
        "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ data, updated_at: new Date().toISOString() })
    });

    if (writeRes.ok) return res.status(200).json({ success: true, added: count });
    return res.status(500).json({ error: await writeRes.text() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
