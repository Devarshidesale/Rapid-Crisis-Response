import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroCanvas() {
  const mountRef = useRef(null);
  const stateRef = useRef({ mouse: { x: 0, y: 0 }, scrollY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500);
    camera.position.set(0, 0, 100);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ═══ PARTICLE FIELD ═══
    const PARTICLE_COUNT = 2000;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pColors = new Float32Array(PARTICLE_COUNT * 3);
    const pVelocities = new Float32Array(PARTICLE_COUNT);
    const colA = new THREE.Color(0xFF3B1F);
    const colB = new THREE.Color(0xFFB020);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      pPositions[i3] = (Math.random() - 0.5) * 300;
      pPositions[i3 + 1] = (Math.random() - 0.5) * 200;
      pPositions[i3 + 2] = -Math.random() * 200;
      pVelocities[i] = 0.02 + Math.random() * 0.06;
      const t = Math.random();
      const c = colA.clone().lerp(colB, t);
      pColors[i3] = c.r; pColors[i3 + 1] = c.g; pColors[i3 + 2] = c.b;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 1.2, vertexColors: true, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ═══ SHOCKWAVE POOL ═══
    const shockwavePool = [];

    function createShockwave(worldPos) {
      const ringGeo = new THREE.RingGeometry(0.5, 1.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xFF3B1F, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(worldPos);
      ring.lookAt(camera.position);
      scene.add(ring);
      shockwavePool.push({ mesh: ring, birth: performance.now(), duration: 600 });
    }

    // ═══ RAYCASTER ═══
    const raycaster = new THREE.Raycaster();
    const clickNDC = new THREE.Vector2();

    function handleClick(e) {
      const rect = container.getBoundingClientRect();
      clickNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      clickNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(clickNDC, camera);
      const dir = raycaster.ray.direction.clone().multiplyScalar(80);
      const point = camera.position.clone().add(dir);
      createShockwave(point);
    }
    container.addEventListener('click', handleClick);

    // ═══ MOUSE MOVE ═══
    function handleMouseMove(e) {
      const rect = container.getBoundingClientRect();
      stateRef.current.mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      stateRef.current.mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    container.addEventListener('mousemove', handleMouseMove);

    // ═══ SCROLL ═══
    function handleScroll() {
      stateRef.current.scrollY = window.scrollY;
    }
    window.addEventListener('scroll', handleScroll);

    // ═══ RESIZE ═══
    function handleResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    // ═══ ANIMATION LOOP ═══
    let animId;

    function animate() {
      animId = requestAnimationFrame(animate);
      const st = stateRef.current;

      // Mouse parallax on particles
      particles.position.x += (-st.mouse.x * 8 - particles.position.x) * 0.02;
      particles.position.y += (st.mouse.y * 5 - particles.position.y) * 0.02;

      // Particle drift
      const posArr = pGeo.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        posArr[i3 + 1] += pVelocities[i];
        if (posArr[i3 + 1] > 100) {
          posArr[i3 + 1] = -100;
          posArr[i3] = (Math.random() - 0.5) * 300;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      // Scroll zoom-out
      camera.position.z = 100 + st.scrollY * 0.1;

      // Shockwaves
      const now = performance.now();
      for (let i = shockwavePool.length - 1; i >= 0; i--) {
        const sw = shockwavePool[i];
        const elapsed = now - sw.birth;
        const p = elapsed / sw.duration;
        if (p >= 1) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          sw.mesh.material.dispose();
          shockwavePool.splice(i, 1);
        } else {
          const scale = 1 + p * 30;
          sw.mesh.scale.set(scale, scale, scale);
          sw.mesh.material.opacity = 0.8 * (1 - p);
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="fn-hero-canvas" />;
}
