"use client"

import { useEffect, useRef } from "react"
import type { Texture, Vector2 } from "three"

import { canOptimize } from "@/utils/image-host"

/**
 * WebGL layer for the hero carousel. It renders the same CMS slide photos on a
 * tilted plane in a perspective scene: a slow cinematic push-in per slide, a
 * noise-dissolve transition with a gold seam between slides, a soft light that
 * follows the pointer (or finger), and a scroll-linked push/parallax as the hero
 * leaves the screen.
 *
 * Progressive enhancement only. The <Image> layers underneath stay the real
 * content (LCP, SEO, no-JS); this canvas fades in on top once the active
 * slide's texture is ready and fades out whenever it isn't. It never mounts
 * under reduced motion, on low-end phones (html[data-glass="lite"]), or
 * without WebGL. Three.js is loaded on idle, after first paint.
 */

type HeroSceneProps = {
  images: (string | undefined)[]
  index: number
  /** User pressed pause: freeze ambient motion (WCAG 2.2.2). */
  still: boolean
}

type SceneApi = {
  show: (index: number) => void
  setStill: (still: boolean) => void
  destroy: () => void
}

const SLIDE_DURATION_S = 6
const TRANSITION_S = 1.1
const OVERSCAN = 1.18 // plane is larger than the view so tilt/parallax never shows an edge
const FOV = 35

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform vec2 uCoverA;
  uniform vec2 uCoverB;
  uniform float uZoomA;
  uniform float uZoomB;
  uniform float uProgress;
  uniform vec2 uPointer;
  uniform float uLight;
  uniform float uDim;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  vec2 cover(vec2 uv, vec2 s, float zoom) { return (uv - 0.5) * s / zoom + 0.5; }

  void main() {
    vec3 a = texture2D(uA, cover(vUv, uCoverA, uZoomA)).rgb;
    vec3 b = texture2D(uB, cover(vUv, uCoverB, uZoomB)).rgb;

    // Left-to-right sweep broken up by noise, so the reveal reads as material, not a wipe.
    float n = noise(vUv * vec2(5.0, 3.0)) * 0.55 + vUv.x * 0.45;
    float front = uProgress * 1.3 - 0.15;
    float keepA = smoothstep(front - 0.07, front + 0.07, n);
    vec3 color = mix(b, a, keepA);

    vec3 gold = vec3(0.93, 0.74, 0.36);
    float seam = 1.0 - abs(keepA * 2.0 - 1.0);
    color += gold * seam * 0.45 * step(0.001, uProgress) * step(uProgress, 0.999);

    // Soft warm light under the pointer / finger.
    vec2 d = vUv - uPointer;
    color += gold * uLight * 0.09 * exp(-dot(d, d) * 6.0);

    gl_FragColor = vec4(color * (1.0 - uDim), 1.0);
  }
`

function textureUrl(src: string) {
  if (!canOptimize(src)) return src
  // Same-origin optimizer URL: no CORS issues for WebGL, and a phone-sized file.
  const target = window.innerWidth * Math.min(window.devicePixelRatio, 1.5)
  const w = target <= 828 ? 828 : target <= 1200 ? 1200 : 1920
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas")
    const gl = c.getContext("webgl2") ?? c.getContext("webgl")
    gl?.getExtension("WEBGL_lose_context")?.loseContext() // don't keep the probe context alive
    return !!gl
  } catch {
    return false
  }
}

async function createScene(
  host: HTMLDivElement,
  images: (string | undefined)[],
  initialIndex: number,
  initialStill: boolean,
): Promise<SceneApi> {
  const THREE = await import("three")

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "low-power" })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  const canvas = renderer.domElement
  canvas.setAttribute("aria-hidden", "true")
  canvas.className = "absolute inset-0 size-full opacity-0 transition-opacity duration-700 ease-out"
  host.appendChild(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
  const geometry = new THREE.PlaneGeometry(1, 1)
  const blank = new THREE.DataTexture(new Uint8Array([10, 30, 25, 255]), 1, 1)
  blank.needsUpdate = true

  const uniforms = {
    uA: { value: blank as Texture },
    uB: { value: blank as Texture },
    uCoverA: { value: new THREE.Vector2(1, 1) },
    uCoverB: { value: new THREE.Vector2(1, 1) },
    uZoomA: { value: 1 },
    uZoomB: { value: 1 },
    uProgress: { value: 0 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uLight: { value: 0 },
    uDim: { value: 0 },
  }
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms })
  const plane = new THREE.Mesh(geometry, material)
  scene.add(plane)

  // ── Textures: active slide first, the rest once it lands. ────────────────
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin("anonymous")
  const textures = new Map<number, Texture>()
  const pending = new Set<number>()
  function load(i: number) {
    const src = images[i]
    if (!src || textures.has(i) || pending.has(i)) return
    pending.add(i)
    loader.load(
      textureUrl(src),
      (tex) => {
        pending.delete(i)
        if (destroyed) return tex.dispose()
        tex.minFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        textures.set(i, tex)
        if (i === target) settleOn(i)
      },
      undefined,
      () => pending.delete(i), // CORS / 404: that slide just keeps the DOM image
    )
  }

  // ── State ────────────────────────────────────────────────────────────────
  let destroyed = false
  let still = initialStill
  let current = -1 // slide shown in uA
  let incoming = -1 // slide in uB while a transition runs
  let target = initialIndex // newest requested slide; queued while a transition runs
  let canvasShown = false
  let transitionT = -1 // seconds into a transition, -1 when idle
  let slideAgeA = 0
  let slideAgeB = 0
  let viewW = 1
  let viewH = 1
  let visible = true
  let raf = 0
  let last = performance.now()
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, light: 0, tlight: 0 }
  let scroll = 0

  function coverOf(tex: Texture, out: Vector2) {
    const img = tex.image as { width: number; height: number }
    const ia = img.width / img.height
    const pa = viewW / viewH
    if (pa > ia) out.set(1, ia / pa)
    else out.set(pa / ia, 1)
  }

  function setCanvasShown(shown: boolean) {
    canvasShown = shown
    canvas.style.opacity = shown ? "1" : "0"
  }

  // Jump straight to a slide (first paint, or its texture arrived late).
  function settleOn(i: number) {
    const tex = textures.get(i)
    if (!tex) return
    uniforms.uA.value = tex
    coverOf(tex, uniforms.uCoverA.value)
    uniforms.uProgress.value = 0
    transitionT = -1
    current = i
    incoming = -1
    slideAgeA = 0
    setCanvasShown(true)
    images.forEach((_, j) => load(j))
    kick()
  }

  function show(i: number) {
    target = i
    const tex = textures.get(i)
    if (!tex) {
      setCanvasShown(false) // DOM crossfade covers it until the texture lands
      load(i)
      return
    }
    // Hidden canvas: its fade-in over the DOM crossfade is the transition, so
    // never dissolve from whatever stale slide is still sitting in uA.
    if (current === -1 || !canvasShown) return settleOn(i)
    if (transitionT >= 0) return // picked up when the running dissolve completes
    if (current === i) return
    uniforms.uB.value = tex
    coverOf(tex, uniforms.uCoverB.value)
    incoming = i
    slideAgeB = 0
    transitionT = 0
    kick()
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  function resize() {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const dist = 10
    viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    viewW = viewH * camera.aspect
    camera.position.set(0, 0, dist)
    camera.updateProjectionMatrix()
    plane.scale.set(viewW * OVERSCAN, viewH * OVERSCAN, 1)
    if (uniforms.uA.value !== blank) coverOf(uniforms.uA.value, uniforms.uCoverA.value)
    if (uniforms.uB.value !== blank) coverOf(uniforms.uB.value, uniforms.uCoverB.value)
    kick()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  // ── Input: pointer anywhere over the hero section, touch included. ───────
  const section: HTMLElement = host.closest("section") ?? host
  function onPointer(e: PointerEvent) {
    const r = section.getBoundingClientRect()
    pointer.tx = (e.clientX - r.left) / r.width
    pointer.ty = 1 - (e.clientY - r.top) / r.height
    pointer.tlight = 1
    kick()
  }
  function onLeave() {
    pointer.tx = 0.5
    pointer.ty = 0.5
    pointer.tlight = 0
    kick()
  }
  function onScroll() {
    const r = section.getBoundingClientRect()
    scroll = Math.min(Math.max(-r.top / Math.max(r.height, 1), 0), 1)
    kick()
  }
  section.addEventListener("pointermove", onPointer, { passive: true })
  section.addEventListener("pointerdown", onPointer, { passive: true })
  section.addEventListener("pointerleave", onLeave)
  section.addEventListener("pointercancel", onLeave)
  window.addEventListener("scroll", onScroll, { passive: true })
  onScroll()

  // ── Render loop: only while on screen and the tab is visible. ────────────
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    kick()
  })
  io.observe(host)
  function onVisibility() {
    kick()
  }
  document.addEventListener("visibilitychange", onVisibility)

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k

  function frame(now: number) {
    raf = 0
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (!visible || document.hidden || destroyed) return

    const k = 1 - Math.exp(-dt * 4) // frame-rate independent smoothing
    pointer.x = lerp(pointer.x, pointer.tx, k)
    pointer.y = lerp(pointer.y, pointer.ty, k)
    pointer.light = lerp(pointer.light, pointer.tlight, k)
    uniforms.uPointer.value.set(pointer.x, pointer.y)
    uniforms.uLight.value = pointer.light

    if (!still) {
      slideAgeA += dt
      slideAgeB += dt
    }
    // Slow push-in over a slide's life (Ken Burns, but on a real camera plane).
    // The incoming slide starts a little closer and settles onto the same curve.
    const pushIn = (age: number) => 1 + 0.06 * Math.min(age / SLIDE_DURATION_S, 1)

    if (transitionT >= 0) {
      transitionT += dt
      const t = Math.min(transitionT / TRANSITION_S, 1)
      uniforms.uProgress.value = ease(t)
      if (t >= 1) {
        uniforms.uA.value = uniforms.uB.value
        uniforms.uCoverA.value.copy(uniforms.uCoverB.value)
        current = incoming
        incoming = -1
        slideAgeA = slideAgeB // continue from B's zoom without a jump
        uniforms.uProgress.value = 0
        transitionT = -1
        if (target !== current) show(target) // a slide change arrived mid-dissolve
      }
    }

    // After the swap, so the completing frame already uses the new slide's zoom.
    uniforms.uZoomA.value = pushIn(slideAgeA)
    uniforms.uZoomB.value = pushIn(slideAgeB) + 0.06 * (1 - uniforms.uProgress.value)

    // Restrained tilt toward the pointer + scroll-linked push and lift.
    plane.rotation.y = (pointer.x - 0.5) * 0.09
    plane.rotation.x = -(pointer.y - 0.5) * 0.06
    plane.position.y = scroll * viewH * 0.07
    camera.position.z = 10 * (1 - 0.1 * scroll)
    uniforms.uDim.value = scroll * 0.35

    renderer.render(scene, camera)

    const settling =
      transitionT >= 0 ||
      Math.abs(pointer.x - pointer.tx) > 0.001 ||
      Math.abs(pointer.y - pointer.ty) > 0.001 ||
      Math.abs(pointer.light - pointer.tlight) > 0.01
    const drifting = !still && slideAgeA < SLIDE_DURATION_S
    if (settling || drifting) kick()
  }

  function kick() {
    if (raf || destroyed) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  load(initialIndex)

  return {
    show,
    setStill(next) {
      still = next
      kick()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      section.removeEventListener("pointermove", onPointer)
      section.removeEventListener("pointerdown", onPointer)
      section.removeEventListener("pointerleave", onLeave)
      section.removeEventListener("pointercancel", onLeave)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onVisibility)
      textures.forEach((t) => t.dispose())
      blank.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}

export function HeroScene({ images, index, still }: HeroSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const indexRef = useRef(index)
  const stillRef = useRef(still)
  const imagesKey = images.join("|")

  useEffect(() => {
    indexRef.current = index
    apiRef.current?.show(index)
  }, [index])

  useEffect(() => {
    stillRef.current = still
    apiRef.current?.setStill(still)
  }, [still])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (document.documentElement.dataset.glass === "lite") return
    if (!webglAvailable()) return

    let cancelled = false
    let api: SceneApi | null = null
    // Wait for idle so three.js never competes with first paint / LCP.
    const hasIdle = typeof window.requestIdleCallback === "function"
    const start = () => {
      createScene(host, imagesKey.split("|").map((s) => s || undefined), indexRef.current, stillRef.current)
        .then((created) => {
          if (cancelled) return created.destroy()
          api = created
          apiRef.current = created
          // Catch up on index/still changes that landed while three.js was loading.
          created.show(indexRef.current)
          created.setStill(stillRef.current)
        })
        .catch(() => {}) // chunk failed to load: the photo carousel is already there
    }
    const handle = hasIdle ? window.requestIdleCallback(start, { timeout: 2000 }) : window.setTimeout(start, 300)

    return () => {
      cancelled = true
      if (hasIdle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
      api?.destroy()
      apiRef.current = null
    }
  }, [imagesKey])

  return <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
}
