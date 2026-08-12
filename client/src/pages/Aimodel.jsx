import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

const DEFAULT_MODELS = [
  {
    id: "deepseek",
    displayName: "Go",
    description: "Fast & efficient · All plans",
    emoji: "🔵",
    color: "#3B6CF4",
    modelId: "deepseek-chat",
    minPlan: "basic",
    enabled: true,
    supportsImageGen: false,
    supportsVision: false,
  },
  {
    id: "grok",
    displayName: "Vision",
    description: "Image generation · Standard+",
    emoji: "🟣",
    color: "#9C5CF4",
    modelId: "grok-4.20-reasoning",
    minPlan: "standard",
    enabled: true,
    supportsImageGen: true,
    supportsVision: true,
  },
  {
    id: "gpt",
    displayName: "Terran",
    description: "Vision · Standard+",
    emoji: "🟢",
    color: "#10B981",
    modelId: "gpt-5.4-mini",
    minPlan: "standard",
    enabled: true,
    supportsImageGen: false,
    supportsVision: true,
  },
];

// NOTE: this component previously took `serverUrl`/`adminApiKey` props and
// called the API directly with an `x-admin-key` header. Neither prop was
// ever actually passed in from App.jsx (the route renders <AiModelsPanel />
// with no props at all), so that header was always empty — this only
// "worked" because the server route had no auth check either. Both are
// fixed now: this uses the same apiFetch() (real JWT session) every other
// admin page already uses, and the server route requires it.
export default function AiModelsPanel() {
  const { apiFetch } = useAuth();
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [agentModeProviderId, setAgentModeProviderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    apiFetch("/api/ai-models")
      .then((r) => r.json())
      .then((d) => {
        if (d.models) {
          setModels(d.models);
        }
        setAgentModeProviderId(d.agentModeProviderId ?? null);

        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateModel = (index, field, value) => {
    const updated = [...models];

    updated[index][field] = value;

    setModels(updated);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);

    try {
      const res = await apiFetch("/api/ai-models", {
        method: "POST",
        body: JSON.stringify({
          models,
          agentModeProviderId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setDirty(false);

      showToast("✅ AI models updated");

    } catch (e) {
      showToast(e.message, "error");

    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.root}>
      {toast && (
        <div
          style={{
            ...s.toast,
            background:
              toast.type === "error"
                ? "#EF4444"
                : "#10B981",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={s.header}>
        <div>
          <h2 style={s.title}>
            AI Models
          </h2>

          <p style={s.sub}>
            Manage available AI models and plan access.
          </p>
        </div>

        <button
          style={{
            ...s.btnSave,
            opacity: dirty ? 1 : 0.5,
          }}
          disabled={!dirty || saving}
          onClick={save}
        >
          {saving ? "Saving..." : "Save Models"}
        </button>
      </div>

      {!loading && (
        <div style={{ ...s.card, borderColor: "#334155", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Agent Mode</div>
              <div style={{ color: "#64748B", fontSize: 12.5, marginTop: 2 }}>
                Which model powers Agent Mode's tool-calling (creating leads, tasks, invoices, etc). Premium plan only, regardless of which model is chosen here.
              </div>
            </div>
          </div>
          <select
            value={agentModeProviderId ?? ""}
            onChange={(e) => {
              setAgentModeProviderId(e.target.value || null);
              setDirty(true);
            }}
            style={{
              marginTop: 10,
              width: "100%",
              maxWidth: 320,
              background: "#0B1220",
              color: "#F1F5F9",
              border: "1px solid #1E293B",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 13,
            }}
          >
            <option value="">— Agent Mode disabled —</option>
            {models.filter((m) => m.enabled).map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.displayName} ({m.modelId})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div style={s.loading}>
          Loading...
        </div>
      ) : (
        <div style={s.grid}>
          {models.map((model, index) => (
            <div
              key={model.id}
              style={{
                ...s.card,
                borderColor: model.color + "55",
              }}
            >
              <div style={s.topRow}>
                <div
                  style={{
                    ...s.emoji,
                    background: model.color + "22",
                    border: `1px solid ${model.color}55`,
                  }}
                >
                  {model.emoji}
                </div>

                <div style={s.colorWrap}>
                  <label style={s.label}>
                    Color
                  </label>

                  <input
                    type="color"
                    value={model.color}
                    onChange={(e) =>
                      updateModel(
                        index,
                        "color",
                        e.target.value
                      )
                    }
                    style={s.colorPicker}
                  />
                </div>
              </div>

              <div style={s.section}>
                <label style={s.label}>
                  Display Name
                </label>

                <input
                  value={model.displayName}
                  onChange={(e) =>
                    updateModel(
                      index,
                      "displayName",
                      e.target.value
                    )
                  }
                  style={s.input}
                  placeholder="Display Name"
                />
              </div>

              <div style={s.section}>
                <label style={s.label}>
                  Description
                </label>

                <textarea
                  value={model.description}
                  onChange={(e) =>
                    updateModel(
                      index,
                      "description",
                      e.target.value
                    )
                  }
                  style={s.textarea}
                  placeholder="Description"
                />
              </div>

              <div style={s.section}>
                <label style={s.label}>
                  Emoji
                </label>

                <input
                  value={model.emoji}
                  onChange={(e) =>
                    updateModel(
                      index,
                      "emoji",
                      e.target.value
                    )
                  }
                  style={s.input}
                  placeholder="🤖"
                />
              </div>

              <div style={s.section}>
                <label style={s.label}>
                  Model ID
                </label>

                <input
                  value={model.modelId}
                  onChange={(e) =>
                    updateModel(
                      index,
                      "modelId",
                      e.target.value
                    )
                  }
                  style={s.input}
                />
              </div>

              <div style={s.section}>
                <label style={s.label}>
                  Minimum Plan
                </label>

                <select
                  value={model.minPlan}
                  onChange={(e) =>
                    updateModel(
                      index,
                      "minPlan",
                      e.target.value
                    )
                  }
                  style={s.input}
                >
                  <option value="basic">
                    Basic
                  </option>

                  <option value="standard">
                    Standard
                  </option>

                  <option value="premium">
                    Premium
                  </option>
                </select>
              </div>

              <div style={s.switchRow}>
                <label style={s.switch}>
                  <input
                    type="checkbox"
                    checked={model.enabled}
                    onChange={(e) =>
                      updateModel(
                        index,
                        "enabled",
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    Enabled
                  </span>
                </label>

                <label style={s.switch}>
                  <input
                    type="checkbox"
                    checked={model.supportsVision}
                    onChange={(e) =>
                      updateModel(
                        index,
                        "supportsVision",
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    Vision
                  </span>
                </label>

                <label style={s.switch}>
                  <input
                    type="checkbox"
                    checked={model.supportsImageGen}
                    onChange={(e) =>
                      updateModel(
                        index,
                        "supportsImageGen",
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    Image Gen
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#0F172A",
    color: "#F1F5F9",
    padding: 24,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },

  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
  },

  sub: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 13,
  },

  btnSave: {
    background: "#6366F1",
    border: "none",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: 18,
  },

  card: {
    background: "#1E293B",
    border: "1px solid",
    borderRadius: 16,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  emoji: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
  },

  colorWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  colorPicker: {
    width: 48,
    height: 36,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },

  section: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  label: {
    fontSize: 12,
    color: "#64748B",
  },

  input: {
    background: "#0F172A",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
  },

  textarea: {
    background: "#0F172A",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
    minHeight: 70,
    resize: "vertical",
  },

  switchRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
  },

  switch: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#CBD5E1",
  },

  loading: {
    textAlign: "center",
    padding: 40,
    color: "#64748B",
  },

  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    padding: "10px 18px",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    zIndex: 9999,
  },
};