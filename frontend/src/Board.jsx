import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8080";

// ─── API 함수 ────────────────────────────────────
const api = {
  list: () => fetch(`${API}/posts`).then((r) => r.json()),
  get: (id) => fetch(`${API}/posts/${id}`).then((r) => r.json()),
  create: (body) =>
    fetch(`${API}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  update: (id, body) =>
    fetch(`${API}/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  delete: (id) => fetch(`${API}/posts/${id}`, { method: "DELETE" }),
};

// ─── 날짜 포맷 ────────────────────────────────────
function fmt(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── 글쓰기/수정 폼 ───────────────────────────────
function PostForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await onSave({ title, content });
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        style={styles.input}
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        style={{ ...styles.input, height: 160, resize: "vertical" }}
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" style={styles.btnPrimary}>
          {initial ? "수정 완료" : "등록"}
        </button>
        <button type="button" style={styles.btnSecondary} onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  );
}

// ─── 게시글 상세 ──────────────────────────────────
function PostDetail({ post, onEdit, onDelete, onBack }) {
  return (
    <div style={styles.card}>
      <button style={styles.btnBack} onClick={onBack}>← 목록</button>
      <h2 style={styles.detailTitle}>{post.title}</h2>
      <p style={styles.meta}>{fmt(post.createdAt)}</p>
      <hr style={styles.divider} />
      <p style={styles.detailContent}>{post.content}</p>
      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button style={styles.btnPrimary} onClick={onEdit}>수정</button>
        <button style={styles.btnDanger} onClick={onDelete}>삭제</button>
      </div>
    </div>
  );
}

// ─── 게시글 목록 아이템 ───────────────────────────
function PostItem({ post, onClick }) {
  return (
    <div style={styles.item} onClick={onClick}>
      <span style={styles.itemTitle}>{post.title}</span>
      <span style={styles.itemDate}>{fmt(post.createdAt)}</span>
    </div>
  );
}

// ─── 메인 App ────────────────────────────────────
export default function App() {
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState("list"); // list | detail | create | edit
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadList() {
    setLoading(true);
    setPosts(await api.list());
    setLoading(false);
  }

  useEffect(() => { loadList(); }, []);

  async function handleCreate(body) {
    await api.create(body);
    await loadList();
    setView("list");
  }

  async function handleUpdate(body) {
    const updated = await api.update(selected.id, body);
    setSelected(updated);
    await loadList();
    setView("detail");
  }

  async function handleDelete() {
    if (!confirm("삭제하시겠습니까?")) return;
    await api.delete(selected.id);
    await loadList();
    setView("list");
  }

  async function handleClickItem(post) {
    setLoading(true);
    const detail = await api.get(post.id);
    setSelected(detail);
    setView("detail");
    setLoading(false);
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <h1 style={styles.logo} onClick={() => setView("list")}>📋 게시판</h1>
        {view === "list" && (
          <button style={styles.btnPrimary} onClick={() => setView("create")}>
            + 글쓰기
          </button>
        )}
      </header>

      <main style={styles.main}>
        {loading && <p style={styles.loading}>로딩 중...</p>}

        {!loading && view === "list" && (
          posts.length === 0
            ? <p style={styles.empty}>게시글이 없습니다.</p>
            : posts.map((p) => (
                <PostItem key={p.id} post={p} onClick={() => handleClickItem(p)} />
              ))
        )}

        {view === "create" && (
          <PostForm
            onSave={handleCreate}
            onCancel={() => setView("list")}
          />
        )}

        {view === "detail" && selected && (
          <PostDetail
            post={selected}
            onBack={() => setView("list")}
            onEdit={() => setView("edit")}
            onDelete={handleDelete}
          />
        )}

        {view === "edit" && selected && (
          <PostForm
            initial={selected}
            onSave={handleUpdate}
            onCancel={() => setView("detail")}
          />
        )}
      </main>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────
const styles = {
  wrap: {
    minHeight: "100vh",
    background: "#f5f5f5",
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
    padding: "0 24px",
    height: 56,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    margin: 0,
  },
  main: {
    maxWidth: 720,
    margin: "24px auto",
    padding: "0 16px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "14px 18px",
    marginBottom: 10,
    cursor: "pointer",
    transition: "box-shadow 0.15s",
  },
  itemTitle: { fontSize: 15, fontWeight: 500 },
  itemDate: { fontSize: 12, color: "#999" },
  card: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: 24,
  },
  detailTitle: { fontSize: 22, fontWeight: 700, margin: "12px 0 4px" },
  detailContent: { fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" },
  meta: { fontSize: 12, color: "#999", margin: 0 },
  divider: { border: "none", borderTop: "1px solid #e0e0e0", margin: "16px 0" },
  form: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  btnPrimary: {
    padding: "8px 18px",
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "8px 18px",
    background: "#f0f0f0",
    color: "#333",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "8px 18px",
    background: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
  },
  btnBack: {
    background: "none",
    border: "none",
    color: "#1976d2",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
  },
  loading: { textAlign: "center", color: "#999" },
  empty: { textAlign: "center", color: "#bbb", marginTop: 60 },
};
