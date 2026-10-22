"""HTTP client for the Hangman REST API.

Human clients and automated bots should use this module instead of
reimplementing request handling.
"""

from __future__ import annotations

import http.client
import json
import socket
import ssl
import time
from typing import Any
from urllib.parse import urlparse

DEFAULT_BASE_URL = "http://127.0.0.1:5000"
DEFAULT_TIMEOUT_SECONDS = 60.0
CONNECT_TIMEOUT_SECONDS = 10.0
MAX_ATTEMPTS = 4
RETRYABLE_STATUS = {502, 503, 504}


class HangmanApiError(Exception):
    """Raised when the Hangman HTTP API cannot complete a request."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class HangmanApiClient:
    """Minimal HTTP client for the Hangman REST API."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._ssl_context = _ssl_context()
        parsed = urlparse(self.base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise HangmanApiError(f"Invalid Hangman server URL: {self.base_url}")
        self._parsed = parsed
        self._conn: http.client.HTTPConnection | None = None

    def close(self) -> None:
        """Close any kept-alive connection."""
        conn = self._conn
        self._conn = None
        if conn is not None:
            try:
                conn.close()
            except OSError:
                pass

    def create_game(self, difficulty: str) -> dict[str, Any]:
        return self._request("POST", "/api/games", {"difficulty": difficulty}, expected_status=201)

    def get_game(self, game_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/games/{game_id}", expected_status=200)

    def guess(self, game_id: str, letter: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/api/games/{game_id}/guess",
            {"letter": letter},
            expected_status=200,
        )

    def start_evaluation(self, name: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        return self._request("POST", "/api/evaluation/start", body, expected_status=201)

    def get_evaluation(self, evaluation_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/evaluation/{evaluation_id}", expected_status=200)

    def evaluation_guess(self, evaluation_id: str, letter: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/api/evaluation/{evaluation_id}/guess",
            {"letter": letter},
            expected_status=200,
        )

    def evaluation_next(self, evaluation_id: str) -> dict[str, Any]:
        return self._request("POST", f"/api/evaluation/{evaluation_id}/next", expected_status=200)

    def evaluation_results(self, evaluation_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/evaluation/{evaluation_id}/results", expected_status=200)

    def get_leaderboard(self) -> dict[str, Any]:
        return self._request("GET", "/api/leaderboard", expected_status=200)

    def get_game_log(self, game_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/games/{game_id}/log", expected_status=200)

    def get_game_replay(self, game_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/games/{game_id}/replay", expected_status=200)

    def get_evaluation_log(self, evaluation_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/evaluation/{evaluation_id}/log", expected_status=200)

    def get_evaluation_replay(self, evaluation_id: str) -> dict[str, Any]:
        return self._request(
            "GET", f"/api/evaluation/{evaluation_id}/replay", expected_status=200
        )

    def get_evaluation_game_log(self, evaluation_id: str, game_index: int) -> dict[str, Any]:
        return self._request(
            "GET",
            f"/api/evaluation/{evaluation_id}/games/{game_index}/log",
            expected_status=200,
        )

    def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        expected_status: int | None = None,
    ) -> dict[str, Any]:
        data = None
        headers = {"Accept": "application/json", "Connection": "keep-alive"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        last_error: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                payload, status = self._send(method, path, data, headers)
            except TimeoutError as exc:
                self.close()
                last_error = HangmanApiError(
                    f"Timed out connecting to Hangman server at {self.base_url}"
                )
                last_error.__cause__ = exc
            except (OSError, http.client.HTTPException) as exc:
                self.close()
                last_error = HangmanApiError(
                    f"Could not connect to Hangman server at {self.base_url}: {exc}"
                )
                last_error.__cause__ = exc
            else:
                if status in RETRYABLE_STATUS and attempt < MAX_ATTEMPTS - 1:
                    self.close()
                    time.sleep(0.5 * (attempt + 1))
                    continue
                if expected_status is not None and status != expected_status:
                    raise HangmanApiError(_error_message(payload, status), status)
                return payload

            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(0.5 * (attempt + 1))

        assert last_error is not None
        raise last_error

    def _send(
        self,
        method: str,
        path: str,
        data: bytes | None,
        headers: dict[str, str],
    ) -> tuple[dict[str, Any], int]:
        conn = self._connection()
        conn.request(method, path, body=data, headers=headers)
        response = conn.getresponse()
        payload = _decode_json(response.read())
        status = response.status
        if response.will_close:
            self.close()
        return payload, status

    def _connection(self) -> http.client.HTTPConnection:
        if self._conn is not None:
            return self._conn
        host = self._parsed.hostname
        assert host is not None
        if self._parsed.scheme == "https":
            conn: http.client.HTTPConnection = http.client.HTTPSConnection(
                host,
                self._parsed.port,
                timeout=self.timeout,
                context=self._ssl_context,
            )
        else:
            conn = http.client.HTTPConnection(
                host,
                self._parsed.port,
                timeout=self.timeout,
            )
        conn._create_connection = _prefer_ipv4_connection  # type: ignore[method-assign]
        self._conn = conn
        return conn


def _prefer_ipv4_connection(
    address: tuple[str, int],
    timeout: float | None = None,
    source_address: tuple[str, int] | None = None,
) -> socket.socket:
    """Connect, trying IPv4 first so a dead IPv6 route cannot stall each request."""
    host, port = address
    infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    infos.sort(key=lambda item: 0 if item[0] == socket.AF_INET else 1)
    connect_timeout = timeout
    if isinstance(timeout, (int, float)) and timeout > 0:
        connect_timeout = min(float(timeout), CONNECT_TIMEOUT_SECONDS)

    errors: list[OSError] = []
    for family, socktype, proto, _canon, sockaddr in infos:
        sock = socket.socket(family, socktype, proto)
        try:
            sock.settimeout(connect_timeout)
            if source_address:
                sock.bind(source_address)
            sock.connect(sockaddr)
            sock.settimeout(timeout)
            return sock
        except OSError as exc:
            errors.append(exc)
            sock.close()
    if errors:
        raise errors[-1]
    raise OSError(f"could not connect to {host}:{port}")


def _ssl_context() -> ssl.SSLContext:
    """Build an HTTPS context that works with python.org macOS installs."""
    try:
        import certifi
    except ImportError:
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


def _decode_json(raw: bytes) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        payload = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {"error": raw.decode("utf-8", errors="replace")}
    if isinstance(payload, dict):
        return payload
    return {"error": str(payload)}


def _error_message(payload: dict[str, Any], status: int) -> str:
    return str(payload.get("error") or f"Request failed with HTTP {status}")
