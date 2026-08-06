import {
  CSS3DObject,
  CSS3DRenderer,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TrackballControls,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "css3d_periodictable",
  name: "CSS3D periodic table",
  category: "css3d",
  description: "Arrange periodic-table DOM cards as a CPU-driven CSS3D scene.",
};

export const controls = [];

const table = [
  "H",
  "Hydrogen",
  "1.00794",
  1,
  1,
  "He",
  "Helium",
  "4.002602",
  18,
  1,
  "Li",
  "Lithium",
  "6.941",
  1,
  2,
  "Be",
  "Beryllium",
  "9.012182",
  2,
  2,
  "B",
  "Boron",
  "10.811",
  13,
  2,
  "C",
  "Carbon",
  "12.0107",
  14,
  2,
  "N",
  "Nitrogen",
  "14.0067",
  15,
  2,
  "O",
  "Oxygen",
  "15.9994",
  16,
  2,
  "F",
  "Fluorine",
  "18.9984032",
  17,
  2,
  "Ne",
  "Neon",
  "20.1797",
  18,
  2,
  "Na",
  "Sodium",
  "22.98976...",
  1,
  3,
  "Mg",
  "Magnesium",
  "24.305",
  2,
  3,
  "Al",
  "Aluminium",
  "26.9815386",
  13,
  3,
  "Si",
  "Silicon",
  "28.0855",
  14,
  3,
  "P",
  "Phosphorus",
  "30.973762",
  15,
  3,
  "S",
  "Sulfur",
  "32.065",
  16,
  3,
  "Cl",
  "Chlorine",
  "35.453",
  17,
  3,
  "Ar",
  "Argon",
  "39.948",
  18,
  3,
  "K",
  "Potassium",
  "39.948",
  1,
  4,
  "Ca",
  "Calcium",
  "40.078",
  2,
  4,
  "Sc",
  "Scandium",
  "44.955912",
  3,
  4,
  "Ti",
  "Titanium",
  "47.867",
  4,
  4,
  "V",
  "Vanadium",
  "50.9415",
  5,
  4,
  "Cr",
  "Chromium",
  "51.9961",
  6,
  4,
  "Mn",
  "Manganese",
  "54.938045",
  7,
  4,
  "Fe",
  "Iron",
  "55.845",
  8,
  4,
  "Co",
  "Cobalt",
  "58.933195",
  9,
  4,
  "Ni",
  "Nickel",
  "58.6934",
  10,
  4,
  "Cu",
  "Copper",
  "63.546",
  11,
  4,
  "Zn",
  "Zinc",
  "65.38",
  12,
  4,
  "Ga",
  "Gallium",
  "69.723",
  13,
  4,
  "Ge",
  "Germanium",
  "72.63",
  14,
  4,
  "As",
  "Arsenic",
  "74.9216",
  15,
  4,
  "Se",
  "Selenium",
  "78.96",
  16,
  4,
  "Br",
  "Bromine",
  "79.904",
  17,
  4,
  "Kr",
  "Krypton",
  "83.798",
  18,
  4,
  "Rb",
  "Rubidium",
  "85.4678",
  1,
  5,
  "Sr",
  "Strontium",
  "87.62",
  2,
  5,
  "Y",
  "Yttrium",
  "88.90585",
  3,
  5,
  "Zr",
  "Zirconium",
  "91.224",
  4,
  5,
  "Nb",
  "Niobium",
  "92.90628",
  5,
  5,
  "Mo",
  "Molybdenum",
  "95.96",
  6,
  5,
  "Tc",
  "Technetium",
  "(98)",
  7,
  5,
  "Ru",
  "Ruthenium",
  "101.07",
  8,
  5,
  "Rh",
  "Rhodium",
  "102.9055",
  9,
  5,
  "Pd",
  "Palladium",
  "106.42",
  10,
  5,
  "Ag",
  "Silver",
  "107.8682",
  11,
  5,
  "Cd",
  "Cadmium",
  "112.411",
  12,
  5,
  "In",
  "Indium",
  "114.818",
  13,
  5,
  "Sn",
  "Tin",
  "118.71",
  14,
  5,
  "Sb",
  "Antimony",
  "121.76",
  15,
  5,
  "Te",
  "Tellurium",
  "127.6",
  16,
  5,
  "I",
  "Iodine",
  "126.90447",
  17,
  5,
  "Xe",
  "Xenon",
  "131.293",
  18,
  5,
  "Cs",
  "Caesium",
  "132.9054",
  1,
  6,
  "Ba",
  "Barium",
  "132.9054",
  2,
  6,
  "La",
  "Lanthanum",
  "138.90547",
  4,
  9,
  "Ce",
  "Cerium",
  "140.116",
  5,
  9,
  "Pr",
  "Praseodymium",
  "140.90765",
  6,
  9,
  "Nd",
  "Neodymium",
  "144.242",
  7,
  9,
  "Pm",
  "Promethium",
  "(145)",
  8,
  9,
  "Sm",
  "Samarium",
  "150.36",
  9,
  9,
  "Eu",
  "Europium",
  "151.964",
  10,
  9,
  "Gd",
  "Gadolinium",
  "157.25",
  11,
  9,
  "Tb",
  "Terbium",
  "158.92535",
  12,
  9,
  "Dy",
  "Dysprosium",
  "162.5",
  13,
  9,
  "Ho",
  "Holmium",
  "164.93032",
  14,
  9,
  "Er",
  "Erbium",
  "167.259",
  15,
  9,
  "Tm",
  "Thulium",
  "168.93421",
  16,
  9,
  "Yb",
  "Ytterbium",
  "173.054",
  17,
  9,
  "Lu",
  "Lutetium",
  "174.9668",
  18,
  9,
  "Hf",
  "Hafnium",
  "178.49",
  4,
  6,
  "Ta",
  "Tantalum",
  "180.94788",
  5,
  6,
  "W",
  "Tungsten",
  "183.84",
  6,
  6,
  "Re",
  "Rhenium",
  "186.207",
  7,
  6,
  "Os",
  "Osmium",
  "190.23",
  8,
  6,
  "Ir",
  "Iridium",
  "192.217",
  9,
  6,
  "Pt",
  "Platinum",
  "195.084",
  10,
  6,
  "Au",
  "Gold",
  "196.966569",
  11,
  6,
  "Hg",
  "Mercury",
  "200.59",
  12,
  6,
  "Tl",
  "Thallium",
  "204.3833",
  13,
  6,
  "Pb",
  "Lead",
  "207.2",
  14,
  6,
  "Bi",
  "Bismuth",
  "208.9804",
  15,
  6,
  "Po",
  "Polonium",
  "(209)",
  16,
  6,
  "At",
  "Astatine",
  "(210)",
  17,
  6,
  "Rn",
  "Radon",
  "(222)",
  18,
  6,
  "Fr",
  "Francium",
  "(223)",
  1,
  7,
  "Ra",
  "Radium",
  "(226)",
  2,
  7,
  "Ac",
  "Actinium",
  "(227)",
  4,
  10,
  "Th",
  "Thorium",
  "232.03806",
  5,
  10,
  "Pa",
  "Protactinium",
  "231.0588",
  6,
  10,
  "U",
  "Uranium",
  "238.02891",
  7,
  10,
  "Np",
  "Neptunium",
  "(237)",
  8,
  10,
  "Pu",
  "Plutonium",
  "(244)",
  9,
  10,
  "Am",
  "Americium",
  "(243)",
  10,
  10,
  "Cm",
  "Curium",
  "(247)",
  11,
  10,
  "Bk",
  "Berkelium",
  "(247)",
  12,
  10,
  "Cf",
  "Californium",
  "(251)",
  13,
  10,
  "Es",
  "Einstenium",
  "(252)",
  14,
  10,
  "Fm",
  "Fermium",
  "(257)",
  15,
  10,
  "Md",
  "Mendelevium",
  "(258)",
  16,
  10,
  "No",
  "Nobelium",
  "(259)",
  17,
  10,
  "Lr",
  "Lawrencium",
  "(262)",
  18,
  10,
  "Rf",
  "Rutherfordium",
  "(267)",
  4,
  7,
  "Db",
  "Dubnium",
  "(268)",
  5,
  7,
  "Sg",
  "Seaborgium",
  "(271)",
  6,
  7,
  "Bh",
  "Bohrium",
  "(272)",
  7,
  7,
  "Hs",
  "Hassium",
  "(270)",
  8,
  7,
  "Mt",
  "Meitnerium",
  "(276)",
  9,
  7,
  "Ds",
  "Darmstadium",
  "(281)",
  10,
  7,
  "Rg",
  "Roentgenium",
  "(280)",
  11,
  7,
  "Cn",
  "Copernicium",
  "(285)",
  12,
  7,
  "Nh",
  "Nihonium",
  "(286)",
  13,
  7,
  "Fl",
  "Flerovium",
  "(289)",
  14,
  7,
  "Mc",
  "Moscovium",
  "(290)",
  15,
  7,
  "Lv",
  "Livermorium",
  "(293)",
  16,
  7,
  "Ts",
  "Tennessine",
  "(294)",
  17,
  7,
  "Og",
  "Oganesson",
  "(294)",
  18,
  7,
];

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  const previousPosition = stage.style.position;
  stage.style.position = "relative";
  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: width / height,
    near: 1,
    far: 10000,
  });
  camera.position.z = 3000;
  const scene = new Scene();
  scene.background = 0x06171b;
  const renderer = new Renderer({ canvas, width, height });
  const overlay = new CSS3DRenderer({ width, height });
  if (!overlay.domElement) return;
  overlay.domElement.style.position = "absolute";
  overlay.domElement.style.inset = "0";
  overlay.domElement.style.zIndex = "2";
  stage.append(overlay.domElement);
  const controls = new TrackballControls(camera, overlay.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  const objects = [];
  const targets = { table: [], sphere: [], helix: [], grid: [] };
  for (let index = 0; index < table.length; index += 5) {
    const element = globalThis.document.createElement("div");
    element.style.width = "120px";
    element.style.height = "160px";
    element.style.boxSizing = "border-box";
    element.style.border = "1px solid rgba(127,255,255,0.85)";
    element.style.background = "rgba(0,127,127,0.55)";
    element.style.color = "#fff";
    element.style.fontFamily = "system-ui, sans-serif";
    element.style.textAlign = "center";
    element.style.padding = "8px";
    element.style.backfaceVisibility = "hidden";
    const number = globalThis.document.createElement("div");
    number.textContent = String(index / 5 + 1);
    number.style.fontSize = "12px";
    number.style.textAlign = "left";
    const symbol = globalThis.document.createElement("div");
    symbol.textContent = table[index];
    symbol.style.fontSize = "42px";
    symbol.style.fontWeight = "700";
    const details = globalThis.document.createElement("div");
    details.innerHTML = `${table[index + 1]}<br>${table[index + 2]}`;
    details.style.fontSize = "12px";
    element.append(number, symbol, details);
    const object = new CSS3DObject(element);
    const seed = index / 5;
    object.position.set(
      ((seed * 7919) % 4000) - 2000,
      ((seed * 6271) % 4000) - 2000,
      ((seed * 3571) % 4000) - 2000,
    );
    scene.add(object);
    objects.push(object);
    targets.table.push(
      new Vector3(
        table[index + 3] * 140 - 1330,
        -(table[index + 4] * 180) + 990,
        0,
      ),
    );
  }
  const vector = new Vector3();
  for (let index = 0; index < objects.length; index++) {
    const phi = Math.acos(-1 + (2 * index) / objects.length);
    const theta = Math.sqrt(objects.length * Math.PI) * phi;
    const point = new Vector3().setFromSphericalCoords(800, phi, theta);
    vector.copy(point).multiplyScalar(2);
    targets.sphere.push({
      position: point,
      rotation: lookRotation(point, vector),
    });
    const helixTheta = index * 0.175 + Math.PI;
    const y = -(index * 8) + 450;
    const helixPoint = new Vector3().setFromCylindricalCoords(
      900,
      helixTheta,
      y,
    );
    vector.set(helixPoint.x * 2, helixPoint.y, helixPoint.z * 2);
    targets.helix.push({
      position: helixPoint,
      rotation: lookRotation(helixPoint, vector),
    });
    targets.grid.push({
      position: new Vector3(
        (index % 5) * 400 - 800,
        -(Math.floor(index / 5) % 5) * 400 + 800,
        Math.floor(index / 25) * 1000 - 2000,
      ),
      rotation: { x: 0, y: 0, z: 0 },
    });
  }
  targets.table = targets.table.map((position) => ({
    position,
    rotation: { x: 0, y: 0, z: 0 },
  }));
  const menu = globalThis.document.createElement("div");
  menu.style.position = "absolute";
  menu.style.bottom = "16px";
  menu.style.left = "0";
  menu.style.right = "0";
  menu.style.display = "flex";
  menu.style.justifyContent = "center";
  menu.style.gap = "6px";
  menu.style.zIndex = "4";
  const transitionState = {
    current: "table",
    from: "table",
    elapsed: 0,
    duration: 2,
  };
  const buttonNames = ["table", "sphere", "helix", "grid"];
  const buttons = buttonNames.map((name) => {
    const button = globalThis.document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.style.cursor = "pointer";
    button.addEventListener("click", () => {
      transitionState.from = transitionState.current;
      transitionState.current = name;
      transitionState.elapsed = 0;
    });
    menu.append(button);
    return button;
  });
  stage.append(menu);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    transitionState.elapsed += timer.update().delta;
    const progress = Math.min(
      1,
      transitionState.elapsed / transitionState.duration,
    );
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - (-2 * progress + 2) ** 2 / 2;
    const from = targets[transitionState.from];
    const to = targets[transitionState.current];
    for (let index = 0; index < objects.length; index++) {
      const object = objects[index];
      const start = from[index];
      const end = to[index];
      object.position.set(
        start.position.x + (end.position.x - start.position.x) * eased,
        start.position.y + (end.position.y - start.position.y) * eased,
        start.position.z + (end.position.z - start.position.z) * eased,
      );
      object.rotation.set(
        start.rotation.x + (end.rotation.x - start.rotation.x) * eased,
        start.rotation.y + (end.rotation.y - start.rotation.y) * eased,
        start.rotation.z + (end.rotation.z - start.rotation.z) * eased,
      );
    }
    controls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    overlay.render(scene, camera);
  }
  transitionState.from = "table";
  transitionState.current = "table";
  transitionState.elapsed = transitionState.duration;
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      for (const button of buttons) button.replaceWith(button.cloneNode(true));
      controls.dispose();
      overlay.dispose();
      overlay.domElement?.remove();
      menu.remove();
      stage.style.position = previousPosition;
    },
  };
}

function lookRotation(position, target) {
  const direction = target.clone().sub(position).normalize();
  return {
    x: Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
    y: Math.atan2(direction.x, direction.z),
    z: 0,
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const object = new EASEL.CSS3DObject(element);
scene.add(object);
const controls = new EASEL.TrackballControls(camera, renderer.domElement);
const renderer = new EASEL.CSS3DRenderer({ width, height });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

const object = new CSS3DObject(element);
scene.add(object);
const controls = new TrackballControls(camera, renderer.domElement);
const renderer = new CSS3DRenderer();
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
