import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

function addBarycentricCoords(geo) {
  const g = geo.toNonIndexed()
  const count = g.attributes.position.count
  const bary = new Float32Array(count * 3)

  for (let i = 0; i < count; i += 3) {
    bary[i * 3] = 1
    bary[i * 3 + 1] = 0
    bary[i * 3 + 2] = 0
    bary[(i + 1) * 3] = 0
    bary[(i + 1) * 3 + 1] = 1
    bary[(i + 1) * 3 + 2] = 0
    bary[(i + 2) * 3] = 0
    bary[(i + 2) * 3 + 1] = 0
    bary[(i + 2) * 3 + 2] = 1
  }

  g.setAttribute('barycentric', new THREE.BufferAttribute(bary, 3))
  return g
}

function hash2(px, py) {
  const a = Math.sin(px * 127.1 + py * 311.7) * 43758.5453
  const b = Math.sin(px * 269.5 + py * 183.3) * 43758.5453
  return [a - Math.floor(a), b - Math.floor(b)]
}

function cellSeed(u, v, fragScale) {
  const n = [Math.floor(u * fragScale), Math.floor(v * fragScale)]
  const f = [u * fragScale - n[0], v * fragScale - n[1]]
  let md = Infinity
  let best = [...n]

  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const o = hash2(n[0] + i, n[1] + j)
      const r = [i + o[0] - f[0], j + o[1] - f[1]]
      const d = r[0] * r[0] + r[1] * r[1]
      if (d < md) {
        md = d
        best = [n[0] + i + o[0], n[1] + j + o[1]]
      }
    }
  }

  return [best[0] / fragScale, best[1] / fragScale]
}

function smoothstep(min, max, v) {
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)))
  return t * t * (3 - 2 * t)
}

function makeCoinLabelTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(512, 502)
  ctx.fillStyle = 'rgba(15, 9, 2, 0.94)'
  ctx.font = '900 420px Arial Black, Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('C', 0, -18)

  ctx.font = '900 58px Courier New, monospace'
  ctx.fillText('CADENA', 0, 245)

  ctx.strokeStyle = 'rgba(255, 77, 0, 0.82)'
  ctx.lineWidth = 13
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-330, 238)
  ctx.lineTo(330, -245)
  ctx.stroke()

  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-210, -130)
  ctx.lineTo(230, 20)
  ctx.moveTo(-260, 82)
  ctx.lineTo(260, -92)
  ctx.stroke()
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createCoinFragments(coinGroup, material) {
  const fragScale = 34
  const radius = 1.64
  const baseGeo = new THREE.PlaneGeometry(radius * 2, radius * 2, 86, 86)
  const nonIndexed = baseGeo.toNonIndexed()
  baseGeo.dispose()

  const pos = nonIndexed.attributes.position.array
  const nrm = nonIndexed.attributes.normal.array
  const uvData = nonIndexed.attributes.uv.array
  const tris = pos.length / 9
  const cellMap = new Map()

  for (let t = 0; t < tris; t++) {
    const x1 = pos[t * 9]
    const y1 = pos[t * 9 + 1]
    const x2 = pos[t * 9 + 3]
    const y2 = pos[t * 9 + 4]
    const x3 = pos[t * 9 + 6]
    const y3 = pos[t * 9 + 7]
    const cx = (x1 + x2 + x3) / 3
    const cy = (y1 + y2 + y3) / 3

    if (Math.hypot(cx, cy) > radius * 0.98) continue

    const uc = (uvData[t * 6] + uvData[t * 6 + 2] + uvData[t * 6 + 4]) / 3
    const vc = (uvData[t * 6 + 1] + uvData[t * 6 + 3] + uvData[t * 6 + 5]) / 3
    const s = cellSeed(uc, vc, fragScale)
    const k = `${s[0].toFixed(9)}_${s[1].toFixed(9)}`

    if (!cellMap.has(k)) cellMap.set(k, { s, t: [] })
    cellMap.get(k).t.push(t)
  }

  const fragments = []
  for (const { s: seed, t: triList } of cellMap.values()) {
    if (!triList.length) continue

    const vc = triList.length * 3
    const pArr = new Float32Array(vc * 3)
    const nArr = new Float32Array(vc * 3)
    const uvArr = new Float32Array(vc * 2)
    let vi = 0
    let cx = 0
    let cy = 0
    let cz = 0

    for (const tri of triList) {
      for (let v = 0; v < 3; v++) {
        const sv = tri * 3 + v
        const px = pos[sv * 3]
        const py = pos[sv * 3 + 1]
        const radial = Math.min(1, Math.hypot(px, py) / radius)
        const pz = 0.16 + (1 - radial) * 0.08

        pArr[vi * 3] = px
        pArr[vi * 3 + 1] = py
        pArr[vi * 3 + 2] = pz
        nArr[vi * 3] = nrm[sv * 3]
        nArr[vi * 3 + 1] = nrm[sv * 3 + 1]
        nArr[vi * 3 + 2] = nrm[sv * 3 + 2]
        uvArr[vi * 2] = uvData[sv * 2]
        uvArr[vi * 2 + 1] = uvData[sv * 2 + 1]
        cx += px
        cy += py
        cz += pz
        vi++
      }
    }

    cx /= vc
    cy /= vc
    cz /= vc

    const shrink = 0.965
    for (let i = 0; i < pArr.length; i += 3) {
      pArr[i] = (pArr[i] - cx) * shrink
      pArr[i + 1] = (pArr[i + 1] - cy) * shrink
      pArr[i + 2] = (pArr[i + 2] - cz) * shrink
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pArr, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(nArr, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))

    const rnd = hash2(seed[0] * 137.53, seed[1] * 137.53)
    const aa = rnd[0] * Math.PI * 2
    const mesh = new THREE.Mesh(geo, material)
    mesh.position.set(cx, cy, cz)
    mesh.userData = {
      cellCenter: new THREE.Vector3(cx, cy, cz),
      cellNormal: new THREE.Vector3(0, 0, 1),
      rotAxis: new THREE.Vector3(Math.cos(aa), Math.sin(aa), 0).normalize(),
      maxAngle: 0.55 + rnd[1] * 1.05,
      lift: 0,
    }
    coinGroup.add(mesh)
    fragments.push(mesh)
  }

  nonIndexed.dispose()
  return fragments
}

export default function LandingPage({ onStart, loading }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return undefined

    gsap.registerPlugin(ScrollTrigger)

    const page = document.querySelector('.fracture-page')
    const cur = document.getElementById('cursor')
    const ring = document.getElementById('cursor-ring')
    const sidebarItems = Array.from(document.querySelectorAll('.sidebar-item'))

    let mx = 0
    let my = 0
    let rx = 0
    let ry = 0
    let raf = 0
    let cursorRaf = 0
    let disposed = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x080808)

    const scrollGroup = new THREE.Group()
    scene.add(scrollGroup)

    const coinGroup = new THREE.Group()
    scrollGroup.add(coinGroup)

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    )
    camera.position.z = window.innerWidth <= 700 ? 9.2 : 7

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.72,
      0.42,
      0.64,
    )
    composer.addPass(bloomPass)
    const fxaaPass = new ShaderPass(FXAAShader)
    fxaaPass.uniforms.resolution.value.set(
      1 / window.innerWidth,
      1 / window.innerHeight,
    )
    composer.addPass(fxaaPass)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enabled = false

    scene.add(new THREE.AmbientLight(0xffffff, 0.36))
    const dirLight = new THREE.DirectionalLight(0xfff4d8, 3.2)
    dirLight.position.set(3, 4, 5)
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0xff9a3a, 0.52)
    fillLight.position.set(-4, -2, -3)
    scene.add(fillLight)

    const wireMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 barycentric;
        varying vec3 vBary;
        void main() {
          vBary = barycentric;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vBary;
        float wireMask(vec3 b, float t) {
          vec3 d = fwidth(b);
          vec3 a = smoothstep(vec3(0.0), d * t, b);
          return 1.0 - min(a.x, min(a.y, a.z));
        }
        void main() {
          float wf = wireMask(vBary, 1.55);
          vec3 col = mix(vec3(0.08, 0.025, 0.0), vec3(1.0, 0.32, 0.04), wf);
          col = mix(col, vec3(1.0, 0.78, 0.22) * 2.15, wf * 0.55);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    })

    const wireMesh = new THREE.Mesh(
      addBarycentricCoords(new THREE.CircleGeometry(1.56, 128)),
      wireMaterial,
    )
    wireMesh.position.z = 0.025
    coinGroup.add(wireMesh)

    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xb56b11,
      metalness: 0.72,
      roughness: 0.38,
      emissive: 0x321000,
      emissiveIntensity: 0.14,
      side: THREE.DoubleSide,
    })
    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(1.68, 1.68, 0.38, 160, 1, true),
      edgeMat,
    )
    edge.rotation.x = Math.PI / 2
    coinGroup.add(edge)

    const backMat = new THREE.MeshStandardMaterial({
      color: 0x8b4b09,
      metalness: 0.58,
      roughness: 0.52,
      side: THREE.DoubleSide,
    })
    const back = new THREE.Mesh(new THREE.CircleGeometry(1.64, 128), backMat)
    back.position.z = -0.19
    back.rotation.y = Math.PI
    coinGroup.add(back)

    const fragmentMat = new THREE.MeshStandardMaterial({
      color: 0xf0a91f,
      metalness: 0.55,
      roughness: 0.48,
      emissive: 0x241000,
      emissiveIntensity: 0.08,
      side: THREE.DoubleSide,
    })
    const fragments = createCoinFragments(coinGroup, fragmentMat)

    const labelTexture = makeCoinLabelTexture()
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture ?? undefined,
      transparent: true,
      depthWrite: false,
    })
    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), labelMat)
    label.position.z = 0.34
    coinGroup.add(label)

    const rcMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.66, 128),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    rcMesh.position.z = 0.36
    coinGroup.add(rcMesh)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)
    const hover = { point: new THREE.Vector3(), active: 0 }
    const localHover = new THREE.Vector3()
    const clock = new THREE.Clock()
    let lastTime = 0

    const fragParams = {
      hoverRadius: 0.76,
      liftDist: 0.34,
      liftSpeedUp: 0.16,
      liftSpeedDown: 0.06,
    }

    const lenis = new Lenis({
      duration: 2.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    lenis.on('scroll', ScrollTrigger.update)
    const lenisTick = (time) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(lenisTick)
    gsap.ticker.lagSmoothing(0)

    const onMouseMove = (e) => {
      mx = e.clientX
      my = e.clientY
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMouseMove)

    const loopCursor = () => {
      rx += (mx - rx) * 0.12
      ry += (my - ry) * 0.12
      if (cur) {
        cur.style.left = `${mx}px`
        cur.style.top = `${my}px`
      }
      if (ring) {
        ring.style.left = `${rx}px`
        ring.style.top = `${ry}px`
      }
      cursorRaf = requestAnimationFrame(loopCursor)
    }
    loopCursor()

    const ctx = gsap.context(() => {
      gsap.to('.nav-status', { opacity: 1, duration: 1, delay: 1.5 })
      gsap.to('.sidebar-label', {
        opacity: 1,
        x: 0,
        duration: 0.6,
        delay: 1.4,
        stagger: 0.1,
      })
      gsap
        .timeline({ delay: 0.4 })
        .to('.hero-title', {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: 'power3.out',
        })
        .to(
          '.hero-meta',
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
          '-=0.5',
        )
        .to(
          '.hero-cta',
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
          '-=0.4',
        )

      gsap
        .timeline({
          scrollTrigger: { trigger: '#section-2', start: 'top 65%' },
        })
        .to('#section-2 .sec-num', { opacity: 1, duration: 0.4 })
        .to(
          '#section-2 .sec-tag',
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.1',
        )
        .to(
          '#section-2 .sec-h2',
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
          '-=0.2',
        )
        .to(
          '#section-2 .sec-body',
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          '-=0.3',
        )
        .to(
          '#section-2 .stats',
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.2',
        )

      gsap
        .timeline({
          scrollTrigger: { trigger: '#section-3', start: 'top 65%' },
        })
        .to('#section-3 .sec-num', { opacity: 1, duration: 0.4 })
        .to(
          '#section-3 .sec-tag',
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.1',
        )
        .to(
          '#section-3 .sec-h2',
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
          '-=0.2',
        )
        .to(
          '#section-3 .sec-body',
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          '-=0.3',
        )
        .to(
          '#section-3 .feat-list',
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.2',
        )
      ;['#section-1', '#section-2', '#section-3'].forEach((id, i) => {
        ScrollTrigger.create({
          trigger: id,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) => {
            if (!self.isActive) return
            sidebarItems.forEach((it) => it.classList.remove('active'))
            sidebarItems[i]?.classList.add('active')
          },
        })
      })

      ScrollTrigger.create({
        trigger: '#section-2',
        start: 'top 85%',
        onEnter: () => gsap.to('.sidebar', { opacity: 0, duration: 0.4 }),
        onLeaveBack: () => gsap.to('.sidebar', { opacity: 1, duration: 0.4 }),
      })

      gsap.set(scrollGroup.position, { x: 0, y: 0, z: 0 })
      gsap.set(scrollGroup.rotation, { x: 0.15, y: 0, z: 0 })
      gsap.from(scrollGroup.rotation, {
        y: Math.PI,
        duration: 2.4,
        ease: 'power3.out',
      })
      gsap.from(scrollGroup.position, {
        y: -2,
        duration: 2.4,
        ease: 'power3.out',
      })

      const idleTween = gsap.to(coinGroup.rotation, {
        y: Math.PI * 2,
        duration: 22,
        ease: 'none',
        repeat: -1,
        paused: true,
      })
      gsap.delayedCall(2.5, () => idleTween.play())

      gsap
        .timeline({
          scrollTrigger: {
            trigger: page ?? 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 4.0,
            onUpdate: (self) => {
              if (self.progress > 0.02) idleTween.pause()
              else idleTween.resume()
            },
          },
        })
        .to(
          scrollGroup.position,
          { x: -2.3, y: 0, z: 0, duration: 1, ease: 'power1.inOut' },
          0,
        )
        .to(
          scrollGroup.rotation,
          {
            x: Math.PI * 0.5,
            y: -Math.PI * 0.6,
            z: Math.PI * 0.25,
            duration: 1,
            ease: 'power1.inOut',
          },
          0,
        )
        .to(
          scrollGroup.position,
          { x: 2.3, y: 0, z: 0, duration: 1, ease: 'power1.inOut' },
          1,
        )
        .to(
          scrollGroup.rotation,
          {
            x: -Math.PI * 0.5,
            y: Math.PI * 0.6,
            z: -Math.PI * 0.25,
            duration: 1,
            ease: 'power1.inOut',
          },
          1,
        )
    }, page)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.position.z = window.innerWidth <= 700 ? 9.2 : 7
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      composer.setSize(window.innerWidth, window.innerHeight)
      fxaaPass.uniforms.resolution.value.set(
        1 / window.innerWidth,
        1 / window.innerHeight,
      )
    }
    window.addEventListener('resize', onResize)

    const tick = () => {
      if (disposed) return

      const elapsed = clock.getElapsedTime()
      const delta = elapsed - lastTime
      lastTime = elapsed

      controls.update()
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObject(rcMesh)
      if (hits.length > 0) {
        coinGroup.worldToLocal(localHover.copy(hits[0].point))
        hover.point.copy(localHover)
        hover.active = Math.min(hover.active + delta * 5, 1)
      } else {
        hover.active = Math.max(hover.active - delta * 2.5, 0)
      }

      for (const frag of fragments) {
        const { cellCenter, cellNormal, rotAxis, maxAngle } = frag.userData
        let target = 0
        if (hover.active > 0.01) {
          const dist = cellCenter.distanceTo(hover.point)
          target =
            (1 - smoothstep(0.2, fragParams.hoverRadius, dist)) * hover.active
        }
        const speed =
          target > frag.userData.lift
            ? fragParams.liftSpeedUp
            : fragParams.liftSpeedDown
        frag.userData.lift = THREE.MathUtils.lerp(
          frag.userData.lift,
          target,
          speed,
        )
        const lift = frag.userData.lift
        frag.position
          .copy(cellCenter)
          .addScaledVector(cellNormal, lift * fragParams.liftDist)
        frag.quaternion.setFromAxisAngle(rotAxis, lift * maxAngle)
      }

      composer.render()
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(cursorRaf)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      gsap.ticker.remove(lenisTick)
      lenis.destroy()
      ctx.revert()
      labelTexture?.dispose()
      renderer.dispose()
      coinGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
    }
  }, [])

  return (
    <div className="fracture-page">
      <canvas ref={canvasRef} className="webgl" />
      <div className="scanlines" />
      <div id="cursor" />
      <div id="cursor-ring" />

      <nav>
        <span className="nav-logo">CADENA / EXCHANGE</span>
        <div className="nav-status">
          <div className="dot-live" />
          REALTIME · WEBGL
        </div>
      </nav>

      <div className="sidebar">
        <div className="sidebar-item active" data-idx="0">
          <span className="sidebar-label">Hero</span>
          <div className="sidebar-tick" />
        </div>
        <div className="sidebar-item" data-idx="1">
          <span className="sidebar-label">Exchange</span>
          <div className="sidebar-tick" />
        </div>
        <div className="sidebar-item" data-idx="2">
          <span className="sidebar-label">Team</span>
          <div className="sidebar-tick" />
        </div>
      </div>

      <div className="content">
        <section id="section-1">
          <div className="hero-top">
            <h1 className="hero-title">
              CADENA
              <br />
              <span className="accent">EXCHANGE</span>
            </h1>
            <div className="hero-meta">
              <span className="tag">Single coin · security priced · 2026</span>
              <span className="desc">
                CADENA 코인 하나를 거래합니다.
                <br />
                보안 뉴스가 가격을 흔들고,
                <br />
                지갑과 위치 인증이 자산을 만듭니다.
              </span>
            </div>
          </div>

          <div className="hero-bottom">
            <div className="hero-cta">
              <span className="cta-label">Scroll to explore</span>
              <div className="cta-row">
                <button
                  type="button"
                  className="cta-link"
                  onClick={onStart}
                  disabled={loading}
                >
                  {loading ? 'SIGNING...' : 'OPEN EXCHANGE'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="rule" />

        <section id="section-2" className="split-section">
          <div className="empty-col" />
          <div className="text-col">
            <div className="sec-num">02 / 03</div>
            <p className="sec-tag">// Exchange Introduction</p>
            <h2 className="sec-h2">
              One coin.
              <br />
              Live pressure.
            </h2>
            <p className="sec-body">
              cadena는 여러 종목을 나열하는 거래소가 아니라 CADENA/KRW 단일
              마켓입니다. MetaMask 로그인으로 받은 가상 자금으로 CADENA를 사고
              팔며, 해킹·유출·취약점 뉴스의 건수와 심각도가 시세에 반영됩니다.
            </p>
            <div className="stats">
              <div>
                <div className="stat-n">CADENA</div>
                <div className="stat-l">Single Asset</div>
              </div>
              <div>
                <div className="stat-n">100만</div>
                <div className="stat-l">Initial KRW</div>
              </div>
              <div>
                <div className="stat-n">GPS</div>
                <div className="stat-l">Reward</div>
              </div>
            </div>
          </div>
        </section>

        <div className="rule" />

        <section id="section-3" className="split-section">
          <div className="text-col border-right">
            <div className="sec-num">03 / 03</div>
            <p className="sec-tag">// Team Introduction</p>
            <h2 className="sec-h2">
              Team.
              <br />
              정재성 거래소.
            </h2>
            <p className="sec-body">
              블록체인기술및응용 01분반 프로젝트 팀입니다. 각자 역할을 나누어
              CADENA 거래소를 구현하였습니다.
            </p>
            <ul className="feat-list">
              <li>박한빈 · 팀장 · 스마트컨트랙트 / 배포</li>
              <li>정재성 · Backend · 시세 엔진 / API</li>
              <li>이지훈 · Frontend · UI / MetaMask 연동</li>
              <li>김서진 · DataBase · 스키마 / 데이터 관리</li>
              <li>박혜수 · QA · 테스트 / 검증 / 통합</li>
            </ul>
          </div>
          <div className="empty-col" />
        </section>
      </div>
    </div>
  )
}
