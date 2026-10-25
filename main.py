"""Serve the static site in web/ for local preview (PyCharm Run)."""

from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
import webbrowser
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parent / "web"
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

    if not WEB_ROOT.is_dir():
        raise SystemExit(f"Missing web root: {WEB_ROOT}")

    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler,
        directory=str(WEB_ROOT),
    )

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        url = f"http://127.0.0.1:{args.port}/"
        print(f"Serving {WEB_ROOT}")
        print(f"Open {url}")
        if not args.no_browser:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
