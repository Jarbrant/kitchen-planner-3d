/* =============================================================
   BLOCK: Scene-modul
   Skapar Three.js-scen, kamera, renderer och ljus.
   Exporterar allt så andra moduler kan använda det.
   ============================================================= */

import * as THREE from 'three';
import CONFIG from '../app/config.js';

/* -----------------------------------------------------------
   SUB-BLOCK: Skapa scen
   ----------------------------------------------------------- */
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);  // matchar body-bakgrund
scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);   // dimma för djupkänsla

/* -----------------------------------------------------------
   SUB-BLOCK: Skapa kamera
   PerspectiveCamera med startposition och ögonhöjd.
   ----------------------------------------------------------- */
export const camera = new THREE.PerspectiveCamera(
  70,                                           // FOV (synfält i grader)
  window.innerWidth / window.innerHeight,       // aspektförhållande
  0.1,                                          // near clipping
  200                                           // far clipping
);
camera.position.set(0, CONFIG.movement.eyeHeight, 5); // start: mitt i rummet

/* -----------------------------------------------------------
   SUB-BLOCK: Skapa renderer
   WebGL-renderer med antialiasing, monteras i #scene-container.
   ----------------------------------------------------------- */
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // maxar 2x
renderer.shadowMap.enabled = false;             // FAS 4: slå på skuggor

const container = document.getElementById('scene-container');
container.appendChild(renderer.domElement);     // lägg canvas i DOM

/* -----------------------------------------------------------
   SUB-BLOCK: Ljussättning
   Ambient + Directional — enkel men tydlig.
   ----------------------------------------------------------- */
const ambientLight = new THREE.AmbientLight(
  0xffffff,
  CONFIG.lights.ambientIntensity
);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(
  0xffffff,
  CONFIG.lights.directionalIntensity
);
dirLight.position.set(...CONFIG.lights.directionalPosition);
scene.add(dirLight);

/* -----------------------------------------------------------
   SUB-BLOCK: Resize-hantering
   Uppdaterar kamera + renderer när fönstret ändrar storlek.
   ----------------------------------------------------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();              // viktig efter aspect-ändring
  renderer.setSize(window.innerWidth, window.innerHeight);
});
