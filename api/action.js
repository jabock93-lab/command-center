export default async function handler(req, res) {
  const authKey = req.headers['x-api-key'] || req.query.key;
  if (authKey !== 'Ephesians6:10-17') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPA_URL = "https://lrunckedeivvrkaoxede.supabase.co";
  const SUPA_KEY = "sb_publishable_83gDs8jIpsD9gXu1evFwFA_NPR6bLvO";

  const action = req.query.action;
  const payload = req.query.data ? JSON.parse(decodeURIComponent(req.query.data)) : req.body;

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' });
  }

  try {
    const readRes = await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main&select=data`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    if (!readRes.ok) return res.status(500).json({ error: 'Failed to read data' });
    const rows = await readRes.json();
    let data = rows.length > 0 && rows[0].data ? rows[0].data : {
      reminders: [], tasks: [], notes: [], records: [], meetings: [],
      meetingSections: ["Morning Huddles", "1:1 Meetings", "Facility Services"],
      tags: [], archived: []
    };

    const id = Math.random().toString(36).slice(2, 10);

    if (action === 'add_task') {
      data.tasks.push({ id, done: false, ...payload });
    } else if (action === 'add_reminder') {
      data.reminders.push({ id, done: false, ...payload });
    } else if (action === 'add_note') {
      data.notes.push({ id, ...payload });
    } else if (action === 'add_meeting') {
      data.meetings.push({ id, ...payload });
    } else if (action === 'delete_task') {
      data.tasks = data.tasks.filter(t => t.id !== payload.id);
    } else if (action === 'complete_task') {
      data.tasks = data.tasks.map(t => t.id === payload.id ? { ...t, done: true } : t);
    } else if (action === 'complete_reminder') {
      data.reminders = data.reminders.map(r => r.id === payload.id ? { ...r, done: true } : r);
    } else if (action === 'update_all') {
      data = payload;
    } else {
      return res.status(400).json({ error: 'Unknown action: ' + action });
    }

    const writeRes = await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main`, {
      method: "PATCH",
      headers: {
        "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ data, updated_at: new Date().toISOString() })
    });

    if (writeRes.ok) return res.status(200).json({ success: true, action, id });
    const err = await writeRes.text();
    return res.status(writeRes.status).json({ error: err });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
