

import React from "react";
import { useState, useEffect } from "react";
// import dotev from "dotenv";
// dotev.config();
// const adminApiKey1 = process.env.REACT_APP_ADMIN_API_KEY || "";
// const serverUrl1 = process.env.REACT_APP_SERVER_URL || "";

const PLANS = [
  
  { key: "standard_images", label: "Standard", color: "#3B6CF4", desc: "Standard subscribers" },
  { key: "premium_images",  label: "Premium",  color: "#E8874A", desc: "Premium subscribers" },
];

export default function AiLimitsPanel({serverUrl = "", adminApiKey = "" }) {
  const [limits,  setLimits]  = useState({ standard_images: 20, premium_images: 100 });
  const [loading, setLoading] = useState(true);
  const [dirty,   setDirty]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${serverUrl}/api/images-limits`)
      .then(r => r.json())
      .then(d => { setLimits(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [serverUrl]);

  const handleChange = (key, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setLimits(l => ({ ...l, [key]: n }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${serverUrl}/api/images-limits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminApiKey },
        body: JSON.stringify(limits),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDirty(false);
      showToast("✅ Image limits saved — Flutter picks up in ~5 min");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.root}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "error" ? "#EF4444" : "#10B981" }}>
          {toast.msg}
        </div>
      )}

      <div style={s.header}>
        <div>
          <h2 style={s.title}>Image Generation Limits</h2>
          <p style={s.sub}>Set how many AI images each plan can generate per month. Resets on the 1st.</p>
        </div>
        <button style={{ ...s.btnSave, opacity: dirty ? 1 : 0.5 }} onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save Limits"}
        </button>
      </div>

      {loading ? (
        <div style={s.loading}>Loading…</div>
      ) : (
        <div style={s.grid}>
          {PLANS.map(p => (
            <div key={p.key} style={{ ...s.card, borderColor: limits[p.key] === 0 ? "#EF4444" : p.color + "44" }}>
              <div style={{ ...s.planDot, background: p.color }} />
              <div style={s.planLabel}>{p.label}</div>
              <div style={s.planDesc}>{p.desc}</div>
              <div style={s.inputRow}>
                <button style={s.stepper} onClick={() => handleChange(p.key, limits[p.key] - 1)}>−</button>
                <input
                  type="number" min="0" max="9999"
                  value={limits[p.key]}
                  onChange={e => handleChange(p.key, e.target.value)}
                  style={{ ...s.numInput, borderColor: p.color + "66" }}
                />
                <button style={s.stepper} onClick={() => handleChange(p.key, limits[p.key] + 1)}>+</button>
              </div>
              <div style={s.unit}>images / month</div>
              {limits[p.key] === 0 && (
                <div style={s.disabledNote}>⚠ Image gen disabled for this plan</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={s.note}>
        <b style={{ color: "#94A3B8" }}>How it works:</b> These values are stored in{" "}
        <code style={s.code}>config/ai_limits</code> in Firestore. The Flutter app reads them at
        startup and caches for 5 minutes. Set a plan to <b>0</b> to disable image generation for
        that tier entirely.
      </div>
    </div>
  );
}

const s = {
  root: { fontFamily: "'DM Sans', system-ui, sans-serif", background: "#0F172A", padding: 24, color: "#F1F5F9" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  sub: { margin: "4px 0 0", fontSize: 13, color: "#64748B" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 },
  card: { background: "#1E293B", border: "1px solid", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  planDot: { width: 14, height: 14, borderRadius: "50%" },
  planLabel: { fontSize: 17, fontWeight: 800 },
  planDesc: { fontSize: 12, color: "#64748B", textAlign: "center" },
  inputRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 },
  stepper: { width: 32, height: 32, borderRadius: 8, border: "1px solid #334155", background: "#0F172A", color: "#F1F5F9", fontSize: 18, cursor: "pointer" },
  numInput: { width: 72, textAlign: "center", background: "#0F172A", border: "1px solid", borderRadius: 8, color: "#F1F5F9", fontSize: 20, fontWeight: 700, padding: "6px 0", outline: "none" },
  unit: { fontSize: 11, color: "#475569" },
  disabledNote: { fontSize: 11, color: "#EF4444", marginTop: 4 },
  btnSave: { background: "#6366F1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  loading: { color: "#64748B", padding: 32, textAlign: "center" },
  note: { background: "#1E293B", border: "1px solid #334155", borderRadius: 10, padding: 16, fontSize: 13, color: "#94A3B8", lineHeight: 1.6 },
  code: { background: "#0F172A", color: "#6366F1", padding: "1px 6px", borderRadius: 4, fontSize: 11 },
  toast: { position: "fixed", top: 20, right: 20, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px #0008" },
};
