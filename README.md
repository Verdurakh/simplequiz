# Simplequiz

A pub quiz answer slip that lives on the player's phone. The host reads questions
aloud; each player keeps their own slip, then corrects it and gets a score.

No sign up, no backend, no database. Every answer is stored in `localStorage` on
the device that typed it and never leaves the browser.

## How a player uses it

1. Optionally type a name at the top.
2. As each question is read out, the compose card at the bottom is already
   numbered. Type a short reminder of the question (optional), pick the answer
   format — **Free text** or **1 · X · 2** — enter the answer, tap **Save & next**.
3. Repeat until the round ends. Tap any saved row to edit or delete it.
4. Tap **Review** to see the whole slip, then **Correct the slip**. As the host
   reads the answers, tap ✓ or ✗ on each row. The score updates live and reads
   **Final score** once every question is marked.
5. **Copy answers** puts the slip on the clipboard as plain text, for pasting
   into a group chat.

Reloading, locking the phone, or closing the tab does not lose anything.
**Clear the slip** (two taps) wipes it for the next round.

## Running it

It is three static files with no build step:

```
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploying

Vercel serves the folder as-is — no framework, no build command, no config file.

```
npx vercel deploy --prod
```

Or point a Vercel project at the repo and accept the defaults ("Other" framework
preset, empty build command, output directory `.`).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the slip, compose card, and review sheet |
| `styles.css` | All styling |
| `app.js` | State, persistence, rendering, scoring |
