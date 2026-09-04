import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { mockPatents, type MockPatent } from '@/lib/mockPatentData';
import { X, Info } from 'lucide-react';

type LayoutType = 'force' | 'timeline' | 'radial';

type NodeData = {
  id: string;
  patent: MockPatent;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  screenPos?: { x: number; y: number };
};

type TooltipData = {
  patent: MockPatent;
  x: number;
  y: number;
};

export default function Visualization() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutType>('force');
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedPatent, setSelectedPatent] = useState<MockPatent | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodesRef = useRef<NodeData[]>([]);
  const meshRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const animationRef = useRef<number>(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const nodeMeshesRef = useRef<THREE.Mesh[]>([]);

  // Color by category
  const categoryColors: Record<string, number> = {
    'AI & Machine Learning': 0x38bdf8,
    'Quantum Computing': 0xa78bfa,
    'IoT & Edge Computing': 0x34d399,
    'Blockchain': 0xfbbf24,
    'Telecommunications': 0xf472b6,
    'Cryptography': 0xfb7185,
    'Healthcare AI': 0x22d3ee,
    'Robotics': 0x60a5fa,
  'Cryptography ': 0xfb7185,
  'Robotics ': 0x60a5fa,
  'Healthcare AI ': 0x22d3ee,
  'Telecommunications ': 0xf472b6,
    'Blockchain ': 0xfbbf24,
    'IoT & Edge Computing ': 0x34d399,
    'Quantum Computing ': 0xa78bfa,
    'AI & Machine Learning ': 0x38bdf8,
  };

  function getColor(patent: MockPatent): number {
    return categoryColors[patent.category] || 0x64748b;
  }

  // Compute layout positions
  function computeLayout(type: LayoutType): NodeData[] {
    const nodes: NodeData[] = mockPatents.map((p) => ({
      id: p.id,
      patent: p,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
    }));

    if (type === 'force') {
      // D3 force simulation in 3D (use 2D force then add Z)
      const sim = d3.forceSimulation(nodes as any)
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(0, 0))
        .force('collide', d3.forceCollide(20))
        .stop();

      // Build links
      const links: { source: number; target: number }[] = [];
      mockPatents.forEach((p, i) => {
        (p.related_patents || []).forEach((rid) => {
          const j = mockPatents.findIndex(mp => mp.id === rid);
          if (j >= 0 && j !== i) links.push({ source: i, target: j });
        });
      });

      sim.force('link', d3.forceLink(links).distance(60).strength(0.1));
      sim.tick(300);

      nodes.forEach((n: any) => {
        n.z = (Math.random() - 0.5) * 80;
      });
    } else if (type === 'timeline') {
      // Sort by filing date, lay out along X axis
      const sorted = [...mockPatents].sort((a, b) => new Date(a.filing_date).getTime() - new Date(b.filing_date).getTime());
      sorted.forEach((p, i) => {
        const node = nodes.find(n => n.id === p.id)!;
        node.x = (i - sorted.length / 2) * 30;
        node.y = (Math.random() - 0.5) * 60;
        node.z = (Math.random() - 0.5) * 60;
      });
    } else if (type === 'radial') {
      // Group by category in radial clusters
      const categories = [...new Set(mockPatents.map(p => p.category))];
      const catAngles: Record<string, number> = {};
      categories.forEach((cat, i) => {
        catAngles[cat] = (i / categories.length) * Math.PI * 2;
      });

      nodes.forEach((n) => {
        const angle = catAngles[n.patent.category] || 0;
        const radius = 60 + (n.patent.similarity_score || 0.5) * 40;
        const subAngle = angle + (Math.random() - 0.5) * 0.5;
        n.x = Math.cos(subAngle) * radius;
        n.y = Math.sin(subAngle) * radius;
        n.z = (Math.random() - 0.5) * 40;
      });
    }

    return nodes;
  }

  // Build/update the 3D scene
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 150, 400);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 200);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0x64748b, 0.5);
    scene.add(ambient);
    const point = new THREE.PointLight(0x38bdf8, 1, 300);
    point.position.set(50, 50, 100);
    scene.add(point);
    const point2 = new THREE.PointLight(0x22d3ee, 0.5, 300);
    point2.position.set(-50, -50, 100);
    scene.add(point2);

    // Grid
    const grid = new THREE.GridHelper(400, 20, 0x1e293b, 0x1e293b);
    grid.position.y = -100;
    scene.add(grid);

    // Group for nodes
    const group = new THREE.Group();
    scene.add(group);
    meshRef.current = group;

    // Mouse interaction
    function onMouseMove(e: MouseEvent) {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    mount.addEventListener('mousemove', onMouseMove);

    // Click
    function onClick(e: MouseEvent) {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(nodeMeshesRef.current);
      if (intersects.length > 0) {
        const idx = intersects[0].object.userData.index;
        const node = nodesRef.current[idx];
        if (node) {
          setSelectedPatent(node.patent);
        }
      }
    }
    mount.addEventListener('click', onClick);

    // Resize
    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener('resize', onResize);

    // Animation loop
    let frame = 0;
    function animate() {
      animationRef.current = requestAnimationFrame(animate);
      frame++;

      // Rotate group slowly
      if (group.children.length > 0) {
        group.rotation.y += 0.0015;
      }

      // Hover detection
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(nodeMeshesRef.current);
      if (intersects.length > 0) {
        const idx = intersects[0].object.userData.index;
        const node = nodesRef.current[idx];
        if (node) {
          setHoveredNode(node.id);
          const screenPos = node.screenPos;
          if (screenPos) {
            setTooltip({ patent: node.patent, x: screenPos.x, y: screenPos.y });
          }
        }
      } else {
        if (hoveredNode !== null) {
          setHoveredNode(null);
          setTooltip(null);
        }
      }

      // Pulse hovered node
      nodeMeshesRef.current.forEach((mesh, i) => {
        const scale = nodesRef.current[i]?.id === hoveredNode ? 1.5 : 1;
        mesh.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      });

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update layout when type changes
  useEffect(() => {
    const nodes = computeLayout(layout);
    nodesRef.current = nodes;

    if (!meshRef.current || !sceneRef.current) return;

    // Clear old meshes
    while (meshRef.current.children.length > 0) {
      const child = meshRef.current.children[0];
      meshRef.current.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        ((child as THREE.Mesh).material as THREE.Material).dispose();
      }
    }
    nodeMeshesRef.current = [];

    // Remove old lines
    if (linesRef.current) {
      sceneRef.current.remove(linesRef.current);
      linesRef.current.geometry.dispose();
      (linesRef.current.material as THREE.Material).dispose();
      linesRef.current = null;
    }

    // Create node meshes
    nodes.forEach((node, i) => {
      const size = 3 + (node.patent.citations_count / 250) * 8;
      const geo = new THREE.SphereGeometry(Math.max(2, size), 24, 24);
      const color = getColor(node.patent);
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        shininess: 80,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.x, node.y, node.z);
      mesh.userData.index = i;
      meshRef.current!.add(mesh);
      nodeMeshesRef.current.push(mesh);
    });

    // Create connection lines
    const positions: number[] = [];
    mockPatents.forEach((p) => {
      (p.related_patents || []).forEach((rid) => {
        const source = nodes.find(n => n.id === p.id);
        const target = nodes.find(n => n.id === rid);
        if (source && target) {
          positions.push(source.x, source.y, source.z, target.x, target.y, target.z);
        }
      });
    });

    if (positions.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.4,
      });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      sceneRef.current.add(lines);
      linesRef.current = lines;
    }

    // Update screen positions for tooltip
    const updateScreenPos = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      const cam = cameraRef.current;
      nodes.forEach((node) => {
        const vec = new THREE.Vector3(node.x, node.y, node.z);
        vec.project(cam);
        const rect = rendererRef.current!.domElement.getBoundingClientRect();
        node.screenPos = {
          x: (vec.x * 0.5 + 0.5) * rect.width,
          y: (-vec.y * 0.5 + 0.5) * rect.height,
        };
      });
    };
    updateScreenPos();
    // Update screen positions periodically
    const interval = setInterval(updateScreenPos, 100);
    return () => clearInterval(interval);
  }, [layout]);

  const layoutOptions: { value: LayoutType; label: string; desc: string }[] = [
    { value: 'force', label: 'Force Graph', desc: 'Physics-based clustering' },
    { value: 'timeline', label: 'Timeline', desc: 'Chronological layout' },
    { value: 'radial', label: 'Radial', desc: 'Category clusters' },
  ];

  const categories = [...new Set(mockPatents.map(p => p.category))];

  return (
    <div className="p-4 lg:p-8 space-y-4">
      {/* Header */}
      <div id="visualization-header">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">3D Patent Visualization</h1>
        <p className="text-slate-400 text-sm mt-1">Interactive 3D network graph of patent relationships</p>
      </div>

      {/* Layout switcher */}
      <div id="visualization-controls" className="flex flex-wrap gap-2">
        {layoutOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setLayout(opt.value)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              layout === opt.value
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {opt.label}
            <span className="block text-xs opacity-60 mt-0.5">{opt.desc}</span>
          </button>
        ))}
      </div>

      {/* 3D Canvas + Legend */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <div
            ref={mountRef}
            className="w-full h-[500px] lg:h-[600px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden"
          />

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute pointer-events-none z-20 bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl max-w-xs"
              style={{
                left: `${tooltip.x + 15}px`,
                top: `${tooltip.y + 15}px`,
              }}
            >
              <p className="text-sky-400 font-mono text-xs">{tooltip.patent.patent_number}</p>
              <p className="text-white text-sm font-medium mt-1">{tooltip.patent.title}</p>
              <p className="text-slate-400 text-xs mt-1">{tooltip.patent.applicant}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-slate-500">Citations: <span className="text-slate-300">{tooltip.patent.citations_count}</span></span>
                <span className="text-slate-500">Similarity: <span className="text-slate-300">{tooltip.patent.similarity_score.toFixed(2)}</span></span>
              </div>
            </div>
          )}

          {/* Info badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-xs text-slate-400 backdrop-blur-xl">
            <Info className="w-3.5 h-3.5" />
            Click nodes for details. Drag to rotate.
          </div>
        </div>

        {/* Legend */}
        <div className="lg:w-56 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Categories</h3>
          <div className="space-y-2">
            {categories.map((cat) => {
              const colorHex = '#' + getColor(mockPatents.find(p => p.category === cat)!).toString(16).padStart(6, '0');
              return (
                <div key={cat} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex }} />
                  <span className="text-slate-400 text-xs">{cat}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <h3 className="text-white font-semibold text-sm mb-2">Node Size</h3>
            <p className="text-slate-500 text-xs">Proportional to citation count</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800">
            <h3 className="text-white font-semibold text-sm mb-2">Lines</h3>
            <p className="text-slate-500 text-xs">Patent citation relationships</p>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedPatent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPatent(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sky-400 font-mono text-sm">{selectedPatent.patent_number}</p>
                <h2 className="text-white text-lg font-bold mt-1">{selectedPatent.title}</h2>
              </div>
              <button onClick={() => setSelectedPatent(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Abstract</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedPatent.abstract}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Applicant</p>
                  <p className="text-sm text-slate-300">{selectedPatent.applicant}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Filing Date</p>
                  <p className="text-sm text-slate-300">{selectedPatent.filing_date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Classification</p>
                  <p className="text-sm text-slate-300 font-mono">{selectedPatent.classification}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm text-slate-300">{selectedPatent.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Citations</p>
                  <p className="text-sm text-slate-300">{selectedPatent.citations_count}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Similarity</p>
                  <p className="text-sm text-slate-300">{selectedPatent.similarity_score.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  selectedPatent.status === 'granted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  selectedPatent.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {selectedPatent.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
