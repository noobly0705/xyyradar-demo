#!/usr/bin/env python3
"""
从合规导出的 CSV 聚合「IP 属地 -> 发帖数」，写入 server/data/province_counts.json。

CSV 示例（UTF-8）：
  ip_province,count
  广东省,120
  北京市,45

ip_province 建议使用与地图 GeoJSON 中省级名称一致的全称（如「广东省」）。
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "server" / "data" / "province_counts.json"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path", type=Path, help="输入 CSV 路径")
    args = ap.parse_args()

    agg: dict[str, int] = defaultdict(int)
    with args.csv_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            prov = (row.get("ip_province") or row.get("province") or "").strip()
            if not prov:
                continue
            try:
                c = int(row.get("count") or row.get("n") or 0)
            except ValueError:
                c = 1
            agg[prov] += c

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "csv",
        "counts": dict(sorted(agg.items(), key=lambda x: -x[1])),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"written: {OUT} ({len(payload['counts'])} provinces)")


if __name__ == "__main__":
    main()
