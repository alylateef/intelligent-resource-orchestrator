"""arq worker: scheduled scans with a Redis single-flight lock."""
from arq import cron
from arq.connections import RedisSettings

from .config import settings
from .db import init_db
from .graph import run_pipeline

LOCK_KEY = "gigradar:scan-lock"


async def scan(ctx) -> str | None:
    redis = ctx["redis"]
    if not await redis.set(LOCK_KEY, "1", nx=True, ex=30 * 60):
        return None  # another run is in progress
    try:
        return await run_pipeline()
    finally:
        await redis.delete(LOCK_KEY)


async def startup(ctx):
    await init_db()


step = max(1, min(settings.scan_interval_minutes, 59))


class WorkerSettings:
    functions = [scan]
    on_startup = startup
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    cron_jobs = [cron(scan, minute=set(range(0, 60, step)), run_at_startup=True)]
    job_timeout = 25 * 60
