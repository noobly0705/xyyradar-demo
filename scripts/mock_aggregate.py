#!/usr/bin/env python3
"""
模拟「微博 / 交友类话题」帖子的 IP 属地统计（按省级行政区聚合）。

重要说明（合规）：
- 未授权抓取微博页面通常违反《用户协议》且可能涉及法律风险。
- 本脚本不访问微博，仅生成演示用的随机分布，便于前端联调。
- 若你有合规数据源（微博开放平台 API、自有导出 CSV 等），把解析结果写入
  与本脚本相同结构的 JSON 即可被前端读取。

用法：
  python3 scripts/mock_aggregate.py
  -> 写入 server/data/province_counts.json
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "server" / "data" / "province_counts.json"

# 与阿里云 DataV 省级 GeoJSON（100000_full）中 properties.name 常见写法对齐
PROVINCE_NAMES = [
    "北京市",
    "天津市",
    "河北省",
    "山西省",
    "内蒙古自治区",
    "辽宁省",
    "吉林省",
    "黑龙江省",
    "上海市",
    "江苏省",
    "浙江省",
    "安徽省",
    "福建省",
    "江西省",
    "山东省",
    "河南省",
    "湖北省",
    "湖南省",
    "广东省",
    "广西壮族自治区",
    "海南省",
    "重庆市",
    "四川省",
    "贵州省",
    "云南省",
    "西藏自治区",
    "陕西省",
    "甘肃省",
    "青海省",
    "宁夏回族自治区",
    "新疆维吾尔自治区",
    "台湾省",
    "香港特别行政区",
    "澳门特别行政区",
]


def main() -> None:
    random.seed(42)
    # 模拟：沿海/人口大省略高
    weights = []
    for n in PROVINCE_NAMES:
        w = 1.0
        if any(x in n for x in ("广东", "江苏", "浙江", "山东", "河南", "四川")):
            w = 3.5
        elif any(x in n for x in ("北京", "上海", "湖北", "湖南", "福建", "河北")):
            w = 2.2
        weights.append(w)

    counts = {}
    for name, w in zip(PROVINCE_NAMES, weights, strict=True):
        counts[name] = int(random.triangular(0, 800, 80 * w))

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "mock",
        "categories": ["微博话题（模拟）", "交友/婚恋类话题（模拟）"],
        "note": "演示数据；接入真实数据请替换为合规管道输出",
        "counts": counts,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"written: {OUT}")


if __name__ == "__main__":
    main()
