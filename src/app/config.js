/* =============================================================
   BLOCK: App-konfiguration
   Centrala konstanter för hela appen.
   Byt värden här istället för att leta i koden.
   ============================================================= */

const CONFIG = {

  /* SUB-BLOCK: Rörelse (FPS-walk) */
  movement: {
    walkSpeed: 3.0,             // meter per sekund (normal)
    runSpeed: 8.0,              // meter per sekund (Shift)
    eyeHeight: 1.70,            // kamerahöjd i meter
    mouseSensitivity: 0.002,    // mus-rotationskänslighet
  },

  /* SUB-BLOCK: Grid & snap */
  grid: {
    size: 60,                   // grid-storlek i meter (totalt)
    divisions: 600,             // antal rutor (= 0.1 m per ruta)
    color1: 0x444444,           // huvudlinjer
    color2: 0x222222,           // sublinjer
  },

  /* SUB-BLOCK: Planritning */
  plan: {
    defaultOpacity: 0.7,        // startopacitet för planbilden
    elevationY: 0.01,           // höjd över golv (undviker z-fighting)
    defaultScalePixelsPerMeter: 50, // fallback om ej kalibrerad (gissning)
  },

  /* SUB-BLOCK: Kalibrering */
  calibration: {
    referenceMeters: 6.0,       // Kåpa B långsida = 6 000 mm
    controlMeters: 3.0,         // Kåpa B kortsida = 3 000 mm (kontrollmått)
    storageKey: 'kitchen3d_calibration', // localStorage-nyckel
  },

  /* SUB-BLOCK: Ljus */
  lights: {
    ambientIntensity: 0.6,
    directionalIntensity: 0.8,
    directionalPosition: [10, 20, 10], // [x, y, z]
  },
};

/* Frys objektet så ingen modul råkar mutera det */
Object.freeze(CONFIG);
Object.freeze(CONFIG.movement);
Object.freeze(CONFIG.grid);
Object.freeze(CONFIG.plan);
Object.freeze(CONFIG.calibration);
Object.freeze(CONFIG.lights);

export default CONFIG;
