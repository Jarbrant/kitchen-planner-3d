/* =============================================================
   BLOCK: Plan-overlay
   Laddar planritningen (plan.png) och lägger den som textur
   på ett plan vid golvet. Opacity kan styras via slider.
   Om bildfilen saknas eller är för liten (< 100 bytes) genereras
   en canvas-baserad testritning automatiskt.
   ============================================================= */

import * as THREE from 'three';
import { scene } from './scene.js';
import CONFIG from '../app/config.js';
import * as storage from '../app/storage.js';

/* -----------------------------------------------------------
   SUB-BLOCK: Variabler
   ----------------------------------------------------------- */
let planMesh = null;             // referens till plan-meshen
let planTexture = null;          // referens till texturen
let imageAspect = 1;            // bredd/höjd-förhållande för bilden
let imageWidthPx = 1;           // originalbredd i pixlar
let imageHeightPx = 1;          // originalhöjd i pixlar

/* -----------------------------------------------------------
   SUB-BLOCK: Intern hjälpfunktion — bygg mesh från textur
   Extraherar den gemensamma logiken för att skapa plan-meshen
   så att den kan anropas från både den normala laddnings-
   vägen och canvas-fallback-vägen.
   ----------------------------------------------------------- */
function _buildMeshFromTexture(texture, widthPx, heightPx) {
  planTexture = texture;
  texture.colorSpace = THREE.SRGBColorSpace; // korrekta färger

  /* Spara pixelstorlek för kalibrerings-beräkningar */
  imageWidthPx = widthPx;
  imageHeightPx = heightPx;
  imageAspect = widthPx / heightPx;

  console.log(`[Plan] Texturstorlek: ${imageWidthPx}×${imageHeightPx} px`);

  /* Bestäm storlek i 3D-världen */
  const savedCal = storage.load('calibration', null);
  let metersPerPixel;

  if (savedCal && savedCal.metersPerPixel) {
    /* Använd sparad kalibrering */
    metersPerPixel = savedCal.metersPerPixel;
    console.log(`[Plan] Använder sparad skala: ${metersPerPixel.toFixed(6)} m/px`);
  } else {
    /* Fallback: gissad skala */
    metersPerPixel = 1 / CONFIG.plan.defaultScalePixelsPerMeter;
    console.log(`[Plan] Ingen kalibrering, använder fallback: ${metersPerPixel.toFixed(6)} m/px`);
  }

  /* Beräkna planets mått i meter */
  const widthM = imageWidthPx * metersPerPixel;
  const heightM = imageHeightPx * metersPerPixel;

  /* Skapa geometri + material */
  const geometry = new THREE.PlaneGeometry(widthM, heightM);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: CONFIG.plan.defaultOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,       // undviker z-fighting med golv
  });

  planMesh = new THREE.Mesh(geometry, material);
  planMesh.rotation.x = -Math.PI / 2;       // horisontellt
  planMesh.position.y = CONFIG.plan.elevationY; // strax ovanför golv
  planMesh.name = 'planOverlay';

  scene.add(planMesh);
  console.log(`[Plan] Lagt plan: ${widthM.toFixed(1)} × ${heightM.toFixed(1)} m`);
}

/* -----------------------------------------------------------
   SUB-BLOCK: Generera testritning med HTML Canvas API
   Skapar en 1200×800 canvas med zoner, rutnät och väggar.
   Skalan är 50 px/m (= CONFIG.plan.defaultScalePixelsPerMeter)
   så att kalibrering mot Kåpa B 6000 mm ger rätt resultat.
   Returnerar ett HTMLCanvasElement.
   ----------------------------------------------------------- */
function generateTestPlan() {
  const SCALE = CONFIG.plan.defaultScalePixelsPerMeter; // 50 px per meter
  const W = 1200;
  const H = 800;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  /* --- Bakgrund --- */
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, W, H);

  /* --- Rutnät (1 m per cell) --- */
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += SCALE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += SCALE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  /* --- Zoner: [x, y, bredd_px, höjd_px, fyllning, kant, namn, rad2] ---
     Skala: 50 px = 1 m, dvs bredder/höjder = meter × 50
     Kåpa B placeras så att dess långsida (300 px = 6 m) är horisontell —
     det är referensmåttet för kalibreringen.
  */
  const zones = [
    // Grovdisk 4×3 m
    { x: 100, y: 100, w: 200, h: 150, fill: 'rgba(74,144,217,0.30)', stroke: '#2471a3', label: 'GROVDISK', label2: '4×3 m' },
    // Huvuddisk 5×3 m
    { x: 350, y: 100, w: 250, h: 150, fill: 'rgba(39,174,96,0.30)',  stroke: '#1e8449', label: 'HUVUDDISK', label2: '5×3 m' },
    // Kåpa B 6×3 m — långsida = 300 px = 6 m (kalibrerings-referens)
    { x: 650, y: 100, w: 300, h: 150, fill: 'rgba(241,196,15,0.35)', stroke: '#b7950b', label: 'KÅPA B', label2: '6×3 m', kapaB: true },
    // Kokeri 6×4 m
    { x: 100, y: 310, w: 300, h: 200, fill: 'rgba(231,76,60,0.30)',  stroke: '#c0392b', label: 'KOKERI', label2: '6×4 m' },
    // Pack/Varumottagning 5×4 m
    { x: 450, y: 310, w: 250, h: 200, fill: 'rgba(155,89,182,0.30)', stroke: '#7d3c98', label: 'PACK / VARU-', label2: 'MOTTAGNING  5×4 m' },
  ];

  zones.forEach(z => {
    /* Fyll */
    ctx.fillStyle = z.fill;
    ctx.fillRect(z.x, z.y, z.w, z.h);

    /* Kant */
    ctx.strokeStyle = z.stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x, z.y, z.w, z.h);

    /* Zonnamn (rad 1) */
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerX = z.x + z.w / 2;
    const centerY = z.y + z.h / 2;
    ctx.fillText(z.label, centerX, centerY - 9);

    /* Storlek (rad 2) */
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(z.label2, centerX, centerY + 10);

    /* Kåpa B: tydlig 6000 mm-markering längs långsidan (botten av zonen) */
    if (z.kapaB) {
      const barY = z.y + z.h - 22; // position för dimensionslinjen
      ctx.strokeStyle = '#7d6608';
      ctx.lineWidth = 1.5;
      /* Horisontell linje */
      ctx.beginPath();
      ctx.moveTo(z.x + 8, barY);
      ctx.lineTo(z.x + z.w - 8, barY);
      ctx.stroke();
      /* Vänster pil */
      ctx.beginPath();
      ctx.moveTo(z.x + 8, barY - 5);
      ctx.lineTo(z.x + 8, barY + 5);
      ctx.stroke();
      /* Höger pil */
      ctx.beginPath();
      ctx.moveTo(z.x + z.w - 8, barY - 5);
      ctx.lineTo(z.x + z.w - 8, barY + 5);
      ctx.stroke();
      /* Text */
      ctx.fillStyle = '#7d6608';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('KÅPA B  6000 mm', centerX, barY + 13);
    }
  });

  /* --- Yttre väggar (tjock svart linje) --- */
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 4;
  ctx.strokeRect(50, 60, 960, 510);   // 19.2 m × 10.2 m (grovt)

  /* --- Rubrik längst upp --- */
  ctx.fillStyle = '#cc2200';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TESTRITNING — Byt till riktig plan.png', W / 2, 38);

  console.log('[Plan] Testritning genererad på canvas.');
  return canvas;
}

/* -----------------------------------------------------------
   SUB-BLOCK: Ladda planritning
   Anropas av bootstrap.js vid uppstart.
   Försöker hämta bildfilen via fetch för att kontrollera
   filstorleken. Om filen är < 100 bytes (placeholder) eller
   om laddningen misslyckas, används canvas-testritningen.
   ----------------------------------------------------------- */
export async function loadPlan(planImagePath) {
  /* Kontrollera filstorlek med fetch innan TextureLoader */
  let useCanvas = false;
  let objectURL = null;

  try {
    const response = await fetch(planImagePath);
    if (!response.ok) {
      console.warn(`[Plan] Fetch misslyckades (${response.status}), genererar testritning`);
      useCanvas = true;
    } else {
      const blob = await response.blob();
      if (blob.size < 100) {
        /* Filen är för liten — trolig placeholder */
        console.warn(`[Plan] Bildfil är ${blob.size} byte (< 100), genererar testritning`);
        useCanvas = true;
      } else {
        /* Giltig fil — skapa tillfällig object URL för TextureLoader */
        objectURL = URL.createObjectURL(blob);
      }
    }
  } catch (err) {
    console.warn('[Plan] Kunde inte hämta planritning, genererar testritning:', err);
    useCanvas = true;
  }

  /* Använd canvas-fallback om nödvändigt */
  if (useCanvas) {
    const canvas = generateTestPlan();
    const texture = new THREE.CanvasTexture(canvas);
    _buildMeshFromTexture(texture, canvas.width, canvas.height);
    return;
  }

  /* Ladda giltig bild med TextureLoader */
  const loader = new THREE.TextureLoader();
  loader.load(
    objectURL,

    /* onLoad-callback */
    (texture) => {
      URL.revokeObjectURL(objectURL); // frigör minnet
      _buildMeshFromTexture(texture, texture.image.width, texture.image.height);
    },

    /* onProgress-callback */
    undefined,

    /* onError-callback */
    (err) => {
      if (objectURL) URL.revokeObjectURL(objectURL); // frigör minnet (defensiv null-check)
      console.warn('[Plan] TextureLoader fel, genererar testritning:', err);
      const canvas = generateTestPlan();
      const texture = new THREE.CanvasTexture(canvas);
      _buildMeshFromTexture(texture, canvas.width, canvas.height);
    }
  );
}

/* -----------------------------------------------------------
   SUB-BLOCK: Ändra opacity
   Kopplas till opacity-slidern i UI.
   ----------------------------------------------------------- */
export function setOpacity(value) {
  if (planMesh) {
    planMesh.material.opacity = value;
  }
}

/* -----------------------------------------------------------
   SUB-BLOCK: Uppdatera skala efter kalibrering
   Tar bort gammal mesh och skapar ny med rätt mått.
   ----------------------------------------------------------- */
export function updateScale(metersPerPixel) {
  if (!planTexture || !planMesh) return;

  /* Beräkna nya mått */
  const widthM = imageWidthPx * metersPerPixel;
  const heightM = imageHeightPx * metersPerPixel;

  /* Ta bort gammal mesh */
  scene.remove(planMesh);
  planMesh.geometry.dispose();
  planMesh.material.dispose();

  /* Skapa ny geometri med rätt mått */
  const geometry = new THREE.PlaneGeometry(widthM, heightM);
  const material = new THREE.MeshBasicMaterial({
    map: planTexture,
    transparent: true,
    opacity: planMesh ? CONFIG.plan.defaultOpacity : 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  planMesh = new THREE.Mesh(geometry, material);
  planMesh.rotation.x = -Math.PI / 2;
  planMesh.position.y = CONFIG.plan.elevationY;
  planMesh.name = 'planOverlay';

  scene.add(planMesh);
  console.log(`[Plan] Uppdaterad: ${widthM.toFixed(1)} × ${heightM.toFixed(1)} m`);
}

/* -----------------------------------------------------------
   SUB-BLOCK: Getters (för kalibrerings-beräkningar)
   ----------------------------------------------------------- */
export function getImageSize() {
  return { width: imageWidthPx, height: imageHeightPx };
}

export function getMesh() {
  return planMesh;
}
