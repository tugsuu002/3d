import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import AvengersPage from "./AvengersPage.jsx";

const PLAYERS = [
  { name: "Messi", pos: "Довтлогч", num: 10, model: "/models/messi.glb" },
  { name: "Ronaldo", pos: "Довтлогч", num: 7, model: "/models/ronaldo.glb" },
  { name: "Neymar", pos: "Довтлогч", num: 11, model: "/models/neymar.glb" },
];

function normalizeModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 1.15 / maxDim;
  model.position.sub(center);
  model.scale.setScalar(scale);
}

function PlayerCard({ player, onSelect }) {
  const viewportRef = useRef(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let renderer, camera, pivot, raf;
    let disposed = false;

    const w = viewport.clientWidth || 300;
    const h = viewport.clientHeight || 300;

    const scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, w / h, 0.01, 100);
    camera.position.set(0, 0.02, 1.7);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    viewport.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(2, 3, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.4);
    rim.position.set(-3, -1, -2);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x404040, 1.3));

    pivot = new THREE.Group();
    scene.add(pivot);

    const loader = new GLTFLoader();
    loader.load(player.model, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      normalizeModel(model);
      pivot.add(model);
    });

    const speed = 0.006 + Math.random() * 0.004;
    const animate = () => {
      pivot.rotation.y += speed;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const nw = viewport.clientWidth;
      const nh = viewport.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (viewport.contains(renderer.domElement)) {
        viewport.removeChild(renderer.domElement);
      }
    };
  }, [player.model]);

  return (
    <div className="player-card" onClick={() => onSelect(player)}>
      <div className="player-viewport" ref={viewportRef} />
      <div className="player-info">
        <div>
          <div className="pname">{player.name}</div>
          <div className="ppos">{player.pos}</div>
        </div>
        <div className="pnum">{player.num}</div>
      </div>
    </div>
  );
}

function HeroViewer({ selected }) {
  const mountRef = useRef(null);
  const pivotRef = useRef(null);
  const sceneRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // one-time three.js setup
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);
    camera.position.set(0, 0.05, 1.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(2, 3, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.0);
    rim.position.set(-3, -1, -2);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.8);
    fill.position.set(-1, 2, -3);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0x404040, 1.4));

    const pivot = new THREE.Group();
    pivotRef.current = pivot;
    scene.add(pivot);

    let dragging = false;
    let prevX = 0;
    let prevY = 0;
    let velY = 0.004;
    let velX = 0;
    let zoom = 1.6;

    const onDown = (e) => {
      dragging = true;
      mount.classList.add("dragging");
      const p = e.touches ? e.touches[0] : e;
      prevX = p.clientX;
      prevY = p.clientY;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - prevX;
      const dy = p.clientY - prevY;
      velY = dx * 0.0007;
      velX = dy * 0.0007;
      prevX = p.clientX;
      prevY = p.clientY;
    };
    const onUp = () => {
      dragging = false;
      mount.classList.remove("dragging");
    };
    mount.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    mount.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    const onWheel = (e) => {
      e.preventDefault();
      zoom += e.deltaY * 0.0012;
      zoom = Math.max(0.9, Math.min(3.2, zoom));
    };
    mount.addEventListener("wheel", onWheel, { passive: false });

    let raf;
    const animate = () => {
      pivot.rotation.y += velY;
      pivot.rotation.x += velX;
      if (!dragging) {
        velY += (0.0032 - velY) * 0.02;
        velX += (0 - velX) * 0.05;
      } else {
        velY *= 0.9;
        velX *= 0.9;
      }
      camera.position.z = zoom;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
      mount.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // load / swap model whenever selected player changes
  useEffect(() => {
    const pivot = pivotRef.current;
    if (!pivot) return;
    setLoading(true);

    const loader = new GLTFLoader();
    let cancelled = false;

    loader.load(selected.model, (gltf) => {
      if (cancelled) return;
      pivot.clear();
      const model = gltf.scene;
      normalizeModel(model);
      pivot.add(model);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <>
      <div id="model-canvas" ref={mountRef} />
      {loading && <div className="loading">3D загвар ачаалж байна…</div>}
    </>
  );
}

export default function App() {
  const [navSolid, setNavSolid] = useState(false);
  const [selected, setSelected] = useState(PLAYERS[0]);
  const [page, setPage] = useState("main");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (page === "avengers") {
    return <AvengersPage onBack={() => setPage("main")} />;
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className={`nav ${navSolid ? "solid" : ""}`}>
        <div className="nav-mark">
          MATCHDAY<span>.</span>
        </div>
        <div className="nav-links">
          <a href="#players">Тоглогчид</a>
          <a href="#features">Онцлог</a>
          <a href="#story">Түүх</a>
          <button className="as-link" onClick={() => setPage("avengers")}>
            Avengers
          </button>
        </div>
        <a className="nav-cta desktop-only" href="#cta">
          Карт үүсгэх
        </a>
        <button
          className={`hamburger-btn ${menuOpen ? "open" : ""}`}
          aria-label="Цэс"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <a href="#players" onClick={closeMenu}>
          Тоглогчид
        </a>
        <a href="#features" onClick={closeMenu}>
          Онцлог
        </a>
        <a href="#story" onClick={closeMenu}>
          Түүх
        </a>
        <button
          className="as-link"
          onClick={() => {
            closeMenu();
            setPage("avengers");
          }}
        >
          Avengers
        </button>
        <a className="nav-cta" href="#cta" onClick={closeMenu}>
          Карт үүсгэх
        </a>
      </div>

      <header className="hero">
        <HeroViewer selected={selected} />
        <div className="hero-text">
          <div className="eyebrow">{selected.name}</div>
          <h1 className="display">
            Тоглогч бүрийг
            <br />
            <em>3D</em>-ээр амьдруул.
          </h1>
          <p>
            MATCHDAY нь тоглогчийн бодит дүрсийг өндөр нарийвчлалтай 3D загвар
            болгон хувиргаж, вэб дээр шууд эргүүлж, ойртуулж үзэх боломж
            олгодог.
          </p>
          <div className="hero-actions">
            <button className="btn-primary">Загвараа ачаалах</button>
            <button className="btn-ghost">Хэрхэн ажилладгийг үзэх</button>
          </div>
        </div>
        <div className="hint">чирж эргүүлээд, scroll-оор томруулаад үзээрэй →</div>
      </header>

      <div className="strip">
        <div className="stat">
          <b>50K</b>
          <span>ПОЛИГОН ЦЭГ</span>
        </div>
        <div className="stat">
          <b>4K</b>
          <span>ТЕКСТУРЫН НАРИЙВЧЛАЛ</span>
        </div>
        <div className="stat">
          <b>360°</b>
          <span>ЭРГЭЛТ</span>
        </div>
        <div className="stat">
          <b>3</b>
          <span>3D ЗАГВАР</span>
        </div>
      </div>

      <section className="players-section" id="players">
        <div className="section-head">
          <div className="eyebrow">Тоглогчдын сан</div>
          <h2 className="display">Хамгийн сүүлд нэмэгдсэн 3D тоглогчид.</h2>
        </div>
        <div className="players-grid">
          {PLAYERS.map((p) => (
            <PlayerCard key={p.name} player={p} onSelect={setSelected} />
          ))}
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-head">
          <div className="eyebrow">Яагаад MATCHDAY вэ</div>
          <h2 className="display">
            Хавтгай зураг биш — гар дотроо эргүүлдэг бодит дүрс.
          </h2>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="n">01</div>
            <h3>Хэмжээст сканнердах</h3>
            <p>
              Хэдхэн зурснаас бид тоглогчийн бүрэн 3D биетийг сэргээж, browser
              дээр шууд ачаалдаг GLB болгож хувиргана.
            </p>
          </div>
          <div className="feature-card">
            <div className="n">02</div>
            <h3>Хаана ч, ямар ч төхөөрөмж дээр</h3>
            <p>
              Нэмэлт апп татах шаардлагагүй — вэб хөтчөөрөө шууд эргүүлж,
              томруулж, өнгө материалыг нь харна.
            </p>
          </div>
          <div className="feature-card">
            <div className="n">03</div>
            <h3>Хөнгөн, хурдан ачаалалт</h3>
            <p>
              Загварыг оновчилж, хэдхэн MB хэмжээтэй болгосон тул удаан
              интернэттэй үед ч түргэн ачаална.
            </p>
          </div>
        </div>
      </section>

      <section className="quote-section" id="story">
        <blockquote>
          "Дэлгэц дээрх тоглогч эцэст нь гар дотроо эргэдэг болсон мэт
          мэдрэмж."
        </blockquote>
        <cite>— Дизайны тойм, 2026</cite>
      </section>

      <section className="cta-section" id="cta">
        <h2 className="display">
          Өөрийн тоглогчийн
          <br />
          3D картыг үүсгэ.
        </h2>
        <div className="price">
          Эхлэх багц <b>₮49,000</b>-с
        </div>
        <button className="btn-primary">Эхлэх</button>
      </section>

      <footer className="footer">
        <span>© 2026 MATCHDAY Studio</span>
        <div>
          <a href="#">Нууцлал</a>
          <a href="#">Холбоо барих</a>
          <a href="#">Instagram</a>
        </div>
      </footer>
    </>
  );
}
