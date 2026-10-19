"use client"

import * as React from "react"
import * as THREE from "three"

const OPTIONS = ["A", "B", "C", "D"]
const ANSWERS = [1, 3, 0, 2]

function drawScreen(canvas: HTMLCanvasElement, selected: number) {
  const ctx = canvas.getContext("2d")!
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(0, 0, w, h)

  // header
  ctx.fillStyle = "#2563eb"
  ctx.fillRect(0, 0, w, 80)
  ctx.fillStyle = "#fff"
  ctx.textBaseline = "middle"
  ctx.font = "bold 30px sans-serif"
  ctx.fillText("Ujian Online", 36, 40)
  ctx.font = "bold 26px sans-serif"
  ctx.textAlign = "right"
  ctx.fillText("Soal 3 / 40", w - 36, 40)
  ctx.textAlign = "left"

  // teks soal (placeholder)
  ctx.fillStyle = "#cbd5e1"
  ctx.beginPath()
  ctx.roundRect(36, 120, w - 72, 20, 10)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(36, 156, (w - 72) * 0.7, 20, 10)
  ctx.fill()

  // pilihan A-D
  OPTIONS.forEach((opt, i) => {
    const y = 210 + i * 86
    const isSel = selected === i
    ctx.fillStyle = isSel ? "#dbeafe" : "#ffffff"
    ctx.strokeStyle = isSel ? "#2563eb" : "#e2e8f0"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(36, y, w - 72, 70, 16)
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(82, y + 35, 22, 0, Math.PI * 2)
    ctx.fillStyle = isSel ? "#2563eb" : "#f1f5f9"
    ctx.fill()
    ctx.fillStyle = isSel ? "#fff" : "#64748b"
    ctx.font = "bold 24px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(opt, 82, y + 36)
    ctx.textAlign = "left"

    ctx.fillStyle = isSel ? "#93c5fd" : "#e2e8f0"
    ctx.beginPath()
    ctx.roundRect(126, y + 25, (w - 250) * (0.75 - i * 0.1), 18, 9)
    ctx.fill()
  })

  // tombol
  ctx.fillStyle = "#2563eb"
  ctx.beginPath()
  ctx.roundRect(w - 216, h - 76, 180, 48, 14)
  ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.font = "bold 22px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("Selanjutnya", w - 126, h - 52)
  ctx.textAlign = "left"
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
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 0.2, 12)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const key = new THREE.DirectionalLight(0xffffff, 1.8)
    key.position.set(3, 5, 6)
    scene.add(key)

    const group = new THREE.Group()
    scene.add(group)

    // Monitor
    const dark = new THREE.MeshStandardMaterial({ color: 0x0f172a })
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.5, 0.2), dark)
    group.add(bezel)

    const screenCanvas = document.createElement("canvas")
    screenCanvas.width = 640
    screenCanvas.height = 560
    const screenTex = new THREE.CanvasTexture(screenCanvas)
    screenTex.colorSpace = THREE.SRGBColorSpace
    screenTex.anisotropy = 4
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(4.9, 3.2),
      new THREE.MeshBasicMaterial({ map: screenTex })
    )
    screen.position.z = 0.11
    group.add(screen)

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.15), dark)
    neck.position.set(0, -2.1, -0.05)
    group.add(neck)
    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 1), dark)
    base.position.set(0, -2.5, 0.1)
    group.add(base)

    // Beberapa bulatan jawaban, sedikit saja
    const bubbles: THREE.Mesh[] = []
    const bubbleGeo = new THREE.TorusGeometry(0.2, 0.04, 12, 32)
    const spots: [number, number, number][] = [
      [-3.6, 1.4, -0.5],
      [3.7, 0.9, -0.3],
      [3.3, -1.8, -0.8],
      [-3.3, -1.5, -0.6],
    ]
    spots.forEach(([x, y, z], i) => {
      const m = new THREE.Mesh(
        bubbleGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
        })
      )
      m.position.set(x, y, z)
      m.userData = { baseY: y, phase: i * 1.7 }
      scene.add(m)
      bubbles.push(m)
    })

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

    let raf = 0
    let current = -1
    const start = performance.now()

    function frame(now: number) {
      const t = reduceMotion ? 0 : (now - start) / 1000

      // jawaban berpindah pelan tiap 2.5 detik
      const idx = Math.floor(t / 2.5) % ANSWERS.length
      if (idx !== current) {
        current = idx
        drawScreen(screenCanvas, ANSWERS[idx])
        screenTex.needsUpdate = true
      }

      group.rotation.y = -0.18 + Math.sin(t * 0.5) * 0.06
      group.position.y = Math.sin(t * 0.8) * 0.08
      for (const b of bubbles) {
        b.position.y = b.userData.baseY + Math.sin(t * 0.6 + b.userData.phase) * 0.15
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mat = o.material
          ;(Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose())
        }
      })
      screenTex.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={containerRef} className={className} aria-hidden="true" />
}
