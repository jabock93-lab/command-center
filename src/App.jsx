import { useState, useEffect, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════ */
/* COMMAND CENTER v5 — Supabase Cloud Sync                    */
/* ═══════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);
const pad = n => String(n).padStart(2, "0");
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NOW = new Date();
const TODAY = fmt(NOW);h
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAYSF = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MO = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const PRI_C = { high: "#ef5350", med: "#ff9800", low: "#66bb6a" };
const PRI_L = { high: "HI", med: "MD", low: "LO" };
const K = {
  bg: "#0c0e11", pn: "#12151b", cd: "#181c25", ch: "#1e2330",
  inp: "#0f1218", bd: "#252a35", bl: "#333a4a",
  tx: "#c8cdd6", dm: "#5a6270", br: "#eef0f4",
  ac: "#e8a735", blu: "#4fc3f7", rd: "#ef5350", gn: "#4caf50", or: "#ff9800", pu: "#ab47bc",
  f: "'Share Tech Mono', monospace", fs: "'Chakra Petch', sans-serif",
};
const CC = { work: "#e8a735", personal: "#4fc3f7" };
const CL = { work: "WRK", personal: "PRS" };

/* ── SUPABASE CONFIG ── */
const SUPA_URL = "https://lrunckedeivvrkaoxede.supabase.co";
const SUPA_KEY = "sb_publishable_83gDs8jIpsD9gXu1evFwFA_NPR6bLvO";
const BLANK = { reminders: [], tasks: [], notes: [], records: [], meetings: [], meetingSections: ["Morning Huddles", "1:1 Meetings", "Facility Services"], tags: [], archived: [] };

/* ── SUPABASE STORAGE ── */
async function cloudLoad() {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main&select=data`, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0 && rows[0].data) return { ...BLANK, ...rows[0].data };
    }
  } catch (e) { console.log("Cloud load error:", e); }
  return null;
}

async function cloudSave(data) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/app_data?id=eq.main`, {
      method: "PATCH",
      headers: {
        "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal"
      },
      body: JSON.stringify({ data, updated_at: new Date().toISOString() })
    });
  } catch (e) { console.log("Cloud save error:", e); }
}

/* ── LOCAL FALLBACK ── */
const LKEY = "cc_v5";
const localLoad = () => { try { const r = localStorage.getItem(LKEY); if (r) return { ...BLANK, ...JSON.parse(r) }; } catch (e) {} return null; };
const localSave = d => { try { localStorage.setItem(LKEY, JSON.stringify(d)); } catch (e) {} };

/* ── GRID ── */
const mGrid = (y, m) => {
  const f = new Date(y, m, 1), l = new Date(y, m + 1, 0), sd = f.getDay(), c = [];
  for (let i = 0; i < sd; i++) c.push({ d: new Date(y, m, -sd + i + 1), ok: false });
  for (let i = 1; i <= l.getDate(); i++) c.push({ d: new Date(y, m, i), ok: true });
  while (c.length % 7) c.push({ d: new Date(y, m + 1, c.length - sd - l.getDate() + 1), ok: false });
  return c;
};
const wkD = d => { const s = new Date(d); s.setDate(s.getDate() - s.getDay()); return Array.from({ length: 7 }, (_, i) => { const x = new Date(s); x.setDate(s.getDate() + i); return x; }); };

/* ── UI ATOMS ── */
const Tag = ({ cat }) => <span style={{ fontFamily: K.f, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: CC[cat], border: `1px solid ${CC[cat]}35`, background: `${CC[cat]}12`, padding: "1px 5px" }}>{CL[cat]}</span>;
const Pri = ({ p }) => p && p !== "none" ? <span style={{ fontFamily: K.f, fontSize: 8, fontWeight: 700, letterSpacing: 1, color: PRI_C[p], border: `1px solid ${PRI_C[p]}40`, padding: "0 4px" }}>{PRI_L[p]}</span> : null;
const TB = ({ t }) => { const c = { reminder: K.ac, task: K.gn, note: K.blu, meeting: K.pu }; const l = { reminder: "REM", task: "TASK", note: "NOTE", meeting: "MTG" }; return <span style={{ fontFamily: K.f, fontSize: 8, letterSpacing: 1.5, color: c[t], opacity: .7, marginLeft: 4 }}>{l[t]}</span>; };
const CT = ({ tag }) => <span style={{ fontFamily: K.f, fontSize: 8, letterSpacing: 1, color: K.blu, border: `1px solid ${K.blu}30`, padding: "0 4px", background: `${K.blu}10` }}>{tag}</span>;
const Btn = ({ children, color = K.ac, small, outline, onClick, style: s, ...r }) => (<button onClick={onClick} style={{ background: outline ? "transparent" : color, color: outline ? color : K.bg, border: outline ? `1px solid ${color}40` : "none", padding: small ? "4px 10px" : "7px 14px", fontFamily: K.f, fontSize: small ? 10 : 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", ...s }} {...r}>{children}</button>);
const Inp = ({ label, ...p }) => (<div style={{ marginBottom: 10 }}>{label && <label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>}<input {...p} style={{ background: K.inp, border: `1px solid ${K.bd}`, color: K.tx, fontFamily: K.f, fontSize: 12, padding: "8px 10px", width: "100%", boxSizing: "border-box", outline: "none", ...(p.style || {}) }} /></div>);
const Txa = ({ label, ...p }) => (<div style={{ marginBottom: 10 }}>{label && <label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>}<textarea {...p} style={{ background: K.inp, border: `1px solid ${K.bd}`, color: K.tx, fontFamily: K.f, fontSize: 12, padding: "8px 10px", width: "100%", boxSizing: "border-box", outline: "none", resize: "vertical", minHeight: 60, ...(p.style || {}) }} /></div>);
const Sel = ({ label, options, ...p }) => (<div style={{ marginBottom: 10 }}>{label && <label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>}<select {...p} style={{ background: K.inp, border: `1px solid ${K.bd}`, color: K.tx, fontFamily: K.f, fontSize: 12, padding: "8px 10px", width: "100%", boxSizing: "border-box", outline: "none", cursor: "pointer", ...(p.style || {}) }}>{options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>);
const CatPk = ({ value: v, onChange }) => (<div style={{ display: "flex", gap: 6, marginBottom: 10 }}>{["work", "personal"].map(c => (<div key={c} onClick={() => onChange(c)} style={{ flex: 1, padding: "6px 0", textAlign: "center", cursor: "pointer", fontFamily: K.f, fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: v === c ? K.bg : CC[c], background: v === c ? CC[c] : "transparent", border: `1px solid ${CC[c]}50`, textTransform: "uppercase" }}>{c}</div>))}</div>);
const CatFl = ({ value: v, onChange }) => (<div style={{ display: "flex", gap: 4 }}>{["all", "work", "personal"].map(c => (<span key={c} onClick={() => onChange(c)} style={{ fontFamily: K.f, fontSize: 9, letterSpacing: 1.5, padding: "3px 8px", cursor: "pointer", textTransform: "uppercase", color: v === c ? (c === "all" ? K.br : CC[c]) : K.dm, background: v === c ? `${c === "all" ? K.br : CC[c]}15` : "transparent", border: `1px solid ${v === c ? (c === "all" ? K.bl : CC[c] + "50") : K.bd}` }}>{c}</span>))}</div>);
const TagPk = ({ tags, selected, onChange }) => { if (!tags || !tags.length) return null; return (<div style={{ marginBottom: 10 }}><label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Tags</label><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{tags.map(t => (<span key={t} onClick={() => onChange(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t])} style={{ fontFamily: K.f, fontSize: 9, padding: "3px 8px", cursor: "pointer", letterSpacing: 1, color: selected.includes(t) ? K.bg : K.blu, background: selected.includes(t) ? K.blu : "transparent", border: `1px solid ${K.blu}40` }}>{t}</span>))}</div></div>); };
const Modal = ({ title, onClose, children }) => (<div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div onClick={e => e.stopPropagation()} style={{ background: K.pn, border: `1px solid ${K.bl}`, width: "100%", maxWidth: 420, maxHeight: "85vh", overflow: "auto" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${K.bd}` }}><span style={{ fontFamily: K.f, fontSize: 11, color: K.ac, letterSpacing: 2, textTransform: "uppercase" }}>{title}</span><span style={{ fontFamily: K.f, fontSize: 18, color: K.dm, cursor: "pointer", lineHeight: 1 }} onClick={onClose}>×</span></div><div style={{ padding: 14 }}>{children}</div></div></div>);
const Empty = ({ text }) => <div style={{ fontFamily: K.f, fontSize: 11, color: K.dm, textAlign: "center", padding: "24px 0", letterSpacing: 1, textTransform: "uppercase" }}>{text}</div>;
const SH = ({ text }) => <div style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 2, padding: "8px 0 6px", borderBottom: `1px solid ${K.bd}`, marginBottom: 8, textTransform: "uppercase" }}>{text}</div>;
const cS = { background: K.cd, border: `1px solid ${K.bd}`, padding: "8px 10px", marginBottom: 6 };

/* ═══════════════════════════════ */
/* MAIN APP                       */
/* ═══════════════════════════════ */
export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("cc_auth") === "true");
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const checkPw = () => { if (pw === "Ephesians6:10-17") { setUnlocked(true); sessionStorage.setItem("cc_auth", "true"); } else { setPwErr(true); setTimeout(() => setPwErr(false), 1500); } };
  
  if (!unlocked) return (
    <div style={{ background: "#0c0e11", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Share Tech Mono', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Chakra+Petch:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", width: 300 }}>
        <div style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, color: "#eef0f4", letterSpacing: 2, marginBottom: 4 }}>COMMAND<span style={{ color: "#e8a735" }}> CENTER</span></div>
        <div style={{ fontSize: 9, color: "#5a6270", letterSpacing: 1.5, marginBottom: 24 }}>AUTHENTICATION REQUIRED</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && checkPw()} placeholder="Enter password..." style={{ width: "100%", background: "#0f1218", border: `1px solid ${pwErr ? "#ef5350" : "#252a35"}`, color: "#c8cdd6", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, padding: "12px 14px", textAlign: "center", outline: "none", marginBottom: 12, boxSizing: "border-box" }} autoFocus />
        <button onClick={checkPw} style={{ width: "100%", background: "#e8a735", color: "#0c0e11", border: "none", padding: "10px", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: "pointer" }}>UNLOCK</button>
        {pwErr && <div style={{ fontSize: 10, color: "#ef5350", marginTop: 8 }}>ACCESS DENIED</div>}
      </div>
    </div>
  );

  const TABS = ["DASH", "CALENDAR", "TASKS", "NOTES", "MEETINGS", "RECORDS"];
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("loading");
  const [tab, setTab] = useState("DASH");
  const [data, setData] = useState(BLANK);
  const [modal, setModal] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [selDate, setSelDate] = useState(new Date());
  const [calView, setCalView] = useState("month");
  const [activeRec, setActiveRec] = useState(null);
  const [showTasks, setShowTasks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [activeMtg, setActiveMtg] = useState(null);

  /* Load: try cloud first, fall back to local */
  useEffect(() => {
    async function init() {
      setSyncStatus("loading");
      const cloud = await cloudLoad();
      if (cloud) {
        setData(cloud);
        localSave(cloud);
        setSyncStatus("synced");
      } else {
        const local = localLoad();
        if (local) { setData(local); setSyncStatus("local"); }
        else { setData(BLANK); setSyncStatus("new"); }
      }
      setLoading(false);
    }
    init();
  }, []);

  /* Save: write to both cloud and local on every change */
  const saveRef = useCallback((newData) => {
    localSave(newData);
    cloudSave(newData).then(() => setSyncStatus("synced")).catch(() => setSyncStatus("local"));
  }, []);

  useEffect(() => { if (!loading) saveRef(data); }, [data, loading, saveRef]);

  const upd_ = fn => setData(prev => fn(prev));
  const add = (t, item) => upd_(p => ({ ...p, [t]: [...p[t], { id: uid(), ...item }] }));
  const upd = (t, id, u) => upd_(p => ({ ...p, [t]: p[t].map(i => i.id === id ? { ...i, ...u } : i) }));
  const del = (t, id) => upd_(p => ({ ...p, [t]: p[t].filter(i => i.id !== id) }));
  const archive = (t, id) => { const item = data[t].find(i => i.id === id); if (item) upd_(p => ({ ...p, [t]: p[t].filter(i => i.id !== id), archived: [...p.archived, { ...item, _orig: t, archivedAt: TODAY }] })); };
  const addTag = tag => { if (tag && !data.tags.includes(tag)) upd_(p => ({ ...p, tags: [...p.tags, tag] })); };
  const addSec = s => { if (s && !data.meetingSections.includes(s)) upd_(p => ({ ...p, meetingSections: [...p.meetingSections, s] })); };

  const completeItem = (type, id) => {
    const item = data[type].find(i => i.id === id);
    if (!item) return;
    upd(type, id, { done: !item.done });
    if (!item.done && item.linkedTo) {
      const mtg = data.meetings.find(m => m.id === item.linkedTo);
      if (mtg) { const ann = mtg.annotations || []; upd("meetings", mtg.id, { annotations: [...ann, { text: `✓ ${item.title} completed`, date: TODAY, id: uid() }] }); }
    }
  };

  const allItems = useMemo(() => {
    const i = [];
    data.reminders.forEach(r => i.push({ ...r, _t: "reminder" }));
    data.tasks.forEach(t => i.push({ ...t, _t: "task" }));
    data.notes.forEach(n => i.push({ ...n, _t: "note" }));
    return i;
  }, [data]);

  const forDate = useCallback(ds => allItems.filter(i => i.date === ds), [allItems]);
  const openTasks = useMemo(() => data.tasks.filter(t => !t.done).sort((a, b) => { const p = { high: 0, med: 1, low: 2, none: 3 }; return ((p[a.priority] || 3) - (p[b.priority] || 3)) || a.date.localeCompare(b.date); }), [data.tasks]);
  const openRems = useMemo(() => data.reminders.filter(r => !r.done && r.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date)), [data.reminders]);
  const overdueItems = useMemo(() => [...data.tasks.filter(t => !t.done && t.date < TODAY), ...data.reminders.filter(r => !r.done && r.date < TODAY)], [data]);
  const todayItems = useMemo(() => forDate(TODAY), [forDate]);
  const todayMtgs = useMemo(() => data.meetings.filter(m => m.date === TODAY), [data.meetings]);
  const upMtgs = useMemo(() => data.meetings.filter(m => m.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5), [data.meetings]);

  const notifs = useMemo(() => {
    const n = [];
    overdueItems.forEach(i => n.push({ text: `OVERDUE: ${i.title}`, type: "overdue" }));
    todayItems.filter(i => i._t === "reminder" && !i.done).forEach(i => n.push({ text: `TODAY: ${i.title}`, type: "today" }));
    todayMtgs.forEach(m => n.push({ text: `MEETING: ${m.title}${m.time ? ` @ ${m.time}` : ""}`, type: "meeting" }));
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1); const ts = fmt(tmrw);
    allItems.filter(i => i.date === ts && !i.done).forEach(i => n.push({ text: `TOMORROW: ${i.title || i.text}`, type: "upcoming" }));
    return n;
  }, [overdueItems, todayItems, todayMtgs, allItems]);

  const searchRes = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase(), r = [];
    data.reminders.forEach(i => { if ((i.title + (i.notes || "")).toLowerCase().includes(q)) r.push({ ...i, _t: "reminder" }); });
    data.tasks.forEach(i => { if ((i.title + (i.notes || "")).toLowerCase().includes(q)) r.push({ ...i, _t: "task" }); });
    data.notes.forEach(i => { if (((i.title || "") + (i.text || "")).toLowerCase().includes(q)) r.push({ ...i, _t: "note" }); });
    data.meetings.forEach(i => { if (((i.title || "") + (i.notes || "")).toLowerCase().includes(q)) r.push({ ...i, _t: "meeting" }); });
    data.records.forEach(i => { if (((i.name || "") + (i.description || "")).toLowerCase().includes(q)) r.push({ ...i, _t: "record" }); });
    return r;
  }, [searchQ, data]);

  const openAdd = (type, defaults = {}) => { setShowFab(false); setModal({ type: `add_${type}`, p: defaults }); };
  const openEdit = (type, item) => setModal({ type: `edit_${type}`, p: item });
  const navCal = dir => { const d = new Date(viewDate); if (calView === "month") d.setMonth(d.getMonth() + dir); else if (calView === "week") d.setDate(d.getDate() + (dir * 7)); else d.setDate(d.getDate() + dir); setViewDate(d); };

  const exportData = format => {
    if (format === "json") navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => alert("JSON copied"));
    else {
      let c = "Type,Title,Date,Category,Priority,Status\n";
      data.reminders.forEach(r => c += `Reminder,"${r.title}",${r.date},${r.cat},${r.priority||""},${r.done?"Done":"Open"}\n`);
      data.tasks.forEach(t => c += `Task,"${t.title}",${t.date},${t.cat},${t.priority||""},${t.done?"Done":"Open"}\n`);
      data.notes.forEach(n => c += `Note,"${n.title}",${n.date},${n.cat},,\n`);
      data.meetings.forEach(m => c += `Meeting,"${m.title}",${m.date},${m.cat},,\n`);
      navigator.clipboard.writeText(c).then(() => alert("CSV copied"));
    }
  };

  /* ── MODALS ── */
  const renderModal = () => {
    if (!modal) return null;
    const { type: mt, p } = modal, close = () => setModal(null);
    if (mt === "add_reminder" || mt === "edit_reminder") { const isE = mt[0] === "e"; return <ItemForm type="reminder" init={p} isEdit={isE} tags={data.tags} onAddTag={addTag} meetings={data.meetings} onSave={item => { if (isE) upd("reminders", p.id, item); else add("reminders", { ...item, done: false }); close(); }} onDel={isE ? () => { archive("reminders", p.id); close(); } : null} onClose={close} />; }
    if (mt === "add_task" || mt === "edit_task") { const isE = mt[0] === "e"; return <ItemForm type="task" init={p} isEdit={isE} tags={data.tags} onAddTag={addTag} meetings={data.meetings} onSave={item => { if (isE) upd("tasks", p.id, item); else add("tasks", { ...item, done: false }); close(); }} onDel={isE ? () => { archive("tasks", p.id); close(); } : null} onClose={close} />; }
    if (mt === "add_note" || mt === "edit_note") { const isE = mt[0] === "e"; const lk = [...data.reminders.map(r => ({ id: r.id, label: `[REM] ${r.title}` })), ...data.tasks.map(t => ({ id: t.id, label: `[TASK] ${t.title}` })), ...data.meetings.map(m => ({ id: m.id, label: `[MTG] ${m.title}` }))]; return <NoteForm init={p} isEdit={isE} tags={data.tags} onAddTag={addTag} linkable={lk} onSave={item => { if (isE) upd("notes", p.id, item); else add("notes", item); close(); }} onDel={isE ? () => { archive("notes", p.id); close(); } : null} onClose={close} />; }
    if (mt === "add_meeting" || mt === "edit_meeting") { const isE = mt[0] === "e"; return <MtgForm init={p} isEdit={isE} sections={data.meetingSections} onSave={item => { if (isE) upd("meetings", p.id, item); else add("meetings", item); close(); }} onDel={isE ? () => { del("meetings", p.id); close(); } : null} onClose={close} />; }
    if (mt === "add_record") return <RecForm onSave={item => { add("records", { ...item, entries: [] }); close(); }} onClose={close} />;
    if (mt === "edit_record") return <RecForm init={p} isEdit onSave={item => { upd("records", p.id, item); close(); }} onDel={() => { del("records", p.id); setActiveRec(null); close(); }} onClose={close} />;
    if (mt === "add_entry") return <EntryForm onSave={entry => { const rec = data.records.find(r => r.id === p.recId); if (rec) upd("records", rec.id, { entries: [...rec.entries, { id: uid(), ...entry }] }); close(); }} onClose={close} />;
    if (mt === "add_tag") return <Modal title="New Tag" onClose={close}><SimpleForm label="Tag Name" ph="e.g. HVAC, Fleet..." bc={K.blu} onSave={t => { addTag(t); close(); }} /></Modal>;
    if (mt === "add_meeting_section") return <Modal title="New Section" onClose={close}><SimpleForm label="Section Name" ph="e.g. Safety Committee..." bc={K.pu} onSave={s => { addSec(s); close(); }} /></Modal>;
    if (mt === "export") return <Modal title="Export" onClose={close}><div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Btn onClick={() => { exportData("json"); close(); }}>JSON</Btn><Btn color={K.blu} onClick={() => { exportData("csv"); close(); }}>CSV</Btn></div></Modal>;
    if (mt === "view_archive") return <Modal title="Archive" onClose={close}>{data.archived.length === 0 ? <Empty text="Empty" /> : data.archived.map(a => (<div key={a.id} style={{ ...cS, opacity: .7 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: K.f, fontSize: 11, color: K.tx }}>{a.title || a.name || a.text || "—"}</span><span style={{ fontFamily: K.f, fontSize: 9, color: K.dm }}>{a._orig} · {a.archivedAt}</span></div></div>))}</Modal>;
    return null;
  };

  /* ── OPEN ITEMS PANEL ── */
  const TasksPanel = () => {
    const tot = openTasks.length + openRems.length;
    return (<div style={{ background: K.pn, border: `1px solid ${K.bl}`, marginBottom: 12 }}>
      <div onClick={() => setShowTasks(!showTasks)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", cursor: "pointer", borderBottom: showTasks ? `1px solid ${K.bd}` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: K.f, fontSize: 10, color: K.gn, letterSpacing: 2 }}>OPEN ITEMS</span>
          <span style={{ fontFamily: K.f, fontSize: 10, color: K.bg, background: tot > 0 ? K.gn : K.dm, padding: "1px 6px", fontWeight: 700 }}>{tot}</span>
          {overdueItems.length > 0 && <span style={{ fontFamily: K.f, fontSize: 10, color: K.bg, background: K.rd, padding: "1px 6px", fontWeight: 700 }}>{overdueItems.length} OD</span>}
        </div>
        <span style={{ fontFamily: K.f, fontSize: 12, color: K.dm, transform: showTasks ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▸</span>
      </div>
      {showTasks && (<div style={{ padding: "8px 12px", maxHeight: 260, overflow: "auto" }}>
        {tot === 0 && <Empty text="All clear" />}
        {overdueItems.length > 0 && <><div style={{ fontFamily: K.f, fontSize: 8, color: K.rd, letterSpacing: 2, marginBottom: 4 }}>OVERDUE</div>{overdueItems.map(i => <MI key={i.id} item={i} color={K.rd} onCheck={() => completeItem(data.tasks.find(t => t.id === i.id) ? "tasks" : "reminders", i.id)} />)}</>}
        {openRems.length > 0 && <><div style={{ fontFamily: K.f, fontSize: 8, color: K.ac, letterSpacing: 2, marginTop: 6, marginBottom: 4 }}>REMINDERS</div>{openRems.map(r => <MI key={r.id} item={r} onCheck={() => completeItem("reminders", r.id)} />)}</>}
        {openTasks.length > 0 && <><div style={{ fontFamily: K.f, fontSize: 8, color: K.gn, letterSpacing: 2, marginTop: 6, marginBottom: 4 }}>TASKS</div>{openTasks.map(t => <MI key={t.id} item={t} onCheck={() => completeItem("tasks", t.id)} />)}</>}
      </div>)}
    </div>);
  };
  const MI = ({ item: i, color, onCheck }) => (<div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: `1px solid ${K.bd}20` }}><span onClick={onCheck} style={{ width: 14, height: 14, border: `2px solid ${color || K.bl}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 9, color: K.gn }} /><span style={{ fontFamily: K.f, fontSize: 11, color: color || K.tx, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</span><Pri p={i.priority} /><span style={{ fontFamily: K.f, fontSize: 9, color: K.dm }}>{i.date}</span><Tag cat={i.cat} /></div>);

  /* ── DATE PANEL ── */
  const DatePanel = ({ ds }) => {
    const items = forDate(ds), mtgs = data.meetings.filter(m => m.date === ds), d = new Date(ds + "T00:00:00");
    return (<div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontFamily: K.f, fontSize: 11, color: K.br, letterSpacing: 1 }}>{DAYSF[d.getDay()]} — {MO[d.getMonth()]} {d.getDate()}, {d.getFullYear()}</span>
        <div style={{ display: "flex", gap: 4 }}><Btn small onClick={() => openAdd("reminder", { date: ds })}>+REM</Btn><Btn small color={K.gn} onClick={() => openAdd("task", { date: ds })}>+TASK</Btn><Btn small color={K.blu} onClick={() => openAdd("note", { date: ds })}>+NOTE</Btn></div>
      </div>
      {mtgs.map(m => (<div key={m.id} onClick={() => openEdit("meeting", m)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${K.pu}`, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: K.pu }}>◈</span><div style={{ flex: 1 }}><div style={{ fontFamily: K.f, fontSize: 12, color: K.br }}>{m.title}</div>{m.time && <span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>{m.time}</span>}</div><Tag cat={m.cat} /><TB t="meeting" /></div>))}
      {items.length === 0 && mtgs.length === 0 && <Empty text="Nothing scheduled" />}
      {items.map(i => {
        const od = !i.done && i.date < TODAY && (i._t === "task" || i._t === "reminder");
        return (<div key={i.id} onClick={() => openEdit(i._t, i)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${od ? K.rd : CC[i.cat]}`, display: "flex", alignItems: "center", gap: 8 }}>
          {(i._t === "task" || i._t === "reminder") && <span onClick={e => { e.stopPropagation(); completeItem(i._t === "task" ? "tasks" : "reminders", i.id); }} style={{ width: 16, height: 16, border: `2px solid ${i.done ? K.gn : od ? K.rd : K.bl}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: K.gn, cursor: "pointer", flexShrink: 0, background: i.done ? `${K.gn}20` : "transparent" }}>{i.done ? "✓" : ""}</span>}
          {i._t === "note" && <span style={{ color: K.blu, flexShrink: 0 }}>■</span>}
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: K.f, fontSize: 12, color: i.done ? K.dm : od ? K.rd : K.tx, textDecoration: i.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title || i.text || "—"}</div></div>
          <Pri p={i.priority} /><Tag cat={i.cat} /><TB t={i._t} />
        </div>);
      })}
    </div>);
  };

  /* ══ DASHBOARD ══ */
  const DashTab = () => (<div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
      {[{ l: "OVERDUE", v: overdueItems.length, c: overdueItems.length > 0 ? K.rd : K.dm }, { l: "TASKS", v: openTasks.length, c: K.gn }, { l: "REMINDERS", v: openRems.length, c: K.ac }, { l: "MEETINGS", v: todayMtgs.length, c: K.pu }].map(s => (<div key={s.l} style={{ background: K.cd, border: `1px solid ${K.bd}`, padding: "10px 6px", textAlign: "center" }}><div style={{ fontFamily: K.f, fontSize: 22, color: s.c, fontWeight: 700 }}>{s.v}</div><div style={{ fontFamily: K.f, fontSize: 8, color: K.dm, letterSpacing: 1.5, marginTop: 2 }}>{s.l}</div></div>))}
    </div>
    <SH text={`TODAY — ${MO[NOW.getMonth()]} ${NOW.getDate()}`} />
    {todayItems.length === 0 && todayMtgs.length === 0 && <Empty text="Clear day" />}
    {todayMtgs.map(m => (<div key={m.id} onClick={() => { setTab("MEETINGS"); setActiveMtg(m.id); }} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${K.pu}`, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: K.pu }}>◈</span><span style={{ fontFamily: K.f, fontSize: 12, color: K.br, flex: 1 }}>{m.title}</span>{m.time && <span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>{m.time}</span>}<Tag cat={m.cat} /></div>))}
    {todayItems.map(i => (<div key={i.id} style={{ ...cS, borderLeft: `3px solid ${CC[i.cat]}`, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: K.f, fontSize: 12, color: K.tx, flex: 1 }}>{i.title || i.text || "—"}</span><Pri p={i.priority} /><Tag cat={i.cat} /><TB t={i._t} /></div>))}
    {upMtgs.length > 0 && <><SH text="UPCOMING MEETINGS" />{upMtgs.map(m => (<div key={m.id} onClick={() => { setTab("MEETINGS"); setActiveMtg(m.id); }} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${K.pu}`, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: K.f, fontSize: 11, color: K.br, flex: 1 }}>{m.title}</span><span style={{ fontFamily: K.f, fontSize: 9, color: K.dm }}>{m.date}{m.time ? ` ${m.time}` : ""}</span><Tag cat={m.cat} /></div>))}</>}
    <SH text="TOOLS" />
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Btn small outline onClick={() => setModal({ type: "export" })}>EXPORT</Btn><Btn small outline color={K.dm} onClick={() => setModal({ type: "view_archive" })}>ARCHIVE</Btn><Btn small outline color={K.blu} onClick={() => setModal({ type: "add_tag" })}>+ TAG</Btn></div>
  </div>);

  /* ══ CALENDAR ══ */
  const CalTab = () => {
    const grid = mGrid(viewDate.getFullYear(), viewDate.getMonth()), week = wkD(viewDate), ds = fmt(selDate);
    return (<div>
      <TasksPanel />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 4 }}>{["month", "week", "day"].map(v => (<span key={v} onClick={() => setCalView(v)} style={{ fontFamily: K.f, fontSize: 10, letterSpacing: 1.5, padding: "4px 8px", cursor: "pointer", textTransform: "uppercase", color: calView === v ? K.bg : K.dm, background: calView === v ? K.ac : "transparent", border: `1px solid ${calView === v ? K.ac : K.bd}` }}>{v}</span>))}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span onClick={() => navCal(-1)} style={{ fontFamily: K.f, fontSize: 16, color: K.dm, cursor: "pointer" }}>◂</span>
          <span style={{ fontFamily: K.f, fontSize: 12, color: K.br, letterSpacing: 1, minWidth: 100, textAlign: "center" }}>{calView === "day" ? `${MO[viewDate.getMonth()]} ${viewDate.getDate()}, ${viewDate.getFullYear()}` : `${MO[viewDate.getMonth()]} ${viewDate.getFullYear()}`}</span>
          <span onClick={() => navCal(1)} style={{ fontFamily: K.f, fontSize: 16, color: K.dm, cursor: "pointer" }}>▸</span>
          <span onClick={() => { setViewDate(new Date()); setSelDate(new Date()); }} style={{ fontFamily: K.f, fontSize: 9, color: K.ac, cursor: "pointer", border: `1px solid ${K.ac}40`, padding: "3px 6px" }}>NOW</span>
        </div>
      </div>
      {calView === "month" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 1 }}>{DAYS.map((d, i) => <div key={i} style={{ fontFamily: K.f, fontSize: 9, color: K.dm, textAlign: "center", padding: 4 }}>{d}</div>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>{grid.map((c, i) => {
          const d2 = fmt(c.d), iT = d2 === TODAY, iS = d2 === ds, it = forDate(d2), mg = data.meetings.filter(m => m.date === d2);
          return (<div key={i} onClick={() => setSelDate(c.d)} style={{ background: iS ? K.ch : K.cd, border: `1px solid ${iT ? K.ac : iS ? K.bl : K.bd}`, padding: 4, minHeight: 44, cursor: "pointer", opacity: c.ok ? 1 : .35 }}>
            <div style={{ fontFamily: K.f, fontSize: 11, color: iT ? K.ac : iS ? K.br : K.dm, fontWeight: iT ? 700 : 400 }}>{c.d.getDate()}</div>
            <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
              {it.some(x => x.cat === "work") && <div style={{ width: 5, height: 5, borderRadius: "50%", background: CC.work }} />}
              {it.some(x => x.cat === "personal") && <div style={{ width: 5, height: 5, borderRadius: "50%", background: CC.personal }} />}
              {mg.length > 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: K.pu }} />}
              {it.some(x => !x.done && x.date < TODAY) && <div style={{ width: 5, height: 5, background: K.rd }} />}
            </div>
          </div>);
        })}</div>
        <div style={{ marginTop: 12 }}><DatePanel ds={ds} /></div>
      </>}
      {calView === "week" && <><div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 12 }}>{week.map((w, i) => { const ws = fmt(w), iS = ws === ds, iT = ws === TODAY, it = forDate(ws); return (<div key={i} onClick={() => setSelDate(w)} style={{ cursor: "pointer", textAlign: "center", padding: "8px 2px", background: iS ? K.ch : K.cd, border: `1px solid ${iT ? K.ac : iS ? K.bl : K.bd}` }}><div style={{ fontFamily: K.f, fontSize: 9, color: K.dm }}>{DAYSF[i]}</div><div style={{ fontFamily: K.f, fontSize: 18, color: iT ? K.ac : K.br, fontWeight: iT ? 700 : 400, margin: "4px 0" }}>{w.getDate()}</div><div style={{ fontFamily: K.f, fontSize: 9, color: K.dm }}>{it.length || ""}</div></div>); })}</div><DatePanel ds={ds} /></>}
      {calView === "day" && <DatePanel ds={fmt(viewDate)} />}
    </div>);
  };

  /* ══ TASKS ══ */
  const TasksTab = () => {
    const [catF, setCF] = useState("all");
    const fl = catF === "all" ? data.tasks : data.tasks.filter(t => t.cat === catF);
    const active = fl.filter(t => !t.done).sort((a, b) => { const p = { high: 0, med: 1, low: 2, none: 3 }; return ((p[a.priority] || 3) - (p[b.priority] || 3)) || a.date.localeCompare(b.date); });
    const done = fl.filter(t => t.done);
    return (<div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><CatFl value={catF} onChange={setCF} /><Btn small color={K.gn} onClick={() => openAdd("task", { date: TODAY })}>+ NEW</Btn></div>
      <SH text={`ACTIVE (${active.length})`} />
      {active.length === 0 && <Empty text="All caught up" />}
      {active.map(t => { const od = t.date < TODAY; return (<div key={t.id} onClick={() => openEdit("task", t)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${od ? K.rd : CC[t.cat]}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span onClick={e => { e.stopPropagation(); completeItem("tasks", t.id); }} style={{ width: 16, height: 16, border: `2px solid ${od ? K.rd : K.bl}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: K.f, fontSize: 12, color: od ? K.rd : K.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>{t.notes && <div style={{ fontFamily: K.f, fontSize: 10, color: K.dm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.notes}</div>}</div>
        <Pri p={t.priority} /><span style={{ fontFamily: K.f, fontSize: 9, color: K.dm }}>{t.date}</span><Tag cat={t.cat} />{t.recurring && t.recurring !== "none" && <span style={{ fontFamily: K.f, fontSize: 8, color: K.or }}>↻</span>}
      </div>); })}
      {done.length > 0 && <><SH text={`COMPLETED (${done.length})`} />{done.map(t => (<div key={t.id} onClick={() => openEdit("task", t)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${CC[t.cat]}20`, opacity: .5, display: "flex", alignItems: "center", gap: 8 }}>
        <span onClick={e => { e.stopPropagation(); completeItem("tasks", t.id); }} style={{ width: 16, height: 16, border: `2px solid ${K.gn}`, background: `${K.gn}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: K.gn, cursor: "pointer", flexShrink: 0 }}>✓</span>
        <span style={{ fontFamily: K.f, fontSize: 12, color: K.dm, textDecoration: "line-through", flex: 1 }}>{t.title}</span><Tag cat={t.cat} />
      </div>))}</>}
    </div>);
  };

  /* ══ NOTES ══ */
  const NotesTab = () => {
    const [catF, setCF] = useState("all");
    const list = (catF === "all" ? data.notes : data.notes.filter(n => n.cat === catF)).sort((a, b) => b.date.localeCompare(a.date));
    const gN = n => { if (!n.linkedTo) return null; const a = [...data.reminders, ...data.tasks, ...data.meetings]; const l = a.find(x => x.id === n.linkedTo); return l ? l.title : null; };
    return (<div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><CatFl value={catF} onChange={setCF} /><Btn small color={K.blu} onClick={() => openAdd("note", { date: TODAY })}>+ NEW</Btn></div>
      {list.length === 0 && <Empty text="No notes" />}
      {list.map(n => { const ln = gN(n); return (<div key={n.id} onClick={() => openEdit("note", n)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${CC[n.cat]}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontFamily: K.f, fontSize: 12, color: K.br, fontWeight: 700 }}>{n.title || "—"}</span><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>{n.date}</span><Tag cat={n.cat} /></div></div>
        {ln && <div style={{ fontFamily: K.f, fontSize: 9, color: K.pu, marginBottom: 3 }}>⤷ {ln}</div>}
        {n.tags && n.tags.length > 0 && <div style={{ display: "flex", gap: 3, marginBottom: 3 }}>{n.tags.map(t => <CT key={t} tag={t} />)}</div>}
        <div style={{ fontFamily: K.f, fontSize: 11, color: K.dm, whiteSpace: "pre-wrap", maxHeight: 50, overflow: "hidden" }}>{n.text}</div>
      </div>); })}
    </div>);
  };

  /* ══ MEETINGS ══ */
  const MtgsTab = () => {
    if (activeMtg) {
      const m = data.meetings.find(x => x.id === activeMtg);
      if (!m) { setActiveMtg(null); return null; }
      const lnN = data.notes.filter(n => n.linkedTo === m.id), lnT = data.tasks.filter(t => t.linkedTo === m.id), lnR = data.reminders.filter(r => r.linkedTo === m.id), ann = m.annotations || [];
      return (<div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span onClick={() => setActiveMtg(null)} style={{ fontFamily: K.f, fontSize: 14, color: K.dm, cursor: "pointer" }}>◂</span><span style={{ fontFamily: K.f, fontSize: 13, color: K.br, letterSpacing: 1 }}>{m.title}</span><Tag cat={m.cat} /></div>
        <div style={{ background: K.cd, border: `1px solid ${K.bd}`, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}><span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>DATE: <span style={{ color: K.tx }}>{m.date}</span></span>{m.time && <span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>TIME: <span style={{ color: K.tx }}>{m.time}</span></span>}<span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>SEC: <span style={{ color: K.pu }}>{m.section}</span></span></div>
          {m.attendees && <div style={{ fontFamily: K.f, fontSize: 10, color: K.dm, marginBottom: 6 }}>ATTENDEES: <span style={{ color: K.tx }}>{m.attendees}</span></div>}
          {m.agenda && <><div style={{ fontFamily: K.f, fontSize: 9, color: K.ac, letterSpacing: 1.5, marginBottom: 3 }}>AGENDA</div><div style={{ fontFamily: K.f, fontSize: 11, color: K.tx, whiteSpace: "pre-wrap", marginBottom: 8, padding: "6px 8px", background: K.inp, border: `1px solid ${K.bd}` }}>{m.agenda}</div></>}
          {m.actionItems && <><div style={{ fontFamily: K.f, fontSize: 9, color: K.gn, letterSpacing: 1.5, marginBottom: 3 }}>ACTION ITEMS</div><div style={{ fontFamily: K.f, fontSize: 11, color: K.tx, whiteSpace: "pre-wrap", marginBottom: 8, padding: "6px 8px", background: K.inp, border: `1px solid ${K.bd}` }}>{m.actionItems}</div></>}
          {m.notes && <><div style={{ fontFamily: K.f, fontSize: 9, color: K.blu, letterSpacing: 1.5, marginBottom: 3 }}>NOTES</div><div style={{ fontFamily: K.f, fontSize: 12, color: K.tx, whiteSpace: "pre-wrap" }}>{m.notes}</div></>}
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}><Btn small outline onClick={() => openEdit("meeting", m)}>EDIT</Btn><Btn small color={K.blu} onClick={() => openAdd("note", { date: m.date, linkedTo: m.id })}>+ NOTE</Btn><Btn small color={K.gn} onClick={() => openAdd("task", { date: m.date, linkedTo: m.id })}>+ TASK</Btn><Btn small onClick={() => openAdd("reminder", { date: m.date, linkedTo: m.id })}>+ REM</Btn></div>
        {(lnT.length > 0 || lnR.length > 0) && <><SH text="STATUS TRACKER" />{lnT.map(t => (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: `1px solid ${K.bd}20` }}><span onClick={() => completeItem("tasks", t.id)} style={{ width: 14, height: 14, border: `2px solid ${t.done ? K.gn : K.bl}`, background: t.done ? `${K.gn}20` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: K.gn, cursor: "pointer" }}>{t.done ? "✓" : ""}</span><span style={{ fontFamily: K.f, fontSize: 11, color: t.done ? K.dm : K.tx, textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.title}</span><TB t="task" /></div>))}{lnR.map(r => (<div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: `1px solid ${K.bd}20` }}><span onClick={() => completeItem("reminders", r.id)} style={{ width: 14, height: 14, border: `2px solid ${r.done ? K.gn : K.bl}`, background: r.done ? `${K.gn}20` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: K.gn, cursor: "pointer" }}>{r.done ? "✓" : ""}</span><span style={{ fontFamily: K.f, fontSize: 11, color: r.done ? K.dm : K.tx, textDecoration: r.done ? "line-through" : "none", flex: 1 }}>{r.title}</span><TB t="reminder" /></div>))}</>}
        {ann.length > 0 && <><SH text="ANNOTATIONS" />{ann.map(a => (<div key={a.id} style={{ fontFamily: K.f, fontSize: 10, color: K.gn, padding: "3px 0", borderBottom: `1px solid ${K.bd}15` }}><span style={{ color: K.dm, marginRight: 6 }}>{a.date}</span>{a.text}</div>))}</>}
        <SH text={`LINKED NOTES (${lnN.length})`} />
        {lnN.length === 0 && <Empty text="No linked notes" />}
        {lnN.map(n => (<div key={n.id} onClick={() => openEdit("note", n)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${K.blu}` }}><div style={{ fontFamily: K.f, fontSize: 12, color: K.br }}>{n.title || "—"}</div><div style={{ fontFamily: K.f, fontSize: 11, color: K.dm, whiteSpace: "pre-wrap", maxHeight: 40, overflow: "hidden", marginTop: 2 }}>{n.text}</div></div>))}
      </div>);
    }
    return (<div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ fontFamily: K.f, fontSize: 10, color: K.dm, letterSpacing: 1.5 }}>MEETINGS</span><div style={{ display: "flex", gap: 4 }}><Btn small outline onClick={() => setModal({ type: "add_meeting_section" })}>+ SEC</Btn><Btn small color={K.pu} onClick={() => openAdd("meeting", { date: TODAY })}>+ MTG</Btn></div></div>
      {data.meetingSections.map(sec => {
        const ms = data.meetings.filter(m => m.section === sec).sort((a, b) => b.date.localeCompare(a.date));
        return (<div key={sec} style={{ marginBottom: 16 }}><SH text={`${sec} (${ms.length})`} />{ms.length === 0 && <Empty text="None yet" />}{ms.map(m => (<div key={m.id} onClick={() => setActiveMtg(m.id)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${K.pu}`, display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: K.f, fontSize: 12, color: K.br }}>{m.title}</div>{m.notes && <div style={{ fontFamily: K.f, fontSize: 10, color: K.dm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.notes}</div>}</div><span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>{m.date}</span>{m.time && <span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>{m.time}</span>}<Tag cat={m.cat} /><span style={{ color: K.dm }}>▸</span></div>))}</div>);
      })}
    </div>);
  };

  /* ══ RECORDS ══ */
  const RecsTab = () => {
    if (activeRec) {
      const rec = data.records.find(r => r.id === activeRec);
      if (!rec) { setActiveRec(null); return null; }
      const ent = [...(rec.entries || [])].sort((a, b) => b.date.localeCompare(a.date));
      return (<div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span onClick={() => setActiveRec(null)} style={{ fontFamily: K.f, fontSize: 14, color: K.dm, cursor: "pointer" }}>◂</span><span style={{ fontFamily: K.f, fontSize: 13, color: K.br }}>{rec.name}</span><Tag cat={rec.cat} /></div><div style={{ display: "flex", gap: 4 }}><Btn small outline onClick={() => openEdit("record", rec)}>EDIT</Btn><Btn small onClick={() => openAdd("entry", { recId: rec.id })}>+ ENTRY</Btn></div></div>
        {rec.description && <div style={{ fontFamily: K.f, fontSize: 11, color: K.dm, marginBottom: 12, padding: "8px 10px", background: K.cd, border: `1px solid ${K.bd}` }}>{rec.description}</div>}
        <SH text={`ENTRIES (${ent.length})`} />{ent.length === 0 && <Empty text="No entries" />}{ent.map(e => (<div key={e.id} style={{ ...cS, borderLeft: `3px solid ${CC[rec.cat]}40` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontFamily: K.f, fontSize: 10, color: K.ac }}>{e.date}</span><span onClick={() => upd("records", rec.id, { entries: rec.entries.filter(x => x.id !== e.id) })} style={{ fontFamily: K.f, fontSize: 10, color: K.rd, cursor: "pointer", opacity: .6 }}>DEL</span></div><div style={{ fontFamily: K.f, fontSize: 12, color: K.tx, whiteSpace: "pre-wrap" }}>{e.text}</div></div>))}
      </div>);
    }
    return (<div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ fontFamily: K.f, fontSize: 10, color: K.dm, letterSpacing: 1.5 }}>TRACKERS</span><Btn small onClick={() => openAdd("record")}>+ NEW</Btn></div>
      {data.records.length === 0 && <Empty text="Create a tracker" />}
      {data.records.map(r => (<div key={r.id} onClick={() => setActiveRec(r.id)} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${CC[r.cat]}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontFamily: K.f, fontSize: 13, color: K.br }}>{r.name}</div>{r.description && <div style={{ fontFamily: K.f, fontSize: 10, color: K.dm, marginTop: 2 }}>{r.description}</div>}</div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>{(r.entries || []).length}</span><Tag cat={r.cat} /><span style={{ color: K.dm }}>▸</span></div></div>))}
    </div>);
  };

  /* ══ SEARCH ══ */
  const SearchOL = () => (<div style={{ position: "fixed", inset: 0, background: "#000d", zIndex: 900, display: "flex", flexDirection: "column" }}><div style={{ background: K.pn, padding: 12, borderBottom: `1px solid ${K.bd}` }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search..." style={{ flex: 1, background: K.inp, border: `1px solid ${K.bd}`, color: K.tx, fontFamily: K.f, fontSize: 13, padding: "10px 12px", outline: "none" }} /><span onClick={() => { setShowSearch(false); setSearchQ(""); }} style={{ fontFamily: K.f, fontSize: 14, color: K.dm, cursor: "pointer" }}>×</span></div></div><div style={{ flex: 1, overflow: "auto", padding: 12 }}>{searchQ && !searchRes.length && <Empty text="No results" />}{searchRes.map(r => (<div key={r.id} onClick={() => { setShowSearch(false); setSearchQ(""); }} style={{ ...cS, cursor: "pointer", borderLeft: `3px solid ${r._t === "meeting" ? K.pu : r._t === "record" ? K.ac : CC[r.cat] || K.dm}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: K.f, fontSize: 12, color: K.br }}>{r.title || r.name || r.text || "—"}</span><div style={{ display: "flex", gap: 4, alignItems: "center" }}>{r.date && <span style={{ fontFamily: K.f, fontSize: 9, color: K.dm }}>{r.date}</span>}<TB t={r._t} /></div></div></div>))}</div></div>);

  /* LOADING */
  if (loading) return <div style={{ background: K.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}><span style={{ fontFamily: K.f, fontSize: 14, color: K.ac, letterSpacing: 3 }}>LOADING...</span><span style={{ fontFamily: K.f, fontSize: 10, color: K.dm }}>Connecting to cloud...</span></div>;

  /* ══ RENDER ══ */
  return (<div style={{ background: K.bg, minHeight: "100vh", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: K.f, color: K.tx, position: "relative" }}>
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Chakra+Petch:wght@400;600;700&display=swap" rel="stylesheet" />
    {/* HEADER */}
    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${K.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: K.pn }}>
      <div>
        <div style={{ fontFamily: K.fs, fontSize: 15, fontWeight: 700, color: K.br, letterSpacing: 2 }}>COMMAND<span style={{ color: K.ac }}> CENTER</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
          <div style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5 }}>{MO[NOW.getMonth()]} {NOW.getDate()}, {NOW.getFullYear()}</div>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncStatus === "synced" ? K.gn : syncStatus === "local" ? K.or : K.dm }} title={syncStatus === "synced" ? "Cloud synced" : "Local only"} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span onClick={() => setShowSearch(true)} style={{ fontSize: 16, color: K.dm, cursor: "pointer" }}>⌕</span>
        <div style={{ position: "relative" }}><span onClick={() => setShowNotifs(!showNotifs)} style={{ fontSize: 16, color: K.dm, cursor: "pointer" }}>⏍</span>{notifs.length > 0 && <div style={{ position: "absolute", top: -4, right: -6, width: 14, height: 14, borderRadius: "50%", background: K.rd, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: K.f, fontSize: 8, color: "#fff", fontWeight: 700 }}>{notifs.length}</div>}</div>
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: CC.work }} /><span style={{ fontFamily: K.f, fontSize: 8, color: CC.work }}>W</span><div style={{ width: 6, height: 6, borderRadius: "50%", background: CC.personal, marginLeft: 3 }} /><span style={{ fontFamily: K.f, fontSize: 8, color: CC.personal }}>P</span></div>
      </div>
    </div>
    {/* NOTIFS */}
    {showNotifs && <div style={{ position: "absolute", top: 52, right: 10, width: 280, background: K.pn, border: `1px solid ${K.bl}`, zIndex: 800, maxHeight: 300, overflow: "auto" }}>
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${K.bd}`, fontFamily: K.f, fontSize: 9, color: K.ac, letterSpacing: 2 }}>NOTIFICATIONS ({notifs.length})</div>
      {!notifs.length && <div style={{ padding: 16, fontFamily: K.f, fontSize: 11, color: K.dm, textAlign: "center" }}>All clear</div>}
      {notifs.map((n, i) => <div key={i} style={{ padding: "6px 10px", borderBottom: `1px solid ${K.bd}20`, fontFamily: K.f, fontSize: 11, color: n.type === "overdue" ? K.rd : n.type === "meeting" ? K.pu : K.tx }}>{n.text}</div>)}
      <div onClick={() => setShowNotifs(false)} style={{ padding: "6px 10px", fontFamily: K.f, fontSize: 9, color: K.dm, textAlign: "center", cursor: "pointer" }}>DISMISS</div>
    </div>}
    {/* TABS */}
    <div style={{ display: "flex", borderBottom: `1px solid ${K.bd}`, background: K.pn, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {TABS.map(t => (<div key={t} onClick={() => { setTab(t); setActiveMtg(null); setActiveRec(null); }} style={{ padding: "9px 8px", textAlign: "center", cursor: "pointer", fontFamily: K.f, fontSize: 9, letterSpacing: 1, color: tab === t ? K.ac : K.dm, borderBottom: tab === t ? `2px solid ${K.ac}` : "2px solid transparent", background: tab === t ? `${K.ac}08` : "transparent", whiteSpace: "nowrap", flexShrink: 0 }}>{t}</div>))}
    </div>
    {/* CONTENT */}
    <div style={{ flex: 1, padding: 14, overflow: "auto", paddingBottom: 70 }}>
      {tab === "DASH" && <DashTab />}
      {tab === "CALENDAR" && <CalTab />}
      {tab === "TASKS" && <TasksTab />}
      {tab === "NOTES" && <NotesTab />}
      {tab === "MEETINGS" && <MtgsTab />}
      {tab === "RECORDS" && <RecsTab />}
    </div>
    {/* FAB */}
    <div style={{ position: "fixed", bottom: 20, right: "calc(50% - 220px)", zIndex: 700 }}>
      {showFab && <div style={{ position: "absolute", bottom: 50, right: 0, background: K.pn, border: `1px solid ${K.bl}`, padding: 8, display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
        <Btn small onClick={() => openAdd("reminder", { date: TODAY })} style={{ width: "100%" }}>+ Reminder</Btn>
        <Btn small color={K.gn} onClick={() => openAdd("task", { date: TODAY })} style={{ width: "100%" }}>+ Task</Btn>
        <Btn small color={K.blu} onClick={() => openAdd("note", { date: TODAY })} style={{ width: "100%" }}>+ Note</Btn>
        <Btn small color={K.pu} onClick={() => openAdd("meeting", { date: TODAY })} style={{ width: "100%" }}>+ Meeting</Btn>
      </div>}
      <div onClick={() => setShowFab(!showFab)} style={{ width: 48, height: 48, borderRadius: "50%", background: K.ac, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px #0008", fontSize: 24, color: K.bg, fontWeight: 700, transform: showFab ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</div>
    </div>
    {showSearch && <SearchOL />}
    {renderModal()}
  </div>);
}

/* ════════════════════════════════════ */
/* FORMS                               */
/* ════════════════════════════════════ */
function ItemForm({ type, init = {}, isEdit, tags, onAddTag, meetings, onSave, onDel, onClose }) {
  const isTask = type === "task";
  const [title, sT] = useState(init.title || ""); const [date, sD] = useState(init.date || TODAY); const [notes, sN] = useState(init.notes || ""); const [cat, sC] = useState(init.cat || "work"); const [pri, sP] = useState(init.priority || "none"); const [rec, sR] = useState(init.recurring || "none"); const [selTags, sTg] = useState(init.tags || []); const [newTag, sNT] = useState(""); const [linkedTo, sL] = useState(init.linkedTo || "none");
  const color = isTask ? K.gn : K.ac;
  return <Modal title={isEdit ? `Edit ${isTask ? "Task" : "Reminder"}` : `New ${isTask ? "Task" : "Reminder"}`} onClose={onClose}>
    <Inp label={isTask ? "Task" : "Title"} value={title} onChange={e => sT(e.target.value)} placeholder={isTask ? "What needs doing..." : "What to remember..."} />
    <Inp label={isTask ? "Due Date" : "Date"} type="date" value={date} onChange={e => sD(e.target.value)} />
    <div style={{ display: "flex", gap: 8 }}><div style={{ flex: 1 }}><Sel label="Priority" value={pri} onChange={e => sP(e.target.value)} options={[{ v: "none", l: "None" }, { v: "high", l: "High" }, { v: "med", l: "Medium" }, { v: "low", l: "Low" }]} /></div><div style={{ flex: 1 }}><Sel label="Recurring" value={rec} onChange={e => sR(e.target.value)} options={[{ v: "none", l: "None" }, { v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }, { v: "monthly", l: "Monthly" }]} /></div></div>
    <Sel label="Link to meeting" value={linkedTo} onChange={e => sL(e.target.value)} options={[{ v: "none", l: "— None —" }, ...meetings.map(m => ({ v: m.id, l: m.title }))]} />
    <Txa label="Notes" value={notes} onChange={e => sN(e.target.value)} placeholder="Details..." />
    <label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Category</label>
    <CatPk value={cat} onChange={sC} /><TagPk tags={tags} selected={selTags} onChange={sTg} />
    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}><input value={newTag} onChange={e => sNT(e.target.value)} placeholder="New tag..." style={{ background: K.inp, border: `1px solid ${K.bd}`, color: K.tx, fontFamily: K.f, fontSize: 11, padding: "4px 8px", flex: 1, outline: "none" }} /><Btn small outline onClick={() => { if (newTag.trim()) { onAddTag(newTag.trim()); sTg([...selTags, newTag.trim()]); sNT(""); } }}>ADD</Btn></div>
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Btn color={color} onClick={() => onSave({ title, date, notes, cat, priority: pri, recurring: rec, tags: selTags, linkedTo: linkedTo === "none" ? null : linkedTo })} style={{ flex: 1 }}>SAVE</Btn>{onDel && <Btn color={K.rd} outline onClick={onDel}>ARCHIVE</Btn>}</div>
  </Modal>;
}

function NoteForm({ init = {}, isEdit, tags, onAddTag, linkable = [], onSave, onDel, onClose }) {
  const [title, sT] = useState(init.title || ""); const [date, sD] = useState(init.date || TODAY); const [text, sTx] = useState(init.text || ""); const [cat, sC] = useState(init.cat || "work"); const [linkedTo, sL] = useState(init.linkedTo || "none"); const [selTags, sTg] = useState(init.tags || []); const [newTag, sNT] = useState("");
  return <Modal title={isEdit ? "Edit Note" : "New Note"} onClose={onClose}>
    <Inp label="Title" value={title} onChange={e => sT(e.target.value)} placeholder="Note title..." />
    <Inp label="Date" type="date" value={date} onChange={e => sD(e.target.value)} />
    <Sel label="Link to" value={linkedTo} onChange={e => sL(e.target.value)} options={[{ v: "none", l: "— Standalone —" }, ...linkable.map(i => ({ v: i.id, l: i.label }))]} />
    <Txa label="Content" value={text} onChange={e => sTx(e.target.value)} placeholder="Write..." style={{ minHeight: 100 }} />
    <label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Category</label>
    <CatPk value={cat} onChange={sC} /><TagPk tags={tags} selected={selTags} onChange={sTg} />
    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}><input value={newTag} onChange={e => sNT(e.target.value)} placeholder="New tag..." style={{ background: K.inp, border: `1px solid ${K.bd}`, color: K.tx, fontFamily: K.f, fontSize: 11, padding: "4px 8px", flex: 1, outline: "none" }} /><Btn small outline onClick={() => { if (newTag.trim()) { onAddTag(newTag.trim()); sTg([...selTags, newTag.trim()]); sNT(""); } }}>ADD</Btn></div>
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Btn color={K.blu} onClick={() => onSave({ title, date, text, cat, linkedTo: linkedTo === "none" ? null : linkedTo, tags: selTags })} style={{ flex: 1 }}>SAVE</Btn>{onDel && <Btn color={K.rd} outline onClick={onDel}>ARCHIVE</Btn>}</div>
  </Modal>;
}

function MtgForm({ init = {}, isEdit, sections, onSave, onDel, onClose }) {
  const [title, sT] = useState(init.title || ""); const [date, sD] = useState(init.date || TODAY); const [time, sTm] = useState(init.time || ""); const [sec, sS] = useState(init.section || (sections[0] || "")); const [attendees, sA] = useState(init.attendees || ""); const [agenda, sAg] = useState(init.agenda || ""); const [actionItems, sAI] = useState(init.actionItems || ""); const [notes, sN] = useState(init.notes || ""); const [cat, sC] = useState(init.cat || "work");
  return <Modal title={isEdit ? "Edit Meeting" : "New Meeting"} onClose={onClose}>
    <Inp label="Title" value={title} onChange={e => sT(e.target.value)} placeholder="Meeting name..." />
    <div style={{ display: "flex", gap: 8 }}><div style={{ flex: 1 }}><Inp label="Date" type="date" value={date} onChange={e => sD(e.target.value)} /></div><div style={{ flex: 1 }}><Inp label="Time" type="time" value={time} onChange={e => sTm(e.target.value)} /></div></div>
    <Sel label="Section" value={sec} onChange={e => sS(e.target.value)} options={sections.map(s => ({ v: s, l: s }))} />
    <Inp label="Attendees" value={attendees} onChange={e => sA(e.target.value)} placeholder="Who's there..." />
    <Txa label="Agenda" value={agenda} onChange={e => sAg(e.target.value)} placeholder="Topics to cover..." />
    <Txa label="Action Items" value={actionItems} onChange={e => sAI(e.target.value)} placeholder="Tasks from this meeting..." />
    <Txa label="Notes" value={notes} onChange={e => sN(e.target.value)} placeholder="Discussion, decisions..." />
    <label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Category</label>
    <CatPk value={cat} onChange={sC} />
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Btn color={K.pu} onClick={() => onSave({ title, date, time, section: sec, attendees, agenda, actionItems, notes, cat })} style={{ flex: 1 }}>SAVE</Btn>{onDel && <Btn color={K.rd} outline onClick={onDel}>DELETE</Btn>}</div>
  </Modal>;
}

function RecForm({ init = {}, isEdit, onSave, onDel, onClose }) {
  const [name, sN] = useState(init.name || ""); const [desc, sD] = useState(init.description || ""); const [cat, sC] = useState(init.cat || "work");
  return <Modal title={isEdit ? "Edit Tracker" : "New Tracker"} onClose={onClose}>
    <Inp label="Name" value={name} onChange={e => sN(e.target.value)} placeholder="e.g. Headache Log..." />
    <Txa label="Description" value={desc} onChange={e => sD(e.target.value)} placeholder="What are you tracking?" />
    <label style={{ fontFamily: K.f, fontSize: 9, color: K.dm, letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Category</label>
    <CatPk value={cat} onChange={sC} />
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Btn onClick={() => onSave({ name, description: desc, cat })} style={{ flex: 1 }}>SAVE</Btn>{onDel && <Btn color={K.rd} outline onClick={onDel}>DELETE</Btn>}</div>
  </Modal>;
}

function EntryForm({ onSave, onClose }) {
  const [date, sD] = useState(TODAY); const [text, sT] = useState("");
  return <Modal title="New Entry" onClose={onClose}>
    <Inp label="Date" type="date" value={date} onChange={e => sD(e.target.value)} />
    <Txa label="Entry" value={text} onChange={e => sT(e.target.value)} placeholder="What happened..." style={{ minHeight: 80 }} />
    <Btn onClick={() => onSave({ date, text })} style={{ width: "100%", marginTop: 8 }}>ADD</Btn>
  </Modal>;
}

function SimpleForm({ label, ph, bc = K.ac, onSave }) {
  const [v, sV] = useState("");
  return <div><Inp label={label} value={v} onChange={e => sV(e.target.value)} placeholder={ph} /><Btn color={bc} onClick={() => { if (v.trim()) onSave(v.trim()); }} style={{ width: "100%", marginTop: 8 }}>CREATE</Btn></div>;
}
