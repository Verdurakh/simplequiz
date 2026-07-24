# Simplequiz

A pub quiz answer slip. The host reads questions aloud; each player keeps their own
slip on their own phone, then corrects it and gets a score. Deployed as static files
on Vercel.

## Hard constraints

These are the point of the project, not incidental choices:

- **No backend, no database, no network calls.** All state lives in `localStorage`
  on the device that typed it. The only external request is the Google Fonts
  stylesheet.
- **No sign up, no accounts, no sharing between devices.** Players do not see each
  other's slips.
- **No build step and no dependencies.** Three static files served as-is. Do not
  introduce a bundler, a framework, or npm packages — Vercel deploys the folder
  directly with an empty build command.
- **Mobile first.** A player is standing in a pub holding a beer. Tap targets are
  at least 44px, the primary controls sit in the bottom third, and answering a
  1/X/2 question must never open the keyboard.

## Layout

| File | Contains |
| --- | --- |
| `index.html` | Static markup: masthead, slip container, compose card, review sheet |
| `styles.css` | All styling, custom properties at `:root` |
| `app.js` | State, persistence, rendering, scoring — one IIFE, no modules |

Rows in the slip and the review sheet are built by the same `buildRow()` function,
parameterised by `{ interactive, judging }`. Change it once, both views follow.

## State

```js
{ version: 1, name: string, entries: Entry[] }
// Entry: { id, label, type: "text"|"pick", answer, note, mark: "right"|"wrong"|null }
```

A row commits when it has an answer **or** a note. That is deliberate: a player who
is unsure parks a thought, the row saves with an empty answer and renders as
`No answer` in italic, and the incomplete row is its own reminder to come back. Do
not "fix" this by requiring an answer.

Persisted to `localStorage` under `simplequiz.v1` after every change. If the shape
of `Entry` changes incompatibly, bump the key and migrate — a returning player must
not lose a slip mid-quiz. `load()` already tolerates missing or malformed fields via
`normalise()`.

Every storage call is wrapped in try/catch: private browsing throws on
`localStorage` access. When it fails, `storageOk` goes false and the page shows the
banner rather than pretending answers are saved.

## Conventions

- Vanilla ES5-style JS. Types are documented with JSDoc typedefs since there is no
  TypeScript to enforce them.
- Build DOM with `createElement` and `textContent`. Never `innerHTML` — player
  answers are arbitrary text.
- `[hidden] { display: none !important; }` sits near the top of `styles.css`
  deliberately. Component classes set `display`, which otherwise beats the `hidden`
  attribute. Any new component that toggles visibility depends on this rule.
- BEM-ish class names (`.row__label`, `.seg__btn`, `.boxes__b`). State is a separate
  class (`.is-on`, `.is-marked`, `.is-editing`) or an ARIA attribute.
- Toggle buttons carry real `aria-pressed`; the JS reads selection state off the
  attribute rather than tracking it separately.
- Destructive actions confirm in-place by re-labelling the button, and disarm on a
  timer. No `window.confirm`.

## Verifying changes

There are no automated tests. Verify in a real browser before claiming a change
works:

```
python -m http.server 8123 --bind 127.0.0.1 --directory .
```

At minimum, walk the full loop at a phone viewport (390×844): add a free-text
answer, add a 1/X/2 answer, **reload the page** and confirm both survived, edit a
row, correct the slip, check the score, clear it. Reload persistence is the feature
most likely to break silently.

## Deploying

`npx vercel deploy --prod`, or point a Vercel project at the repo using the "Other"
framework preset with an empty build command and output directory `.`.
