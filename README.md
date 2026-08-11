# Tidebreak Capital — Website

Informational marketing site for Tidebreak Capital, a Life Sciences catalyst fund.
Static HTML/CSS/JS — no build step, no dependencies. Hosted on GitHub Pages.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Home — hero, positioning, core belief, philosophy, approach preview, insights preview, firm preview, LP CTA |
| `approach.html` | The investment approach — thesis, four pillars, process timeline, risk framework |
| `team.html` | The team (placeholder bios to fill in) |
| `insights.html` | Perspectives & track record (placeholder catalyst calls to fill in) |
| `firm.html` | Firm structure, information barriers, FAQ |
| `contact.html` | LP access request form + direct contacts |
| `assets/styles.css` | Shared design system (colors, type, components) |
| `assets/site.js` | Nav toggle, scroll reveal, count-up stats, form handling |
| `assets/favicon.svg` | Brand mark |

## Brand
- **Palette:** deep navy (`#081422`–`#0b1b2b`) + calm-water teal accent (`#79b0a8`), rare gold mark (`#c9a86a`). Defined as CSS variables in `assets/styles.css`.
- **Type:** Fraunces (display serif) + Inter (body), loaded from Google Fonts.
- **Voice:** ocean/tidebreak metaphor + "absorb the risk, capture the growth" volatility framing, with Life Sciences policy catalysts as the stated focus.

## Before launch — things to replace
- **Team bios & headshots** (`team.html`) — placeholders marked in-line.
- **Track record / catalyst calls** (`insights.html`) — needs 2–3 real, dated, public-record examples. Highest-value open item.
- **Contact form** (`contact.html`) — currently a front-end demo that shows a success state but sends nothing. Wire it to email or a CRM. Easiest no-backend option: create a form endpoint at [Formspree](https://formspree.io) or [Basin](https://usebasin.com) and set the `<form>` `action`/`method`, or use Netlify Forms if you move hosting there.
- **Email addresses** — `ir@` / `info@tidebreak-cap.com` are assumed from the firm domain; confirm they exist.
- **Compliance / entity details** (`firm.html`) — confirm entity names, registrations, and disclosures with counsel.

## Local preview
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)
Pushed to `main`; Pages serves from the root of `main`. Live at the repository's Pages URL.
A custom domain (e.g. `tidebreak-cap.com`) can be added in **Settings → Pages → Custom domain**.
