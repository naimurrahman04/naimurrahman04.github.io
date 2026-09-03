---
title: "The Anatomy of a Vulnerability Assessment: Port Scanning, Security Headers, and Clickjacking"
slug: "va-master-tool-anatomy"
date: "2026-09-03"
tags: [Methodology, Pentesting, Web Security]
description: "A vulnerability assessment is a sequence of checks that build on each other. How port scanning, header analysis, clickjacking testing, and directory brute-forcing chain into a complete picture."
project: "VA-Master-Tool"
project_url: "https://github.com/naimurrahman04/VA-Master-tool"
---

# The Anatomy of a Vulnerability Assessment: Port Scanning, Security Headers, and Clickjacking

*By Naimur Rahman — Cybersecurity Engineer*

A vulnerability assessment isn't one tool — it's a *sequence* of checks that build on each other. You start broad (what's open?), then narrow (what's running?), then probe specific weaknesses (what's misconfigured?).

This post breaks down the core checks in a typical web assessment, using [`VA-Master-Tool`](https://github.com/naimurrahman04/VA-Master-tool) — a framework I built that chains them together.

---

## Step 1: Recon — resolve and scan

Every assessment starts with turning a domain into an attack surface.

```python
domain = urlparse(url).netloc
ip = socket.gethostbyname(domain)
```

Then a port scan to find what's listening. The naive approach is a simple connect scan:

```python
for port in range(1, 101):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.1)
    try:
        s.connect((target, port))
        print(f"Port {port} is open")
    except (socket.timeout, ConnectionRefusedError):
        pass
```

This works, but for a real engagement you'd use `nmap` with service detection (`-sV`) and script scanning (`-sC`) to fingerprint *what* is running on each open port — not just *that* it's open.

---

## Step 2: Security header analysis

Once you know the target is a web app, the fastest wins are **missing security headers**. These are one-line fixes that prevent entire classes of attacks:

| Header | Protects against |
|--------|------------------|
| `Content-Security-Policy` | XSS, data injection |
| `X-Frame-Options` | Clickjacking |
| `X-Content-Type-Options` | MIME sniffing |
| `Strict-Transport-Security` | SSL stripping, MITM |
| `X-XSS-Protection` | Reflected XSS (legacy) |

The check is trivial — just look for the header in the response:

```python
for header in security_headers:
    if header in response.headers:
        print(f"{header}: {response.headers[header]}")
    else:
        print(f"{header} header is missing")
```

A missing `X-Frame-Options` or `Content-Security-Policy` is a **low-severity** finding on its own, but it's a signal that the app's security posture is weak — and it's often the first thing a client asks you to fix because it's cheap.

---

## Step 3: Clickjacking testing

Clickjacking is the attack that `X-Frame-Options` defends against: an attacker embeds your site in an invisible `<iframe>` and tricks the user into clicking something they didn't mean to.

The test is beautifully simple — **try to frame the target**:

```html
<iframe width="900" height="600" src="https://target.com"></iframe>
```

If the target renders inside the iframe, it's **vulnerable**. If it refuses to load (because of `X-Frame-Options` or CSP `frame-ancestors`), it's protected. No exploit code needed — the browser does the work for you.

---

## Step 4: Directory brute-forcing

Finally, you enumerate hidden content — admin panels, backup files, exposed endpoints — by brute-forcing common paths:

```python
for directory in directories:
    r = requests.get(f"{url}/{directory}")
    if r.status_code == 200:
        print(f"{directory_url} || 200")  # found something
```

This is where you find the `.git/config`, the `backup.zip`, the `/admin` panel that was never meant to be public.

---

## Why chain them together

Each step feeds the next:

1. **Port scan** → tells you *what's exposed*
2. **Header analysis** → tells you *how well it's defended*
3. **Clickjacking** → tests a *specific* defense
4. **Directory brute-force** → finds *what's hidden*

Individually, each check is simple. Chained together, they give you a complete picture of a target's attack surface — which is exactly what a vulnerability assessment is supposed to deliver.

**Try it:** [`github.com/naimurrahman04/VA-Master-tool`](https://github.com/naimurrahman04/VA-Master-tool)

---

*For authorized security testing only.*
