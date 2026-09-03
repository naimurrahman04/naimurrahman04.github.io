---
title: "macOS Live Forensics: Collecting Volatile Evidence Before It's Gone"
slug: "mac-forensic-live-response"
date: "2026-09-03"
tags: [DFIR, macOS, Incident Response]
description: "Volatile evidence — processes, network connections, login history — vanishes on reboot. What to collect first, and how to automate it with a non-destructive live-response script."
project: "mac-forensic"
project_url: "https://github.com/naimurrahman04/mac-forensic"
---

# macOS Live Forensics: Collecting Volatile Evidence Before It's Gone

*By Naimur Rahman — Cybersecurity Engineer*

In a macOS incident response, the clock starts the moment you suspect compromise. Volatile evidence — running processes, network connections, open files, login history — disappears the second the machine reboots or the attacker cleans up. You need to capture it *now*, in a forensically sound way, before you do anything else.

This post walks through what to collect and introduces [`mac-forensic`](https://github.com/naimurrahman04/mac-forensic), a live-response script I built to automate the collection.

---

## Why live response matters

Digital forensics has two phases:

1. **Live response** — collect volatile data from a *running* system (processes, network, memory, logs)
2. **Dead-box analysis** — image the disk and analyze it offline

Most people jump straight to disk imaging. But a running system holds evidence that a disk image will never show you: what processes were running, what network connections were open, who was logged in, what files were open. If you power the machine off first, that evidence is gone forever.

The order matters: **collect volatile data first, then image the disk.**

---

## What to collect (and why)

| Artifact | Command | Why it matters |
|----------|---------|----------------|
| **System info** | `system_profiler -detailLevel full` | Hardware, OS version, installed software |
| **User accounts** | `dscl . -list /Users` | Detect rogue/backdoor accounts |
| **Running processes** | `ps aux` | Malware, suspicious binaries, C2 agents |
| **Login history** | `last` | Unauthorized access, lateral movement |
| **Network connections** | `netstat -an` | Active C2 channels, exfiltration |
| **Open files** | `lsof` | What the attacker has open right now |
| **Memory info** | `top -l 1` | Memory pressure, injected processes |
| **Disk info** | `diskutil list` + `df -h` | Mounted volumes, hidden partitions |
| **TCC permissions** | `TCC.db` | Which apps have camera/mic/disk access |
| **Launch items** | `LaunchDaemons`/`LaunchAgents` | Persistence mechanisms |
| **Browser history** | Safari/Chrome/Firefox DBs | What the attacker browsed, exfil targets |

The last three are the highest-value for a *compromise* investigation: **persistence** (launch items), **permissions** (TCC), and **browser history** (what the attacker was after).

---

## The `mac-forensic` script

I built [`mac-forensic`](https://github.com/naimurrahman04/mac-forensic) to automate all of this. It's a single Bash script that:

1. Creates a timestamped evidence directory with subfolders (`browser_history/`, `logs/`, `plists/`, `audit/`)
2. Collects every artifact above with a single run
3. Zips everything into a portable evidence bundle

```bash
bash mac_live_response.sh
# → mac_forensic_evidence_20260903_091500.zip
```

Key design decisions:

- **Timestamped output** — every run is isolated, so you can re-run without overwriting prior evidence
- **Non-destructive** — it *copies* artifacts, never modifies the source system
- **Keychain-aware** — it *locates* Keychain files but deliberately does **not** extract them (that requires the user's password and is a separate, more sensitive step)
- **Graceful failures** — `2>/dev/null` on optional artifacts means a missing file doesn't abort the whole collection

---

## The honest limitations

A live-response script is the *first* step, not the whole investigation. It doesn't:

- **Image memory** (that needs `sudo` + a tool like `osxpmem` or `rekall`)
- **Decrypt Keychain** (requires the user's password)
- **Parse the collected artifacts** (you still need to analyze the logs, plists, and DBs)

But it gets the volatile evidence safely onto disk in minutes, which is exactly what the first responder needs.

---

## The takeaway

In macOS IR, **speed and order matter more than tooling sophistication.** Collect volatile data first, in a non-destructive, timestamped, portable way — and you've preserved the evidence that would otherwise vanish on reboot.

**Try it:** [`github.com/naimurrahman04/mac-forensic`](https://github.com/naimurrahman04/mac-forensic)

---

*For authorized incident response and forensic investigations only.*
