import { useState, useEffect } from "react";

const AI_BASE = import.meta.env.VITE_AI_BASE || "http://localhost:8000";

export default function App() {
  const [stations, setStations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [realtime, setRealtime] = useState(null);
  const [predict, setPredict] = useState(null);
  const [loading, setLoading] = useState(false);

  // 앱 로드 시 station 목록 가져오기
  useEffect(() => {
    fetch(`${AI_BASE}/ai/realtime?limit=50`)
      .then((r) => r.json())
      .then(setStations)
      .catch(() => setStations([]));
  }, []);

  // station 선택 시 실시간 + 예측 동시 조회
  async function fetchData(id) {
    if (!id) return;
    setLoading(true);
    // 실시간 API와 예측 API를 동시에 요청, 둘 다 끝날 때까지 대기
    const [rt, pd] = await Promise.allSettled([
      fetch(`${AI_BASE}/ai/realtime/${id}`).then((r) => r.json()),
      fetch(`${AI_BASE}/ai/predict/${id}`).then((r) => r.json()),
    ]);

    // rt가 성공했으면 데이터 저장, 실패(404 등)했으면 null
    setRealtime(rt.status === "fulfilled" ? rt.value : null);

    // pd가 성공했으면 데이터 저장, 실패했으면 null
    setPredict(pd.status === "fulfilled" ? pd.value : null);
    setLoading(false);
  }

  function handleSelect(e) {
    setSelectedId(e.target.value);
    fetchData(e.target.value);
  }

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h2>🚴 따릉이 실시간 대시보드</h2>

      {/* Station 선택 */}
      <select value={selectedId} onChange={handleSelect} style={{ width: "100%", padding: 8, marginBottom: 16 }}>
        <option value="">-- 정류소 선택 --</option>
        {stations.map((s) => (
          <option key={s.station_id} value={s.station_id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* 새로고침 버튼 */}
      <button onClick={() => fetchData(selectedId)} disabled={!selectedId || loading}
        style={{ padding: "8px 16px", marginBottom: 24 }}>
        {loading ? "조회 중..." : "새로고침"}
      </button>

      {/* 결과 표시 */}
      {realtime && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <h3>📡 실시간</h3>
          <p>정류소: {realtime.name}</p>
          <p>현재 자전거: <strong>{realtime.bikes}대</strong></p>
          <p>거치대: {realtime.docks}개</p>
          <p style={{ color: "#999", fontSize: 12 }}>업데이트: {realtime.ts}</p>
        </div>
      )}

      {predict && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <h3>🔮 10분 후 예측</h3>
          <p>예측 자전거: <strong>{predict.predicted_bikes}대</strong></p>
          <p>모델: {predict.model_version}</p>
          <p style={{ color: "#999", fontSize: 12 }}>예측 시각: {predict.target_time}</p>
        </div>
      )}

      {!realtime && !loading && selectedId && (
        <p style={{ color: "#999" }}>데이터가 없습니다. 수집을 먼저 실행해주세요.</p>
      )}
    </div>
  );
}