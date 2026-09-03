# LoanNest

A 9-page marketing and application site for a fictional personal, auto, home
and business lender. Built as a Finance / Loan & Lending sub-category
deliverable — plain HTML, CSS and JavaScript, no build step, no frameworks.

> **Demonstration site.** LoanNest is a placeholder brand. Every rate, figure,
> testimonial, team member and address in this repo is illustrative and not
> real financial advice or an offer of credit.

## Pages (9 total)

| Page | File | Notes |
|---|---|---|
| Home | `index.html` | Hero, quick-quote widget, product grid, story, trust/compliance, testimonials, FAQ, CTA |
| Loans | `loans.html` | Filterable grid of 8 products + full comparison table |
| Loan detail | `loan-detail.html` | Personal Loan deep-dive with a live repayment estimate |
| Calculator | `calculator.html` | Full EMI calculator, amortisation schedule, short application form |
| About | `about.html` | Story, values, licensing timeline, leadership team |
| Contact | `contact.html` | Contact form, office details, map embed |
| Login | `login.html` | Centred auth screen, no nav/theme toggle |
| Register | `register.html` | Centred auth screen, no nav/theme toggle |
| 404 | `404.html` | Custom not-found page |

## Structure

```
LOAN/
├── index.html
├── loans.html
├── loan-detail.html
├── calculator.html
├── about.html
├── contact.html
├── login.html
├── register.html
├── 404.html
├── assets/
│   ├── css/style.css     — every design token + all page styles (single stylesheet)
│   └── js/
│       ├── main.js       — theme toggle, nav drawer, reveals, accordions, filters, form validation
│       └── calculator.js — EMI maths, quick-quote widget, sticky loan-detail estimate, full calculator
└── README.md
```

## Design system

- **Colours** (3 max, CSS variables in `:root`): deep pine `#0E4438`
  (primary/trust), warm sand `#E4D7C1` (secondary/surface), amber `#E08A2E`
  (accent/action). Dark mode overrides the same variables under
  `[data-theme="dark"]`.
- **Type**: Fraunces (display/headings), Plus Jakarta Sans (body/UI), IBM
  Plex Mono (numbers — rates, EMI figures, stats).
- **Spacing**: 4px base scale (`--s-1` … `--s-24`).
- **One radius** (`--radius: 14px`), **one shadow**, **one easing curve**
  used everywhere.
- **Icons**: Phosphor Icons (CDN).

## Interactivity

- Theme toggle persists via `localStorage`, defaults to
  `prefers-color-scheme`, hidden on auth pages.
- Responsive nav: full horizontal bar above 1024px, slide-in drawer at or
  below 1024px.
- Client-side EMI calculator (`assets/js/calculator.js`) — no backend;
  every figure is computed in the browser and labelled as an estimate.
- All forms (Contact, Login, Register, Calculator application form) validate
  inline before submit: required fields, email/phone pattern checks,
  password length + confirmation match, a blocking Terms checkbox on
  Register, and range checks on numeric loan amounts.

## Wiring this up to a real backend

Every form currently prevents its default submit and shows an inline
success message — nothing is transmitted anywhere. To go live:

- **Contact / Calculator application form**: point the `<form>` at a
  Formspree or Netlify Forms endpoint (see the HTML comment above each
  `<form>` tag), or your own API.
- **Login / Register**: replace the `submit` handlers in
  `assets/js/main.js` (`initAuthForms`) with real authentication calls.
- **Newsletter**: replace the Mailchimp embed comment in the footer with
  your list's actual form action.
- **Map**: swap the `iframe` `src` in `contact.html` for your own Google
  Maps embed URL.
- **Analytics**: paste your tag where `<!-- GA_TAG -->` appears in each
  `<head>`.

## Browser support

Tested against current Chrome, Firefox, Safari and Edge. Respects
`prefers-reduced-motion` (animations are disabled/instant when set).
