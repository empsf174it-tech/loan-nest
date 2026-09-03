/* ==========================================================================
   LoanNest — calculator.js
   Client-side EMI engine used by the homepage quick quote, the loan detail
   sticky card, and the full calculator page. All figures are estimates.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const money0 = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });
  const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  /* ------------------------------------------------------------------
     Core maths
     EMI = P x r x (1+r)^n / ((1+r)^n - 1)   where r = monthly rate
     ------------------------------------------------------------------ */
  function computeEmi(principal, annualRate, months) {
    if (!principal || !months) return 0;
    const r = annualRate / 12 / 100;
    if (r === 0) return principal / months;
    const factor = Math.pow(1 + r, months);
    return (principal * r * factor) / (factor - 1);
  }

  function parseNumber(value) {
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : NaN;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function termLabel(months) {
    if (months % 12 === 0) {
      const years = months / 12;
      return years + (years === 1 ? ' year' : ' years');
    }
    return months + ' months';
  }

  /* ------------------------------------------------------------------
     1. Homepage quick quote
     ------------------------------------------------------------------ */
  function initQuickQuote() {
    const widget = $('#quickQuote');
    if (!widget) return;

    const amount = $('#qqAmount');
    const term = $('#qqTerm');
    const output = $('#qqEmi');
    const link = $('#qqLink');
    const rate = parseFloat(widget.dataset.rate || '8.9');

    function update() {
      const principal = clamp(parseNumber(amount.value) || 0, 1000, 500000);
      const months = parseInt(term.value, 10);
      const emi = computeEmi(principal, rate, months);
      output.textContent = emi ? money0.format(emi) + '/mo' : '—';
      if (link) {
        link.href = 'calculator.html?amount=' + Math.round(principal) +
                    '&term=' + months + '&rate=' + rate;
      }
    }

    amount.addEventListener('input', update);
    term.addEventListener('change', update);
    update();
  }

  /* ------------------------------------------------------------------
     2. Loan detail sticky-card estimate
     ------------------------------------------------------------------ */
  function initDetailQuote() {
    const box = $('#detailQuote');
    if (!box) return;

    const amount = $('#dqAmount');
    const term = $('#dqTerm');
    const emiOut = $('#dqEmi');
    const totalOut = $('#dqTotal');
    const interestOut = $('#dqInterest');
    const link = $('#dqLink');
    const rate = parseFloat(box.dataset.rate || '9.4');
    const min = parseFloat(box.dataset.min || '2000');
    const max = parseFloat(box.dataset.max || '50000');

    function update() {
      const principal = clamp(parseNumber(amount.value) || min, min, max);
      const months = parseInt(term.value, 10);
      const emi = computeEmi(principal, rate, months);
      const total = emi * months;

      emiOut.textContent = money0.format(emi);
      totalOut.textContent = money0.format(total);
      interestOut.textContent = money0.format(total - principal);
      if (link) {
        link.href = 'calculator.html?amount=' + Math.round(principal) +
                    '&term=' + months + '&rate=' + rate;
      }
    }

    amount.addEventListener('input', update);
    amount.addEventListener('blur', () => {
      const principal = clamp(parseNumber(amount.value) || min, min, max);
      amount.value = plain.format(principal);
      update();
    });
    term.addEventListener('change', update);
    update();
  }

  /* ------------------------------------------------------------------
     3. Full EMI calculator page
     ------------------------------------------------------------------ */
  function initCalculator() {
    const panel = $('#emiCalculator');
    if (!panel) return;

    const type = $('#calcType');
    const amountRange = $('#calcAmount');
    const amountInput = $('#calcAmountInput');
    const rateRange = $('#calcRate');
    const rateInput = $('#calcRateInput');
    const termRange = $('#calcTerm');
    const termInput = $('#calcTermInput');

    const emiOut = $('#calcEmi');
    const principalOut = $('#calcPrincipal');
    const interestOut = $('#calcInterest');
    const totalOut = $('#calcTotal');
    const termOut = $('#calcTermOut');
    const barPrincipal = $('#barPrincipal');
    const barInterest = $('#barInterest');
    const schedule = $('#calcSchedule');
    const amountMin = $('#calcAmountMin');
    const amountMax = $('#calcAmountMax');
    const applyAmount = $('#applyAmount');

    // Product presets: [min, max, default amount, rate, default months]
    const PRESETS = {
      personal: { min: 2000, max: 50000, amount: 18000, rate: 9.4, term: 48 },
      auto: { min: 5000, max: 100000, amount: 32000, rate: 6.8, term: 60 },
      home: { min: 50000, max: 1500000, amount: 340000, rate: 5.9, term: 360 },
      business: { min: 10000, max: 500000, amount: 120000, rate: 8.2, term: 84 }
    };

    function currentPreset() {
      return PRESETS[type.value] || PRESETS.personal;
    }

    function showControlError(input, message) {
      const wrap = input.closest('.calc-control');
      const msg = wrap && wrap.querySelector('.calc-msg');
      input.closest('.calc-control__input').classList.add('has-error');
      if (msg) {
        msg.textContent = message;
        msg.classList.add('is-visible');
      }
    }

    function clearControlError(input) {
      const wrap = input.closest('.calc-control');
      const msg = wrap && wrap.querySelector('.calc-msg');
      input.closest('.calc-control__input').classList.remove('has-error');
      if (msg) msg.classList.remove('is-visible');
    }

    function buildSchedule(principal, annualRate, months, emi) {
      if (!schedule) return;

      const r = annualRate / 12 / 100;
      const years = Math.ceil(months / 12);
      let balance = principal;
      const rows = [];

      for (let year = 1; year <= years; year += 1) {
        let principalPaid = 0;
        let interestPaid = 0;
        const monthsThisYear = Math.min(12, months - (year - 1) * 12);

        for (let m = 0; m < monthsThisYear; m += 1) {
          const interest = balance * r;
          const principalPart = Math.min(emi - interest, balance);
          interestPaid += interest;
          principalPaid += principalPart;
          balance -= principalPart;
        }

        rows.push(
          '<tr><th scope="row">Year ' + year + '</th>' +
          '<td class="num" data-label="Principal paid">' + money0.format(principalPaid) + '</td>' +
          '<td class="num" data-label="Interest paid">' + money0.format(interestPaid) + '</td>' +
          '<td class="num" data-label="Balance remaining">' + money0.format(Math.max(balance, 0)) + '</td></tr>'
        );
      }

      schedule.innerHTML = rows.join('');
    }

    function update() {
      const preset = currentPreset();
      const principal = clamp(parseNumber(amountRange.value), preset.min, preset.max);
      const rate = clamp(parseNumber(rateRange.value), 1, 24);
      const months = clamp(parseInt(termRange.value, 10), 6, 360);

      const emi = computeEmi(principal, rate, months);
      const total = emi * months;
      const interest = total - principal;

      emiOut.textContent = money0.format(emi);
      principalOut.textContent = money0.format(principal);
      interestOut.textContent = money0.format(interest);
      totalOut.textContent = money0.format(total);
      if (termOut) termOut.textContent = termLabel(months);

      const principalShare = total > 0 ? (principal / total) * 100 : 0;
      barPrincipal.style.width = principalShare.toFixed(1) + '%';
      barInterest.style.width = (100 - principalShare).toFixed(1) + '%';

      if (applyAmount) applyAmount.value = plain.format(Math.round(principal));

      buildSchedule(principal, rate, months, emi);
    }

    /* --- Range <-> text input syncing with inline range validation --- */
    function bindPair(range, input, options) {
      range.addEventListener('input', () => {
        input.value = options.format(parseNumber(range.value));
        clearControlError(input);
        update();
      });

      input.addEventListener('input', () => {
        const value = parseNumber(input.value);
        const min = options.min();
        const max = options.max();

        if (Number.isNaN(value)) {
          showControlError(input, 'Enter numbers only.');
          return;
        }
        if (value < min || value > max) {
          showControlError(input, 'Enter a value between ' + options.label(min) + ' and ' + options.label(max) + '.');
          return;
        }
        clearControlError(input);
        range.value = String(value);
        update();
      });

      input.addEventListener('blur', () => {
        const value = parseNumber(input.value);
        const safe = Number.isNaN(value) ? parseNumber(range.value) : clamp(value, options.min(), options.max());
        range.value = String(safe);
        input.value = options.format(safe);
        clearControlError(input);
        update();
      });
    }

    bindPair(amountRange, amountInput, {
      min: () => currentPreset().min,
      max: () => currentPreset().max,
      format: (v) => plain.format(Math.round(v)),
      label: (v) => money0.format(v)
    });

    bindPair(rateRange, rateInput, {
      min: () => 1,
      max: () => 24,
      format: (v) => v.toFixed(1),
      label: (v) => v + '%'
    });

    bindPair(termRange, termInput, {
      min: () => 6,
      max: () => 360,
      format: (v) => String(Math.round(v)),
      label: (v) => v + ' months'
    });

    function applyPreset(preset) {
      amountRange.min = String(preset.min);
      amountRange.max = String(preset.max);
      amountRange.step = String(Math.max(500, Math.round(preset.max / 200)));
      amountRange.value = String(preset.amount);
      amountInput.value = plain.format(preset.amount);

      rateRange.value = String(preset.rate);
      rateInput.value = preset.rate.toFixed(1);

      termRange.value = String(preset.term);
      termInput.value = String(preset.term);

      if (amountMin) amountMin.textContent = money0.format(preset.min);
      if (amountMax) amountMax.textContent = money0.format(preset.max);

      clearControlError(amountInput);
      clearControlError(rateInput);
      clearControlError(termInput);
      update();
    }

    type.addEventListener('change', () => applyPreset(currentPreset()));

    // Seed from URL parameters when arriving from a quote widget.
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get('type');
    const preset = Object.assign({}, PRESETS[requestedType] || PRESETS.personal);
    if (PRESETS[requestedType]) type.value = requestedType;

    const urlAmount = parseNumber(params.get('amount'));
    const urlTerm = parseInt(params.get('term'), 10);
    const urlRate = parseNumber(params.get('rate'));
    if (!Number.isNaN(urlAmount)) preset.amount = clamp(urlAmount, preset.min, preset.max);
    if (!Number.isNaN(urlTerm)) preset.term = clamp(urlTerm, 6, 360);
    if (!Number.isNaN(urlRate)) preset.rate = clamp(urlRate, 1, 24);

    applyPreset(preset);
  }

  /* ------------------------------------------------------------------
     4. Short application form (calculator page)
     ------------------------------------------------------------------ */
  function initApplyForm() {
    const form = $('#applyForm');
    if (!form || !window.LoanNestForms) return;

    const V = window.LoanNestForms;
    const success = $('#applySuccess');
    const name = $('#applyName');
    const email = $('#applyEmail');
    const phone = $('#applyPhone');
    const amount = $('#applyAmount');
    const employment = $('#applyEmployment');
    const consent = $('#applyConsent');

    function validateAmount() {
      const value = parseNumber(amount.value);
      if (!amount.value.trim()) return V.setError(amount, 'Enter the amount you need.');
      if (Number.isNaN(value)) return V.setError(amount, 'Enter numbers only.');
      if (value < 1000 || value > 1500000) {
        return V.setError(amount, 'Amount must be between $1,000 and $1,500,000.');
      }
      return V.setValid(amount);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const ok = [
        V.validateRequired(name, 'Please enter your full name.'),
        V.validateEmail(email),
        V.validatePhone(phone, false),
        validateAmount(),
        V.validateRequired(employment, 'Select your employment status.'),
        V.validateCheckbox(consent, 'Please agree to the soft credit check to continue.')
      ].every(Boolean);

      if (ok) V.showSuccess(form, success); else V.focusFirstError(form);
    });

    amount.addEventListener('blur', validateAmount);
    consent.addEventListener('change', () => {
      V.validateCheckbox(consent, 'Please agree to the soft credit check to continue.');
    });

    [name, email, phone, amount, employment].forEach((input) => {
      input.addEventListener('input', () => {
        const field = V.fieldOf(input);
        if (field && field.classList.contains('has-error')) V.clearState(input);
      });
    });
  }

  function boot() {
    initQuickQuote();
    initDetailQuote();
    initCalculator();
    initApplyForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
