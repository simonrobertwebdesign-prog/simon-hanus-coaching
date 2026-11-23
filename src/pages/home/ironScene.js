// The 3D barbell world behind the home page story.
// Plain Three.js (no extra React layer) so it loads on its own after the page shows.
// Scroll progress 0 → 1 drives everything: the camera, the plates sliding on, the bar lifting.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, CylinderGeometry, LatheGeometry, PlaneGeometry,
  BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, MeshStandardMaterial, MeshPhysicalMaterial,
  MeshBasicMaterial, CanvasTexture, PMREMGenerator, DirectionalLight, HemisphereLight, Vector2, Vector3,
  SRGBColorSpace, ACESFilmicToneMapping, RepeatWrapping, Color, MathUtils,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Calibrated plates, loaded the way a lifter would: heaviest first, nearest the collar.
// Sizes in metres (IPF calibrated plates).
export const PLATES = [
  { plan: "premium", kg: 25, colour: "#d3262e", ink: "#ffffff", R: 0.225, t: 0.027, from: 0.24, to: 0.35 },
  { plan: "monthly", kg: 20, colour: "#1f4fa6", ink: "#ffffff", R: 0.225, t: 0.0225, from: 0.36, to: 0.47 },
  { plan: "oneoff", kg: 15, colour: "#f0b400", ink: "#15202b", R: 0.2, t: 0.021, from: 0.48, to: 0.58 },
];
const CLIP = { from: 0.585, to: 0.63 };
const LIFT = { from: 0.66, to: 0.88, height: 0.62 };
const BAR_Y = 1.0;
const COLLAR_X = 0.685; // where the sleeve starts (inner face of the collar)
const SLEEVE_END = 1.1;

// Camera stops along the scroll. pos = where the camera is, tgt = what it looks at.
const SHOTS = [
  { p: 0.0, pos: [2.05, 1.62, 1.55], tgt: [-0.95, 1.42, -0.5] },
  { p: 0.12, pos: [1.95, 1.4, 1.35], tgt: [0.25, 1.08, -0.1] },
  { p: 0.23, pos: [1.78, 1.13, 1.12], tgt: [0.6, 1.0, 0] },
  { p: 0.6, pos: [1.62, 1.24, 0.98], tgt: [0.62, 1.0, 0] },
  { p: 0.7, pos: [-0.2, 1.05, 4.25], tgt: [-0.68, 1.2, 0] },
  { p: 0.88, pos: [-0.2, 0.95, 4.2], tgt: [-0.68, 1.22, 0] },
  { p: 1.0, pos: [-0.15, 0.9, 3.95], tgt: [-0.64, 1.3, 0] },
];

// Phones (tall screens): the words sit on top, so the bar is framed in the lower part.
const SHOTS_TALL = [
  { p: 0.0, pos: [1.6, 1.75, 1.7], tgt: [0.15, 1.32, -0.1] },
  { p: 0.12, pos: [1.9, 1.55, 2.1], tgt: [0.42, 1.48, 0] },
  { p: 0.23, pos: [1.95, 1.55, 1.6], tgt: [0.72, 1.45, 0] },
  { p: 0.6, pos: [1.85, 1.6, 1.5], tgt: [0.74, 1.47, 0] },
  { p: 0.7, pos: [0.0, 1.8, 6.5], tgt: [0.0, 2.45, 0] },
  { p: 0.88, pos: [0.0, 1.75, 6.4], tgt: [0.0, 2.45, 0] },
  { p: 1.0, pos: [0.0, 1.7, 6.2], tgt: [0.0, 2.4, 0] },
];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);
const easeOut = (v) => 1 - Math.pow(1 - v, 3);
const span = (p, a, b) => clamp01((p - a) / (b - a));

function canvasTexture(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// One plate: a lathe profile with a raised hub and rim, axis along X.
function plateGeometry(R, t) {
  const r0 = 0.0262, r1 = 0.072, h = t / 2;
  const pts = [
    [r0, -h], [r1, -h], [r1 + 0.008, -h * 0.74], [R - 0.012, -h * 0.74], [R - 0.002, -h * 0.62],
    [R, -h * 0.5], [R, h * 0.5], [R - 0.002, h * 0.62], [R - 0.012, h * 0.74], [r1 + 0.008, h * 0.74],
    [r1, h], [r0, h], [r0, -h],
  ].map(([x, y]) => new Vector2(x, y));
  const g = new LatheGeometry(pts, 72);
  g.rotateZ(-Math.PI / 2);
  return g;
}

function plateLabel(kg, ink) {
  return canvasTexture(512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    try { ctx.fontStretch = "expanded"; } catch {}
    ctx.font = `800 66px Archivo, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(`${kg} KG`, s / 2, s * 0.835);
    ctx.font = `700 22px Archivo, "Helvetica Neue", Arial, sans-serif`;
    ctx.globalAlpha = 0.8;
    ctx.fillText("SIMON HANUS", s / 2, s * 0.17);
  });
}

const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uAspect;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.02 + 0.03 * aSeed), 2.8);
    p.x += sin(uTime * 0.35 + aSeed * 6.2831) * 0.05;
    p.z += cos(uTime * 0.3 + aSeed * 4.0) * 0.04;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uPointer;
    d.x *= uAspect;
    float dist = length(d);
    float push = smoothstep(0.32, 0.0, dist) * 0.11;
    vec2 dir = d / max(dist, 0.0001);
    dir.x /= uAspect;
    ndc += dir * push;
    clip.xy = ndc * clip.w;
    gl_Position = clip;
    gl_PointSize = uSize * uPixelRatio * (0.55 + aSeed) / -mv.z;
    vAlpha = (0.3 + 0.55 * aSeed) * smoothstep(0.0, 0.25, p.y) * smoothstep(2.8, 2.3, p.y);
  }
`;
const DUST_FRAG = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    gl_FragColor = vec4(1.0, 1.0, 1.0, a);
  }
`;

export function createIronScene(host, { phone = false, still = false } = {}) {
  const renderer = new WebGLRenderer({ antialias: !phone, alpha: true, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.75;

  const camera = new PerspectiveCamera(32, 1, 0.05, 40);

  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(-2.5, 4, 3);
  const rim = new DirectionalLight(0xdfe8ff, 1.6);
  rim.position.set(3, 1.5, -3);
  scene.add(key, rim, new HemisphereLight(0xf3f5f7, 0x56626e, 0.6));

  // ---------- the bar ----------
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);

  const knurl = keep(canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    for (let i = -s; i < s * 2; i += 24) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + s, 0); ctx.lineTo(i, s); ctx.stroke();
    }
  }));
  knurl.colorSpace = "";
  knurl.wrapS = knurl.wrapT = RepeatWrapping;
  knurl.repeat.set(3, 90);

  const steel = keep(new MeshStandardMaterial({ color: "#a6aeb6", metalness: 1, roughness: 0.42, bumpMap: knurl, bumpScale: 0.9 }));
  const chrome = keep(new MeshStandardMaterial({ color: "#e4e8ec", metalness: 1, roughness: 0.14 }));
  const darkSteel = keep(new MeshStandardMaterial({ color: "#3a434c", metalness: 0.9, roughness: 0.35 }));

  const bar = new Group();
  bar.position.y = BAR_Y;
  scene.add(bar);

  const shaftGeo = keep(new CylinderGeometry(0.014, 0.014, COLLAR_X * 2, 32, 1, true));
  shaftGeo.rotateZ(Math.PI / 2);
  bar.add(new Mesh(shaftGeo, steel));

  // Each side spins on its own, like a real bar's sleeves.
  const sides = [1, -1].map((s) => {
    const side = new Group();
    side.scale.x = s;
    bar.add(side);
    const collarGeo = keep(new CylinderGeometry(0.04, 0.04, 0.03, 48));
    collarGeo.rotateZ(Math.PI / 2);
    const collar = new Mesh(collarGeo, chrome);
    collar.position.x = COLLAR_X - 0.015;
    side.add(collar);
    const sleeveGeo = keep(new CylinderGeometry(0.025, 0.025, SLEEVE_END - COLLAR_X, 48));
    sleeveGeo.rotateZ(Math.PI / 2);
    const sleeve = new Mesh(sleeveGeo, chrome);
    sleeve.position.x = (COLLAR_X + SLEEVE_END) / 2;
    side.add(sleeve);
    const capGeo = keep(new CylinderGeometry(0.027, 0.027, 0.012, 48));
    capGeo.rotateZ(Math.PI / 2);
    const cap = new Mesh(capGeo, darkSteel);
    cap.position.x = SLEEVE_END;
    side.add(cap);
    return side;
  });

  // ---------- plates ----------
  let seat = COLLAR_X;
  const plates = PLATES.map((spec) => {
    const geo = keep(plateGeometry(spec.R, spec.t));
    const mat = keep(new MeshPhysicalMaterial({ color: new Color(spec.colour), metalness: 0.25, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
    const label = keep(plateLabel(spec.kg, spec.ink));
    const labelMat = keep(new MeshBasicMaterial({ map: label, transparent: true, depthWrite: false, toneMapped: false }));
    const labelGeo = keep(new PlaneGeometry(spec.R * 2 * 0.96, spec.R * 2 * 0.96));
    const x = seat + spec.t / 2;
    seat += spec.t;
    const pair = sides.map((side, si) => {
      const g = new Group();
      const body = new Mesh(geo, mat);
      g.add(body);
      for (const face of [1, -1]) {
        const l = new Mesh(labelGeo, labelMat);
        l.rotation.y = face * Math.PI / 2;
        l.position.x = face * (spec.t * 0.37 + 0.0006);
        if (si === 1) l.scale.x = -1; // the left side is a mirror: flip the text back
        g.add(l);
      }
      side.add(g);
      return g;
    });
    return { spec, x, pair };
  });

  // spring clips
  const clipGeo = keep(new CylinderGeometry(0.034, 0.034, 0.028, 40));
  clipGeo.rotateZ(Math.PI / 2);
  const clipX = seat + 0.016;
  const clips = sides.map((side) => {
    const c = new Mesh(clipGeo, darkSteel);
    side.add(c);
    return c;
  });

  // ---------- soft shadow on the "floor" ----------
  const shadowTex = keep(canvasTexture(256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(21,32,43,0.55)");
    g.addColorStop(0.55, "rgba(21,32,43,0.18)");
    g.addColorStop(1, "rgba(21,32,43,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }));
  const shadowMat = keep(new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
  const shadowGeo = keep(new PlaneGeometry(1, 1));
  const shadow = new Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(2.9, 0.9, 1);
  scene.add(shadow);

  // ---------- chalk dust ----------
  const count = still ? 0 : phone ? 260 : 650;
  let dust = null;
  if (count) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4.6;
      pos[i * 3 + 1] = Math.random() * 2.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
      seed[i] = Math.random();
    }
    const g = keep(new BufferGeometry());
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new Float32BufferAttribute(seed, 1));
    const m = keep(new ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new Vector2(9, 9) },
        uAspect: { value: 1 },
        uSize: { value: phone ? 26 : 30 },
        uPixelRatio: { value: pixelRatio },
      },
    }));
    dust = new Points(g, m);
    dust.frustumCulled = false;
    scene.add(dust);
  }

  // ---------- state ----------
  let progress = still ? 0.64 : 0;
  let shown = progress;
  const pointer = new Vector2(0, 0);
  const pointerSmooth = new Vector2(0, 0);
  const dustPointer = new Vector2(9, 9);
  let pointerActive = false;
  let aspect = 1;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let slowFrames = 0, frames = 0;

  const camPos = new Vector3(), camTgt = new Vector3(), tmpA = new Vector3(), tmpB = new Vector3();
  const ZERO = new Vector2(0, 0), FAR = new Vector2(9, 9);

  function shotAt(p, outPos, outTgt) {
    const shots = aspect < 0.8 ? SHOTS_TALL : SHOTS;
    let i = 0;
    while (i < shots.length - 2 && p > shots[i + 1].p) i++;
    const a = shots[i], b = shots[i + 1];
    const k = smooth(span(p, a.p, b.p));
    outPos.set(...a.pos).lerp(tmpA.set(...b.pos), k);
    outTgt.set(...a.tgt).lerp(tmpB.set(...b.tgt), k);
    // Squarish screens (tablets): step back a little and bring the bar towards the middle.
    if (aspect >= 0.8 && aspect < 1.25) {
      const d = tmpA.copy(outPos).sub(outTgt).multiplyScalar(1.3);
      if (outTgt.x < 0) outTgt.x *= 0.5;
      outTgt.y += 0.18;
      outPos.copy(outTgt).add(d);
    }
  }

  function pose(p, t) {
    for (const { spec, x, pair } of plates) {
      const k = easeOut(span(p, spec.from, spec.to));
      const startX = SLEEVE_END + 0.32 + spec.R * 0.4;
      for (const g of pair) {
        g.position.x = MathUtils.lerp(startX, x, k);
        g.position.y = (1 - k) * 0.06;
        g.rotation.x = (1 - k) * 1.6;
        g.visible = k > 0.001;
      }
    }
    const ck = easeOut(span(p, CLIP.from, CLIP.to));
    for (const c of clips) {
      c.position.x = MathUtils.lerp(SLEEVE_END + 0.25, clipX, ck);
      c.visible = ck > 0.001;
    }
    const lift = smooth(span(p, LIFT.from, LIFT.to)) * LIFT.height;
    bar.position.y = BAR_Y + lift + Math.sin(t * 0.9) * 0.008;
    bar.rotation.z = Math.sin(t * 0.5) * 0.004;
    for (const s of sides) s.rotation.x = t * 0.12;
    const loaded = span(p, 0.24, 0.5);
    shadow.position.set(0, 0.001, 0);
    shadow.material.opacity = (0.55 + loaded * 0.45) * (1 - lift / LIFT.height * 0.55);
    const sc = 1 + lift * 0.5;
    shadow.scale.set(2.9 * sc, 0.75 * sc + loaded * 0.25, 1);
  }

  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 40 : 32;
    camera.updateProjectionMatrix();
    if (dust) dust.material.uniforms.uAspect.value = aspect;
    if (still) draw(0);
  }

  function draw(dt) {
    time += dt;
    shown += (progress - shown) * (still ? 1 : Math.min(1, dt * 7));
    pointerSmooth.lerp(pointerActive ? pointer : ZERO, Math.min(1, dt * 3));
    shotAt(still ? 0.7 : shown, camPos, camTgt);
    camPos.x += pointerSmooth.x * 0.14;
    camPos.y += pointerSmooth.y * 0.07;
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    pose(shown, still ? 0 : time);
    if (dust) {
      const u = dust.material.uniforms;
      u.uTime.value = time;
      dustPointer.lerp(pointerActive ? pointer : FAR, pointerActive ? Math.min(1, dt * 10) : 1);
      u.uPointer.value.copy(dustPointer);
    }
    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    draw(dt);
    // Struggling device? Drop the resolution once.
    frames++;
    if (frames > 30 && frames < 150) {
      if (dt > 0.026) slowFrames++;
      if (slowFrames > 45 && pixelRatio > 1) {
        pixelRatio = 1;
        renderer.setPixelRatio(1);
        if (dust) dust.material.uniforms.uPixelRatio.value = 1;
        resize();
      }
    }
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); });
  io.observe(host);
  const onVis = () => { visible = !document.hidden; last = performance.now(); };
  document.addEventListener("visibilitychange", onVis);

  resize();
  if (!still) raf = requestAnimationFrame(loop);
  window.addEventListener("resize", resize);

  return {
    canvas: renderer.domElement,
    setProgress(p) { progress = clamp01(p); },
    setPointer(x, y, active = true) { pointer.set(x, y); pointerActive = active; },
    redraw() { draw(0); },
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
      for (const d of disposables) d.dispose?.();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
