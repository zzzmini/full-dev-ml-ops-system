import { useState } from "react";
import Board from "./Board";
import Dashboard from "./Dashboard";

export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div>
      <nav style={{ padding: "12px 24px", background: "#fff", borderBottom: "1px solid #e0e0e0", display: "flex", gap: 16 }}>
        <button onClick={() => setPage("dashboard")}>🚴 대시보드</button>
        <button onClick={() => setPage("board")}>📋 게시판</button>
      </nav>
      {page === "dashboard" ? <Dashboard /> : <Board />}
    </div>
  );
}