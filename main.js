window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================= SCENE SETUP =================
const canvas = document.getElementById("webgl");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// ================= PARTICLE VARIABLES =================
let particles, geometry, material;
let particleCount = 5000;
let currentTemplate = 0;
let spread = 1.2;

// ================= SHAPE TEMPLATES =================
function createHeartShape() {
  const t = Math.random() * Math.PI * 2;
  const x = 16 * Math.pow(Math.sin(t), 3) / 16;
  const y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 16;
  return { x, y, z: (Math.random()-0.5)*0.5 };
}

function createFlowerShape() {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sin(6 * angle) * 0.8;
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
    z: (Math.random()-0.5)*0.5
  };
}

function createSaturnShape() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1 + Math.random() * 0.3;
  return {
    x: radius * Math.cos(angle),
    y: (Math.random()-0.5)*0.2,
    z: radius * Math.sin(angle)
  };
}

function createGalaxyShape() {
  const angle = Math.random() * Math.PI * 6;
  const radius = angle * 0.1;
  return {
    x: radius * Math.cos(angle),
    y: (Math.random()-0.5)*0.3,
    z: radius * Math.sin(angle)
  };
}

const templates = [
  createHeartShape,
  createFlowerShape,
  createSaturnShape,
  createGalaxyShape
];

// ================= CREATE PARTICLES =================
function createParticles(shapeFn) {
  if (particles) scene.remove(particles);

  geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const p = shapeFn();
    positions[i*3] = p.x;
    positions[i*3+1] = p.y;
    positions[i*3+2] = p.z;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  material = new THREE.PointsMaterial({
    size: 0.05,
    color: new THREE.Color("hotpink")
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

// ================= FIREWORKS EFFECT =================
function fireworksBurst() {
  material.size = 0.15;
  setTimeout(() => material.size = 0.05, 300);
}

// ================= MEDIAPIPE HAND TRACKING =================
const video = document.getElementById("video");

const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

hands.onResults(results => {
  if (!results.multiHandLandmarks.length) return;

  const lm = results.multiHandLandmarks[0];
  const thumb = lm[4];
  const index = lm[8];
  const middle = lm[12];
  const wrist = lm[0];

  const pinch = distance(thumb, index) < 0.05;
  const openPalm = distance(index, wrist) > 0.3 && distance(middle, wrist) > 0.3;

  spread = openPalm ? 1.03 : 0.99;

  if (pinch) {
    material.color.setHSL(Math.random(), 1, 0.6);
  }

  if (index.y < wrist.y - 0.2) {
    currentTemplate = (currentTemplate + 1) % templates.length;
    createParticles(templates[currentTemplate]);
  }

  const twoFingers = index.y < wrist.y && middle.y < wrist.y;
  if (twoFingers) fireworksBurst();
});

// Camera feed
const cameraFeed = new Camera(video, {
  onFrame: async () => await hands.send({ image: video }),
  width: 640,
  height: 480
});
cameraFeed.start();

// ================= ANIMATION LOOP =================
function animate() {
  requestAnimationFrame(animate);

  if (geometry && geometry.attributes.position) {
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= spread;
      positions[i+1] *= spread;
      positions[i+2] *= spread;
    }

    geometry.attributes.position.needsUpdate = true;
  }
  if (particles) particles.rotation.y += 0.002;

  renderer.render(scene, camera);
}
// ================= START =================
createParticles(templates[0]);
animate();
