# Blog workflow

The blog is a static markdown-to-HTML pipeline:

```
blog/posts/*.md  →  scripts/build_blog.py  →  blog/*.html
```

## How to add a new post

1. Create `blog/posts/<slug>.md` with YAML front-matter:

```markdown
---
title: "Your Post Title"
slug: "your-post-slug"
date: "2026-09-03"
tags: [AI Security, Web Security]
description: "A one-sentence summary for SEO and social cards."
project: "project-name"
project_url: "https://github.com/naimurrahman04/project-name"
---

Your markdown body here...
```

2. Push. The **Build Blog** GitHub Action runs `scripts/build_blog.py` and
   commits `blog/<slug>.html` automatically.

3. Add the new page to `sitemap.xml` and link it from `blog.html`.

## Local build

```bash
pip install mistune
python3 scripts/build_blog.py
```

The build script uses `mistune` if available, and falls back to a minimal
stdlib renderer otherwise — so it works in any environment.
