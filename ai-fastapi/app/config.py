from dotenv import load_dotenv
from datetime import timezone, timedelta
import os

load_dotenv(".env.local")
KST = timezone(timedelta(hours=9))
SEOUL_API_KEY = os.getenv("SEOUL_API_KEY")
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
COLLECT_PAGE_SIZE = int(os.getenv("COLLECT_PAGE_SIZE", 1000))
COLLECT_MAX_END = int(os.getenv("COLLECT_MAX_END", 4000))
COLLECT_SLEEP_SEC = float(os.getenv("COLLECT_SLEEP_SEC", 0.25))
REDIS_TTL_SEC = int(os.getenv("REDIS_TTL_SEC", 3600))
PREDICT_INTERVAL_MIN = int(os.getenv("PREDICT_INTERVAL_MIN", 5))