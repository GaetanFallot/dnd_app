// ════════════════════════════════════════
//  Unit conversion: feet/miles → metres
//  Utilisé par fetch_all.js, translate_fr.js, rebuild_bundles.js
// ════════════════════════════════════════

/**
 * Converts all foot/mile measurements in a string to SI units.
 * Handles both English ("feet", "foot", "ft.") and French ("pieds", "pied")
 * as the same translation sometimes leaves them in English.
 *
 * Convention D&D FR : 1 case = 1,5 m = 5 ft
 *   5 ft  → 1,5 m      10 ft → 3 m     15 ft → 4,5 m
 *   20 ft → 6 m        30 ft → 9 m     60 ft → 18 m
 */
function ft(text) {
  if (!text || typeof text !== 'string') return text;

  // X feet / X foot / X ft. / X ft / X pieds / X pied
  text = text.replace(
    /(\d+(?:\.\d+)?)\s*(?:feet|foot|ft\.?|pieds?)\b/gi,
    (_, n) => {
      const m = parseFloat(n) * 0.3;
      const rounded = Math.round(m * 10) / 10;
      return rounded + ' m';
    }
  );

  // X miles / X mile → X km  (1 mile = ~1.6 km)
  text = text.replace(
    /(\d+(?:\.\d+)?)\s*miles?/gi,
    (_, n) => {
      const km = Math.round(parseFloat(n) * 1.6 * 10) / 10;
      return km + ' km';
    }
  );

  return text;
}

/**
 * Converts a speed object like { walk: "30 ft.", fly: "60 ft." }
 */
function ftSpeed(speed) {
  if (!speed || typeof speed !== 'object') return speed;
  const out = {};
  for (const [k, v] of Object.entries(speed)) {
    out[k] = typeof v === 'string' ? ft(v)
           : typeof v === 'number' ? ft(`${v} ft`)
           : v;
  }
  return out;
}

/**
 * Converts a senses object like { darkvision: "60 ft.", passive_perception: 12 }
 */
function ftSenses(senses) {
  if (!senses || typeof senses !== 'object') return senses;
  const out = {};
  for (const [k, v] of Object.entries(senses)) {
    out[k] = typeof v === 'string' ? ft(v) : v;
  }
  return out;
}

module.exports = { ft, ftSpeed, ftSenses };
