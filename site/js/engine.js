/* ============================================================
   ENGINE — pure functions. No DOM in here.
   ============================================================ */

const Engine = (() => {

  /* Build the full round ladder for a given biggest hand.
     maxCards=10 reproduces the printed scorecard exactly:
     10♥ 9♣ 8♦ 7♠ 6NT 5M 4♥ 3♣ 2♦ 1♠ 1♥ 2♣ 3♦ 4♠ 5M 6NT 7♥ 8♣ 9♦ 10♠ */
  function buildLadder(maxCards) {
    const counts = [];
    for (let c = maxCards; c >= 1; c--) counts.push(c);
    for (let c = 1; c <= maxCards; c++) counts.push(c);

    let cycleIndex = 0;
    return counts.map((cards) => {
      const special = CONFIG.specialRounds[cards];
      if (special) {
        cycleIndex = 0;                 // the cycle restarts after a special
        return { cards, type: special };
      }
      const suit = CONFIG.suitCycle[cycleIndex % CONFIG.suitCycle.length];
      cycleIndex++;
      return { cards, type: 'suit', suit };
    });
  }

  /* Dealer rotates clockwise one seat per round. */
  function dealerSeat(state, roundIndex) {
    return (state.startDealer + roundIndex) % state.players.length;
  }

  /* Calling starts with the seat after the dealer and goes clockwise,
     so the dealer always calls last. */
  function callOrder(state, roundIndex) {
    const n = state.players.length;
    const dealer = dealerSeat(state, roundIndex);
    const order = [];
    for (let i = 1; i <= n; i++) order.push((dealer + i) % n);
    return order;
  }

  /* Points for one seat in one round. */
  function scoreSeat(round, seat) {
    const made = round.made[seat];
    if (made === null || made === undefined) return 0;

    if (round.type === 'misere') {
      return made === 0 ? CONFIG.misereBonus : -made * CONFIG.misereTrickCost;
    }
    const called = round.calls[seat];
    const hit = called !== null && called === made;
    return made + (hit ? CONFIG.exactCallBonus : 0);
  }

  /* Running totals after every completed round. */
  function totals(state) {
    const out = state.players.map(() => 0);
    state.rounds.forEach((round) => {
      if (!round.scored) return;
      state.players.forEach((_, seat) => { out[seat] += scoreSeat(round, seat); });
    });
    return out;
  }

  function sum(list) {
    return list.reduce((a, b) => a + (b || 0), 0);
  }

  function allFilled(list) {
    return list.every((v) => v !== null && v !== undefined);
  }

  /* Which seats are tied for the lead at the end. */
  function leaders(state) {
    const t = totals(state);
    const best = Math.max(...t);
    return { best, seats: t.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0) };
  }

  /* Resolve a tie-break draw.
     guesses: { seat: number }  cards: [{rank}, {rank}]
     Returns { winner } or { redraw: true, reason }. */
  function resolveTiebreak(guesses, cards) {
    const actual = cards[0].rank + cards[1].rank;
    const entries = Object.entries(guesses).map(([seat, guess]) => ({
      seat: Number(seat),
      guess: Number(guess),
      distance: Math.abs(Number(guess) - actual),
    }));

    const closest = Math.min(...entries.map((e) => e.distance));
    let inRunning = entries.filter((e) => e.distance === closest);

    if (inRunning.length > 1 && CONFIG.tiebreak.higherGuessWinsTies) {
      const highest = Math.max(...inRunning.map((e) => e.guess));
      inRunning = inRunning.filter((e) => e.guess === highest);
    }

    if (inRunning.length === 1) {
      return { actual, winner: inRunning[0].seat, entries };
    }
    return {
      actual,
      redraw: true,
      reason: 'Identical guesses — draw two more cards.',
      entries,
    };
  }

  return {
    buildLadder, dealerSeat, callOrder,
    scoreSeat, totals, leaders,
    resolveTiebreak, sum, allFilled,
  };
})();
