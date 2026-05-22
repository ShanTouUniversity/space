import { h } from "preact";
import { useState, useEffect } from "preact/hooks";

const COLORS = [
  { bg: "#fef3c7", border: "#fbbf24" },
  { bg: "#dbeafe", border: "#60a5fa" },
  { bg: "#d1fae5", border: "#34d399" },
  { bg: "#fce7f3", border: "#f472b6" },
  { bg: "#ede9fe", border: "#a78bfa" },
  { bg: "#ffedd5", border: "#fb923c" },
  { bg: "#ccfbf1", border: "#2dd4bf" },
  { bg: "#ffe4e6", border: "#fb7185" },
];

const DEMO_MESSAGES = [
  { body: "这里什么都没有，但什么都可以有。", user: { login: "Space" }, created_at: "2024-10-01T00:00:00Z" },
  { body: "Anonymous Space 欢迎你。", user: { login: "ST.U" }, created_at: "2024-10-02T00:00:00Z" },
  { body: "留下你的涂鸦吧～", user: { login: "ST.U" }, created_at: "2024-10-03T00:00:00Z" },
];

const ISSUE_NUMBER = 1;
const REPO = "ShanTouUniversity/space";

function getRotation() {
  return (Math.random() - 0.5) * 6;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const GraffitiWall = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = `https://api.github.com/repos/${REPO}/issues/${ISSUE_NUMBER}/comments`;
    const cached = localStorage.getItem("graffiti-cache");
    const cachedTime = localStorage.getItem("graffiti-cache-time");

    if (cached && cachedTime && Date.now() - Number(cachedTime) < 60000) {
      try {
        setMessages(JSON.parse(cached));
        setLoading(false);
        return;
      } catch (_) {}
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        localStorage.setItem("graffiti-cache", JSON.stringify(data));
        localStorage.setItem("graffiti-cache-time", String(Date.now()));
        setMessages(data);
      })
      .catch(() => {
        if (cached) {
          try { setMessages(JSON.parse(cached)); } catch (_) {}
        } else {
          setMessages(DEMO_MESSAGES);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div class="graffiti-wall">
      {loading && (
        <div class="graffiti-loading">
          <div class="graffiti-spinner" />
          <p>正在加载涂鸦...</p>
        </div>
      )}

      {!loading && (
        <>
          <div class="graffiti-grid">
            {messages.map((msg, i) => {
              const color = COLORS[i % COLORS.length];
              const rotation = getRotation();
              return (
                <div
                  class="graffiti-note"
                  style={{
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  <p class="graffiti-note-body">{msg.body}</p>
                  <div class="graffiti-note-footer">
                    <span class="graffiti-note-author">{msg.user?.login || "匿名"}</span>
                    <span class="graffiti-note-date">{formatDate(msg.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {messages.length === 0 && !loading && (
            <p class="graffiti-empty">还没有涂鸦，来做第一个吧！</p>
          )}

          <div class="graffiti-actions">
            <a
              href={`https://github.com/${REPO}/issues/${ISSUE_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              class="graffiti-btn"
            >
              ✏️ 我也要涂鸦
            </a>
          </div>
        </>
      )}

      {error && <p class="graffiti-error">{error}</p>}

      <style>{`
        .graffiti-wall {
          min-height: 400px;
        }
        .graffiti-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 0;
          gap: 1rem;
          color: var(--text-200);
        }
        .graffiti-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--primary-200);
          border-top-color: var(--primary-100);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .graffiti-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          padding: 1rem 0;
        }
        .graffiti-note {
          width: 220px;
          padding: 1rem 1rem 0.5rem;
          border: 2px solid;
          border-radius: 4px;
          box-shadow: 3px 3px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .graffiti-note::before {
          content: "";
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 12px;
          background: rgba(255,255,255,0.4);
          border-radius: 2px;
        }
        .graffiti-note:hover {
          transform: scale(1.05) !important;
          box-shadow: 5px 5px 16px rgba(0,0,0,0.15);
          z-index: 10;
        }
        .graffiti-note-body {
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0 0 0.5rem;
          word-break: break-word;
          flex: 1;
        }
        .graffiti-note-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          opacity: 0.6;
          border-top: 1px solid rgba(0,0,0,0.08);
          padding-top: 0.3rem;
        }
        .graffiti-note-author {
          font-weight: 600;
        }
        .graffiti-empty {
          text-align: center;
          padding: 3rem;
          color: var(--text-200);
        }
        .graffiti-actions {
          display: flex;
          justify-content: center;
          padding: 2rem 0;
        }
        .graffiti-btn {
          display: inline-block;
          padding: 0.75rem 2rem;
          background-color: var(--primary-100);
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .graffiti-btn:hover {
          opacity: 0.85;
          text-decoration: none;
        }
        .graffiti-error {
          text-align: center;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default GraffitiWall;
