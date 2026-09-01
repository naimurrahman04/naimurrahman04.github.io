#!/usr/bin/env python3
"""Fetch cybersecurity news from RSS feeds and write news.json.

Parses RSS 2.0 directly (stdlib only, no external deps) to avoid
relying on flaky third-party APIs like rss2json.
"""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

FEEDS = [
    ("https://feeds.feedburner.com/TheHackersNews", "The Hacker News"),
    ("https://www.bleepingcomputer.com/feed/", "BleepingComputer"),
]

MAX_PER_FEED = 5
MAX_TOTAL = 9


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (news-fetcher)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def parse_rss(xml_bytes):
    root = ET.fromstring(xml_bytes)
    items = []
    # RSS 2.0: <channel><item>...</item></channel>
    for item in root.iter("item"):
        title = item.findtext("title") or ""
        link = item.findtext("link") or ""
        pub = item.findtext("pubDate") or ""
        if title and link:
            items.append({"title": title.strip(), "link": link.strip(), "pubDate": pub.strip()})
    return items


def main():
    all_items = []
    for url, source in FEEDS:
        try:
            xml = fetch(url)
            for it in parse_rss(xml)[:MAX_PER_FEED]:
                it["source"] = source
                all_items.append(it)
        except Exception as e:
            print(f"WARN: failed {url}: {e}", file=sys.stderr)

    if not all_items:
        print("ERROR: no items fetched from any feed", file=sys.stderr)
        sys.exit(1)

    # Sort by pubDate descending (best-effort parse)
    def sort_key(it):
        # pubDate like "Sat, 31 Aug 2026 20:47:54 +0000"
        m = re.search(r"(\d{1,2})\s+(\w{3})\s+(\d{4})", it.get("pubDate", ""))
        if not m:
            return ""
        months = {"Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05",
                  "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10",
                  "Nov": "11", "Dec": "12"}
        day, mon, year = m.group(1), m.group(2), m.group(3)
        return f"{year}-{months.get(mon, '00')}-{int(day):02d}"

    all_items.sort(key=sort_key, reverse=True)
    all_items = all_items[:MAX_TOTAL]

    out = {
        "updated": "2026-01-01T00:00:00Z",  # placeholder, overwritten below
        "items": all_items,
    }
    # Use current time
    import datetime
    out["updated"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    with open("news.json", "w") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote news.json with {len(all_items)} items")


if __name__ == "__main__":
    main()
