/* ==========================================================================
   LoanNest — main.js
   Handles: theme toggle, mobile drawer, sticky header, scroll reveals,
            accordions, loan filtering, and client-side form validation.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ------------------------------------------------------------------
     1. Theme toggle — persists in localStorage, defaults to OS setting
     ------------------------------------------------------------------ */
  const THEME_KEY = 'loannest-theme';

  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  function storeTheme(value) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (err) {
      /* Storage unavailable (private mode) — theme still applies for this visit. */
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    $$('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  }

  function initTheme() {
    const stored = readStoredTheme();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));

    $$('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        storeTheme(next);
      });
    });
  }

  /* ------------------------------------------------------------------
     2. Mobile drawer navigation (<= 1024px)
     ------------------------------------------------------------------ */
  function initNav() {
    const nav = $('#primaryNav');
    const toggle = $('#navToggle');
    const closeBtn = $('#navClose');
    const backdrop = $('#navBackdrop');
    if (!nav || !toggle || !backdrop) return;

    let lastFocused = null;

    function openNav() {
      lastFocused = document.activeElement;
      nav.classList.add('is-open');
      backdrop.hidden = false;
      // Force a reflow so the opacity transition runs from its start value.
      void backdrop.offsetWidth;
      backdrop.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      if (closeBtn) closeBtn.focus();
    }

    function closeNav() {
      nav.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      window.setTimeout(() => { backdrop.hidden = true; }, 320);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    toggle.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) closeNav(); else openNav();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    backdrop.addEventListener('click', closeNav);

    $$('.nav__link, .nav__drawer-actions .btn', nav).forEach((link) => {
      link.addEventListener('click', () => {
        if (nav.classList.contains('is-open')) closeNav();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) closeNav();
    });

    // Reset drawer state when resizing up into the desktop nav.
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && nav.classList.contains('is-open')) closeNav();
    });
  }

  /* ------------------------------------------------------------------
     3. Sticky header border on scroll
     ------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#siteHeader');
    if (!header) return;

    const update = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ------------------------------------------------------------------
     4. Scroll reveal
     ------------------------------------------------------------------ */
  function initReveals() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.revealDelay || 0);
        window.setTimeout(() => entry.target.classList.add('is-visible'), delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach((item) => observer.observe(item));
  }

  /* ------------------------------------------------------------------
     5. Accordions (FAQ blocks)
     ------------------------------------------------------------------ */
  function initAccordions() {
    $$('.accordion').forEach((accordion) => {
      const triggers = $$('.accordion__trigger', accordion);

      triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
          const item = trigger.closest('.accordion__item');
          const isOpen = item.classList.contains('is-open');

          triggers.forEach((other) => {
            other.setAttribute('aria-expanded', 'false');
            other.closest('.accordion__item').classList.remove('is-open');
          });

          if (!isOpen) {
            item.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     6. Loan category filtering (loans.html)
     ------------------------------------------------------------------ */
  function initFilters() {
    const bar = $('#loanFilters');
    if (!bar) return;

    const chips = $$('.filter-chip', bar);
    const items = $$('.loan-item');
    const empty = $('#filterEmpty');
    const count = $('#filterCount');

    function applyFilter(value) {
      let visible = 0;
      items.forEach((item) => {
        const match = value === 'all' || item.dataset.category === value;
        item.classList.toggle('is-hidden', !match);
        if (match) visible += 1;
      });
      if (empty) empty.classList.toggle('is-visible', visible === 0);
      if (count) count.textContent = String(visible);
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((other) => {
          other.classList.remove('is-active');
          other.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('is-active');
        chip.setAttribute('aria-pressed', 'true');
        applyFilter(chip.dataset.filter);
      });
    });

    // Deep-link support: loans.html?type=auto pre-selects that category.
    const requested = new URLSearchParams(window.location.search).get('type');
    const preset = requested && chips.find((chip) => chip.dataset.filter === requested);
    if (preset) preset.click(); else applyFilter('all');
  }

  /* ------------------------------------------------------------------
     7. Shared validation helpers
     ------------------------------------------------------------------ */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  const PHONE_RE = /^[0-9+()\s-]{7,20}$/;

  function fieldOf(input) {
    return input.closest('.field');
  }

  function setError(input, message) {
    const field = fieldOf(input);
    if (!field) return false;
    field.classList.add('has-error');
    field.classList.remove('is-valid');
    const msg = field.querySelector('.field__msg');
    if (msg && message) msg.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    return false;
  }

  function setValid(input) {
    const field = fieldOf(input);
    if (!field) return true;
    field.classList.remove('has-error');
    field.classList.add('is-valid');
    input.setAttribute('aria-invalid', 'false');
    return true;
  }

  function clearState(input) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.remove('has-error', 'is-valid');
    input.removeAttribute('aria-invalid');
  }

  function validateRequired(input, message) {
    return input.value.trim() ? setValid(input) : setError(input, message);
  }

  function validateEmail(input) {
    const value = input.value.trim();
    if (!value) return setError(input, 'Email address is required.');
    if (!EMAIL_RE.test(value)) return setError(input, 'Enter a valid email, e.g. name@example.com');
    return setValid(input);
  }

  function validatePassword(input, min) {
    const value = input.value;
    if (!value) return setError(input, 'Password is required.');
    if (value.length < (min || 8)) return setError(input, 'Use at least 8 characters.');
    return setValid(input);
  }

  function validatePhone(input, optional) {
    const value = input.value.trim();
    if (!value) return optional ? setValid(input) : setError(input, 'Phone number is required.');
    if (!PHONE_RE.test(value)) return setError(input, 'Enter a valid phone number.');
    return setValid(input);
  }

  function validateCheckbox(input, message) {
    const field = fieldOf(input);
    if (input.checked) {
      if (field) field.classList.remove('has-error');
      input.setAttribute('aria-invalid', 'false');
      return true;
    }
    return setError(input, message);
  }

  function focusFirstError(form) {
    const first = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    if (first) first.focus();
  }

  function showSuccess(form, successEl) {
    if (!successEl) return;
    successEl.classList.add('is-visible');
    successEl.setAttribute('tabindex', '-1');
    successEl.focus({ preventScroll: true });
    form.reset();
    $$('input, select, textarea', form).forEach(clearState);
    window.setTimeout(() => successEl.classList.remove('is-visible'), 7000);
  }

  // Expose helpers for calculator.js so validation behaves identically everywhere.
  window.LoanNestForms = {
    setError, setValid, clearState, validateRequired, validateEmail,
    validatePhone, validateCheckbox, focusFirstError, showSuccess, fieldOf
  };

  /* ------------------------------------------------------------------
     8. Contact form
     ------------------------------------------------------------------ */
  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;

    const success = $('#contactSuccess');
    const name = $('#contactName');
    const email = $('#contactEmail');
    const phone = $('#contactPhone');
    const topic = $('#contactTopic');
    const message = $('#contactMessage');

    const run = () => [
      validateRequired(name, 'Please tell us your full name.'),
      validateEmail(email),
      validatePhone(phone, true),
      validateRequired(topic, 'Choose what your enquiry is about.'),
      validateRequired(message, 'Please add a short message.')
    ].every(Boolean);

    [name, email, phone, topic, message].forEach((input) => {
      input.addEventListener('blur', () => {
        if (input === email) validateEmail(input);
        else if (input === phone) validatePhone(input, true);
        else validateRequired(input, 'This field is required.');
      });
      input.addEventListener('input', () => {
        if (fieldOf(input).classList.contains('has-error')) clearState(input);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (run()) showSuccess(form, success);
      else focusFirstError(form);
    });
  }

  /* ------------------------------------------------------------------
     9. Auth forms — login + register
     ------------------------------------------------------------------ */
  function initAuthForms() {
    const login = $('#loginForm');
    if (login) {
      const email = $('#loginEmail');
      const password = $('#loginPassword');
      const success = $('#loginSuccess');

      login.addEventListener('submit', (event) => {
        event.preventDefault();
        const ok = [validateEmail(email), validatePassword(password, 8)].every(Boolean);
        if (ok) showSuccess(login, success); else focusFirstError(login);
      });

      [email, password].forEach((input) => {
        input.addEventListener('input', () => {
          if (fieldOf(input).classList.contains('has-error')) clearState(input);
        });
      });
    }

    const register = $('#registerForm');
    if (register) {
      const name = $('#registerName');
      const email = $('#registerEmail');
      const password = $('#registerPassword');
      const confirm = $('#registerConfirm');
      const terms = $('#registerTerms');
      const success = $('#registerSuccess');

      function matchPasswords() {
        if (!confirm.value) return setError(confirm, 'Please confirm your password.');
        if (confirm.value !== password.value) return setError(confirm, 'Passwords do not match.');
        return setValid(confirm);
      }

      register.addEventListener('submit', (event) => {
        event.preventDefault();
        const ok = [
          validateRequired(name, 'Please enter your full name.'),
          validateEmail(email),
          validatePassword(password, 8),
          matchPasswords(),
          validateCheckbox(terms, 'You must accept the terms to continue.')
        ].every(Boolean);
        if (ok) showSuccess(register, success); else focusFirstError(register);
      });

      confirm.addEventListener('blur', matchPasswords);
      terms.addEventListener('change', () => validateCheckbox(terms, 'You must accept the terms to continue.'));

      [name, email, password, confirm].forEach((input) => {
        input.addEventListener('input', () => {
          if (fieldOf(input).classList.contains('has-error')) clearState(input);
        });
      });
    }
  }

  /* ------------------------------------------------------------------
     9b. Password reveal toggles (auth pages)
     ------------------------------------------------------------------ */
  function initPasswordToggles() {
    $$('.pw-toggle').forEach((btn) => {
      const wrap = btn.closest('.field__wrap');
      const input = wrap && wrap.querySelector('input');
      if (!input) return;
      const icon = btn.querySelector('i');

      btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.setAttribute('aria-pressed', String(show));
        if (icon) icon.className = show ? 'ph ph-eye-slash' : 'ph ph-eye';
      });
    });
  }

  /* ------------------------------------------------------------------
     10. Newsletter (footer)
     ------------------------------------------------------------------ */
  function initNewsletter() {
    $$('.newsletter').forEach((form) => {
      const input = form.querySelector('input[type="email"]');
      const note = form.parentElement.querySelector('.newsletter-note');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const valid = EMAIL_RE.test(input.value.trim());
        if (note) {
          note.textContent = valid
            ? 'Thanks — please check your inbox to confirm.'
            : 'Enter a valid email address to subscribe.';
        }
        if (valid) form.reset();
      });
    });
  }

  /* ------------------------------------------------------------------
     10b. Stat count-up animation (runs once when scrolled into view)
     ------------------------------------------------------------------ */
  function initCountUp() {
    const values = $$('.stat__value');
    if (!values.length) return;

    const reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Split "$2.4B" -> { prefix:"$", number:2.4, suffix:"B", decimals:1 }
    const parsed = values.map((el) => {
      const match = el.textContent.trim().match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
      if (!match) return null;
      const raw = match[2].replace(/,/g, '');
      const dot = raw.indexOf('.');
      return {
        el,
        prefix: match[1],
        target: parseFloat(raw),
        suffix: match[3],
        decimals: dot === -1 ? 0 : raw.length - dot - 1,
        grouped: match[2].indexOf(',') !== -1
      };
    });

    const format = (item, value) => {
      let num = value.toFixed(item.decimals);
      if (item.grouped) num = Number(num).toLocaleString('en-US');
      return item.prefix + num + item.suffix;
    };

    const run = (item) => {
      if (reduceMotion) { item.el.textContent = format(item, item.target); return; }
      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        item.el.textContent = format(item, item.target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else item.el.textContent = format(item, item.target);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      parsed.forEach((item) => item && run(item));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = parsed.find((p) => p && p.el === entry.target);
        if (item) run(item);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    parsed.forEach((item) => {
      if (!item) return;
      item.el.textContent = format(item, 0);
      observer.observe(item.el);
    });
  }

  /* ------------------------------------------------------------------
     11. Footer year
     ------------------------------------------------------------------ */
  function initYear() {
    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function boot() {
    initTheme();
    initNav();
    initHeader();
    initReveals();
    initAccordions();
    initFilters();
    initContactForm();
    initAuthForms();
    initPasswordToggles();
    initNewsletter();
    initCountUp();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
