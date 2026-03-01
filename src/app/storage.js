/* =============================================================
   BLOCK: Storage-modul
   Hanterar localStorage (autosave) + export/import av JSON.
   ============================================================= */

const STORAGE_PREFIX = 'kitchen3d_'; // prefix för alla nycklar

/* =============================================================
   SUB-BLOCK: Spara till localStorage
   ============================================================= */

/**
 * Spara ett objekt i localStorage under given nyckel.
 * @param {string} key  — nyckelnamn (utan prefix)
 * @param {any} data    — data att spara (serialiseras till JSON)
 */
export function save(key, data) {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const json = JSON.stringify(data);
    localStorage.setItem(fullKey, json);
    console.log(`[Storage] Sparat: ${fullKey}`); // debug
  } catch (err) {
    console.warn('[Storage] Kunde inte spara:', err);
  }
}

/* =============================================================
   SUB-BLOCK: Ladda från localStorage
   ============================================================= */

/**
 * Ladda ett objekt från localStorage.
 * @param {string} key       — nyckelnamn (utan prefix)
 * @param {any} fallback     — returneras om nyckeln inte finns
 * @returns {any}
 */
export function load(key, fallback = null) {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Storage] Kunde inte ladda:', err);
    return fallback;
  }
}

/* =============================================================
   SUB-BLOCK: Export/Import som JSON-sträng
   ============================================================= */

/**
 * Exportera data som JSON-sträng (för copy/paste).
 * @param {any} data
 * @returns {string}
 */
export function exportJSON(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Importera JSON-sträng till objekt.
 * Returnerar null om parsing misslyckas.
 * @param {string} jsonString
 * @returns {any|null}
 */
export function importJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn('[Storage] Ogiltig JSON:', err);
    return null;
  }
}
