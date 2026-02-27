from fastapi import FastAPI, HTTPException, Query
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
import redis, httpx, json, asyncio, uvicorn
from datetime import datetime
from app.config import *


# ─── Redis 연결 ───────────────────────────────────
def get_redis():
    """
    Redis 클라이언트를 생성하여 반환한다.
    - decode_responses=True: bytes 대신 문자열(str)로 자동 디코딩
    - 호출할 때마다 새 커넥션을 반환 (간단한 단일 서버 구성용)
    """
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


# ─── 수집 루프 ────────────────────────────────────
async def collect_loop():
    """
    서울 공공 자전거(따릉이) API에서 대여소 실시간 데이터를 수집해 Redis에 저장한다.
    - 페이지 단위로 순차 요청 (start ~ COLLECT_MAX_END)
    - '역' 이름이 포함된 대여소만 필터링하여 저장
    - 스케줄러에 의해 10분마다 자동 실행되며, /ai/collect/subway 엔드포인트로 수동 실행도 가능
    """
    r = get_redis()

    # 비동기 HTTP 클라이언트 생성 (timeout=10초)
    async with httpx.AsyncClient(timeout=10) as client:
        start = 1

        # 최대 수집 범위(COLLECT_MAX_END)까지 페이지 단위로 반복
        while start <= COLLECT_MAX_END:
            end = start + COLLECT_PAGE_SIZE - 1  # 한 페이지의 마지막 인덱스

            # 서울 열린데이터 광장 따릉이 API 호출
            url = f"http://openapi.seoul.go.kr:8088/{SEOUL_API_KEY}/json/bikeList/{start}/{end}"
            resp = await client.get(url)

            # 응답 JSON에서 대여소 목록 추출 (없으면 빈 리스트)
            items = resp.json().get("rentBikeStatus", {}).get("row", [])

            # 더 이상 데이터가 없으면 루프 종료
            if not items:
                break

            for item in items:
                # '역' 글자가 포함된 대여소만 저장 (지하철역 인근 대여소 필터)
                if "역" not in item.get("stationName", ""):
                    continue

                # Redis에 저장할 데이터 구성
                payload = {
                    "station_id": item["stationId"],           # 대여소 ID
                    "name": item["stationName"],               # 대여소 이름
                    "bikes": int(item.get("parkingBikeTotCnt", 0)),  # 현재 주차된 자전거 수
                    "docks": int(item.get("rackTotCnt", 0)),         # 전체 거치대 수
                    "lat": item.get("stationLatitude", ""),    # 위도
                    "lng": item.get("stationLongitude", ""),   # 경도
                    "ts": datetime.now(KST).isoformat(),       # 수집 시각 (KST 기준 ISO 형식)
                }

                # Redis에 TTL(REDIS_TTL_SEC)을 설정하여 저장
                # key 형식: realtime:station:{stationId}
                r.setex(
                    f"realtime:station:{item['stationId']}",
                    REDIS_TTL_SEC,
                    json.dumps(payload, ensure_ascii=False)  # 한글 유지
                )

            start += COLLECT_PAGE_SIZE  # 다음 페이지로 이동

            # API 과부하 방지를 위해 페이지 요청 사이에 잠시 대기
            await asyncio.sleep(COLLECT_SLEEP_SEC)


# ─── 예측 루프 ────────────────────────────────────
def predict_loop():
    """
    Redis에 저장된 실시간 데이터를 기반으로 10분 후 자전거 수를 예측해 저장한다.
    - 현재는 더미 로직 (bikes + 1) 사용 → Day3에서 실제 ML 모델로 교체 예정
    - 스케줄러에 의해 PREDICT_INTERVAL_MIN 분마다 자동 실행
    """
    r = get_redis()

    # 실시간 데이터가 저장된 모든 key를 순회
    for key in r.scan_iter("realtime:station:*"):
        raw = json.loads(r.get(key))  # 실시간 데이터 로드

        # 예측 결과 데이터 구성
        payload = {
            "station_id": raw["station_id"],
            "predicted_bikes": raw["bikes"] + 1,  # ← 더미 예측값 (추후 모델 교체)
            "target_time": (datetime.now(KST) + timedelta(minutes=10)).isoformat(),  # 예측 대상 시각
            "model_version": "v1-dummy",           # 사용된 모델 버전 태그
            "ts": datetime.now(KST).isoformat(),   # 예측 수행 시각
        }

        # Redis에 TTL을 설정하여 예측 결과 저장
        # key 형식: prediction:station:{station_id}
        r.setex(
            f"prediction:station:{raw['station_id']}",
            REDIS_TTL_SEC,
            json.dumps(payload)
        )


# ─── 스케줄러 (앱 생명주기 관리) ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI 앱의 시작/종료 시 실행되는 생명주기 핸들러.
    - 앱 시작 시: APScheduler를 통해 수집/예측 주기 작업 등록 및 실행
    - 앱 종료 시: 스케줄러 정상 종료 (yield 이후 코드)
    """
    scheduler = AsyncIOScheduler()

    # 따릉이 실시간 데이터 수집: 10분마다 실행
    scheduler.add_job(collect_loop, "interval", minutes=10)

    # 자전거 수 예측: PREDICT_INTERVAL_MIN 분마다 실행
    scheduler.add_job(predict_loop, "interval", minutes=PREDICT_INTERVAL_MIN)

    scheduler.start()
    yield  # ← 앱 실행 중 (이 지점에서 FastAPI가 요청을 처리)
    scheduler.shutdown()  # 앱 종료 시 스케줄러 정리

# ─── FastAPI 앱 초기화 ────────────────────────────
app = FastAPI(lifespan=lifespan)

# ─── CORS 처리 ──-------──────────────────────────
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 프론트 주소
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health Check ─────────────────────────────────
@app.get("/ai/health")
def health():
    """서버 정상 동작 여부 확인용 엔드포인트"""
    return {"ok": True}


# ─── 수동 수집 트리거 ──────────────────────────────
@app.post("/ai/collect/subway")
async def collect_subway():
    """
    따릉이 데이터 수집을 즉시 실행한다 (스케줄 대기 없이 수동 트리거).
    - 테스트 또는 운영 중 즉시 갱신이 필요할 때 사용
    - curl -X POST http://localhost:8000/ai/collect/subway
    """
    await collect_loop()
    return {"ok": True}


# ─── 실시간 데이터 조회 ────────────────────────────
@app.get("/ai/realtime")
def list_realtime(limit: int = Query(50, ge=1, le=500)):
    """
    Redis에 저장된 실시간 대여소 데이터 목록을 반환한다.
    - limit: 반환할 최대 개수 (기본 50, 최소 1, 최대 500)
    """
    r = get_redis()
    # scan_iter로 realtime:station:* 패턴의 key를 최대 limit개 조회
    keys = list(r.scan_iter("realtime:station:*", count=100))[:limit]
    # 각 key의 값을 JSON 파싱하여 리스트로 반환 (만료된 key는 제외)
    return [json.loads(r.get(k)) for k in keys if r.get(k)]


@app.get("/ai/realtime/{station_id}")
def get_realtime(station_id: str):
    """
    특정 대여소의 실시간 데이터를 반환한다.
    - station_id: 대여소 ID (예: ST-1234)
    - 데이터가 없거나 TTL 만료 시 404 반환
    """
    data = get_redis().get(f"realtime:station:{station_id}")
    if not data:
        raise HTTPException(404, "station not found")
    return json.loads(data)


# ─── 예측 데이터 조회 ──────────────────────────────
@app.get("/ai/predict/{station_id}")
def get_predict(station_id: str):
    """
    특정 대여소의 자전거 수 예측 결과를 반환한다.
    - station_id: 대여소 ID
    - 예측 데이터가 없거나 TTL 만료 시 404 반환
    """
    data = get_redis().get(f"prediction:station:{station_id}")
    if not data:
        raise HTTPException(404, "prediction not found")
    return json.loads(data)


# ─── 직접 실행 진입점 ──────────────────────────────
if __name__ == "__main__":
    # 개발 환경에서 직접 실행할 때 사용 (reload=False: 프로덕션 모드)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)