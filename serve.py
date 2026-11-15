"""本地静态服务（Python 标准库）— 在 .venv 内运行，只监听 127.0.0.1。

用法：.venv/Scripts/python.exe serve.py
      BT_PORT=8788 .venv/Scripts/python.exe serve.py   # 仅端口可覆盖，主机始终锁定回环地址
"""
import json
import functools
import http.server
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CFG = json.loads((ROOT / "run.config.json").read_text(encoding="utf-8"))
SERVER = CFG["server"]
PORT = int(os.environ.get("BT_PORT", SERVER["port"]))
HOST = SERVER["host"]  # 不允许外部覆盖，保证不对局域网开放


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer((HOST, PORT), handler) as httpd:
        base = f"http://{HOST}:{PORT}"
        print("BURNING TOKENS (local only, Python venv)")
        print(f"  2D : {base}/{SERVER['entry2d']}")
        print(f"  3D : {base}/{SERVER['entry3d']}")
        print(f"  调研: {base}/research.md")
        print("  不上传 GitHub；按 Ctrl+C 停止。")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止。")
