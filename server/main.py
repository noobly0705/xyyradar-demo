import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "province_counts.json"

app = FastAPI(title="xyyradar-demo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_payload() -> dict:
    if not DATA_FILE.exists():
        return {
            "updated_at": "",
            "source": "empty",
            "note": "请先运行 scripts/mock_aggregate.py 生成数据",
            "counts": {},
        }
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


@app.get("/api/stats")
def get_stats():
    return _load_payload()
