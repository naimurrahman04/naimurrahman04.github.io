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

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initHamburger();
    initReveal();
  });
})();
