import redis
from backend_fastapi.config import settings

redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def get_redis_client():
    return redis_client
