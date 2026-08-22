# Contract Whist — scorekeeper

Static single-page app. No backend, no build step, no framework.
Game state lives in the browser's localStorage, so a refresh (or a
closed lid) does not lose the scoresheet.

## Run it

**Simplest — no Docker at all:**

    xdg-open site/index.html

Everything works from `file://`, including the card artwork.

**With Docker (so other devices on the LAN can reach it):**

    ./run.sh          # starts nginx on :8088 and opens a tab
    ./stop.sh

`./site` is bind-mounted, so editing a colour or dropping in new
artwork shows up on the next refresh — no rebuild, no restart.

**Desktop shortcut:**

    ./install-shortcut.sh

Adds "Contract Whist" to the application menu. For an icon on the
desktop itself, the script prints the one-line copy command.

## Hosting it on the web

It is fully static, so GitHub Pages works as-is: push the contents of
`site/`, or rename `site/` to `docs/` and point Pages at that folder.
Nothing else changes. Scores are per-browser, so each device keeps its
own scoresheet.

## Playing

- Calls are entered starting to the dealer's left; the dealer calls last.
- The dealer rotates one seat clockwise per hand, automatically.
- Tricks made must add up to the hand size before the hand will score.
- Number keys work as well as the on-screen chips. Backspace steps back
  through entries and into previous hands. Enter advances.
- "Scoresheet" shows the full grid: running total, then called/made.

## Starting over

- **Mid-game:** "New game" in the top-right of any hand. It confirms
  first, then returns to setup with the names kept and the deal moved
  on one seat.
- **Undoing a mistake:** "Back" (or Backspace) reverses one entry at a
  time and keeps going into previous hands, un-scoring as it reverses.
- **After the last hand:** "Reopen last hand" on the final screen puts
  you back into trick entry.
- **Completely clean slate:** run `localStorage.clear()` in the browser
  console and refresh.

## Scoring

| Hand type          | Points                                   |
|--------------------|------------------------------------------|
| Suit / No Trumps   | tricks made, +10 if it matches the call  |
| Misère             | +10 for none, otherwise −1 per trick     |

Ties at the end are settled by cutting two cards face down and calling
their combined value (J 11, Q 12, K 13, A 14). Closest wins; equally
close means the higher call takes it; identical calls force a redraw.

## Changing things

**From the app:** "House rules" on the setup screen, or "Rules" during
any hand. Covers the exact-call bonus, both Misère numbers, whether
Misère has a calling phase, "screw the dealer", tie-break behaviour,
and which hand sizes are No Trumps / Misère. Changes are saved in the
browser and survive a reload. "Restore defaults" undoes the lot.

Two things to know: mid-game, scoring changes recalculate the whole
scoresheet, and changing which hand sizes are special only affects the
next game, not a ladder already in progress.

- `site/js/config.js` — the defaults behind that panel, and what
  "Restore defaults" restores to.
- `site/css/tokens.css` — every colour, typeface and size in the app.
- `site/assets/cards/` — the ace artwork and card back. Replace a file,
  keep the name. Any SVG at roughly 5:7 will drop straight in.

## The round ladder

Generated, not hardcoded. Hands run max→1 then 1→max; suits cycle
♥ ♣ ♦ ♠; hands of 6 are No Trumps and hands of 5 are Misère; the suit
cycle restarts after each special. With 10 cards that reproduces the
printed scorecard exactly:

    10♥ 9♣ 8♦ 7♠ 6NT 5M 4♥ 3♣ 2♦ 1♠ 1♥ 2♣ 3♦ 4♠ 5M 6NT 7♥ 8♣ 9♦ 10♠

The biggest hand caps at floor(52 / players), so six players get a
16-hand ladder and eight players get 12.

## Troubleshooting

**403 from nginx.** Check `docker compose logs whist`.
- `directory index ... is forbidden` — the mount is at the wrong level;
  `docker compose exec whist ls /usr/share/nginx/html` should list
  `index.html`, not a nested folder. Run compose from this directory.
- `Permission denied` — run `chmod -R a+rX site`.
- On Fedora/RHEL, SELinux: change the volume line to
  `./site:/usr/share/nginx/html:ro,z` and restart.
