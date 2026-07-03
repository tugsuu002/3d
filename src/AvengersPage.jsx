import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Each mesh piece, with its explode direction (unit vector, computed from
// each piece's centroid relative to the whole suit's centroid) and how far
// it should drift outward at full "exploded" state.
const PIECES = [
  { key: "helmet", model: "/models/ironman/helmet.glb", dir: [-0.007, 0.999, -0.054], dist: 0.55 },
  { key: "chest", model: "/models/ironman/chest.glb", dir: [-0.04, 0.995, 0.065], dist: 0.18 },
  { key: "gauntlet_l", model: "/models/ironman/gauntlet_l.glb", dir: [-0.674, 0.628, 0.288], dist: 0.5 },
  { key: "gauntlet_r", model: "/models/ironman/gauntlet_r.glb", dir: [0.885, 0.310, -0.226], dist: 0.5 },
  { key: "legs", model: "/models/ironman/legs.glb", dir: [0.013, -0.999, -0.042], dist: 0.4 },
  { key: "boots", model: "/models/ironman/boots.glb", dir: [0.102, -0.961, 0.245], dist: 0.75 },
];

// Items shown in the price list (gauntlet_l + gauntlet_r sold as one pair).
const CATALOG = [
  { id: "helmet", name: "Дуулга", en: "Helmet", price: 129000, pieces: ["helmet"] },
  { id: "chest", name: "Цээж хуяг", en: "Chest Plate", price: 249000, pieces: ["chest"] },
  { id: "gauntlets", name: "Гарын хуяг", en: "Gauntlets", price: 159000, pieces: ["gauntlet_l", "gauntlet_r"] },
  { id: "legs", name: "Хөлний хуяг", en: "Leg Armor", price: 179000, pieces: ["legs"] },
  { id: "boots", name: "Гутал", en: "Boots", price: 99000, pieces: ["boots"] },
];

function formatPrice(n) {
  return n.toLocaleString("mn-MN") + "₮";
}

function HeroExplodeViewer({ highlightPieces }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ highlightPieces: [] });

  useEffect(() => {
    stateRef.current.highlightPieces = highlightPieces;
  }, [highlightPieces]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.01, 100);
    camera.position.set(0, 0.05, 2.15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(2, 3, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4af37, 1.4);
    rim.position.set(-3, -1, -2);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x404040, 1.3));

    const pivot = new THREE.Group();
    scene.add(pivot);

    const loader = new GLTFLoader();
    const pieceGroups = {};

    PIECES.forEach((p) => {
      const holder = new THREE.Group();
      pivot.add(holder);
      pieceGroups[p.key] = { holder, dir: new THREE.Vector3(...p.dir), dist: p.dist, mesh: null };

      loader.load(p.model, (gltf) => {
        const model = gltf.scene;
        pieceGroups[p.key].mesh = model;
        holder.add(model);
      });
    });

    pivot.scale.setScalar(1.25);
    pivot.position.set(0, -0.05, 0);

    let raf;
    let t = 0;
    let dragging = false;
    let prevX = 0;
    let velY = 0.0025;

    const onDown = (e) => {
      dragging = true;
      const p = e.touches ? e.touches[0] : e;
      prevX = p.clientX;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - prevX;
      velY = dx * 0.0008;
      prevX = p.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    mount.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    mount.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    const animate = () => {
      t += 0.008;
      // breathing explode factor: 0 -> 1 -> 0 continuously
      const explode = (Math.sin(t) + 1) / 2;

      pivot.rotation.y += velY;
      if (!dragging) velY += (0.0022 - velY) * 0.01;

      const hl = stateRef.current.highlightPieces;
      Object.entries(pieceGroups).forEach(([key, g]) => {
        const isHighlighted = hl.length === 0 || hl.includes(key);
        const factor = explode * g.dist * (isHighlighted ? 1 : 0.35);
        g.holder.position.copy(g.dir).multiplyScalar(factor);

        if (g.mesh) {
          const targetScale = isHighlighted ? 1 : 0.94;
          g.mesh.scale.setScalar(
            g.mesh.scale.x + (targetScale - g.mesh.scale.x) * 0.08
          );
        }
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      mount.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div id="model-canvas" className="explode-canvas" ref={mountRef} />;
}

export default function AvengersPage({ onBack }) {
  const [cart, setCart] = useState({});
  const [hoverId, setHoverId] = useState(null);

  const addToCart = (id) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = CATALOG.reduce(
    (sum, p) => sum + (cart[p.id] || 0) * p.price,
    0
  );

  const highlightPieces = hoverId
    ? CATALOG.find((c) => c.id === hoverId)?.pieces || []
    : [];

  return (
    <div className="avengers-page">
      <nav className="nav solid avengers-nav">
        <button className="nav-mark as-link" onClick={onBack}>
          ← MATCHDAY
        </button>
        <div className="nav-mark avengers-mark">
          STARK ARSENAL<span>.</span>
        </div>
        <div className="cart-pill">
          Сагс: {cartCount} · {formatPrice(cartTotal)}
        </div>
      </nav>

      <header className="avengers-hero">
        <div className="eyebrow gold">Iron Man Suit — Interactive</div>
        <h1 className="display">
          Нэг л хуяг, <em>амьд эргэлддэг.</em>
        </h1>
        <p>
          Загвар нэг бүтэн хэвээрээ, харин хэсгүүд нь тасралтгүй зөөлнөөр
          задран, дахин угсарна. Доорх жагсаалт дээр хулс аваачихад тухайн
          хэсэг тодрон гарч ирнэ.
        </p>
      </header>

      <div className="explode-wrap">
        <HeroExplodeViewer highlightPieces={highlightPieces} />
      </div>

      <section className="parts-list">
        {CATALOG.map((p) => (
          <div
            key={p.id}
            className={`parts-row ${hoverId === p.id ? "active" : ""}`}
            onMouseEnter={() => setHoverId(p.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            <div className="parts-row-name">
              <div className="pname">{p.name}</div>
              <div className="ppos">{p.en}</div>
            </div>
            <div className="pprice">{formatPrice(p.price)}</div>
            <button className="btn-primary gold" onClick={() => addToCart(p.id)}>
              {cart[p.id] ? `Сагсанд (${cart[p.id]})` : "Сагслах"}
            </button>
          </div>
        ))}
      </section>

      <footer className="footer avengers-footer">
        <span>
          © 2026 STARK ARSENAL — fan demo, албан ёсны Marvel бүтээгдэхүүн биш
        </span>
        <button className="nav-cta gold" onClick={onBack}>
          MATCHDAY-руу буцах
        </button>
      </footer>
    </div>
  );
}
