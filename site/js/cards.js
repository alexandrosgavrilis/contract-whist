/* ============================================================
   CARDS — deck and the face renderer used by the tie-break.
   The trump ACE shown each round is NOT drawn here; it is loaded
   straight from assets/cards/ace-<suit>.svg so you can swap the
   artwork by replacing a file.
   ============================================================ */

const Cards = (() => {

  const PIP = {
    hearts:   'M50 90C22 66 8 48 8 32 8 17 19 8 31 8c9 0 16 5 19 12 3-7 10-12 19-12 12 0 23 9 23 24 0 16-14 34-42 58z',
    diamonds: 'M50 5 88 50 50 95 12 50z',
    spades:   'M50 7c28 25 42 43 42 57 0 12-9 20-19 20-9 0-16-5-19-11 2 9 6 16 12 21H34c6-5 10-12 12-21-3 6-10 11-19 11-10 0-19-8-19-20C8 50 22 32 50 7z',
  };
  const CLUB = '<path d="M56 62c0 14 4 26 10 32H34c6-6 10-18 10-32z"/><circle cx="50" cy="28" r="19"/><circle cx="27" cy="58" r="19"/><circle cx="73" cy="58" r="19"/>';

  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RED = { hearts: true, diamonds: true };

  /* Rank 2–14. Face cards use letters, as in the tie-break rules. */
  function rankLabel(rank) {
    return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[rank] || String(rank);
  }

  function pipMarkup(suit) {
    return suit === 'clubs' ? CLUB : `<path d="${PIP[suit]}"/>`;
  }

  /* An inline SVG card face — used only for revealed tie-break cards. */
  function faceSVG(card) {
    const colour = RED[card.suit] ? 'var(--pip-red)' : 'var(--pip-black)';
    const label = rankLabel(card.rank);
    return `
    <svg viewBox="0 0 240 336" class="card-face" role="img"
         aria-label="${label} of ${card.suit}">
      <defs><symbol id="p-${card.suit}" viewBox="0 0 100 100">
        <g fill="${colour}">${pipMarkup(card.suit)}</g>
      </symbol></defs>
      <rect x="1.5" y="1.5" width="237" height="333" rx="16"
            fill="#f6f2e7" stroke="#cfc7b4" stroke-width="3"/>
      <text x="120" y="150" text-anchor="middle" fill="${colour}"
            font-family="var(--font-display)" font-size="112" font-weight="700">${label}</text>
      <use href="#p-${card.suit}" x="88" y="168" width="64" height="64"/>
      <use href="#p-${card.suit}" x="16" y="16" width="30" height="30"/>
      <use href="#p-${card.suit}" x="194" y="290" width="30" height="30"/>
    </svg>`;
  }

  /* Draw n distinct cards from a fresh deck. */
  function draw(n) {
    const deck = [];
    SUITS.forEach((suit) => {
      for (let rank = 2; rank <= 14; rank++) deck.push({ suit, rank });
    });
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
    }
    return out;
  }

  return { faceSVG, draw, rankLabel };
})();
