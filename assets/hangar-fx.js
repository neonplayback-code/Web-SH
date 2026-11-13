// HANGAR effects layer (RGB control-room look). Everything here is inert in ASTRA, paused while the tab is hidden and
// reduced or removed in "lite" performance mode and with prefers-reduced-motion. Nothing here fakes system state:
// the boot sequence and the telemetry panel only show values read from the page (counts, network, measured frame rate).
const root = document.documentElement;
const $ = selector => document.querySelector(selector);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const active = () => root.dataset.mode === "overdrive" && !document.hidden;
const motion = () => active() && !reduced.matches;
const rr = (a, b) => a + Math.random() * (b - a);
const SVG_NS = "http://www.w3.org/2000/svg";

// ---------- Circuit flow: traces along the screen edges with energy packets travelling on them ----------
let circuits = null, builtFor = "";
function buildCircuits() {
  const key = `${innerWidth}x${innerHeight}|${root.dataset.quality}`;
  if (builtFor === key && circuits) return;
  builtFor = key;
  if (!circuits) {
    circuits = document.createElementNS(SVG_NS, "svg");
    circuits.id = "hg-circuits"; circuits.setAttribute("aria-hidden", "true");
    document.body.prepend(circuits);
  }
  circuits.replaceChildren();
  const W = innerWidth, H = innerHeight;
  circuits.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const margin = Math.min(.16 * W, 240);
  const count=({low:3,medium:7,max:12})[root.dataset.quality]||7;
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    let x = left ? rr(6, margin * .7) : W - rr(6, margin * .7), y = rr(0, H);
    const points = [[x, y]];
    for (let k = 0; k < 6; k++) {
      if (k % 2 === 0) y += rr(70, 240) * (Math.random() < .5 ? -1 : 1);
      else x = Math.min(left ? margin : W, Math.max(left ? 0 : W - margin, x + rr(24, 80) * (Math.random() < .5 ? 1 : -1)));
      y = Math.min(H, Math.max(0, y));
      points.push([x, y]);
    }
    const d = `M${points.map(p => `${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join(" L")}`;
    const trace = document.createElementNS(SVG_NS, "path"); trace.setAttribute("d", d); trace.setAttribute("class", "hg-trace");
    const packet = document.createElementNS(SVG_NS, "path"); packet.setAttribute("d", d); packet.setAttribute("class", "hg-packet");
    packet.style.animationDuration = `${rr(5, 11).toFixed(1)}s`; packet.style.animationDelay = `-${rr(0, 9).toFixed(1)}s`;
    circuits.append(trace, packet);
    for (const [px, py] of [points[0], points[points.length - 1]]) {
      const node = document.createElementNS(SVG_NS, "rect");
      node.setAttribute("x", (px - 2.5).toFixed(0)); node.setAttribute("y", (py - 2.5).toFixed(0)); node.setAttribute("width", "5"); node.setAttribute("height", "5"); node.setAttribute("class", "hg-node");
      circuits.append(node);
    }
  }
}

// ---------- Cursor spotlight / reactive grid ----------
let spotQueued = false, spot = null;
addEventListener("pointermove", event => {
  if (!motion() || spotQueued) return;
  spotQueued = true;
  requestAnimationFrame(() => { spotQueued = false; root.style.setProperty("--mx", `${event.clientX}px`); root.style.setProperty("--my", `${event.clientY}px`); });
}, { passive: true });
function ensureSpot() { if (!spot) { spot = document.createElement("div"); spot.id = "hg-spot"; spot.setAttribute("aria-hidden", "true"); document.body.prepend(spot); } }

// ---------- Boot sequence: real values, quick, never blocks input ----------
function bootSequence() {
  if (!motion() || $("#hg-boot")) return;
  const num = selector => $(selector)?.textContent?.trim() || "0";
  const lines = [
    ["HANGAR // inicializando módulos", ""],
    ["Accesos", num("[data-shortcut-count]")],
    ["Juegos", num("[data-game-count]")],
    ["Plugins activos", num("[data-plugin-readout]")],
    ["Red", navigator.onLine ? "en línea" : "sin conexión"]
  ];
  const box = document.createElement("div");
  box.id = "hg-boot"; box.setAttribute("aria-hidden", "true");
  const log = document.createElement("pre"); const bar = document.createElement("i");
  box.append(log, bar); document.body.append(box);
  let i = 0;
  const step = () => {
    if (!box.isConnected) return;
    if (i < lines.length) {
      const [label, value] = lines[i++];
      log.textContent += `${value ? `${label.padEnd(18, ".")} ${value}` : label}\n`;
      bar.style.width = `${i / lines.length * 100}%`;
      setTimeout(step, 110);
    } else { box.classList.add("is-done"); setTimeout(() => box.remove(), 420); }
  };
  step();
}

// ---------- Micro glitch: short and rare, only on big headings ----------
setInterval(() => {
  if (!motion()) return;
  const target = [$("#greeting"), $(".stage-title")].filter(Boolean)[Math.floor(Math.random() * 2)];
  if (!target) return;
  target.classList.add("hg-glitch");
  setTimeout(() => target.classList.remove("hg-glitch"), 300);
}, 9000);

// ---------- Telemetry: measured frame rate + live counters ----------
const fpsCanvas = $("#hg-fps"), fpsValue = $("#hg-fps-val"), net = $("#hg-net");
const samples = [];
let rafId = 0, frames = 0, windowStart = 0;
function drawFps() {
  if (!fpsCanvas) return;
  const g = fpsCanvas.getContext("2d"), w = fpsCanvas.width, h = fpsCanvas.height;
  g.clearRect(0, 0, w, h);
  const css = getComputedStyle(root), c1 = css.getPropertyValue("--hg-ac").trim() || "#00e5ff", c2 = css.getPropertyValue("--hg-ac3").trim() || "#ff2bd6";
  g.strokeStyle = "rgba(255,255,255,.06)"; g.lineWidth = 1;
  for (let y = 16; y < h; y += 16) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
  if (samples.length < 2) return;
  const step = w / 59, grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  g.beginPath();
  samples.forEach((v, n) => {
    const x = w - (samples.length - 1 - n) * step, y = h - 4 - Math.min(1, v / 75) * (h - 8);
    if (n) g.lineTo(x, y);
    else g.moveTo(x, y);
  });
  g.strokeStyle = grad; g.lineWidth = 2; g.shadowColor = c1; g.shadowBlur = 8; g.stroke(); g.shadowBlur = 0;
  g.lineTo(w, h); g.lineTo(w - (samples.length - 1) * step, h); g.closePath();
  const fill = g.createLinearGradient(0, 0, 0, h); fill.addColorStop(0, "rgba(0,229,255,.18)"); fill.addColorStop(1, "rgba(0,229,255,0)");
  g.fillStyle = fill; g.fill();
}
function tick(now) {
  if (!active() || !fpsCanvas) { rafId = 0; return; }
  rafId = requestAnimationFrame(tick);
  frames++;
  if (!windowStart) windowStart = now;
  if (now - windowStart >= 500) {
    const fps = Math.round(frames * 1000 / (now - windowStart));
    frames = 0; windowStart = now;
    samples.push(fps); if (samples.length > 60) samples.shift();
    if (fpsValue) fpsValue.textContent = String(fps);
    drawFps();
  }
}
function startTelemetry() { if (!rafId && active() && fpsCanvas) { windowStart = 0; frames = 0; rafId = requestAnimationFrame(tick); } }
function updateNet() { if (net) { net.textContent = navigator.onLine ? "en línea" : "sin conexión"; net.dataset.state = navigator.onLine ? "ok" : "down"; } }
addEventListener("online", updateNet); addEventListener("offline", updateNet); updateNet();

// ---------- Mode lifecycle ----------
function sync(entering = false) {
  if (root.dataset.mode !== 'overdrive') {
    if(rafId){cancelAnimationFrame(rafId);rafId=0;}
    if(circuits){circuits.remove();circuits=null;builtFor='';}
    if(spot){spot.remove();spot=null;}
    return;
  }
  ensureSpot(); buildCircuits(); startTelemetry();
  if (entering) bootSequence();
}
document.addEventListener("od-mode-change", () => sync(true));
document.addEventListener("od-quality-change",()=>sync(false));
document.addEventListener("visibilitychange", () => sync(false));
let resizeTimer = 0;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (root.dataset.mode === "overdrive") buildCircuits(); }, 200); }, { passive: true });
new MutationObserver(() => { if (root.dataset.mode === "overdrive") buildCircuits(); }).observe(root, { attributes: true, attributeFilter: ["class"] });
// First paint in HANGAR: boot once per browser session; later tabs skip it.
let firstBoot = false;
try { firstBoot = !sessionStorage.getItem("od-hg-booted"); sessionStorage.setItem("od-hg-booted", "1"); } catch { /* no session storage */ }
sync(firstBoot);
