/* =============================================================
   BLOCK: Plan-overlay
   Laddar planritningen (plan.png) och lägger den som textur
   på ett plan vid golvet. Opacity kan styras via slider.
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
   SUB-BLOCK: Ladda planritning
   Anropas av bootstrap.js vid uppstart.
   Skapar textur + plan-mesh + applicerar sparad skala.
   ----------------------------------------------------------- */
export function loadPlan(planImagePath) {
  const loader = new THREE.TextureLoader();

  loader.load(
    planImagePath,

    /* onLoad-callback */
    (texture) => {
      planTexture = texture;
      texture.colorSpace = THREE.SRGBColorSpace; // korrekta färger

      /* Hämta bildens pixelstorlek */
      imageWidthPx = texture.image.width;
      imageHeightPx = texture.image.height;
      imageAspect = imageWidthPx / imageHeightPx;

      console.log(`[Plan] Laddat: ${imageWidthPx}×${imageHeightPx} px`);

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
    },

    /* onProgress-callback */
    undefined,

    /* onError-callback */
    (err) => {
      console.warn('[Plan] Kunde inte ladda planritning:', err);
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
