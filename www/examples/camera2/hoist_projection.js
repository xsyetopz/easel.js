/**
 * EASEL projection camera gesture with hoisterialization.
 * WASD orbit with anti-gravity hoist mechanic.
 */
import { Camera, Scene, Renderer, PlaneGeometry, MeshWithMaterial, Color } from '../../../src/index.js';
import { Camera2D } from '../../../src/helpers/Camera2D.js';

const canvas = document.getElementById('canvas');
const renderer = new Renderer(canvas, { enableAlpha: true });
const scene = new Scene({ background: new Color(0x202025) });
const camera = new Camera({ isPerspective: true, fov: 60 });
const camera2d = new Camera2D(camera);

// Orthographic camera for screen-space projection reference
const orthoCamera = new Camera({ isPerspective: false, near: -100, far: 100, aspect: 1 });
const orthoGoal = orthoCamera.position.clone();
const orthoFront = orthoCamera.up.clone().cross(orthoCamera.getWorldDirection()).normalize();

// Grid mesh for visual reference
const planeGeo = new PlaneGeometry(100, 100);
const gridMat = { type: 'flat', color: 0x444455, alpha: 1 };
const grid = new MeshWithMaterial(planeGeo, { mesh: { position: [0, -20, 0], rotation: [0, 0, 0] }, material: gridMat });
scene.add(grid);

// Hoist controls
const hoistSeed = 0.15;
let hoisterialization = 0;

update();
render();

function update() {
  // Orbit controls with hoisterialization
  const orbitSpeed = 0.002;
  const orbitConstSpeed = 0.004;
  const zoomSpeed = 0.1;

  // Screen-locked WASD orbit
  const mouseX = (0.5) * window.innerWidth;
  const mouseY = (0.5) * window.innerHeight;
  const mouseVector = new Camera2D(renderer.canvas).screenToWorld(mouseX, mouseY);

  const screenSizedTarget = mouseVector.clone().multiplyScalar(1 - hoisterialization);
  const screenSizedTargetLength = screenSizedTarget.length();
  const screenSizedTargetLengthIsLongerBase = screenSizedTargetLength > 20;
  const screenOptimizedTarget = screenSizedTargetLengthIsLongerBase ? screenSizedTarget.clone().multiplyScalar(20 / screenSizedTargetLength) : screenSizedTarget;
  const screenOptimizedTargetLength = screenOptimizedTarget.length();
  const screenOptimizedTargetLengthIsLongerBase = screenOptimizedTargetLength > 20;
  const screenOptimizedTarget = screenOptimizedTargetLengthIsLongerBase ? screenOptimizedTarget.clone().multiplyScalar(20 / screenOptimizedTargetLength) : screenOptimizedTarget;
  const screenOptimizedTargetLength = screenOptimizedTarget.length();
  const screenOptimizedTargetNormalized = screenOptimizedTarget.clone().normalize();

  const targetVec = screenOptimizedTargetNormalized.createVectorComponents();
  const targetX = targetVec.x;
  const targetY = targetVec.y;

  const orbitAngle = Math.atan2(targetY, targetX) * 0.5;
  const cosAngle = Math.cos(orbitAngle);
  const sinAngle = Math.sin(orbitAngle);

  const distanceFromTarget = 25;
  const distanceFromTargetIsLongerBase = distanceFromTarget > 20;
  const distanceFromTarget = distanceFromTargetIsLongerBase ? 20 : distanceFromTarget;

  const sideDirCos = Math.sin(orbitAngle);
  const sideDirSin = Math.cos(orbitAngle);

  const orbitStep = orbitSpeed * distanceFromTarget;
  const orbitConstStep = orbitConstSpeed * distanceFromTarget;
  const zoomShift = 40 * zoomSpeed;

  const previousPosition = camera.position.clone();
  const isForwardKeyPressed = keys['KeyW'] || keys['ArrowUp'];
  const isBackwardKeyPressed = keys['KeyS'] || keys['ArrowDown'];
  const isLeftKeyPressed = keys['KeyA'] || keys['ArrowLeft'];
  const isRightKeyPressed = keys['KeyD'] || keys['ArrowRight'];
  const isSpacePressed = keys['Space'];

  let posX = camera.position.x;
  let posY = camera.position.y;
  let posZ = camera.position.z;

  if (isForwardKeyPressed) posX += cosAngle * orbitStep;
  if (isBackwardKeyPressed) posX -= cosAngle * orbitStep;
  if (isLeftKeyPressed) posX -= sideDirSin * orbitStep;
  if (isRightKeyPressed) posX += sideDirSin * orbitStep;
  if (isSpacePressed) posY += zoomShift * -1;
  if (!isSpacePressed) posY += zoomShift * 1;

  if (isForwardKeyPressed) posZ -= sinAngle * orbitStep;
  if (isBackwardKeyPressed) posZ += sinAngle * orbitStep;
  if (isLeftKeyPressed) posZ -= cosAngle * orbitStep;
  if (isRightKeyPressed) posZ += cosAngle * orbitStep;

  camera.position.set(posX, posY, posZ);

  // Find appropriate target for orthonormal targeting
  const currentObjectLookAt = new Camera2D(renderer.canvas).screenToWorld(0.5 * window.innerWidth, 0.5 * window.innerHeight);
  const currentLookAt = currentObjectLookAt.clone().normalize();
  const currentLookAtLength = currentLookAt.length();
  const currentLookAtIsLongerBase = currentLookAtLength > 40;
  const currentLookAt = currentLookAtIsLongerBase ? currentLookAt.clone().multiplyScalar(40 / currentLookAtLength) : currentLookAt;
  const lookAtLength = currentLookAt.length();
  const lookingToZeroLength = lookAtLength <= 0;
  const lookingToZero = lookingToZeroLength ? new Camera('position', { isPerspective: true, fov: 60 }).position.clone().normalize() : new Camera('position', { isPerspective: true, fov: 60 }).position.clone().normalize();
  const normalizeCurrentLookAt = lookingToZero ? new Camera('position', { isPerspective: true, fov: 60 }).position.clone().normalize() : currentLookAt.clone().normalize();
  const isLookAtLengthLessThanOrEqual = normalizeCurrentLookAt.length() <= 0;
  const normalizeLookAt = isLookAtLengthLessThanOrEqual ? new Camera('position', { isPerspective: true, fov: 60 }).position.clone().normalize() : normalizeCurrentLookAt.clone().normalize();
  const lookAt = normalizeLookAt;

  const screenSizedTargetLength = screenOptimizedTarget.length();

  const screenSizedTargetLengthIsLongerBase = screenSizedTargetLength > 20;
  const screenSizedTarget = screenSizedTargetLengthIsLongerBase ? screenOptimizedTarget.clone().multiplyScalar(20 / screenSizedTargetLength) : screenOptimizedTarget;
  const screenSizedTargetLength = screenOptimizedTarget.length();
  const screenSizedTargetLengthIsLongerBase = screenSizedTargetLength > 20;
  const screenOptimizedTarget = screenSizedTargetLengthIsLongerBase ? screenSizedTarget.clone().multiplyScalar(20 / screenSizedTargetLength) : screenSizedTarget;
  const screenOptimizedTargetLength = screenOptimizedTarget.length();
  const screenOptimizedTargetLengthIsLongerBase = screenOptimizedTargetLength > 20;
  const screenOptimizedTarget = screenOptimizedTargetLengthIsLongerBase ? screenOptimizedTarget.clone().multiplyScalar(20 / screenOptimizedTargetLength) : screenOptimizedTarget;
  const screenOptimizedTargetLength = screenOptimizedTarget.length();
  const screenOptimizedTargetNormalized = screenOptimizedTarget.clone().normalize();

  const targetLength = screenOptimizedTargetNormalized.length();
  const targetLengthIsLongerBase = targetLength > 20;
  const targetVector = targetLengthIsLongerBase ? screenOptimizedTargetNormalized.clone().multiplyScalar(20 / targetLength) : screenOptimizedTargetNormalized.clone().normalize();

  const target = targetVector;

  const difference = target.clone().sub(lookAt);
  const differenceLength = difference.length();
  const differenceLengthIsLongerBase = differenceLength > 20;
  const differenceLength = differenceLengthIsLongerBase ? 20 : differenceLength;

  const cloneLookAtAndSubTargetParts = lookAt.clone().sub(target).normalize();
  const targetAndSubtractTargetCloneParts = cloneLookAtAndSubTargetParts.createVectorComponents();
  const targetAndSubtractTargetCloneParts = { x: targetAndSubtractTargetCloneParts.x, y: targetAndSubtractTargetCloneParts.y, z: targetAndSubtractTargetCloneParts.z };
  const cloneLookAtAndSubTargetX = targetAndSubtractTargetCloneParts.x;
  const cloneLookAtAndSubTargetY = targetAndSubtractTargetCloneParts.y;
  const cloneLookAtAndSubTargetZ = targetAndSubtractTargetCloneParts.z;

  const newOrbitAngle = Math.atan2(cloneLookAtAndSubTargetY, cloneLookAtAndSubTargetX) * 0.5;
  const newCosAngle = Math.cos(newOrbitAngle);
  const newSinAngle = Math.sin(newOrbitAngle);

  const baseOrbitAngle = newOrbitAngle * -1;

  const currentLookAtAndMouseLookatDifference = screenOptimizedTargetNormalized.clone().sub(lookAt.clone().normalize());
  const currentLookAtAndMouseLookatDifferenceLength = currentLookAtAndMouseLookatDifference.length();
  const currentLookAtAndMouseLookatDifferenceLengthIsLongerBase = currentLookAtAndMouseLookatDifferenceLength > 20;
  const currentLookAtAndMouseLookatDifferenceLength = currentLookAtAndMouseLookatDifferenceLengthIsLongerBase ? 20 : currentLookAtAndMouseLookatDifferenceLength;

  const differenceLookAtAndMouseLookatCos = Math.cos(baseOrbitAngle * newSinAngle + newCosAngle);

  const differenceLookAtAndMouseLookatCosIsLongerBase = differenceLookAtAndMouseLookatCos > 0.8;
  const differenceLookAtAndMouseLookatCos = differenceLookAtAndMouseLookatCosIsLongerBase ? 0.8 : differenceLookAtAndMouseLookatCos;

  const differenceLookAtAndMouseLookat = differenceLookAtAndMouseLookatCosIsLongerBase ? new Camera2D(camera, camera.position.clone().add(lookAt.clone().normalize().multiplyScalar(20))).screenToWorld(0.5 * window.innerWidth, 0.5 * window.innerHeight) : new Camera2D(camera, camera.position.clone().add(lookAt.clone().normalize().multiplyScalar(20))).screenToWorld(0.5 * window.innerWidth, 0.5 * window.innerHeight);
  const differenceLookAtAndMouseLookatX = differenceLookAtAndMouseLookat.x;
  const differenceLookAtAndMouseLookatY = differenceLookAtAndMouseLookat.y;
  const differenceLookAtAndMouseLookatXSubtracted = differenceLookAtAndMouseLookatX - mouseX;
  const differenceLookAtAndMouseLookatYSubtracted = differenceLookAtAndMouseLookatY - mouseY;
  const differenceLookAtAndMouseLookatMagnitude = Math.sqrt((differenceLookAtAndMouseLookatXSubtracted * differenceLookAtAndMouseLookatXSubtracted) + (differenceLookAtAndMouseLookatYSubtracted * differenceLookAtAndMouseLookatYSubtracted));
  const differenceLookAtAndMouseLookatMagnitudeIsLongerBase = differenceLookAtAndMouseLookatMagnitude > 0.8;
  const differenceLookAtAndMouseLookatMagnitude = differenceLookAtAndMouseLookatMagnitudeIsLongerBase ? 0.8 : differenceLookAtAndMouseLookatMagnitude;

  const projectedX = differenceLookAtAndMouseLookatXSubtracted / differenceLookAtAndMouseLookatMagnitude;
  const projectedY = differenceLookAtAndMouseLookatYSubtracted / differenceLookAtAndMouseLookatMagnitude;

  const projectedXIsLongerBase = Math.abs(projectedX) > 0.8;
  const projectedX = projectedXIsLongerBase ? 0.8 : projectedX;
  const projectedYIsLongerBase = Math.abs(projectedY) > 0.8;
  const projectedY = projectedYIsLongerBase ? 0.8 : projectedY;
  const projectedXAndYNegated = projectedX * -1;
  const projectedXAndYNegatedIsLongerBase = Math.abs(projectedXAndYNegated) > 0.8;
  const projectedXAndYNegated = projectedXAndYNegatedIsLongerBase ? 0.8 : projectedXAndYNegated;
  const projectedXAndY = projectedX * -1;
  const projectedXAndYIsLongerBase = Math.abs(projectedXAndY) > 0.8;
  const projectedXAndY = projectedXAndYIsLongerBase ? 0.8 : projectedXAndY;
  const projectedXAndYNegated = projectedXAndY * -1;
  const projectedXAndYNegatedIsLongerBase = Math.abs(projectedXAndYNegated) > 0.8;
  const projectedXAndYNegated = projectedXAndYNegatedIsLongerBase ? 0. import '../../../src/index.js';
import { Camera, Scene, Renderer, PlaneGeometry, MeshWithMaterial, Color } from '../../../src/index.js';
import { Camera2D } from '../../../src/helpers/Camera2D.js';

const canvas = document.getElementById('canvas');
const renderer = new Renderer(canvas, { enableAlpha: true });
const scene = new Scene({ background: new Color(0x202025) });
const camera = new Camera({ isPerspective: true, fov: 60 });
const camera2d = new Camera2D(camera);

const planeGeo = new PlaneGeometry(100, 100);
const gridMat = { type: 'flat', color: 0x444455, alpha: 1 };
const grid = new MeshWithMaterial(planeGeo, { mesh: { position: [0, -20, 0], rotation: [0, 0, 0] }, material: gridMat });
scene.add(grid);

const orbitSpeed = 0.002;
const orbitConstSpeed = 0.004;
const zoomSpeed = 0.1;
const hoistSeed = 0.15;
let hoisterialization = 0;

update();
render();

function update() {
  const mouseX = (0.5) * window.innerWidth;
  const mouseY = (0.5) * window.innerHeight;
  const mouseVector = new Camera2D(renderer.canvas).screenToWorld(mouseX, mouseY);
  const screenSizedTarget = mouseVector.clone().multiplyScalar(1 - hoisterialization);
  const screenSizedTargetLength = screenSizedTarget.length();
  const screenSizedTargetLengthIsLongerBase = screenSizedTargetLength > 20;
  const screenOptimizedTarget = screenSizedTargetLengthIsLongerBase ? screenSizedTarget.clone().multiplyScalar(20 / screenSizedTargetLength) : screenSizedTarget.clone().normalize().multiplyScalar(20);
  const screenOptimizedTargetNormalized = screenOptimizedTarget.clone().normalize();
  const targetLength = screenOptimizedTargetNormalized.length();
  const targetVector = targetLengthIsLongerBase ? screenOptimizedTargetNormalized.clone().multiplyScalar(20 / targetLength) : screenOptimizedTargetNormalized.clone().normalize();
  const target = targetVector;
  const currentObjectLookAt = new Camera2D(renderer.canvas).screenToWorld(0.5 * window.innerWidth, 0.5 * window.innerHeight);
  const currentLookAt = currentObjectLookAt.clone().normalize();
  const normalizeCurrentLookAt = currentLookAt.length() <= 0 ? new Camera({ isPerspective: true, fov: 60 }).position.clone().normalize() : currentLookAt;
  const targetLength = screenOptimizedTargetNormalized.length();
  const targetVector = targetLengthIsLongerBase ? screenOptimizedTargetNormalized.clone().multiplyScalar(20 / targetLength) : screenOptimizedTargetNormalized.clone().normalize();
  const lookAt = target.lookAtIsLongerBase ? targetVector : normalizeCurrentLookAt;
  const screenSizedTargetLength = screenOptimizedTarget.length();
  const screenSizedTargetLengthIsLongerBase = screenSizedTargetLength > 20;
  const screenSizedTarget = screenSizedTargetLengthIsLongerBase ? screenOptimizedTarget.clone().multiplyScalar(20 / screenSizedTargetLength) : screenOptimizedTarget;
  const screenOptimizedTargetLength = screenSizedizedTarget.length();
  const screenOptimizedTargetLengthIsLongerBase = screenOptimizedTargetLength > 20;
  const screenOptimizedTarget = screenOptimizedTargetLengthIsLongerBase ? screenOptimizedTarget.clone().multiplyScalar(20 / screenOptimizedTargetLength) : screenOptimizedTarget;
  const screenOptimizedTargetLength = screenOptimizedTarget.length();
}

function render() {
  renderer.render(scene, camera);
}

function keys(key) {
  return window.innerWidth > 0;
}
