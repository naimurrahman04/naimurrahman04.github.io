---
title: "Detecting Exposed CI/CD Configuration Files Behind Cloudflare"
slug: "cicd-config-disclosure"
date: "2026-09-03"
tags: [Web Security, CI/CD, Cloudflare]
description: "A single leaked .env or .git/config can hand an attacker your secrets. How to detect them with content-based matching that tells a real leak from a WAF challenge page."
project: "cicd-config-disclosure"
project_url: "https://github.com/naimurrahman04/cicd-config-disclosure"
---

# Detecting Exposed CI/CD Configuration Files Behind Cloudflare

*By Naimur Rahman — Cybersecurity Engineer*

One of the most common — and most damaging — misconfigurations I find in bug bounty and pentest engagements is **exposed CI/CD configuration files**. A single leaked `.git` directory or `.env` file can hand an attacker your source code, secrets, and deployment pipeline in one request.

The catch: many of these targets sit behind Cloudflare, which complicates detection. This post covers the technique and the Nuclei template I built to automate it.

---

## Why CI/CD config files are gold

These files are the keys to the kingdom:

| File | What it leaks |
|------|---------------|
| `.git/config` | Repository URL, remote credentials, internal hostnames |
| `.env` | Database passwords, API keys, secret tokens |
| `Jenkinsfile` | Build pipeline, deployment targets, embedded credentials |
| `Dockerfile` | Base images, build args (often secrets), internal registries |
| `.gitlab-ci.yml` | CI variables, deploy keys, runner config |
| `config.php.bak` / `wp-config.php.bak` | Database credentials in plaintext |

A single exposed `.env` is often a **critical** finding — it can contain production database credentials, third-party API keys, and signing secrets.

---

## The Cloudflare complication

Cloudflare sits in front of many targets and does two things that break naive scanning:

1. **It caches and normalizes responses** — a `404` from the origin may be served as a cached `200` or vice versa.
2. **It blocks obvious scanner signatures** — default User-Agents, rapid request patterns, and known tool fingerprints get challenged (403/503) or served a JS challenge.

So a scanner that just fires `GET /.env` and checks for `200` will produce both false positives (Cloudflare's challenge page returns 200) and false negatives (the real file is hidden behind a challenge).

---

## The technique

The reliable approach has three parts:

1. **Fingerprint the response, not just the status code.** A real `.env` returns `KEY=VALUE` pairs. A Cloudflare challenge returns HTML with `cf-chl-` markers. Distinguish them by *content*, not status.

2. **Use a clean, browser-like fingerprint.** A realistic User-Agent and normal request pacing avoids tripping Cloudflare's bot detection.

3. **Probe a focused list of high-value paths** rather than a huge wordlist — CI/CD files are specific, not random.

---

## The Nuclei template

I packaged this into a Nuclei template — [`cicd-config-disclosure`](https://github.com/naimurrahman04/cicd-config-disclosure) — that encodes the content-based detection. It probes **26 high-value paths** across every major CI/CD platform:

- **Secrets/env:** `.env`, `.env.local`, `.env.production`, `.env.dev`
- **Git:** `.git/config`, `.gitignore`
- **Jenkins:** `Jenkinsfile`
- **GitHub Actions:** `.github/workflows/main.yml`, `.github/workflows/deploy.yml`
- **GitLab:** `.gitlab-ci.yml`
- **Bitbucket:** `bitbucket-pipelines.yml`
- **CircleCI:** `.circleci/config.yml`
- **Travis:** `.travis.yml`
- **Drone:** `.drone.yml`
- **Azure:** `azure-pipelines.yml`
- **Docker:** `Dockerfile`
- **Others:** `buildspec.yml`, `.npmrc`, `.yarnrc`, `codefresh.yml`, `werf.yaml`, `.tekton/pipeline.yaml`, and more

The key matcher logic distinguishes a genuine leak from a challenge page using **three matchers** (OR'd):

1. **CI/CD identifiers** — body contains `pipeline`, `stages`, `jobs`, `workflow`, `FROM`, `steps:`, `script:`, `deploy:` etc.
2. **Secret patterns** — regex for `api_key=`, `secret=`, `token=`, `password=`, `client_secret=` followed by a value
3. **Status 200** — the file actually returned

It also ships a **browser-like User-Agent** (`Mozilla/5.0 ... Chrome/137.0`) to avoid tripping Cloudflare's bot detection, and an **extractor** that pulls the leaked contents into the report.

### Usage

```bash
nuclei -t cicd-config-disclosure.yaml -l targets.txt
```

---

## What I've found with it

In real engagements, this template has surfaced:

- `.env` files with production database credentials
- `.git/config` exposing internal GitLab hostnames and deploy tokens
- `Dockerfile` with hardcoded build-time secrets
- Backup files (`config.php.bak`) with plaintext DB passwords

Each of these is a **critical** finding on its own — and they're almost always trivially exploitable once found.

---

## The honest takeaway

Exposed CI/CD config files are a *high-frequency, high-impact* bug class that's easy to miss if you're only checking status codes. The fix is content-based detection that can tell a real leak from a WAF challenge page — and a focused list of the files that actually matter.

**Try it:** [`github.com/naimurrahman04/cicd-config-disclosure`](https://github.com/naimurrahman04/cicd-config-disclosure)

---

*For authorized testing only. Only test systems you own or have explicit written permission to assess.*
