const fileInput = document.getElementById("audioFile");
const canvas = document.getElementById("visualizer");
let globalVolume = 1.0;
let gainNode;

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setClearColor(0x802c2b);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 5;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
let hand; // 👈 make it global so we can animate it later

// 🎭 Clown face
const clownFace = new THREE.Group();

const faceGeometry = new THREE.SphereGeometry(2.5, 100, 100);
const faceMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
const face = new THREE.Mesh(faceGeometry, faceMaterial);
clownFace.add(face);

const eyeGeometry = new THREE.SphereGeometry(0.75, 10, 100);
const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
leftEye.position.set(-0.8, 0.7, 1.7);
rightEye.position.set(0.8, 0.7, 1.7);
clownFace.add(leftEye, rightEye);

const noseGeometry = new THREE.SphereGeometry(0.4, 100, 100);
const noseMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const nose = new THREE.Mesh(noseGeometry, noseMaterial);
nose.position.set(0, 0.2, 2.5);
clownFace.add(nose);

const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.9, -0.2, 100, 100), new THREE.MeshPhongMaterial({ color: 0xff0000 }));
const mouth1 = new THREE.Mesh(new THREE.TorusGeometry(0.9, -0.2, 100, 100), new THREE.MeshPhongMaterial({ color: 0xff0000 }));
mouth.position.set(0, -0.4, 2);
mouth.rotation.x = Math.PI / 2;
mouth1.position.set(0, -1, 1.6);
mouth1.rotation.x = Math.PI / -2.5;
clownFace.add(mouth, mouth1);

// 🧢 Hat, Drum, and Hand
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./hat.png', texture => {
  
  const hat = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  hat.position.set(0, 3, 2);
  hat.scale.set(0.9, 1.5, 0);
  clownFace.add(hat);
});

    const fireLevelLabel = document.getElementById('fireLevel');

    document.addEventListener("keydown", function (event) {
      if (event.code === "ArrowUp") {
        baseIntensity = Math.min(baseIntensity + 0.1, 2);
      } else if (event.code === "ArrowDown") {
        baseIntensity = Math.max(baseIntensity - 0.1, 0);
      }
      document.getElementById('fireLevel').textContent = baseIntensity.toFixed(1);
    });
    

  document.addEventListener("keydown", function (event) {
    if (event.code === "Equal") { // + key
      globalVolume = Math.min(globalVolume + 0.1, 10.0);
    } else if (event.code === "Minus") { // - key
      globalVolume = Math.max(globalVolume - 0.1, 0);
    }
  
    if (gainNode) gainNode.gain.value = globalVolume;
  
    const volumeDisplay = document.getElementById("volumeDisplay");
    if (volumeDisplay) {
      volumeDisplay.textContent = `🔊 ${Math.round(globalVolume * 100)}%`;
    }
  });
  
  
  
// 🔥 Fire Particle System
const fireTexture = textureLoader.load('./fire.png');
class Particle {
  constructor(position) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: fireTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.acceleration = new THREE.Vector3(0, 0.02, 0);
    this.velocity = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 0.1, (Math.random() - 0.5) * 0.1);
    this.lifespan = 1.0;
    scene.add(this.mesh);
  }
  update() {
    this.velocity.add(this.acceleration);
    this.mesh.position.add(this.velocity);
    this.lifespan -= 0.02;
    this.mesh.material.opacity = this.lifespan;
    this.mesh.scale.set(this.lifespan * 2, this.lifespan * 2, this.lifespan * 2);
    if (this.lifespan <= 0) {
      scene.remove(this.mesh);
      return false;
    }
    return true;
  }
}
class ParticleSystem {
  constructor(position) {
    this.origin = position;
    this.particles = [];
    this.intensity = 1;
  }
  addParticle() {
    for (let i = 0; i < this.intensity * 10; i++) {
      this.particles.push(new Particle(this.origin));
    }
  }
  run() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update()) this.particles.splice(i, 1);
    }
  }
}
let baseIntensity = 1.0;

const particleSystem = new ParticleSystem(new THREE.Vector3(0, 1.5, -3));
scene.add(particleSystem);
scene.add(clownFace);

// 💡 Lighting
scene.add(new THREE.AmbientLight(0xffffff, 1));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(0, 3, 5);
scene.add(directionalLight);
scene.add(new THREE.DirectionalLightHelper(directionalLight, 1));

// 🎧 Audio & Visualizer Logic
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
gainNode = audioContext.createGain();
gainNode.gain.value = globalVolume;
gainNode.connect(audioContext.destination);
let currentSource = null;
let jamendoAudio = null;

function visualizeStream(source, analyser) {
  analyser.fftSize = 256;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    const low = dataArray.slice(0, 32).reduce((a, b) => a + b, 0) / 32;
    const mid = dataArray.slice(32, 96).reduce((a, b) => a + b, 0) / 64;

    leftEye.scale.y = 1 + low / 256;
    rightEye.scale.y = 1 + low / 256;
    nose.scale.set(1 + mid / 256, 1 + mid / 256, 1);
    mouth.scale.y = 1 + mid / 256;
    mouth1.scale.y = 1 + mid / 256;
    particleSystem.intensity = baseIntensity * (low / 128); // Boost, not replace
    particleSystem.addParticle();
    particleSystem.run();
    renderer.render(scene, camera);
  }

  draw();
}

// 📂 File Upload Handling
document.getElementById("stopBtn").addEventListener("click", () => {
  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
    currentSource = null;
  }
  if (jamendoAudio) {
    jamendoAudio.pause();
    jamendoAudio = null;
  }
});

fileInput.addEventListener("change", function () {
  const file = this.files[0];
  const reader = new FileReader();

  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
    currentSource = null;
  }

  reader.onload = () => {
    audioContext.decodeAudioData(reader.result, buffer => {
      const source = audioContext.createBufferSource();
      const analyser = audioContext.createAnalyser();
      source.buffer = buffer;
      source.connect(analyser);
      analyser.connect(gainNode);

      source.start();
      currentSource = source;
      visualizeStream(source, analyser);
    });
  };

  reader.readAsArrayBuffer(file);
});

// 🔍 Jamendo Music Integration
const jamendoSearchInput = document.getElementById('jamendoSearch');
const jamendoSearchBtn = document.getElementById('jamendoSearchBtn');
const jamendoResults = document.getElementById('jamendoResults');
const jamendoPlayBtn = document.getElementById('jamendoPlayBtn');

const JAMENDO_CLIENT_ID = 'de89508a';

jamendoSearchBtn.addEventListener('click', () => {
  const query = jamendoSearchInput.value.trim();
  if (!query) return;
  fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=10&namesearch=${encodeURIComponent(query)}&audioformat=mp31`)
    .then(res => res.json())
    .then(data => {
      jamendoResults.innerHTML = '';
      data.results.forEach(track => {
        const opt = document.createElement('option');
        opt.value = track.audio;
        opt.text = `${track.name} - ${track.artist_name}`;
        jamendoResults.appendChild(opt);
      });
    });
});

jamendoPlayBtn.addEventListener('click', () => {
  const url = jamendoResults.value;
  if (!url) return;

  if (audioContext.state === 'suspended') audioContext.resume();
  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
    currentSource = null;
  }
  if (jamendoAudio) {
    jamendoAudio.pause();
    jamendoAudio = null;
  }

  jamendoAudio = new Audio(url);
  jamendoAudio.volume = globalVolume;

  jamendoAudio.crossOrigin = 'anonymous';
  const source = audioContext.createMediaElementSource(jamendoAudio);
  const analyser = audioContext.createAnalyser();
  source.connect(analyser);
  analyser.connect(gainNode);
  jamendoAudio.play();
  visualizeStream(source, analyser);
});

// 🌀 Start animation loop
function animate() {
  requestAnimationFrame(animate);
  particleSystem.addParticle();
  particleSystem.run();
  renderer.render(scene, camera);
}

animate();
const menuToggle = document.getElementById('menuToggle');
const controls = document.getElementById('controls');

menuToggle.addEventListener('click', () => {
  controls.classList.toggle('hidden');
  menuToggle.textContent = controls.classList.contains('hidden') ? '☰' : '✖';
});
