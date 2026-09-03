---
title: "Building an AI-Assisted Web Vulnerability Scanner (Without Letting the AI Hallucinate Findings)"
slug: "ai-vapt-scanner"
date: "2026-09-03"
tags: [AI Security, Web Security, Python]
description: "AI should triage, not detect. How deterministic checks find vulnerabilities and the LLM only explains them — so the scanner can't hallucinate a false positive."
project: "ai-vapt"
project_url: "https://github.com/naimurrahman04/ai-vapt"
---

# Building an AI-Assisted Web Vulnerability Scanner (Without Letting the AI Hallucinate Findings)

*By Naimur Rahman — Cybersecurity Engineer*

"AI-powered vulnerability scanner" is a phrase that gets thrown around a lot, and most of the time it means one of two things: a wrapper around an existing tool with a chatbot bolted on, or a demo that produces confident-sounding but *wrong* results.

I wanted to build something honest. The result is [`ai-vapt`](https://github.com/naimurrahman04/ai-vapt) — a web scanner where **deterministic checks do the finding, and the LLM only does the explaining.**

This post explains the architecture and the design decisions behind it.

---

## The core principle: AI should triage, not detect

The biggest mistake in AI security tooling is letting the LLM *decide* whether something is a vulnerability. LLMs hallucinate. They'll confidently tell you a reflected XSS exists when it doesn't, or miss a real one because the evidence didn't fit their training patterns.

`ai-vapt` inverts this:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Crawler    │ ──▶ │ Deterministic │ ──▶ │  LLM Triage │
│  (discover) │     │   Checks      │     │  (optional)  │
└─────────────┘     └──────────────┘     └─────────────┘
```

1. **Crawler** discovers pages, forms, links, and query parameters
2. **Deterministic checks** find vulnerabilities with hard rules — no AI involved
3. **LLM triage** (optional) confirms true positives, explains impact, suggests remediation

The scanner works *fully* without an LLM. The LLM layer is a value-add, not a dependency.

---

## The deterministic checks

These are pure functions that inspect a response and return a finding (or nothing). They can't hallucinate because they're just `if` statements:

### 1. Security headers
```python
SECURITY_HEADERS = {
    "X-Frame-Options": "Clickjacking protection missing",
    "Content-Security-Policy": "CSP missing",
    "Strict-Transport-Security": "HSTS missing",
    # ...
}
```
Missing header → finding. Present → no finding. Zero ambiguity.

### 2. Sensitive file exposure
Probes common paths and flags any that return `200`:
```python
SENSITIVE_PATHS = [
    "/.git/config", "/.env", "/.aws/credentials",
    "/backup.zip", "/backup.sql", "/phpinfo.php",
    "/wp-config.php.bak", "/config.php.bak",
]
```

### 3. Reflected XSS
Injects a payload into each query parameter and checks if it's reflected *unencoded* in the response:
```python
XSS_PAYLOAD = "<script>alert('ai-vapt')</script>"
# ... if XSS_PAYLOAD in r.text: finding
```

### 4. Server info disclosure
Flags `Server` and `X-Powered-By` headers that leak software/version.

Every finding carries a **category, severity, title, detail, URL, and evidence** — so it's copy-pasteable into a pentest report.

---

## The LLM triage layer (the "AI" part, done right)

When you *do* configure an LLM, it doesn't scan — it *triages*. For each finding, it's asked to return structured JSON:

```json
{
  "is_true_positive": true,
  "impact": "An attacker can...",
  "remediation": "Add the header..."
}
```

The prompt is explicit about the output shape, and the code does best-effort JSON extraction with a regex — so even a slightly-off LLM response degrades gracefully to `None` rather than crashing.

```python
m = re.search(r"\{.*\}", text, re.DOTALL)
if m:
    return json.loads(m.group(0))
return None
```

**Key design choice:** the LLM's verdict is *advisory*. The deterministic finding is always reported regardless. The LLM can add context, but it can't *suppress* a real finding or *invent* a fake one.

---

## Why this architecture matters

1. **No false confidence.** The scanner never claims a vuln exists unless a deterministic check fired.
2. **Works offline.** No API key? No problem — you still get full findings with severity.
3. **Auditable.** Every finding has evidence you can verify by hand.
4. **LLM-agnostic.** Any OpenAI-compatible endpoint works (Ollama, vLLM, LM Studio, OpenAI, Azure).

---

## Usage

```bash
pip install -e .
ai-vapt --url https://target.com --crawl
# optional LLM triage:
ai-vapt --url https://target.com --llm http://localhost:11434/v1 --model llama3
```

---

## The honest takeaway

"AI security" doesn't mean replacing deterministic logic with a model — it means using the model where it's actually good (explaining, summarizing, triaging) and keeping the *detection* deterministic and auditable. That's the difference between a tool you can trust in a real engagement and a demo.

**Try it:** [`github.com/naimurrahman04/ai-vapt`](https://github.com/naimurrahman04/ai-vapt)

---

*Part of a series on AI security. Previous: [Red-Teaming LLM Applications](https://github.com/naimurrahman04/llm-sec).*
