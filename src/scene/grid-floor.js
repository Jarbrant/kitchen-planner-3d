/* =============================================================
   BLOCK: Golv + Grid
   Skapar ett synligt golv med grid-linjer som ger måttkänsla.
   ============================================================= */

import * as THREE from 'three';
import { scene } from './scene.js';
import CONFIG from '../app/config.js';

/* -----------------------------------------------------------
   SUB-BLOCK: GridHelper
   Skapar rutnät med konfigurerad storlek och färger.
   ----------------------------------------------------------- */
const gridHelper = new THREE.GridHelper(
  CONFIG.grid.size,               // totalstorlek i meter
  CONFIG.grid.divisions,          // antal rutor
  CONFIG.grid.color1,             // huvudlinjefärg
  CONFIG.grid.color2              // sublinjefärg
);
gridHelper.position.y = 0;       // på golvet
scene.add(gridHelper);

/* -----------------------------------------------------------
   SUB-BLOCK: Golvplan (osynligt men klickbart)
   Stort plan för raycasting vid kalibrering (klick-på-golv).
   ----------------------------------------------------------- */
const floorGeometry = new THREE.PlaneGeometry(
  CONFIG.grid.size,
  CONFIG.grid.size
);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a2a3e,
  transparent: true,
  opacity: 0.3,
  side: THREE.DoubleSide,
});
export const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // lägg plant (horisontellt)
floor.position.y = 0;
floor.name = 'floor';            // namn för enkel identifiering
scene.add(floor);
