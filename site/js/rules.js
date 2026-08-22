/* ============================================================
   RULES — the settings panel's model.

   config.js holds the defaults. Anything changed in the Rules
   panel is saved as an override in localStorage and re-applied
   over CONFIG on every load. Editing config.js still works and
   still sets the defaults; overrides simply win.
   ============================================================ */

const Rules = (() => {
  const KEY = 'contract-whist-rules-v1';

  /* Rewrites CONFIG.specialRounds so exactly one hand size maps to `type`. */
  function setSpecial(type, size) {
    Object.keys(CONFIG.specialRounds).forEach((k) => {
      if (CONFIG.specialRounds[k] === type) delete CONFIG.specialRounds[k];
    });
    if (size > 0) CONFIG.specialRounds[size] = type;
  }

  function specialSize(type) {
    const hit = Object.keys(CONFIG.specialRounds)
      .find((k) => CONFIG.specialRounds[k] === type);
    return hit ? Number(hit) : 0;
  }

  const FIELDS = [
    {
      id: 'exactCallBonus',
      label: 'Bonus for making your call exactly',
      note: 'On top of one point per trick.',
      type: 'number', min: 0, max: 50,
      get: () => CONFIG.exactCallBonus,
      set: (v) => { CONFIG.exactCallBonus = v; },
    },
    {
      id: 'misereBonus',
      label: 'Misère: bonus for taking no tricks',
      type: 'number', min: 0, max: 50,
      get: () => CONFIG.misereBonus,
      set: (v) => { CONFIG.misereBonus = v; },
    },
    {
      id: 'misereTrickCost',
      label: 'Misère: points lost per trick taken',
      type: 'number', min: 0, max: 20,
      get: () => CONFIG.misereTrickCost,
      set: (v) => { CONFIG.misereTrickCost = v; },
    },
    {
      id: 'misereHasCalls',
      label: 'Players still call a number in Misère',
      note: 'Off means the hand goes straight to trick entry.',
      type: 'toggle',
      get: () => CONFIG.misereHasCalls,
      set: (v) => { CONFIG.misereHasCalls = v; },
    },
    {
      id: 'forbidExactTotalCall',
      label: 'Screw the dealer',
      note: 'The dealer may not make the calls add up to the hand size.',
      type: 'toggle',
      get: () => CONFIG.forbidExactTotalCall,
      set: (v) => { CONFIG.forbidExactTotalCall = v; },
    },
    {
      id: 'higherGuessWinsTies',
      label: 'Tie-break: higher call wins when equally close',
      note: 'Off means an equally close pair draws again instead.',
      type: 'toggle',
      get: () => CONFIG.tiebreak.higherGuessWinsTies,
      set: (v) => { CONFIG.tiebreak.higherGuessWinsTies = v; },
    },
    {
      id: 'notrumpsHand',
      label: 'Hand size played as No Trumps',
      note: '0 for never.',
      type: 'number', min: 0, max: 13,
      get: () => specialSize('notrumps'),
      set: (v) => setSpecial('notrumps', v),
    },
    {
      id: 'misereHand',
      label: 'Hand size played as Misère',
      note: '0 for never.',
      type: 'number', min: 0, max: 13,
      get: () => specialSize('misere'),
      set: (v) => setSpecial('misere', v),
    },
  ];

  /* Snapshot the pristine values from config.js before anything is applied. */
  const DEFAULTS = {};
  FIELDS.forEach((f) => { DEFAULTS[f.id] = f.get(); });

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function write(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode */ }
  }

  /* Push saved overrides onto CONFIG. Called once at boot. */
  function apply() {
    const saved = read();
    FIELDS.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(saved, f.id)) f.set(saved[f.id]);
    });
  }

  /* Returns null on success, or a message explaining why it was rejected. */
  function change(id, value) {
    const field = FIELDS.find((f) => f.id === id);
    if (!field) return 'Unknown setting.';

    if (field.type === 'number') {
      value = Number(value);
      if (!Number.isFinite(value)) return 'That needs to be a number.';
      value = Math.max(field.min, Math.min(field.max, Math.round(value)));
    } else {
      value = Boolean(value);
    }

    /* Two specials cannot share a hand size. */
    if (id === 'notrumpsHand' && value > 0 && value === specialSize('misere')) {
      return 'That hand size is already Misère.';
    }
    if (id === 'misereHand' && value > 0 && value === specialSize('notrumps')) {
      return 'That hand size is already No Trumps.';
    }

    field.set(value);
    const saved = read();
    saved[id] = value;
    write(saved);
    return null;
  }

  function restoreDefaults() {
    FIELDS.forEach((f) => f.set(DEFAULTS[f.id]));
    write({});
  }

  function isModified() {
    return FIELDS.some((f) => f.get() !== DEFAULTS[f.id]);
  }

  return { FIELDS, DEFAULTS, apply, change, restoreDefaults, isModified };
})();
