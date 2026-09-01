// Minimal interactions: nav active state + mobile hamburger
(function () {
  'use strict';

  // Nav active link highlight
  function initNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 120) current = s.getAttribute('id');
      });
      navLinks.forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('#')) {
          a.style.color = href === '#' + current ? 'var(--text)' : '';
        }
      });
    });
  }

  // Mobile hamburger
  function initHamburger() {
    const burger = document.getElementById('hamburger');
    const links = document.getElementById('navLinks');
    if (!burger || !links) return;
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('active');
        links.classList.remove('open');
      });
    });
  }

  // Scroll reveal with stagger
  function initReveal() {
    const targets = document.querySelectorAll('.section-title, .about-text, .tag-cloud, .tl-item, .skill-card, .project-card, .cert-card, .achievements, .training, .languages, .contact-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 3) * 0.08 + 's';
      observer.observe(el);
    });
  }

  // Live cybersecurity news — reads static news.json (updated by GitHub Action)
  function initNews() {
    const grid = document.getElementById('newsGrid');
    if (!grid) return;

    const CACHE_KEY = 'newsCache';
    const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours (matches Action schedule)

    function render(items) {
      grid.innerHTML = '';
      items.forEach(item => {
        const a = document.createElement('a');
        a.className = 'news-card';
        a.href = item.link;
        a.target = '_blank';
        a.rel = 'noopener';

        const src = document.createElement('span');
        src.className = 'news-source';
        src.textContent = item.source;

        const title = document.createElement('span');
        title.className = 'news-title';
        title.textContent = item.title;

        const date = document.createElement('span');
        date.className = 'news-date';
        date.textContent = new Date(item.pubDate).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        });

        a.appendChild(src);
        a.appendChild(title);
        a.appendChild(date);
        grid.appendChild(a);
      });
    }

    function showError() {
      grid.innerHTML = '<div class="news-error">Unable to load news right now. Please refresh.</div>';
    }

    function loadCached() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data.items || !data.items.length) return null;
        if (Date.now() - data.ts > CACHE_TTL) return null;
        return data.items;
      } catch (e) { return null; }
    }

    function saveCache(items) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: items }));
      } catch (e) { /* ignore */ }
    }

    // Show cached immediately if available
    const cached = loadCached();
    if (cached) render(cached);

    // Fetch the static news.json (same-origin, no CORS, no rate limits)
    fetch('news.json', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(d => {
        if (!d.items || !d.items.length) throw new Error('empty');
        saveCache(d.items);
        render(d.items);
      })
      .catch(() => {
        if (cached) { render(cached); return; }
        showError();
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initHamburger();
    initReveal();
    initNews();
  });
})();
