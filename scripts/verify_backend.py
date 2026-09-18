#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartGrade 后端链路一键验证

用途：数据库修好后，用这一条命令确认整条链路是否打通。
      依次验证「登录 → 学生列表 → 请假列表」，并直接给出人话诊断。

用法：
    python3 scripts/verify_backend.py
    python3 scripts/verify_backend.py --teacher T001
    python3 scripts/verify_backend.py --base-url https://your-host/api/v1

说明：
    - 云托管缩容到 0 时首次请求会返回 503，脚本会自动重试等待冷启动（最多 3 次）。
    - 零第三方依赖，仅用标准库，macOS 自带 python3 可直接运行。
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

DEFAULT_BASE = "https://smartgrade-api-287135-10-1426534958.sh.run.tcloudbase.com/api/v1"
DEFAULT_TEACHER = "T001"

# 业务错误码 → 人话提示
CODE_HINTS = {
    40007: "数据库连不上 —— 检查 CynosDB 实例是否暂停/欠费/白名单变更",
    40005: "接口路径不存在",
    40001: "请求参数错误",
    40003: "无权限访问",
    40004: "资源不存在",
}


def request(url, method="GET", body=None, headers=None, timeout=20, retries=3):
    """发请求；502/503/504 自动重试（云托管冷启动）"""
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)

    last = (0, "未知错误")
    for i in range(retries):
        req = urllib.request.Request(url, data=payload, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status, resp.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            if e.code in (502, 503, 504) and i < retries - 1:
                last = (e.code, raw)
                time.sleep(2 * (i + 1))
                continue
            return e.code, raw
        except Exception as e:  # 超时 / 连接失败
            last = (0, str(e))
            if i < retries - 1:
                time.sleep(2 * (i + 1))
                continue
            return 0, str(e)
    return last


def parse_json(raw):
    try:
        return json.loads(raw)
    except Exception:
        return None


def count_of(data):
    """兼容 data 为数组 / {list:[]} / {items:[]} / {total:n} 等多种形态"""
    if data is None:
        return None
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict):
        for key in ("list", "items", "records", "rows", "data"):
            val = data.get(key)
            if isinstance(val, list):
                return len(val)
        for key in ("total", "count"):
            if isinstance(data.get(key), int):
                return data[key]
    return None


def diagnose(status, raw):
    """把一次响应翻译成 (是否成功, 展示文案)"""
    if status == 0:
        return False, "连不上（超时/网络错误）"
    if status in (502, 503, 504):
        return False, f"HTTP {status} —— 云托管实例正在冷启动或已缩容到 0"
    if status == 401:
        return False, "HTTP 401 —— 登录态无效"

    obj = parse_json(raw)
    if obj is None:
        return False, f"HTTP {status} —— 返回的不是 JSON：{raw[:80]}"

    code = obj.get("code")
    if code == 0:
        return True, "成功"
    hint = CODE_HINTS.get(code, obj.get("message") or "未知业务错误")
    return False, f"code={code} —— {hint}"


def main():
    ap = argparse.ArgumentParser(description="SmartGrade 后端链路一键验证")
    ap.add_argument("--base-url", default=DEFAULT_BASE, help="API 根地址")
    ap.add_argument("--teacher", default=DEFAULT_TEACHER, help="登录工号")
    ap.add_argument("--timeout", type=int, default=20, help="单次请求超时秒数")
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    print("=" * 58)
    print(f"SmartGrade 后端链路验证")
    print(f"地址：{base}")
    print(f"工号：{args.teacher}")
    print("=" * 58)

    # ---------- 1. 登录 ----------
    print("\n[1/3] 登录接口  POST /auth/login")
    status, raw = request(
        f"{base}/auth/login",
        method="POST",
        body={"teacherNo": args.teacher},
        timeout=args.timeout,
    )
    ok, msg = diagnose(status, raw)
    print(f"      {'✅' if ok else '❌'} {msg}")

    token = None
    if ok:
        data = (parse_json(raw) or {}).get("data") or {}
        token = data.get("token") or data.get("accessToken")
        teacher_name = data.get("name") or (data.get("teacher") or {}).get("name")
        print(f"      教师：{teacher_name or args.teacher}")
        if not token:
            print("      ⚠️ 响应里没找到 token，后续两项会失败")

    if not token:
        print("\n" + "-" * 58)
        print("结论：登录没通过，后续接口无法验证。")
        print("先解决上面报的问题，再跑一次这个脚本。")
        print("-" * 58)
        return 1

    auth_hdr = {"Authorization": f"Bearer {token}"}

    # ---------- 2. 学生列表 ----------
    print("\n[2/3] 学生列表  GET /students")
    status, raw = request(f"{base}/students", headers=auth_hdr, timeout=args.timeout)
    ok2, msg2 = diagnose(status, raw)
    print(f"      {'✅' if ok2 else '❌'} {msg2}")
    if ok2:
        n = count_of((parse_json(raw) or {}).get("data"))
        print(f"      学生数：{n if n is not None else '（返回结构未识别）'}")

    # ---------- 3. 请假列表 ----------
    print("\n[3/3] 请假列表  GET /leaves")
    status, raw = request(f"{base}/leaves", headers=auth_hdr, timeout=args.timeout)
    ok3, msg3 = diagnose(status, raw)
    print(f"      {'✅' if ok3 else '❌'} {msg3}")
    if ok3:
        n = count_of((parse_json(raw) or {}).get("data"))
        print(f"      请假记录：{n if n is not None else '（返回结构未识别）'}")

    # ---------- 结论 ----------
    print("\n" + "=" * 58)
    if ok2 and ok3:
        print("✅ 链路全通！可以到小程序「学生导入」页上传真实数据了。")
        print("   上传后如需下线 seed 虚拟数据：")
        print("     backend/prisma/99_cleanup_demo_students.sql")
        rc = 0
    elif ok and not ok2:
        print("⚠️ 登录通过，但业务接口还没通。")
        print("   多半是数据库刚恢复、迁移未执行完，稍等再跑一次。")
        rc = 1
    else:
        print("❌ 链路未打通，按上面的提示处理后再跑一次。")
        rc = 1
    print("=" * 58)
    return rc


if __name__ == "__main__":
    sys.exit(main())
