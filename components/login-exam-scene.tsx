"use client"

import * as React from "react"
import * as THREE from "three"

const OPTIONS = ["A", "B", "C", "D"]
const QUESTION_COUNT = 5
// Jawaban yang "dipilih" tiap soal (index opsi)
const ANSWERS = [1, 3, 0, 2, 1]

function drawSheet(
  canvas: HTMLCanvasElement,
  progress: number,
  timeLeft: string
) {
  const ctx = canvas.getContext("2d")!
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  // kertas
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, 36)
  ctx.fill()

  // header
  ctx.fillStyle = "#2563eb"
  ctx.beginPath()
  ctx.roundRect(0, 0, w, 110, [36, 36, 0, 0])
  ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.font = "bold 40px sans-serif"
  ctx.textBaseline = "middle"
  ctx.fillText("Computer Based Test", 40, 55)
  ctx.font = "bold 34px monospace"
  ctx.textAlign = "right"
  ctx.fillText(timeLeft, w - 40, 55)
  ctx.textAlign = "left"

  // soal
  const rowH = (h - 110 - 40) / QUESTION_COUNT
  for (let q = 0; q < QUESTION_COUNT; q++) {
    const y = 110 + 20 + q * rowH
    ctx.fillStyle = "#e2e8f0"
    ctx.font = "bold 30px sans-serif"
    ctx.fillStyle = "#475569"
    ctx.fillText(`${q + 1}.`, 40, y + 28)
    ctx.fillStyle = "#e2e8f0"
    ctx.beginPath()
    ctx.roundRect(100, y + 18, w - 160 - (q % 2) * 90, 20, 10)
    ctx.fill()

    const answered = progress > q + 0.5
    OPTIONS.forEach((opt, i) => {
      const cx = 120 + i * 120
      const cy = y + 85
      const selected = answered && ANSWERS[q] === i
      ctx.beginPath()
      ctx.arc(cx, cy, 30, 0, Math.PI * 2)
      ctx.fillStyle = selected ? "#2563eb" : "#fff"
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = selected ? "#2563eb" : "#cbd5e1"
      ctx.stroke()
      ctx.fillStyle = selected ? "#fff" : "#64748b"
      ctx.font = "bold 28px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(opt, cx, cy + 1)
      ctx.textAlign = "left"
    })
    if (answered) {
      ctx.fillStyle = "#16a34a"
      ctx.font = "bold 40px sans-serif"
      ctx.fillText("✓", w - 90, y + 85)
    }
  }
}

export function LoginExamScene({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.2, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.4))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 5, 6)
    scene.add(key)

    const group = new THREE.Group()
    scene.add(group)

    // Lembar ujian (canvas texture)
    const sheetCanvas = document.createElement("canvas")
    sheetCanvas.width = 700
    sheetCanvas.height = 960
    const sheetTex = new THREE.CanvasTexture(sheetCanvas)
    sheetTex.colorSpace = THREE.SRGBColorSpace
    sheetTex.anisotropy = 4
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 4.8),
      new THREE.MeshBasicMaterial({ map: sheetTex, transparent: true })
    )
    group.add(sheet)

    // Bayangan lembar
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 4.9),
      new THREE.MeshBasicMaterial({
        color: 0x1e3a8a,
        transparent: true,
        opacity: 0.25,
      })
    )
    back.position.set(0.15, -0.15, -0.1)
    group.add(back)

    // Pensil 2B
    const pencil = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.8, 6),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    )
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.3, 6),
      new THREE.MeshStandardMaterial({ color: 0xf1c27d })
    )
    tip.position.y = -1.05
    const lead = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.1, 6),
      new THREE.MeshStandardMaterial({ color: 0x1f2937 })
    )
    lead.position.y = -1.25
    const eraser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xf472b6 })
    )
    eraser.position.y = 1
    pencil.add(body, tip, lead, eraser)
    pencil.position.set(2.2, -0.6, 0.8)
    pencil.rotation.z = Math.PI / 5
    group.add(pencil)

    // Jam (timer) berputar
    const clock = new THREE.Group()
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.07, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    )
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 40),
      new THREE.MeshBasicMaterial({ color: 0x2563eb })
    )
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.38, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    hand.geometry.translate(0, 0.19, 0)
    hand.position.z = 0.03
    clock.add(face, ring, hand)
    clock.position.set(-2.2, 2.2, 0.7)
    group.add(clock)

    // Gelembung jawaban melayang
    const bubbles: THREE.Mesh[] = []
    const bubbleGeo = new THREE.TorusGeometry(0.16, 0.035, 12, 32)
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(
        bubbleGeo,
        new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0x93c5fd : 0xffffff,
          transparent: true,
          opacity: 0.55,
        })
      )
      m.position.set(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 7,
        -1 - Math.random() * 3
      )
      m.userData = {
        speed: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        baseY: m.position.y,
      }
      scene.add(m)
      bubbles.push(m)
    }

    function resize() {
      const w = container!.clientWidth
      const h = container!.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // Interaksi mouse (parallax)
    const mouse = { x: 0, y: 0 }
    function onMove(e: PointerEvent) {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("pointermove", onMove)

    const total = 90 // detik hitung mundur ujian (demo)
    let raf = 0
    let lastProgress = -1
    const start = performance.now()

    function frame(now: number) {
      const t = reduceMotion ? 6 : (now - start) / 1000

      // progres mengisi jawaban, loop tiap siklus
      const cycle = QUESTION_COUNT + 2
      const progress = t % cycle
      const stepped = Math.floor(progress * 2)
      if (stepped !== lastProgress) {
        lastProgress = stepped
        const left = Math.max(0, total - Math.floor(t))
        const mm = String(Math.floor(left / 60)).padStart(2, "0")
        const ss = String(left % 60).padStart(2, "0")
        drawSheet(sheetCanvas, Math.min(progress, QUESTION_COUNT + 1), `${mm}:${ss}`)
        sheetTex.needsUpdate = true
      }

      group.position.y = Math.sin(t * 0.9) * 0.12
      group.rotation.y += (mouse.x * 0.35 - 0.2 - group.rotation.y) * 0.05
      group.rotation.x += (mouse.y * 0.15 - group.rotation.x) * 0.05
      if (!reduceMotion) {
        // pensil "menulis" ke tiap soal
        const qi = Math.min(Math.floor(progress), QUESTION_COUNT - 1)
        const targetY = 1.6 - qi * 0.82 - 0.4
        pencil.position.y += (targetY - pencil.position.y) * 0.06
        pencil.position.x = 1.0 + Math.sin(t * 6) * 0.05 + ANSWERS[qi] * 0.4 - 0.3
      }
      hand.rotation.z = -t * 1.5
      clock.rotation.y = Math.sin(t * 0.7) * 0.3

      for (const b of bubbles) {
        const d = b.userData
        b.position.y = d.baseY + Math.sin(t * d.speed + d.phase) * 0.5
        b.rotation.x = t * d.speed
        b.rotation.y = t * d.speed * 0.7
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener("pointermove", onMove)
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mat = o.material
          ;(Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose())
        }
      })
      sheetTex.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={containerRef} className={className} aria-hidden="true" />
}
