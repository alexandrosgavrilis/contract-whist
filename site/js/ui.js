/* ============================================================
   UI — screens, input flow, persistence.
   ============================================================ */

(() => {
  'use strict';

  Rules.apply();   // saved house rules win over the defaults in config.js

  const $ = (id) => document.getElementById(id);
  const el = (sel) => document.querySelector(sel);

  /* ---------- state ---------- */

  let S = null;               // the live game
  let setup = {               // the setup screen's working copy
    players: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    startDealer: 0,
    maxCards: 10,
  };

  const blankRound = (spec, n) => ({
    cards: spec.cards,
    type: spec.type,
    suit: spec.suit || null,
    calls: Array(n).fill(null),
    made: Array(n).fill(null),
    scored: false,
  });

  function newGame(players, startDealer, maxCards) {
    const ladder = Engine.buildLadder(maxCards);
    return {
      players: players.slice(),
      startDealer,
      maxCards,
      rounds: ladder.map((spec) => blankRound(spec, players.length)),
      roundIndex: 0,
      phase: 'call',
      active: null,
      screen: 'round',
      tiebreak: null,
    };
  }

  /* ---------- persistence ---------- */

  function save() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(S)); } catch (e) { /* private mode */ }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)); } catch (e) { return null; }
  }
  function wipe() {
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) { /* ignore */ }
  }

  /* ---------- helpers ---------- */

  const round = () => S.rounds[S.roundIndex];
  const order = () => Engine.callOrder(S, S.roundIndex);
  const dealer = () => Engine.dealerSeat(S, S.roundIndex);

  function activeList() {
    return S.phase === 'call' ? round().calls : round().made;
  }

  function firstGap(list) {
    const seq = order();
    for (const seat of seq) if (list[seat] === null) return seat;
    return null;
  }

  function lastFilled(list) {
    const seq = order();
    for (let i = seq.length - 1; i >= 0; i--) if (list[seq[i]] !== null) return seq[i];
    return null;
  }

  function roundIsMisereNoCalls(r) {
    return r.type === 'misere' && !CONFIG.misereHasCalls;
  }
  /* The seat leading the first trick, or null if it isn't settled yet. */
  function leadSeatNow() {
    const r = round();
    if (S.phase !== 'play' && S.phase !== 'made') return null;
    if (!roundIsMisereNoCalls(r) && !Engine.allFilled(r.calls)) return null;
    return Engine.leadSeat(S, S.roundIndex);
  }
  function trumpLabel(r) {
    if (r.type === 'suit') return CONFIG.labels[r.suit];
    return CONFIG.labels[r.type];
  }

  /* ============================================================
     SCREENS
     ============================================================ */

  function show(name) {
    ['setup', 'round', 'final', 'tiebreak'].forEach((s) => {
      $('screen-' + s).hidden = (s !== name);
    });
  }

  function render() {
    if (!S) { show('setup'); renderSetup(); return; }
    show(S.screen);
    if (S.screen === 'round') renderRound();
    if (S.screen === 'final') renderFinal();
    if (S.screen === 'tiebreak') renderTiebreak();
    save();
  }

  /* ------------------------------------------------------------
     SETUP
     ------------------------------------------------------------ */

  function clampSetup() {
    const cap = CONFIG.defaultMaxCards(setup.players.length);
    if (setup.maxCards > cap) setup.maxCards = cap;
    if (setup.maxCards < 1) setup.maxCards = 1;
    if (setup.startDealer >= setup.players.length) setup.startDealer = 0;
  }

  function renderSetup() {
    clampSetup();
    $('players-count').textContent = setup.players.length;
    $('cards-count').textContent = setup.maxCards;

    const cap = CONFIG.defaultMaxCards(setup.players.length);
    $('cards-hint').textContent =
      `${setup.players.length} players · up to ${cap} cards each from a 52-card deck · ` +
      `${Engine.buildLadder(setup.maxCards).length} hands`;

    const list = $('name-list');
    list.innerHTML = '';
    setup.players.forEach((name, i) => {
      const li = document.createElement('li');
      li.className = 'name-row';
      li.innerHTML = `
        <button type="button" class="dealer-pick" data-seat="${i}"
                aria-pressed="${i === setup.startDealer}"
                title="Deal first">${i === setup.startDealer ? 'D' : i + 1}</button>
        <input type="text" value="${escapeHtml(name)}" data-seat="${i}"
               maxlength="14" aria-label="Player ${i + 1} name" autocomplete="off">`;
      list.appendChild(li);
    });

    const preview = $('ladder-preview');
    preview.innerHTML = Engine.buildLadder(setup.maxCards).map((r) => {
      const special = r.type !== 'suit';
      const label = special
        ? (r.type === 'misere' ? 'M' : 'NT')
        : { hearts: '♥', clubs: '♣', diamonds: '♦', spades: '♠' }[r.suit];
      return `<span class="${special ? 'is-special' : ''}">${r.cards}${label}</span>`;
    }).join('');

    $('resume-game').hidden = !load();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ------------------------------------------------------------
     ROUND
     ------------------------------------------------------------ */

  function renderRound() {
    const r = round();
    const n = S.players.length;
    const seq = order();
    const tot = Engine.totals(S);

    /* rail */
    $('rail-round').textContent = `${S.roundIndex + 1} / ${S.rounds.length}`;
    $('rail-dealer').textContent = S.players[dealer()];
    $('ladder').innerHTML = S.rounds.map((_, i) =>
      `<i class="${i < S.roundIndex ? 'is-done' : ''}${i === S.roundIndex ? ' is-now' : ''}"></i>`).join('');

    /* hero */
    const hero = $('hero-card');
    if (r.type === 'suit') {
      hero.innerHTML = `<img src="assets/cards/ace-${r.suit}.svg" alt="Ace of ${r.suit} — trumps">`;
    } else if (r.type === 'misere') {
      hero.innerHTML = `<p class="legend">Misère<small>Take no tricks</small></p>`;
    } else {
      hero.innerHTML = `<p class="legend">No<br>Trumps<small>Highest card wins</small></p>`;
    }
    $('hero-meta').innerHTML = r.type === 'suit'
      ? `<b>${r.cards}</b> card${r.cards > 1 ? 's' : ''} each · <b>${trumpLabel(r)}</b> are trumps`
      : `<b>${r.cards}</b> card${r.cards > 1 ? 's' : ''} each`;

    /* seats */
    const madeAllIn = Engine.allFilled(r.made);
    const leader = leadSeatNow();
    const body = $('seats-body');
    body.innerHTML = '';
    seq.forEach((seat) => {
      const call = r.calls[seat];
      const made = r.made[seat];
      const isActive = seat === S.active && (S.phase === 'call' || S.phase === 'made');
      const delta = madeAllIn ? Engine.scoreSeat(r, seat) : null;

      const tr = document.createElement('tr');
      tr.className = 'seat' + (isActive ? ' is-active' : '') +
        (S.phase === 'call' || S.phase === 'made' ? ' is-clickable' : '');
      tr.dataset.seat = seat;

      const callCell = roundIsMisereNoCalls(r)
        ? '<span class="cell-empty">—</span>'
        : (call === null ? '<span class="cell-empty">·</span>' : call);

      const madeClass = (made !== null && !roundIsMisereNoCalls(r) && made === call) ? 'hit' : '';

      tr.innerHTML = `
        <td class="cell-name">${escapeHtml(S.players[seat])}${seat === dealer() ? '<span class="dealer-mark">D</span>' : ''}${seat === leader ? '<span class="lead-mark">Leads</span>' : ''}</td>
        <td class="cell-call">${callCell}</td>
        <td class="cell-made ${madeClass}">${made === null ? '<span class="cell-empty">·</span>' : made}</td>
        <td class="cell-score">${tot[seat]}${delta === null ? '' :
          `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}</span>`}</td>`;
      body.appendChild(tr);
    });

    renderPrompt();
  }

  function renderPrompt() {
    const r = round();
    const text = $('prompt-text');
    const pad = $('keypad');
    const next = $('btn-next');

    if (S.phase === 'call') {
      const called = Engine.sum(r.calls.filter((v) => v !== null));
      const remaining = r.calls.filter((v) => v === null).length;
      text.innerHTML = S.active === null
        ? `All calls are in<span class="tally">${called} called for ${r.cards} tricks</span>`
        : `<b>${escapeHtml(S.players[S.active])}</b> calls` +
          `<span class="tally">${called} called so far · ${remaining} still to call</span>`;
      renderKeypad(pad, r.cards, r.calls[S.active]);
      next.textContent = 'Calls are in';
      next.disabled = !Engine.allFilled(r.calls);

    } else if (S.phase === 'play') {
      const called = Engine.sum(r.calls.filter((v) => v !== null));
      const gap = called - r.cards;
      const state = gap === 0 ? 'is-exact' : (gap > 0 ? 'is-over' : '');
      text.innerHTML = roundIsMisereNoCalls(r)
        ? `Play the hand<span class="tally">Nobody wants a trick</span>`
        : `Play the hand` +
          `<span class="tally ${state}">${called} called · ${r.cards} tricks · ` +
          `${gap === 0 ? 'dead even' : (gap > 0 ? `${gap} over` : `${-gap} under`)}</span>`;
      pad.hidden = true;
      next.textContent = 'Enter tricks made';
      next.disabled = false;

    } else { /* made */
      const done = Engine.sum(r.made.filter((v) => v !== null));
      const left = r.cards - done;
      const complete = Engine.allFilled(r.made);
      const balanced = done === r.cards;
      const state = complete ? (balanced ? 'is-exact' : 'is-over') : '';
      text.innerHTML = (S.active === null
        ? `Tricks are in`
        : `<b>${escapeHtml(S.players[S.active])}</b> made`) +
        `<span class="tally ${state}">${complete && !balanced
          ? `${done} tricks entered — the hand had ${r.cards}`
          : `${done} of ${r.cards} tricks accounted for${left > 0 ? ` · ${left} left` : ''}`}</span>`;
      renderKeypad(pad, r.cards, r.made[S.active]);
      next.textContent = 'Score the hand';
      next.disabled = !(complete && balanced);
    }

    $('btn-back').disabled = false;
  }

  function renderKeypad(pad, maxValue, current) {
    if (S.active === null) { pad.hidden = true; return; }
    pad.hidden = false;
    pad.innerHTML = '';
    const r = round();
    const isDealerCalling = S.phase === 'call' && S.active === dealer();
    const others = Engine.sum(r.calls.filter((v, i) => v !== null && i !== S.active));

    for (let v = 0; v <= maxValue; v++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = v;
      b.dataset.value = v;
      b.setAttribute('aria-pressed', String(current === v));
      if (CONFIG.forbidExactTotalCall && isDealerCalling && others + v === r.cards) {
        b.disabled = true;
        b.title = 'The calls may not add up to the number of tricks';
      }
      pad.appendChild(b);
    }
  }

  /* ---------- entering a number ---------- */

  function enterValue(v) {
    if (!S || S.screen !== 'round' || S.active === null) return;
    const r = round();
    if (v < 0 || v > r.cards) return;

    const list = activeList();
    list[S.active] = v;
    const gap = firstGap(list);
    S.active = gap;
    render();
  }

  function stepBack() {
    const r = round();

    if (S.phase === 'made') {
      const last = lastFilled(r.made);
      if (last !== null) { r.made[last] = null; S.active = last; render(); return; }
      S.phase = roundIsMisereNoCalls(r) ? 'call' : 'play';
      if (S.phase === 'call') { previousRound(); return; }
      S.active = null; render(); return;
    }

    if (S.phase === 'play') {
      if (roundIsMisereNoCalls(r)) { previousRound(); return; }
      S.phase = 'call';
      S.active = lastFilled(r.calls);
      if (S.active !== null) r.calls[S.active] = null;
      render(); return;
    }

    /* call phase */
    const last = lastFilled(r.calls);
    if (last !== null) { r.calls[last] = null; S.active = last; render(); return; }
    previousRound();
  }

  function previousRound() {
    if (S.roundIndex === 0) {
      if (confirm('Go back to the table setup? The current game will be cleared.')) {
        wipe(); S = null; render();
      }
      return;
    }
    S.roundIndex -= 1;
    const r = round();
    r.scored = false;
    S.phase = 'made';
    S.active = lastFilled(r.made);
    if (S.active !== null) r.made[S.active] = null;
    render();
  }

  function advance() {
    const r = round();

    if (S.phase === 'call') {
      S.phase = 'play';
      S.active = null;
      render(); return;
    }

    if (S.phase === 'play') {
      S.phase = 'made';
      S.active = firstGap(r.made);
      render(); return;
    }

    /* made -> score it */
    r.scored = true;
    if (S.roundIndex + 1 >= S.rounds.length) {
      S.screen = 'final';
      render(); return;
    }
    S.roundIndex += 1;
    startRound();
  }

  function startRound() {
    const r = round();
    if (roundIsMisereNoCalls(r)) {
      S.phase = 'play';
      S.active = null;
    } else {
      S.phase = 'call';
      S.active = firstGap(r.calls);
    }
    render();
  }

  /* ------------------------------------------------------------
     FINAL
     ------------------------------------------------------------ */

  function listNames(seats) {
    const n = seats.map((s) => escapeHtml(S.players[s]));
    if (n.length <= 1) return n[0] || '';
    return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  }

  function renderFinal() {
    const tot = Engine.totals(S);
    const { best, seats } = Engine.leaders(S);

    const ranked = S.players
      .map((name, seat) => ({ name, seat, pts: tot[seat] }))
      .sort((a, b) => b.pts - a.pts);

    $('podium').innerHTML = ranked.map((p, i) => `
      <li class="${p.pts === best ? 'is-winner' : ''}">
        <span class="rank">${i + 1}</span>
        <span class="who">${escapeHtml(p.name)}</span>
        <span class="pts">${p.pts}</span>
      </li>`).join('');

    const tied = seats.length > 1;
    const names = listNames(seats);
    const decided = S.tiebreak && S.tiebreak.winner !== null && S.tiebreak.winner !== undefined;

    if (decided) {
      $('verdict').innerHTML =
        `<b>${escapeHtml(S.players[S.tiebreak.winner])}</b> wins the cut, and the game.`;
    } else if (tied) {
      $('verdict').innerHTML =
        `${names} tie on <b>${best}</b>. Cut for it.`;
    } else {
      $('verdict').innerHTML = `<b>${escapeHtml(S.players[seats[0]])}</b> wins with ${best}.`;
    }

    $('btn-tiebreak').hidden = !tied || decided;
  }

  /* ------------------------------------------------------------
     TIE-BREAK
     ------------------------------------------------------------ */

  function beginTiebreak() {
    const { seats } = Engine.leaders(S);
    S.tiebreak = {
      seats,
      guesses: {},
      active: seats[0],
      cards: null,
      result: null,
      winner: null,
    };
    S.screen = 'tiebreak';
    render();
  }

  function renderTiebreak() {
    const tb = S.tiebreak;
    const prompt = $('tb-prompt');
    const pad = $('tb-keypad');
    const action = $('tb-action');

    /* cards */
    $('tb-cards').innerHTML = tb.cards
      ? tb.cards.map((c) => `<div class="tb-card is-flipping">${Cards.faceSVG(c)}</div>`).join('')
      : `<div class="tb-card"><img src="assets/cards/back.svg" alt="Face-down card"></div>
         <div class="tb-card"><img src="assets/cards/back.svg" alt="Face-down card"></div>`;

    /* guesses so far */
    $('tb-guesses').innerHTML = tb.seats.map((seat) => {
      const g = tb.guesses[seat];
      const won = tb.winner === seat;
      return `<li class="${won ? 'is-winner' : ''}">${escapeHtml(S.players[seat])}<b>${g === undefined ? '·' : g}</b></li>`;
    }).join('');

    $('tb-back').hidden = false;

    if (tb.active !== null && tb.active !== undefined) {
      prompt.innerHTML = `<b>${escapeHtml(S.players[tb.active])}</b> calls the two cards' total` +
        `<span class="tally">J 11 · Q 12 · K 13 · A 14</span>`;
      pad.hidden = false;
      pad.innerHTML = '';
      for (let v = CONFIG.tiebreak.minGuess; v <= CONFIG.tiebreak.maxGuess; v++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = v;
        b.dataset.value = v;
        const taken = Object.entries(tb.guesses).some(([s, g]) => Number(s) !== tb.active && g === v);
        if (taken) { b.disabled = true; b.title = 'Already called'; }
        pad.appendChild(b);
      }
      action.textContent = 'Turn the cards';
      action.disabled = true;
      $('tb-verdict').textContent = '';
      return;
    }

    pad.hidden = true;

    if (!tb.cards) {
      prompt.innerHTML = `All calls are in<span class="tally">Turn them over</span>`;
      action.textContent = 'Turn the cards';
      action.disabled = false;
      $('tb-verdict').textContent = '';
      return;
    }

    const res = tb.result;
    $('tb-back').hidden = !res.redraw;
    prompt.innerHTML = `The cards total <b>${res.actual}</b>`;
    $('tb-verdict').innerHTML = res.redraw
      ? res.reason
      : `<b>${escapeHtml(S.players[res.winner])}</b> takes it.`;
    action.textContent = res.redraw ? 'Draw again' : 'Back to scores';
    action.disabled = false;
  }

  function tiebreakGuess(v) {
    const tb = S.tiebreak;
    tb.guesses[tb.active] = v;
    const next = tb.seats.find((s) => tb.guesses[s] === undefined);
    tb.active = next === undefined ? null : next;
    render();
  }

  function tiebreakAction() {
    const tb = S.tiebreak;

    if (!tb.cards) {
      tb.cards = Cards.draw(2);
      tb.result = Engine.resolveTiebreak(tb.guesses, tb.cards);
      tb.winner = tb.result.redraw ? null : tb.result.winner;
      render(); return;
    }

    if (tb.result.redraw) {
      tb.guesses = {};
      tb.active = tb.seats[0];
      tb.cards = null;
      tb.result = null;
      render(); return;
    }

    S.screen = 'final';
    render();
  }

  /* ------------------------------------------------------------
     HOUSE RULES
     ------------------------------------------------------------ */

  function renderRules(message) {
    const list = $('rules-list');
    list.innerHTML = Rules.FIELDS.map((f) => {
      const v = f.get();
      const control = f.type === 'toggle'
        ? `<button type="button" class="rule-toggle" data-id="${f.id}"
                   aria-pressed="${v}">${v ? 'On' : 'Off'}</button>`
        : `<input type="number" class="rule-number" data-id="${f.id}"
                  value="${v}" min="${f.min}" max="${f.max}" inputmode="numeric">`;
      return `<li>
        <div class="rule-text">
          <span class="rule-label">${f.label}</span>
          ${f.note ? `<span class="rule-note">${f.note}</span>` : ''}
        </div>
        ${control}
      </li>`;
    }).join('');

    const warn = $('rules-warning');
    const midGame = S && S.screen !== 'setup';
    if (message) {
      warn.hidden = false;
      warn.className = 'rules-warning is-error';
      warn.textContent = message;
    } else if (midGame) {
      warn.hidden = false;
      warn.className = 'rules-warning';
      warn.textContent = 'A game is in progress. Scoring changes recalculate the whole '
        + 'scoresheet, and which hands are Misère or No Trumps only affects the next game.';
    } else {
      warn.hidden = true;
    }

    $('restore-rules').disabled = !Rules.isModified();
    $('rules-overlay').hidden = false;
  }

  function openRules() { renderRules(null); }

  function closeRules() {
    $('rules-overlay').hidden = true;
    render();                     // pick up any scoring change immediately
    if (!S) renderSetup();        // ladder preview may have changed
  }

  $('open-rules').onclick = openRules;
  $('open-rules-setup').onclick = openRules;
  $('close-rules').onclick = closeRules;
  $('done-rules').onclick = closeRules;
  $('rules-overlay').addEventListener('click', (e) => {
    if (e.target === $('rules-overlay')) closeRules();
  });

  $('restore-rules').onclick = () => {
    if (!confirm('Put every house rule back to its default?')) return;
    Rules.restoreDefaults();
    renderRules(null);
  };

  $('rules-list').addEventListener('click', (e) => {
    const t = e.target.closest('.rule-toggle');
    if (!t) return;
    const now = t.getAttribute('aria-pressed') === 'true';
    renderRules(Rules.change(t.dataset.id, !now));
  });

  $('rules-list').addEventListener('change', (e) => {
    const n = e.target.closest('.rule-number');
    if (!n) return;
    renderRules(Rules.change(n.dataset.id, n.value));
  });

  /* ------------------------------------------------------------
     SCORESHEET
     ------------------------------------------------------------ */

  function renderSheet() {
    const running = S.players.map(() => 0);
    const rows = S.rounds.map((r, i) => {
      const cells = S.players.map((_, seat) => {
        if (!r.scored) return '<td class="cell-pair">·</td>';
        running[seat] += Engine.scoreSeat(r, seat);
        const call = roundIsMisereNoCalls(r) ? '—' : (r.calls[seat] === null ? '·' : r.calls[seat]);
        return `<td class="cell-pair"><b>${running[seat]}</b><br>${call}/${r.made[seat] === null ? '·' : r.made[seat]}</td>`;
      }).join('');
      const mark = r.type === 'suit'
        ? { hearts: '♥', clubs: '♣', diamonds: '♦', spades: '♠' }[r.suit]
        : (r.type === 'misere' ? 'Misère' : 'No Trumps');
      return `<tr class="${i === S.roundIndex && S.screen === 'round' ? 'is-now' : ''}">
        <th class="row-head" scope="row">${r.cards} ${mark}</th>
        <th class="row-head">${escapeHtml(S.players[Engine.dealerSeat(S, i)])}</th>
        ${cells}</tr>`;
    }).join('');

    const tot = Engine.totals(S);
    $('sheet').innerHTML = `
      <table class="sheet">
        <thead><tr>
          <th>Hand</th><th>Dealer</th>
          ${S.players.map((p) => `<th>${escapeHtml(p)}</th>`).join('')}
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total</td>
          ${tot.map((t) => `<td>${t}</td>`).join('')}</tr></tfoot>
      </table>
      <p class="hint">Each cell shows the running total, then called / made.</p>`;
    $('overlay').hidden = false;
  }

  /* ============================================================
     EVENTS
     ============================================================ */

  /* --- setup --- */
  $('players-minus').onclick = () => {
    if (setup.players.length > CONFIG.minPlayers) { setup.players.pop(); renderSetup(); }
  };
  $('players-plus').onclick = () => {
    if (setup.players.length < CONFIG.maxPlayers) {
      setup.players.push('Player ' + (setup.players.length + 1));
      setup.maxCards = CONFIG.defaultMaxCards(setup.players.length);
      renderSetup();
    }
  };
  $('cards-minus').onclick = () => { if (setup.maxCards > 1) { setup.maxCards--; renderSetup(); } };
  $('cards-plus').onclick = () => {
    if (setup.maxCards < CONFIG.defaultMaxCards(setup.players.length)) { setup.maxCards++; renderSetup(); }
  };

  $('name-list').addEventListener('input', (e) => {
    const seat = e.target.dataset.seat;
    if (seat !== undefined) setup.players[Number(seat)] = e.target.value;
  });
  $('name-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.dealer-pick');
    if (!btn) return;
    setup.startDealer = Number(btn.dataset.seat);
    renderSetup();
  });

  $('start-game').onclick = () => {
    const names = setup.players.map((n, i) => (n.trim() || `Player ${i + 1}`));
    S = newGame(names, setup.startDealer, setup.maxCards);
    startRound();
  };
  $('resume-game').onclick = () => { S = load(); if (S) render(); };

  /* --- round --- */
  $('keypad').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b && !b.disabled) enterValue(Number(b.dataset.value));
  });
  $('seats-body').addEventListener('click', (e) => {
    const tr = e.target.closest('tr.seat');
    if (!tr || (S.phase !== 'call' && S.phase !== 'made')) return;
    S.active = Number(tr.dataset.seat);
    render();
  });
  $('btn-next').onclick = advance;
  $('btn-back').onclick = stepBack;

  /* --- overlay --- */
  $('open-sheet').onclick = renderSheet;
  $('btn-sheet-final').onclick = renderSheet;
  $('close-sheet').onclick = () => { $('overlay').hidden = true; };
  $('print-sheet').onclick = () => window.print();
  $('overlay').addEventListener('click', (e) => {
    if (e.target === $('overlay')) $('overlay').hidden = true;
  });

  /* --- final --- */
  $('btn-tiebreak').onclick = beginTiebreak;
  $('btn-edit-last').onclick = () => {
    S.screen = 'round';
    S.tiebreak = null;
    const r = round();
    r.scored = false;
    S.phase = 'made';
    S.active = null;
    render();
  };
  function resetToSetup(message) {
    if (!confirm(message)) return;
    /* keep the table as it was, but pass the deal on one seat */
    setup.players = S.players.slice();
    setup.startDealer = (S.startDealer + 1) % S.players.length;
    setup.maxCards = S.maxCards;
    wipe();
    S = null;
    render();
  }

  $('btn-new-game').onclick = () =>
    resetToSetup('Start a new game? This scoresheet will be cleared.');

  $('abandon-game').onclick = () =>
    resetToSetup('Abandon this game and start over? '
      + 'The scores so far will be cleared and cannot be recovered.');

  /* --- tie-break --- */
  $('tb-keypad').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b && !b.disabled) tiebreakGuess(Number(b.dataset.value));
  });
  $('tb-action').onclick = tiebreakAction;
  $('tb-back').onclick = () => { S.screen = 'final'; render(); };

  /* --- keyboard: digits enter numbers, Backspace undoes --- */
  let digitBuffer = null;
  let digitTimer = null;

  function commitDigits() {
    if (digitBuffer === null) return;
    const v = Number(digitBuffer);
    digitBuffer = null;
    if (S.screen === 'round') enterValue(v);
    else if (S.screen === 'tiebreak' && S.tiebreak.active !== null) {
      if (v >= CONFIG.tiebreak.minGuess && v <= CONFIG.tiebreak.maxGuess) tiebreakGuess(v);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (!S || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.matches('input, textarea')) return;
    if (!$('overlay').hidden) {
      if (e.key === 'Escape') $('overlay').hidden = true;
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      clearTimeout(digitTimer);
      digitBuffer = digitBuffer === null ? e.key : digitBuffer + e.key;
      /* a leading 1 or 2 might be the start of a two-digit number */
      const couldGrow = Number(digitBuffer) <= 2 && digitBuffer.length === 1;
      if (couldGrow) digitTimer = setTimeout(commitDigits, 420);
      else commitDigits();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (S.screen === 'round') stepBack();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (S.screen === 'round' && !$('btn-next').disabled) advance();
      else if (S.screen === 'tiebreak' && !$('tb-action').disabled) tiebreakAction();
    }
  });

  /* ---------- boot ---------- */
  const saved = load();
  if (saved && saved.players) {
    S = saved;
    render();
  } else {
    render();
  }
})();
