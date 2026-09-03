#!/usr/bin/env python3
"""Build individual blog post HTML pages from markdown sources.

Reads blog/posts/*.md (each with YAML front-matter), converts the body to
HTML, and writes one self-contained page per post to blog/<slug>.html.

Uses only the standard library + mistune (if available) so it runs in the
GitHub Actions environment without extra installs. Falls back to a minimal
markdown renderer if mistune is missing.
"""
import os
import re
import html as html_mod

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, "blog", "posts")
OUT_DIR = os.path.join(ROOT, "blog")
SITE = "https://naimurrahman04.github.io"

try:
    import mistune
    HAS_MISTUNE = True
except ImportError:
    HAS_MISTUNE = False


def parse_front_matter(text):
    """Split YAML front-matter from body. Returns (meta_dict, body)."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm = parts[1]
    body = parts[2].lstrip("\n")
    meta = {}
    for line in fm.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key == "tags":
            val = [t.strip() for t in val.strip("[]").split(",") if t.strip()]
        meta[key] = val
    return meta, body


def render_markdown(md):
    if HAS_MISTUNE:
        return mistune.html(md)
    # Minimal fallback: escape HTML, then handle code blocks, headers, lists,
    # bold, inline code, links, and paragraphs.
    out = []
    in_code = False
    code_lines = []
    for line in md.splitlines():
        if line.startswith("```"):
            if in_code:
                out.append("<pre><code>" + html_mod.escape("\n".join(code_lines)) + "</code></pre>")
                code_lines = []
                in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code_lines.append(line)
            continue
        if line.startswith("### "):
            out.append("<h3>" + html_mod.escape(line[4:]) + "</h3>")
        elif line.startswith("## "):
            out.append("<h2>" + html_mod.escape(line[3:]) + "</h2>")
        elif line.startswith("# "):
            out.append("<h1>" + html_mod.escape(line[2:]) + "</h1>")
        elif line.startswith("- "):
            out.append("<li>" + html_mod.escape(line[2:]) + "</li>")
        elif re.match(r"^\d+\. ", line):
            out.append("<li>" + html_mod.escape(re.sub(r"^\d+\. ", "", line)) + "</li>")
        elif line.strip() == "":
            out.append("")
        else:
            out.append("<p>" + html_mod.escape(line) + "</p>")
    return "\n".join(out)


def build_page(meta, body_html):
    title = meta.get("title", "Untitled")
    slug = meta.get("slug", "post")
    date = meta.get("date", "")
    description = meta.get("description", "")
    tags = meta.get("tags", [])
    project = meta.get("project", "")
    project_url = meta.get("project_url", "")
    url = f"{SITE}/blog/{slug}.html"

    tag_html = "".join(f'<span class="blog-tag">{t}</span>' for t in tags)
    project_html = ""
    if project and project_url:
        project_html = (
            f'<a class="blog-project" href="{project_url}" target="_blank" rel="noopener">'
            f'View the tool: {project} →</a>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Naimur Rahman</title>
<meta name="description" content="{description}">
<meta name="author" content="Naimur Rahman">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#0a66c2">
<link rel="canonical" href="{url}">

<!-- Open Graph -->
<meta property="og:type" content="article">
<meta property="og:site_name" content="Naimur Rahman — Cybersecurity Engineer">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{title}">
<meta property="og:locale" content="en_US">
<meta property="article:published_time" content="{date}">
<meta property="article:author" content="Naimur Rahman">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{SITE}/og-image.png">
<meta name="twitter:image:alt" content="{title}">

<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../blog.css">

<!-- Structured Data: BlogPosting -->
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{title}",
  "description": "{description}",
  "url": "{url}",
  "datePublished": "{date}",
  "dateModified": "{date}",
  "author": {{"@type": "Person", "name": "Naimur Rahman", "url": "{SITE}/"}},
  "publisher": {{"@type": "Person", "name": "Naimur Rahman"}},
  "mainEntityOfPage": {{"@type": "WebPage", "@id": "{url}"}},
  "keywords": "{', '.join(tags)}"
}}
</script>
</head>
<body>

<nav class="nav" id="nav">
  <div class="nav-inner">
    <a href="../index.html" class="logo">Naimur<span class="logo-accent"> Rahman</span></a>
    <button class="hamburger" id="hamburger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-links" id="navLinks">
      <a href="../index.html#about">About</a>
      <a href="../index.html#experience">Experience</a>
      <a href="../index.html#skills">Skills</a>
      <a href="../index.html#projects">Projects</a>
      <a href="../blog.html" class="active">Blog</a>
      <a href="../tools.html" class="nav-cta">Security Tools</a>
    </div>
  </div>
</nav>

<article class="post">
  <div class="section-inner">
    <a class="post-back" href="../blog.html">← Back to all posts</a>
    <div class="blog-meta">
      {tag_html}
      <span class="blog-date">{date}</span>
    </div>
    <h1 class="post-title">{title}</h1>
    {project_html}
    <div class="post-body">
{body_html}
    </div>
    <a class="post-back" href="../blog.html">← Back to all posts</a>
  </div>
</article>

<footer class="footer">
  <p>© 2026 Naimur Rahman · Cybersecurity Engineer</p>
</footer>

<script src="../script.js?v=2"></script>
</body>
</html>
"""


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    built = []
    for fname in sorted(os.listdir(POSTS_DIR)):
        if not fname.endswith(".md"):
            continue
        path = os.path.join(POSTS_DIR, fname)
        with open(path) as f:
            text = f.read()
        meta, body = parse_front_matter(text)
        body_html = render_markdown(body)
        page = build_page(meta, body_html)
        slug = meta.get("slug", fname[:-3])
        out_path = os.path.join(OUT_DIR, f"{slug}.html")
        with open(out_path, "w") as f:
            f.write(page)
        built.append(slug)
        print(f"BUILT blog/{slug}.html")
    print(f"\nTotal: {len(built)} pages")


if __name__ == "__main__":
    main()
