// The 3D world behind the home page story (test 2: dark gym under one spotlight).
// Plain Three.js so it loads on its own after the page shows.
// Scroll progress 0 → 1 drives the camera, the plates sliding on and the bar lifting.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, CylinderGeometry, LatheGeometry, PlaneGeometry, RingGeometry,
  ConeGeometry, ExtrudeGeometry, Shape, Path, BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, CanvasTexture, PMREMGenerator, DirectionalLight,
  SpotLight, HemisphereLight, Vector2, Vector3, Color, Fog, SRGBColorSpace, ACESFilmicToneMapping, RepeatWrapping,
  AdditiveBlending, DoubleSide, MathUtils,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Urethane plates in the style of commercial gym plates (12 sides, two handles, steel hub, white numbers).
// The coloured ring shows the coaching level. Loaded heaviest first, nearest the collar.
// R = corner radius of the 12-sided plate, t = thickness, in metres.
export const PLATES = [
  { plan: "premium", kg: 25, accent: "#8b3fd1", R: 0.226, t: 0.046, from: 0.24, to: 0.35 },
  { plan: "monthly", kg: 20, accent: "#c8102e", R: 0.206, t: 0.041, from: 0.36, to: 0.47 },
  { plan: "oneoff", kg: 15, accent: "#d8dadd", R: 0.186, t: 0.037, from: 0.48, to: 0.58 },
];
const CLIP = { from: 0.585, to: 0.63 };
const LIFT = { from: 0.66, to: 0.88, height: 0.62 };
const BAR_Y = 1.0;
const COLLAR_X = 0.685;
const SLEEVE_END = 1.1;

const SHOTS = [
  { p: 0.0, pos: [2.05, 1.62, 1.55], tgt: [-0.95, 1.42, -0.5] },
  { p: 0.12, pos: [1.95, 1.4, 1.35], tgt: [0.25, 1.08, -0.1] },
  { p: 0.23, pos: [1.78, 1.13, 1.12], tgt: [0.6, 1.0, 0] },
  { p: 0.6, pos: [1.62, 1.24, 0.98], tgt: [0.62, 1.0, 0] },
  { p: 0.7, pos: [-0.2, 1.05, 4.25], tgt: [-0.68, 1.2, 0] },
  { p: 0.88, pos: [-0.2, 0.95, 4.2], tgt: [-0.68, 1.22, 0] },
  { p: 1.0, pos: [-0.15, 0.9, 3.95], tgt: [-0.64, 1.3, 0] },
];
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

function canvasTexture(w, h, draw, colour = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new CanvasTexture(c);
  if (colour) t.colorSpace = SRGBColorSpace;
  return t;
}

// 12-sided plate with softened corners, a centre hole and two handle slots.
function plateShape(R) {
  const s = new Shape();
  const n = 12, cut = R * 0.07;
  const corner = (i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / 12;
    return new Vector2(Math.cos(a) * R, Math.sin(a) * R);
  };
  for (let i = 0; i < n; i++) {
    const c = corner(i), prev = corner((i + n - 1) % n), next = corner((i + 1) % n);
    const a = c.clone().add(prev.clone().sub(c).setLength(cut));
    const b = c.clone().add(next.clone().sub(c).setLength(cut));
    if (i === 0) s.moveTo(a.x, a.y);
    else s.lineTo(a.x, a.y);
    s.quadraticCurveTo(c.x, c.y, b.x, b.y);
  }
  s.closePath();
  const hole = new Path();
  hole.absarc(0, 0, 0.0262, 0, Math.PI * 2, true);
  s.holes.push(hole);
  // two handle slots, left and right
  const r1 = R * 0.6, r2 = R * 0.8, half = 0.36, rc = (r2 - r1) / 2, rm = (r1 + r2) / 2;
  for (const base of [0, Math.PI]) {
    const a0 = base - half, a1 = base + half;
    const h = new Path();
    h.absarc(0, 0, r2, a0, a1, false);
    h.absarc(Math.cos(a1) * rm, Math.sin(a1) * rm, rc, a1, a1 + Math.PI, false);
    h.absarc(0, 0, r1, a1, a0, true);
    h.absarc(Math.cos(a0) * rm, Math.sin(a0) * rm, rc, a0 + Math.PI, a0 + Math.PI * 2, false);
    s.holes.push(h);
  }
  return s;
}

function plateGeometry(R, t) {
  const bevel = Math.min(0.006, t * 0.16);
  const g = new ExtrudeGeometry(plateShape(R), {
    depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 3, curveSegments: 28,
  });
  g.translate(0, 0, -(t - bevel * 2) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

// Stainless hub insert: a ring that stands a little proud of both faces.
function hubGeometry(t) {
  const h = t / 2 + 0.0025, r0 = 0.0258, r1 = 0.058;
  const pts = [[r0, -h], [r1 - 0.004, -h], [r1, -h + 0.004], [r1, h - 0.004], [r1 - 0.004, h], [r0, h], [r0, -h]].map(([x, y]) => new Vector2(x, y));
  const g = new LatheGeometry(pts, 64);
  g.rotateZ(-Math.PI / 2);
  return g;
}

function plateLabel(kg, R) {
  return canvasTexture(512, 512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "#f4f4f5";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    try { ctx.fontStretch = "expanded"; } catch {}
    // numbers sit between the handles, top and bottom, like the real thing
    ctx.font = `900 ${Math.round(70 * (0.226 / R) ** 0.2)}px Archivo, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(`${kg} KG`, s / 2, s * 0.82);
    ctx.fillText(`${kg} KG`, s / 2, s * 0.18);
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
    p.y = mod(p.y + uTime * (0.015 + 0.025 * aSeed), 3.2);
    p.x += sin(uTime * 0.3 + aSeed * 6.2831) * 0.05;
    p.z += cos(uTime * 0.25 + aSeed * 4.0) * 0.04;
    float beam = smoothstep(1.5, 0.1, length(p.xz - vec2(0.1, 0.2)));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = ndc - uPointer;
    d.x *= uAspect;
    float dist = length(d);
    float push = smoothstep(0.3, 0.0, dist) * 0.1;
    vec2 dir = d / max(dist, 0.0001);
    dir.x /= uAspect;
    ndc += dir * push;
    clip.xy = ndc * clip.w;
    gl_Position = clip;
    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) / -mv.z;
    vAlpha = (0.06 + 0.5 * beam) * (0.4 + 0.6 * aSeed) * smoothstep(0.0, 0.3, p.y) * smoothstep(3.2, 2.6, p.y);
  }
`;
const DUST_FRAG = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(0.92, 0.9, 1.0), smoothstep(0.5, 0.0, d) * vAlpha);
  }
`;
const BEAM_VERT = /* glsl */ `
  varying float vY;
  varying float vEdge;
  void main() {
    vY = position.y;
    vec3 n = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vEdge = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_FRAG = /* glsl */ `
  uniform float uHeight;
  uniform float uStrength;
  varying float vY;
  varying float vEdge;
  void main() {
    float t = clamp(vY / uHeight + 0.5, 0.0, 1.0);
    float a = pow(vEdge, 2.2) * mix(0.25, 1.0, t) * uStrength;
    gl_FragColor = vec4(vec3(0.86, 0.84, 0.95), a);
  }
`;

export function createIronWorld(host, { phone = false, still = false } = {}) {
  const renderer = new WebGLRenderer({ antialias: !phone, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color("#000000");
  scene.fog = new Fog("#000000", 4.5, 11);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.28;

  const camera = new PerspectiveCamera(32, 1, 0.05, 40);

  const disposables = [];
  const keep = (x) => (disposables.push(x), x);

  // ---------- light: one hard spotlight from above, purple from behind, a crimson kick low in front ----------
  const spot = new SpotLight("#f1efff", 42, 0, 0.5, 0.85, 2);
  spot.position.set(0.1, 4.3, 0.6);
  spot.target.position.set(0, 0.9, 0);
  scene.add(spot, spot.target);
  const purple = new DirectionalLight("#8b3fd1", 3.2);
  purple.position.set(-2.4, 1.8, -3);
  const crimson = new DirectionalLight("#c8102e", 1.4);
  crimson.position.set(2.6, 0.2, 2.2);
  scene.add(purple, crimson, new HemisphereLight("#26262c", "#000000", 0.35));

  // purple haze far behind, a low crimson glow on the horizon
  const hazeTex = keep(canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    let g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.42);
    g.addColorStop(0, "rgba(98,30,150,0.75)"); g.addColorStop(0.45, "rgba(52,14,84,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    g = ctx.createRadialGradient(w * 0.58, h * 0.86, 0, w * 0.58, h * 0.86, w * 0.3);
    g.addColorStop(0, "rgba(200,16,46,0.32)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }));
  const haze = new Mesh(keep(new PlaneGeometry(26, 13)), keep(new MeshBasicMaterial({ map: hazeTex, fog: false, depthWrite: false, toneMapped: false })));
  haze.position.set(0, 2.2, -8);
  haze.renderOrder = -2;
  scene.add(haze);

  // rubber floor that catches the spotlight and fades out into the dark (no hard horizon)
  const floorFade = keep(canvasTexture(256, 256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "#fff"); g.addColorStop(0.45, "#fff"); g.addColorStop(1, "#000");
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }, false));
  const floor = new Mesh(keep(new PlaneGeometry(12, 12)), keep(new MeshStandardMaterial({ color: "#0c0c0e", roughness: 0.92, metalness: 0, transparent: true, alphaMap: floorFade, depthWrite: false })));
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  scene.add(floor);

  // the light beam itself
  const beamH = 4.2;
  const beamGeo = keep(new ConeGeometry(1.35, beamH, 64, 1, true));
  const beamMat = keep(new ShaderMaterial({
    vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending, fog: false,
    uniforms: { uHeight: { value: beamH }, uStrength: { value: phone ? 0.07 : 0.085 } },
  }));
  const beam = new Mesh(beamGeo, beamMat);
  beam.position.set(0.1, 4.3 - beamH / 2, 0.45);
  beam.rotation.x = -0.1;
  scene.add(beam);

  // ---------- the bar ----------
  const knurl = keep(canvasTexture(256, 256, (ctx, s) => {
    ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 6;
    for (let i = -s; i < s * 2; i += 24) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + s, 0); ctx.lineTo(i, s); ctx.stroke();
    }
  }, false));
  knurl.wrapS = knurl.wrapT = RepeatWrapping;
  knurl.repeat.set(3, 90);

  const steel = keep(new MeshStandardMaterial({ color: "#8e959c", metalness: 1, roughness: 0.4, bumpMap: knurl, bumpScale: 0.9 }));
  const chrome = keep(new MeshStandardMaterial({ color: "#e4e7ea", metalness: 1, roughness: 0.12 }));
  const stainless = keep(new MeshStandardMaterial({ color: "#d3d7db", metalness: 1, roughness: 0.22 }));
  const blackSteel = keep(new MeshStandardMaterial({ color: "#18181b", metalness: 0.85, roughness: 0.35 }));

  const bar = new Group();
  bar.position.y = BAR_Y;
  scene.add(bar);
  const shaftGeo = keep(new CylinderGeometry(0.014, 0.014, COLLAR_X * 2, 32, 1, true));
  shaftGeo.rotateZ(Math.PI / 2);
  bar.add(new Mesh(shaftGeo, steel));

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
    const cap = new Mesh(capGeo, blackSteel);
    cap.position.x = SLEEVE_END;
    side.add(cap);
    return side;
  });

  // ---------- plates ----------
  const urethane = keep(new MeshPhysicalMaterial({ color: "#121214", roughness: 0.62, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: new Color("#3a3a44") }));
  let seat = COLLAR_X;
  const plates = PLATES.map((spec) => {
    const geo = keep(plateGeometry(spec.R, spec.t));
    const hubGeo = keep(hubGeometry(spec.t));
    const ringMat = keep(new MeshStandardMaterial({ color: spec.accent, emissive: spec.accent, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 }));
    const ringGeo = keep(new RingGeometry(spec.R * 0.855, spec.R * 0.885, 72));
    const label = keep(plateLabel(spec.kg, spec.R));
    const labelMat = keep(new MeshBasicMaterial({ map: label, transparent: true, depthWrite: false, toneMapped: false }));
    const labelGeo = keep(new PlaneGeometry(spec.R * 1.9, spec.R * 1.9));
    const x = seat + spec.t / 2;
    seat += spec.t;
    const pair = sides.map((side, si) => {
      const g = new Group();
      g.add(new Mesh(geo, urethane));
      g.add(new Mesh(hubGeo, stainless));
      for (const face of [1, -1]) {
        const ring = new Mesh(ringGeo, ringMat);
        ring.rotation.y = face * Math.PI / 2;
        ring.position.x = face * (spec.t / 2 + 0.0008);
        g.add(ring);
        const l = new Mesh(labelGeo, labelMat);
        l.rotation.y = face * Math.PI / 2;
        l.position.x = face * (spec.t / 2 + 0.0012);
        if (si === 1) l.scale.x = -1;
        g.add(l);
      }
      side.add(g);
      return g;
    });
    return { spec, x, pair };
  });

  const clipGeo = keep(new CylinderGeometry(0.036, 0.036, 0.03, 40));
  clipGeo.rotateZ(Math.PI / 2);
  const clipX = seat + 0.017;
  const clips = sides.map((side) => {
    const c = new Mesh(clipGeo, blackSteel);
    side.add(c);
    return c;
  });

  // soft dark shadow under the bar, inside the light pool
  const shadowTex = keep(canvasTexture(256, 256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,0.85)"); g.addColorStop(0.6, "rgba(0,0,0,0.3)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }));
  const shadow = new Mesh(keep(new PlaneGeometry(1, 1)), keep(new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  scene.add(shadow);

  // ---------- dust in the light ----------
  const count = still ? 0 : phone ? 320 : 800;
  let dust = null;
  if (count) {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4.4;
      pos[i * 3 + 1] = Math.random() * 3.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
      seed[i] = Math.random();
    }
    const g = keep(new BufferGeometry());
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new Float32BufferAttribute(seed, 1));
    const m = keep(new ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPointer: { value: new Vector2(9, 9) }, uAspect: { value: 1 }, uSize: { value: phone ? 24 : 28 }, uPixelRatio: { value: pixelRatio } },
    }));
    dust = new Points(g, m);
    dust.frustumCulled = false;
    scene.add(dust);
  }

  // ---------- state ----------
  let progress = still ? 0.64 : 0;
  let shown = progress;
  const pointer = new Vector2(), pointerSmooth = new Vector2(), dustPointer = new Vector2(9, 9);
  const ZERO = new Vector2(0, 0), FAR = new Vector2(9, 9);
  let pointerActive = false, aspect = 1, visible = true, raf = 0, last = performance.now(), time = 0, slowFrames = 0, frames = 0;
  const camPos = new Vector3(), camTgt = new Vector3(), tmpA = new Vector3(), tmpB = new Vector3();

  function shotAt(p, outPos, outTgt) {
    const shots = aspect < 0.8 ? SHOTS_TALL : SHOTS;
    let i = 0;
    while (i < shots.length - 2 && p > shots[i + 1].p) i++;
    const a = shots[i], b = shots[i + 1];
    const k = smooth(span(p, a.p, b.p));
    outPos.set(...a.pos).lerp(tmpA.set(...b.pos), k);
    outTgt.set(...a.tgt).lerp(tmpB.set(...b.tgt), k);
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
      const startX = SLEEVE_END + 0.34 + spec.R * 0.4;
      for (const g of pair) {
        g.position.x = MathUtils.lerp(startX, x, k);
        g.position.y = (1 - k) * 0.07;
        g.rotation.x = (1 - k) * 1.9;
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
    for (const s of sides) s.rotation.x = t * 0.1;
    const loaded = span(p, 0.24, 0.5);
    shadow.material.opacity = (0.5 + loaded * 0.5) * (1 - (lift / LIFT.height) * 0.5);
    const sc = 1 + lift * 0.6;
    shadow.scale.set(2.8 * sc, (0.55 + loaded * 0.35) * sc, 1);
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
    setProgress(p) { progress = clamp01(p); },
    setPointer(x, y, active = true) { pointer.set(x, y); pointerActive = active; },
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
