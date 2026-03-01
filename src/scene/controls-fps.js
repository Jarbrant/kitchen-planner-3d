/* =============================================================
   BLOCK: FPS-kontroller (Pointer Lock + WASD)
   Hanterar "gå runt"-upplevelsen:
     - Klick i scen → pointer lock (mus låses)
     - WASD = rörelse, Shift = spring
     - Mus = titta runt
     - ESC = släpp pointer lock
   ============================================================= */

import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { camera, renderer } from './scene.js';
import CONFIG from '../app/config.js';

/* -----------------------------------------------------------
   SUB-BLOCK: Skapa PointerLockControls
   Kopplar kameran till DOM-elementet.
   ----------------------------------------------------------- */
export const controls = new PointerLockControls(camera, renderer.domElement);

/* -----------------------------------------------------------
   SUB-BLOCK: Tangentbords-state
   Håller reda på vilka knappar som är nedtryckta just nu.
   ----------------------------------------------------------- */
const keys = {
  forward: false,   // W
  backward: false,  // S
  left: false,      // A
  right: false,     // D
  run: false,       // Shift
};

/* -----------------------------------------------------------
   SUB-BLOCK: Keydown/Keyup-lyssnare
   Sätter keys-state baserat på vilken tangent som trycks/släpps.
   ----------------------------------------------------------- */
function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':      keys.forward  = true; break;
    case 'KeyS':      keys.backward = true; break;
    case 'KeyA':      keys.left     = true; break;
    case 'KeyD':      keys.right    = true; break;
    case 'ShiftLeft':
    case 'ShiftRight': keys.run     = true; break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW':      keys.forward  = false; break;
    case 'KeyS':      keys.backward = false; break;
    case 'KeyA':      keys.left     = false; break;
    case 'KeyD':      keys.right    = false; break;
    case 'ShiftLeft':
    case 'ShiftRight': keys.run     = false; break;
  }
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

/* -----------------------------------------------------------
   SUB-BLOCK: Pointer lock — klick för att aktivera
   ----------------------------------------------------------- */
renderer.domElement.addEventListener('click', () => {
  /* Aktivera pointer lock bara om appen inte är i kalibrerings-läge */
  if (!window.__calibrationActive) {
    controls.lock();
  }
});

/* -----------------------------------------------------------
   SUB-BLOCK: Uppdatera rörelse varje frame
   Anropas från bootstrap.js i animate-loopen.
   deltaTime = tid sedan förra frame i sekunder.
   ----------------------------------------------------------- */
export function updateMovement(deltaTime) {
  if (!controls.isLocked) return;  // ingen rörelse om musen inte är låst

  /* Bestäm hastighet: spring eller gå */
  const speed = keys.run
    ? CONFIG.movement.runSpeed
    : CONFIG.movement.walkSpeed;

  const distance = speed * deltaTime; // meter att förflytta denna frame

  /* moveForward / moveRight är inbyggda i PointerLockControls */
  if (keys.forward)  controls.moveForward(distance);
  if (keys.backward) controls.moveForward(-distance);
  if (keys.right)    controls.moveRight(distance);
  if (keys.left)     controls.moveRight(-distance);

  /* Lås Y-position (ögonhöjd) — vi går på golvet, inte flyger */
  camera.position.y = CONFIG.movement.eyeHeight;
}
