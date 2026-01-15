/**
 * 4D TENSOR VISUALIZER - ENGINE
 */

// --- 1. CONFIGURATION & STATE ---
const state = {
    H: 2, B: 8, S: 12, D: 8,
    explode: 0.3,
    is3D: true,
    autoRotate: false,
    isHeatmap: false,
    cameraDist: 25,
    angles: { x: 0.5, y: 0.4 }
};

let scene, camera, renderer, raycaster, mouse;
let tensorBlocks = []; // Stores our group and cell data
let hoveredCell = null;

// --- 2. CORE INITIALIZATION ---
function init() {
    const container = document.getElementById('viewport');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0b);

    // Camera setup
    updateCamera(container);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const point = new THREE.PointLight(0xffffff, 0.5);
    point.position.set(20, 20, 20);
    scene.add(ambient, point);

    setupUI();
    renderTensor();
    animate();
}

function updateCamera(container) {
    const aspect = container.clientWidth / container.clientHeight;
    if (state.is3D) {
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    } else {
        const f = 20;
        camera = new THREE.OrthographicCamera(f*aspect/-2, f*aspect/2, f/2, f/-2, 0.1, 1000);
    }
    syncCamera();
}

function syncCamera() {
    if (state.is3D) {
        camera.position.x = state.cameraDist * Math.sin(state.angles.x) * Math.cos(state.angles.y);
        camera.position.z = state.cameraDist * Math.cos(state.angles.x) * Math.cos(state.angles.y);
        camera.position.y = state.cameraDist * Math.sin(state.angles.y);
    } else {
        camera.position.set(0, 0, 30);
    }
    camera.lookAt(0, 0, 0);
}

// --- 3. TENSOR GENERATION ---
function renderTensor() {
    // Cleanup
    tensorBlocks.forEach(b => scene.remove(b.group));
    tensorBlocks = [];

    const cellSize = 0.7;
    const gap = 0.15;
    const depth = 0.2;
    
    const blockW = state.D * (cellSize + gap);
    const blockH = state.S * (cellSize + gap);
    const headSpacing = blockW * 2.0;
    const startX = -((state.H - 1) * headSpacing) / 2;

    for (let h = 0; h < state.H; h++) {
        const group = new THREE.Group();
        const blockData = { group, cells: [] };

        for (let b = 0; b < state.B; b++) {
            const explodeFac = 1 + (state.explode * 3);
            const zOffset = -b * (depth + 0.1) * explodeFac;
            const xyOffset = b * 0.15 * (1 + state.explode);

            // Front Layer: Detailed & Interactive
            if (b === 0) {
                for (let s = 0; s < state.S; s++) {
                    for (let d = 0; d < state.D; d++) {
                        const val = Math.random(); // Mock activation value
                        
                        const geo = new THREE.BoxGeometry(cellSize, cellSize, depth);
                        
                        // Color Logic
                        let color = new THREE.Color(0x58C4DD);
                        if (state.isHeatmap) {
                            // Map 0-1 to HSL (Blue to Red)
                            color.setHSL((240 - (val * 240)) / 360, 0.8, 0.5);
                        }

                        const mat = new THREE.MeshPhongMaterial({ 
                            color: color, 
                            transparent: true, 
                            opacity: 0.85,
                            emissive: color,
                            emissiveIntensity: state.isHeatmap ? 0.3 : 0.1
                        });

                        const mesh = new THREE.Mesh(geo, mat);
                        const edge = new THREE.LineSegments(
                            new THREE.EdgesGeometry(geo),
                            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
                        );

                        const xPos = -(blockW/2) + d*(cellSize+gap) + cellSize/2;
                        const yPos = (blockH/2) - s*(cellSize+gap) - cellSize/2;

                        const cellGroup = new THREE.Group();
                        cellGroup.position.set(xPos + xyOffset, yPos + xyOffset, zOffset);
                        cellGroup.add(mesh, edge);
                        group.add(cellGroup);

                        blockData.cells.push({ mesh, edge, val, indices: { h, b, s, d }, origCol: color });
                    }
                }
            } else {
                // Background Layers: Simplified "Ghost" planes for performance
                const ghostGeo = new THREE.BoxGeometry(blockW, blockH, depth * 0.5);
                const ghostMat = new THREE.MeshPhongMaterial({ color: 0x333333, transparent: true, opacity: 0.2 });
                const ghost = new THREE.Mesh(ghostGeo, ghostMat);
                ghost.position.set(xyOffset, xyOffset, zOffset);
                group.add(ghost);
            }
        }

        group.position.x = startX + (h * headSpacing);
        scene.add(group);
        tensorBlocks.push(blockData);
    }
    document.getElementById('shape-display').textContent = `[${state.H}, ${state.B}, ${state.S}, ${state.D}]`;
}

// --- 4. INTERACTIONS ---
function setupUI() {
    // Sliders
    const link = (id, key, multiplier=1) => {
        const input = document.getElementById(id);
        const display = document.getElementById(id.replace('-slider', '-val'));
        input.addEventListener('input', (e) => {
            state[key] = parseFloat(e.target.value) / multiplier;
            if (display) display.textContent = state[key].toFixed(multiplier === 1 ? 0 : 2);
            renderTensor();
        });
    };

    link('h-slider', 'H');
    link('b-slider', 'B');
    link('s-slider', 'S');
    link('d-slider', 'D');
    link('ex-slider', 'explode', 100);

    // View Toggles
    document.getElementById('btn-3d').onclick = (e) => toggleView(true, e.target);
    document.getElementById('btn-2d').onclick = (e) => toggleView(false, e.target);
    
    document.getElementById('btn-heatmap').onclick = (e) => {
        state.isHeatmap = !state.isHeatmap;
        e.target.classList.toggle('active');
        e.target.textContent = `Heatmap: ${state.isHeatmap ? 'ON' : 'OFF'}`;
        renderTensor();
    };

    document.getElementById('btn-rotate').onclick = (e) => {
        state.autoRotate = !state.autoRotate;
        e.target.classList.toggle('active');
    };

    document.getElementById('btn-reset').onclick = () => {
        state.angles = { x: 0.5, y: 0.4 };
        state.cameraDist = 25;
        syncCamera();
    };

    // Mouse Controls
    const viewport = document.getElementById('viewport');
    viewport.addEventListener('mousemove', onMouseMove);
    viewport.addEventListener('wheel', (e) => {
        state.cameraDist = Math.max(5, Math.min(100, state.cameraDist + e.deltaY * 0.05));
        syncCamera();
        e.preventDefault();
    }, { passive: false });

    // Window Resize
    window.onresize = () => {
        camera.aspect = viewport.clientWidth / viewport.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    };
}

function toggleView(is3D, btn) {
    state.is3D = is3D;
    document.getElementById('btn-3d').classList.remove('active');
    document.getElementById('btn-2d').classList.remove('active');
    btn.classList.add('active');
    updateCamera(document.getElementById('viewport'));
    renderTensor();
}

function onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Camera Orbiting (Clickless rotation for demo, usually use mousedown)
    if (e.buttons === 1) {
        state.angles.x -= e.movementX * 0.01;
        state.angles.y = Math.max(-1.5, Math.min(1.5, state.angles.y + e.movementY * 0.01));
        syncCamera();
    }

    raycaster.setFromCamera(mouse, camera);
    const meshes = tensorBlocks.flatMap(b => b.cells.map(c => c.mesh));
    const intersects = raycaster.intersectObjects(meshes);

    const tooltip = document.getElementById('tooltip');

    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const cell = tensorBlocks.flatMap(b => b.cells).find(c => c.mesh === mesh);
        
        if (cell) {
            highlightCrossSection(cell.indices.s, cell.indices.d);
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 20) + 'px';
            tooltip.style.top = (e.clientY + 20) + 'px';
            tooltip.innerHTML = `
                <strong>INDEX</strong> [${cell.indices.h}, ${cell.indices.b}, ${cell.indices.s}, ${cell.indices.d}]<br>
                <hr style="margin:5px 0; opacity:0.2">
                <strong>ACTIVATION:</strong> <span style="color:#FFC107">${cell.val.toFixed(5)}</span>
            `;
        }
    } else {
        tooltip.style.display = 'none';
        resetHighlights();
    }
}

function highlightCrossSection(s, d) {
    tensorBlocks.forEach(b => b.cells.forEach(c => {
        if (c.indices.s === s && c.indices.d === d) {
            c.mesh.material.emissiveIntensity = 1.0;
            c.edge.material.opacity = 1.0;
        } else {
            c.mesh.material.emissiveIntensity = 0.1;
            c.edge.material.opacity = 0.1;
        }
    }));
}

function resetHighlights() {
    tensorBlocks.forEach(b => b.cells.forEach(c => {
        c.mesh.material.emissiveIntensity = state.isHeatmap ? 0.3 : 0.1;
        c.edge.material.opacity = 0.2;
    }));
}

function animate() {
    requestAnimationFrame(animate);
    if (state.autoRotate) {
        state.angles.x += 0.005;
        syncCamera();
    }
    renderer.render(scene, camera);
}

// Start
init();