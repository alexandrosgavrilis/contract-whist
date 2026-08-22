/* ============================================================
   CONFIG — house rules and wording live here.
   This is the file to edit if your table plays it differently.
   ============================================================ */

const CONFIG = {

  /* --- The round ladder ------------------------------------
     Hands run  max→1  then  1→max.
     Suits cycle in this order; the cycle RESTARTS after every
     special round, which is what your paper scorecard does.   */
  suitCycle: ['hearts', 'clubs', 'diamonds', 'spades'],

  /* Hand sizes that are played as special rounds instead of a suit. */
  specialRounds: {
    6: 'notrumps',
    5: 'misere',
  },

  /* Biggest hand, given the number of players.
     52 cards must go round evenly, and the sheet caps at 10.   */
  defaultMaxCards(players) {
    return Math.min(10, Math.floor(52 / players));
  },

  /* --- Scoring ---------------------------------------------- */
  exactCallBonus: 10,   // hitting your call exactly
  misereBonus:    10,   // taking zero tricks in Misère
  misereTrickCost: 1,   // points lost per trick taken in Misère

  /* Does everyone still call a number in Misère?
     false = no calling phase, everyone is trying for zero.      */
  misereHasCalls: false,

  /* Dealer may not make the calls add up to the hand size
     ("screw the dealer"). Off by default.                       */
  forbidExactTotalCall: false,

  /* --- Tie-break -------------------------------------------- */
  /* Two cards face down, closest guess to their combined value.
     J=11 Q=12 K=13 A=14.                                        */
  tiebreak: {
    minGuess: 4,    // 2 + 2
    maxGuess: 28,   // 14 + 14
    /* If two players are equally close, the HIGHER guess wins.
       Set to false to redraw instead.                           */
    higherGuessWinsTies: true,
  },

  /* --- Table limits ----------------------------------------- */
  minPlayers: 2,
  maxPlayers: 8,

  storageKey: 'contract-whist-v1',

  /* --- Wording ---------------------------------------------- */
  labels: {
    hearts: 'Hearts',
    clubs: 'Clubs',
    diamonds: 'Diamonds',
    spades: 'Spades',
    notrumps: 'No Trumps',
    misere: 'Misère',
  },
};
