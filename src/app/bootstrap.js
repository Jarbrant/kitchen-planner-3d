/* =============================================================
   BLOCK: Bootstrap (app-start)
   Huvudentrypoint — startar scen, FPS-kontroller, planöverlägg,
   kalibrering och animate-loop.
   ============================================================= */

import * as THREE from 'three';

/* -----------------------------------------------------------
   SUB-BLOCK: Importera moduler
   ----------------------------------------------------------- */
import CONFIG from './config.js';
import { fmt } from './utils.js';
import { loadJSON } from './utils.js';
import * as storage from './storage.js';
import { scene, camera, renderer } from '../scene/scene.js';
import { controls, updateMovement } from '../scene/controls-fps.js';
import '../scene/grid-floor.js';                   // self-init: lägger golv i scen
import { loadPlan, setOpacity, updateScale, getMesh, getImageSize } from '../scene/plan-overlay.js';

/* =============================================================
   BLOCK: Global state
   ============================================================= */
let planData = null;              // data/plan.json innehåll
let calibrationActive = false;    // är kalibrering igång?
let calibrationPoints = [];       // klickade punkter [{x,y}, ...]
window.__calibrationActive = false; // global flagga (hindrar pointer lock under kalibrering)

/* =============================================================
   BLOCK: Init — körs vid uppstart
   ============================================================= */
async function init() {
  console.log('[Boot] Startar Kitchen Planner 3D...');

  /* -----------------------------------------------------------
     SUB-BLOCK: Ladda plan.json
     ----------------------------------------------------------- */
  try {
    planData = await loadJSON('data/plan.json');
    console.log('[Boot] plan.json laddad:', planData);
  } catch (err) {
    console.warn('[Boot] Kunde inte ladda plan.json, använder defaults.', err);
    planData = {
      planImage: 'assets/plans/plan.png',
      heightZones: [],
      calibration: { metersPerPixel: null },
    };
  }

  /* -----------------------------------------------------------
     SUB-BLOCK: Ladda planritning
     ----------------------------------------------------------- */
  const planImage = planData.planImage || 'assets/plans/plan.png';
  loadPlan(planImage);

  /* -----------------------------------------------------------
     SUB-BLOCK: Visa höjdzoner i UI
     ----------------------------------------------------------- */
  renderHeightZones(planData.heightZones || []);

  /* -----------------------------------------------------------
     SUB-BLOCK: Visa sparad kalibrering (om den finns)
     ----------------------------------------------------------- */
  const savedCal = storage.load('calibration', null);
  if (savedCal && savedCal.metersPerPixel) {
    showCalibrationOK(savedCal.metersPerPixel);
  }

  /* -----------------------------------------------------------
     SUB-BLOCK: Koppla UI-element
     ----------------------------------------------------------- */
  setupOpacitySlider();
  setupCalibrateButton();

  /* -----------------------------------------------------------
     SUB-BLOCK: Starta animate-loop
     ----------------------------------------------------------- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();       // sekunder sedan förra frame

    /* Uppdatera FPS-rörelse */
    updateMovement(delta);

    /* Uppdatera debug-overlay */
    updateDebugOverlay();

    /* Rendera scen */
    renderer.render(scene, camera);
  }
  animate();

  console.log('[Boot] Redo! Klicka i scenen för FPS-mode.');
}

/* =============================================================
   BLOCK: Opacity-slider
   Kopplar slidern till plan-overlay-modulens setOpacity.
   ============================================================= */
function setupOpacitySlider() {
  const slider = document.getElementById('opacity-slider');
  const display = document.getElementById('opacity-value');

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    setOpacity(val);
    display.textContent = val.toFixed(2);       // visa aktuellt värde
  });
}

/* =============================================================
   BLOCK: Kalibreringsknapp + logik
   Flöde:
     1. Klicka "Kalibrera skala"
     2. Overlay visas: "Klicka punkt 1..."
     3. Användaren klickar på planbilden → punkt 1 sparas
     4. "Klicka punkt 2..."
     5. Användaren klickar → punkt 2 sparas
     6. metersPerPixel beräknas och sparas
   ============================================================= */
function setupCalibrateButton() {
  const btn = document.getElementById('btn-calibrate');
  const overlay = document.getElementById('calibration-overlay');
  const prompt = document.getElementById('calibration-prompt');

  btn.addEventListener('click', () => {
    /* Avbryt om redan aktiv */
    if (calibrationActive) {
      cancelCalibration();
      return;
    }

    /* Starta kalibrering */
    calibrationActive = true;
    window.__calibrationActive = true;
    calibrationPoints = [];

    /* Släpp pointer lock om aktivt */
    if (controls.isLocked) controls.unlock();

    /* Visa overlay */
    overlay.classList.remove('hidden');
    prompt.textContent = 'Klicka punkt 1 på planbilden (långsidan kåpa B)...';
    btn.textContent = '❌ Avbryt kalibrering';

    /* Lyssna på klick i scenen */
    renderer.domElement.addEventListener('click', onCalibrationClick);
    console.log('[Kalibrering] Startad — väntar på punkt 1');
  });
}

/* -----------------------------------------------------------
   SUB-BLOCK: Kalibrerings-klick-hanterare
   Raycaster hittar var på planbilden användaren klickade.
   ----------------------------------------------------------- */
function onCalibrationClick(event) {
  /* Skapa raycaster från musposition */
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  /* Hitta planöverlägget */
  const planMesh = getMesh();
  if (!planMesh) return;

  const hits = raycaster.intersectObject(planMesh);
  if (hits.length === 0) return;  // klickade utanför planen

  const hit = hits[0];
  const uv = hit.uv;             // UV-koordinat (0–1)
  const imgSize = getImageSize();

  /* Konvertera UV till pixelkoordinat */
  const pixelX = uv.x * imgSize.width;
  const pixelY = (1 - uv.y) * imgSize.height; // Y inverteras

  const point = { x: pixelX, y: pixelY };
  calibrationPoints.push(point);

  /* Visa markör på skärmen */
  showCalibrationMarker(event.clientX, event.clientY, calibrationPoints.length);

  const prompt = document.getElementById('calibration-prompt');

  if (calibrationPoints.length === 1) {
    /* Punkt 1 klickad — vänta på punkt 2 */
    prompt.textContent = 'Klicka punkt 2 (andra änden av kåpa B 6 m)...';
    console.log(`[Kalibrering] Punkt 1: (${pixelX.toFixed(0)}, ${pixelY.toFixed(0)}) px`);

  } else if (calibrationPoints.length === 2) {
    /* Punkt 2 klickad — beräkna! */
    console.log(`[Kalibrering] Punkt 2: (${pixelX.toFixed(0)}, ${pixelY.toFixed(0)}) px`);
    finishCalibration();
  }
}

/* -----------------------------------------------------------
   SUB-BLOCK: Slutför kalibrering
   Beräknar metersPerPixel och sparar.
   ----------------------------------------------------------- */
function finishCalibration() {
  const p1 = calibrationPoints[0];
  const p2 = calibrationPoints[1];

  /* Pixelavstånd mellan de 2 punkterna */
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);

  /* Beräkna skala */
  const metersPerPixel = CONFIG.calibration.referenceMeters / pixelDistance;

  console.log(`[Kalibrering] Pixelavstånd: ${pixelDistance.toFixed(1)} px`);
  console.log(`[Kalibrering] metersPerPixel: ${metersPerPixel.toFixed(6)}`);

  /* Spara i localStorage */
  const calData = {
    metersPerPixel: metersPerPixel,
    pixelDistance: pixelDistance,
    point1: p1,
    point2: p2,
    timestamp: new Date().toISOString(),
  };
  storage.save('calibration', calData);

  /* Uppdatera plan-overlay med rätt skala */
  updateScale(metersPerPixel);

  /* Visa OK-status */
  showCalibrationOK(metersPerPixel);

  /* Rensa kalibrerings-UI */
  cancelCalibration();
}

/* -----------------------------------------------------------
   SUB-BLOCK: Visa "Skala OK" status
   ----------------------------------------------------------- */
function showCalibrationOK(metersPerPixel) {
  const status = document.getElementById('calibration-status');
  status.textContent = `✅ Skala OK — ${(metersPerPixel * 1000).toFixed(3)} mm/px`;
  status.classList.add('ok');
}

/* -----------------------------------------------------------
   SUB-BLOCK: Avbryt/rensa kalibrering
   ----------------------------------------------------------- */
function cancelCalibration() {
  calibrationActive = false;
  window.__calibrationActive = false;
  calibrationPoints = [];

  /* Dölj overlay */
  const overlay = document.getElementById('calibration-overlay');
  overlay.classList.add('hidden');

  /* Återställ knapptext */
  const btn = document.getElementById('btn-calibrate');
  btn.textContent = '📐 Kalibrera skala (Kåpa B = 6 m)';

  /* Ta bort klick-lyssnare */
  renderer.domElement.removeEventListener('click', onCalibrationClick);

  /* Ta bort markörer */
  document.querySelectorAll('.calibration-marker').forEach(el => el.remove());
}

/* -----------------------------------------------------------
   SUB-BLOCK: Visa kalibreringsmarkör (röd prick)
   ----------------------------------------------------------- */
function showCalibrationMarker(screenX, screenY, index) {
  const marker = document.createElement('div');
  marker.className = 'calibration-marker';
  marker.style.left = screenX + 'px';
  marker.style.top = screenY + 'px';
  marker.title = `Punkt ${index}`;
  document.body.appendChild(marker);
}

/* =============================================================
   BLOCK: Höjdzoner — rendera i UI
   ============================================================= */
function renderHeightZones(zones) {
  const list = document.getElementById('zone-list');
  list.innerHTML = '';            // rensa

  if (zones.length === 0) {
    list.innerHTML = '<li>Inga zoner definierade</li>';
    return;
  }

  zones.forEach(zone => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${zone.name}
      <span class="zone-height">${zone.ceilingHeightM.toFixed(2)} m</span>
    `;
    list.appendChild(li);
  });
}

/* =============================================================
   BLOCK: Debug-overlay — uppdatera varje frame
   Visar kameraposition i meter och aktuell skala.
   ============================================================= */
function updateDebugOverlay() {
  /* Position */
  const posEl = document.getElementById('debug-pos');
  posEl.textContent = `Pos: ${fmt(camera.position.x)}, ${fmt(camera.position.z)} m`;

  /* Skala */
  const scaleEl = document.getElementById('debug-scale');
  const savedCal = storage.load('calibration', null);
  if (savedCal && savedCal.metersPerPixel) {
    scaleEl.textContent = `Skala: ${savedCal.metersPerPixel.toFixed(6)} m/px`;
  } else {
    scaleEl.textContent = 'Skala: ej kalibrerad';
  }
}

/* =============================================================
   BLOCK: Kör init
   ============================================================= */
init();
