"""Lexical URL feature extraction shared by training and inference."""
from collections import Counter
from math import log2
from urllib.parse import urlsplit
import ipaddress
import re

SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "ow.ly", "buff.ly",
    "cutt.ly", "rb.gy", "shorturl.at", "rebrand.ly", "tiny.cc", "lnkd.in"
}
SUSPICIOUS_TERMS = (
    "login", "signin", "verify", "secure", "account", "update", "password",
    "wallet", "gift", "payment", "urgent", "confirm", "auth", "banking",
    "recover", "suspended", "webscr", "credential", "invoice", "support"
)
FEATURE_NAMES = [
    "url_length", "hostname_length", "path_length", "query_length", "tld_length",
    "count_dots", "count_hyphens", "count_underscores", "count_slashes", "count_at",
    "count_question", "count_equal", "count_ampersand", "count_percent", "count_digits",
    "digit_ratio", "count_subdomains", "has_ip", "uses_https", "has_punycode",
    "has_port", "has_userinfo", "suspicious_keyword_count", "is_shortener",
    "hostname_entropy", "has_double_slash_path", "count_letters", "special_char_ratio"
]

def extract_features(raw_url: str) -> dict:
    raw = str(raw_url).strip()
    candidate = raw if "://" in raw else "http://" + raw
    try:
        parsed = urlsplit(candidate)
        host = (parsed.hostname or "").lower().strip(".")
        path = parsed.path or ""
        query = parsed.query or ""
        port = parsed.port
        userinfo = bool(parsed.username or parsed.password)
    except (ValueError, UnicodeError):
        host, path, query, port, userinfo = "", "", "", None, False
        parsed = urlsplit("http://invalid.invalid")
    labels = [part for part in host.split(".") if part]
    try:
        ipaddress.ip_address(host)
        is_ip = 1
    except ValueError:
        is_ip = 0
    counts = Counter(raw.lower())
    letters = sum(ch.isalpha() for ch in raw)
    digits = sum(ch.isdigit() for ch in raw)
    specials = sum(not ch.isalnum() for ch in raw)
    freq = Counter(host)
    entropy = -sum((n / max(1, len(host))) * log2(n / max(1, len(host))) for n in freq.values()) if host else 0.0
    terms = sum(1 for term in SUSPICIOUS_TERMS if term in raw.lower())
    tld = labels[-1] if len(labels) > 1 else ""
    path_after_host = path.lstrip("/")
    return {
        "url_length": len(raw), "hostname_length": len(host), "path_length": len(path),
        "query_length": len(query), "tld_length": len(tld), "count_dots": counts["."],
        "count_hyphens": counts["-"], "count_underscores": counts["_"],
        "count_slashes": counts["/"], "count_at": counts["@"], "count_question": counts["?"],
        "count_equal": counts["="], "count_ampersand": counts["&"], "count_percent": counts["%"],
        "count_digits": digits, "digit_ratio": digits / max(1, len(raw)),
        "count_subdomains": max(0, len(labels) - 2), "has_ip": is_ip,
        "uses_https": int(parsed.scheme.lower() == "https"),
        "has_punycode": int("xn--" in host), "has_port": int(port is not None),
        "has_userinfo": int(userinfo), "suspicious_keyword_count": terms,
        "is_shortener": int(host in SHORTENERS), "hostname_entropy": entropy,
        "has_double_slash_path": int("//" in path_after_host), "count_letters": letters,
        "special_char_ratio": specials / max(1, len(raw)),
    }

def explain_features(raw_url: str) -> list[str]:
    f = extract_features(raw_url)
    candidate = raw_url if "://" in raw_url else "http://" + raw_url
    parsed = urlsplit(candidate)
    host = (parsed.hostname or "").lower()
    reasons = []
    if not f["uses_https"]: reasons.append("The URL does not use HTTPS.")
    if f["has_ip"]: reasons.append("The hostname is a raw IP address rather than a domain name.")
    if f["has_punycode"]: reasons.append("The domain contains punycode, which can represent look-alike characters.")
    if f["count_subdomains"] >= 3: reasons.append("The hostname contains several subdomain levels.")
    if f["has_userinfo"]: reasons.append("The URL contains embedded username or password information.")
    if f["is_shortener"]: reasons.append("The domain is a URL shortener, so the destination is not obvious from the link.")
    terms = [term for term in SUSPICIOUS_TERMS if term in raw_url.lower()]
    if terms: reasons.append("The URL contains potentially sensitive or urgency-related terms: " + ", ".join(terms[:5]) + ".")
    if len(raw_url) > 180: reasons.append("The URL is unusually long.")
    if host.count("-") >= 3: reasons.append("The hostname contains several hyphens.")
    if not reasons: reasons.append("No obvious lexical warning signs were detected; this does not prove the destination is safe.")
    return reasons
