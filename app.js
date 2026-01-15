/**
 * 4D Tensor Visualizer
 * Logic Architecture:
 * 1. State Management (The 'Source of Truth')
 * 2. Three.js Engine (Scene, Camera, Renderer)
 * 3. Component Factory (Building the blocks)
 * 4. UI/Interaction Handlers
 */

// 1. GLOBAL STATE
const state = {
    H: 2, B: 8, S: 12, D: 8,
    explode: 0.3,
    is3D: true,
    autoRotate: false,
    cameraDistance: 25,
    angles: { x: Math.atan2(8, 25), y: Math.atan2(8, Math.sqrt(8 * 8 + 25 * 25)) }
};

// 2. THREE.JS INITIALIZATION
let scene, camera, renderer, raycaster, mouse;
let tensorBlocks = [];
let hoveredCell = null;

const init = () => {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    initCamera(container);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const direct1 = new THREE.DirectionalLight(0xffffff, 0.5);
    direct1.position.set(10, 10, 15);
    scene.add(ambient, direct1);

    renderTensor();
    setupEventListeners();
    animate();
};

const initCamera = (container) => {
    const aspect = container.clientWidth / container.clientHeight;
    if (state.is3D) {
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        updateCameraPosition();
    } else {
        const f = 20;
        camera = new THREE.OrthographicCamera(f * aspect / -2, f * aspect / 2, f / 2, f / -2, 0.1, 1000);
        camera.position.set(0, 0, 30);
    }
    camera.lookAt(0, 0, 0);
};

// 3. TENSOR RENDERING LOGIC
const renderTensor = () => {
    // Clear existing
    tensorBlocks.forEach(b => scene.remove(b.group));
    tensorBlocks = [];

    const cellSize = 0.8;
    const cellGap = 0.1;
    const thickness = 0.15;
    
    const blockW = state.D * (cellSize + cellGap);
    const blockH = state.S * (cellSize + cellGap);
    const headSpacing = blockW * 1.8;
    const startX = -((state.H * headSpacing) / 2) + (headSpacing / 2);

    for (let h = 0; h < state.H; h++) {
        const group = new THREE.Group();
        const blockData = { group, cells: [], headIndex: h };

        for (let b = 0; b < state.B; b++) {
            const offset = {
                x: b * 0.15 * (1 + state.explode),
                y: b * 0.15 * (1 + state.explode),
                z: -b * (thickness + 0.05) * (1 + state.explode * 4)
            };

            // Only render full interactive cells for the top layer to save performance
            if (b === 0) {
                createLayerCells(group, blockData, h, b, offset, blockW, blockH, cellSize, cellGap, thickness);
            } else {
                createGhostLayer(group, offset, blockW, blockH, thickness);
            }
        }

        group.position.x = startX + (h * headSpacing);
        scene.add(group);
        tensorBlocks.push(blockData);
    }
    document.getElementById('shape-display').textContent = `[${state.H}, ${state.B}, ${state.S}, ${state.D}]`;
};

// Helper: Create the interactive front layer
function createLayerCells(group, blockData, h, b, offset, blockW, blockH, size, gap, thick) {
    for (let s = 0; s < state.S; s++) {
        for (let d = 0; d < state.D; d++) {
            const geo = new THREE.BoxGeometry(size * 0.85, size * 0.85, thick * 0.4);
            const mat = new THREE.MeshPhongMaterial({ 
                color: 0x58C4DD, transparent: true, opacity: 0.8, emissive: 0x58C4DD, emissiveIntensity: 0.2 
            });
            
            const mesh = new THREE.Mesh(geo, mat);
            const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x58C4DD }));
            
            const cellGroup = new THREE.Group();
            cellGroup.add(mesh, edge);
            
            const yPos = (blockH / 2) - s * (size + gap) - (size / 2);
            const xPos = -(blockW / 2) + d * (size + gap) + (size / 2);
            
            cellGroup.position.set(xPos + offset.x, yPos + offset.y, offset.z + thick);
            group.add(cellGroup);

            blockData.cells.push({
                mesh, edge, 
                indices: { h, b, s, d },
                origMat: mat, origEdge: edge.material
            });
        }
    }
}

// Helper: Create the background visual layers
function createGhostLayer(group, offset, w, h, thick) {
    const geo = new THREE.BoxGeometry(w + 0.3, h + 0.3, thick);
    const mat = new THREE.MeshPhongMaterial({ color: 0xd0d0d0, transparent: true, opacity: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(offset.x, offset.y, offset.z);
    group.add(mesh);
}

// 4. INTERACTION & ANIMATION
const updateCameraPosition = () => {
    camera.position.x = state.cameraDistance * Math.sin(state.angles.x) * Math.cos(state.angles.y);
    camera.position.z = state.cameraDistance * Math.cos(state.angles.x) * Math.cos(state.angles.y);
    camera.position.y = state.cameraDistance * Math.sin(state.angles.y);
    camera.lookAt(0, 0, 0);
};

const setupEventListeners = () => {
    const container = document.getElementById('canvas-container');

    // Tooltip & Hover
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        handleHover(e);
    });

    // Sliders
    const bindSlider = (id, key, multiplier = 1) => {
        const el = document.getElementById(id);
        el.addEventListener('input', (e) => {
            state[key] = parseFloat(e.target.value) / multiplier;
            document.getElementById(`${id.split('-')[0]}-value`).textContent = state[key].toFixed(multiplier === 1 ? 0 : 2);
            renderTensor();
        });
    };

    bindSlider('h-slider', 'H');
    bindSlider('b-slider', 'B');
    bindSlider('s-slider', 'S');
    bindSlider('d-slider', 'D');
    bindSlider('explode-slider', 'explode', 100);

    // Buttons
    document.getElementById('auto-rotate').onclick = (e) => {
        state.autoRotate = !state.autoRotate;
        e.target.classList.toggle('active');
    };

    document.getElementById('reset-view').onclick = () => {
        state.angles = { x: 0.5, y: 0.3 };
        state.cameraDistance = 25;
        updateCameraPosition();
    };
    
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
};

const handleHover = (event) => {
    raycaster.setFromCamera(mouse, camera);
    const allMeshes = tensorBlocks.flatMap(b => b.cells.map(c => c.mesh));
    const intersects = raycaster.intersectObjects(allMeshes);
    const tooltip = document.getElementById('tooltip');

    if (hoveredCell) resetCell(hoveredCell);

    if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const cell = tensorBlocks.flatMap(b => b.cells).find(c => c.mesh === mesh);
        if (cell) {
            highlightMatch(cell.indices.s, cell.indices.d);
            hoveredCell = cell;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY + 15}px`;
            tooltip.innerHTML = `Head: ${cell.indices.h} | Batch: ${cell.indices.b}<br>Seq: ${cell.indices.s} | Dim: ${cell.indices.d}`;
        }
    } else {
        tooltip.style.display = 'none';
    }
};

const highlightMatch = (s, d) => {
    tensorBlocks.forEach(b => b.cells.forEach(c => {
        if (c.indices.s === s && c.indices.d === d) {
            c.mesh.material = new THREE.MeshPhongMaterial({ color: 0xFFC107, emissive: 0xFFC107 });
        }
    }));
};

const resetCell = (cell) => {
    tensorBlocks.forEach(b => b.cells.forEach(c => {
        c.mesh.material = c.origMat;
    }));
};

const animate = () => {
    requestAnimationFrame(animate);
    if (state.autoRotate) {
        state.angles.x += 0.005;
        updateCameraPosition();
    }
    renderer.render(scene, camera);
};

init();