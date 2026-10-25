"""Serve the static site for local preview (PyCharm Run)."""

from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# Only the Pages site — not tests, lockfiles, etc.
SITE_ROOT = ROOT
SITE_INDEX = ROOT / "index.html"
DEFAULT_PORT = 8080


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview the love-xxx static site")
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Port to listen on (default: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not open a browser tab on start",
    )
    args = parser.parse_args()

    if not SITE_INDEX.is_file():
        raise SystemExit(f"Missing site index: {SITE_INDEX}")

    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(SITE_ROOT),
    )

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        url = f"http://127.0.0.1:{args.port}/"
        print(f"Serving {SITE_ROOT}")
        print(f"Open {url}")
        if not args.no_browser:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
