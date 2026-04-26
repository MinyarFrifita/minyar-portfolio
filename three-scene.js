/* ===================================
   Three.js 3D Scene — Portfolio
   Particles · Geometry · Post-Processing
   =================================== */

(function () {
    'use strict';

    // ===== WebGL Detection =====
    function isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    if (!isWebGLAvailable()) {
        console.warn('WebGL not available — falling back to 2D');
        return;
    }

    // ===== GLOBALS =====
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();
    let scrollProgress = 0;
    const isMobile = window.innerWidth < 768;

    // ===== SCENE SETUP =====
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.0008);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);

    const renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('three-canvas'),
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // ===== POST-PROCESSING (UnrealBloom) =====
    let composer = null;
    let bloomPass = null;

    function setupPostProcessing() {
        if (typeof THREE.EffectComposer === 'undefined') return;

        composer = new THREE.EffectComposer(renderer);
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);

        bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            isMobile ? 0.6 : 1.0,   // strength
            0.4,                      // radius
            0.85                      // threshold
        );
        composer.addPass(bloomPass);
    }

    // ===== 3D PARTICLE NETWORK =====
    const PARTICLE_COUNT = isMobile ? 120 : 300;
    const CONNECTION_DISTANCE = isMobile ? 12 : 15;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Color palette — purple/violet/pink
    const colorPalette = [
        new THREE.Color(0x8b5cf6), // purple
        new THREE.Color(0x6366f1), // indigo
        new THREE.Color(0xa78bfa), // light purple
        new THREE.Color(0xec4899), // pink
        new THREE.Color(0xc4b5fd), // lavender
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        // Spread particles in a large sphere
        const radius = 30 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi) - 20;

        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

        sizes[i] = Math.random() * 2.5 + 0.5;

        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle shader material
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vOpacity;
            uniform float uTime;
            uniform float uPixelRatio;

            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float dist = length(mvPosition.xyz);
                vOpacity = smoothstep(80.0, 10.0, dist) * 0.8;
                gl_PointSize = size * uPixelRatio * (80.0 / -mvPosition.z);
                gl_PointSize = max(gl_PointSize, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vOpacity;

            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float alpha = smoothstep(0.5, 0.0, d) * vOpacity;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // ===== CONNECTION LINES =====
    const MAX_CONNECTIONS = isMobile ? 200 : 600;
    const linePositions = new Float32Array(MAX_CONNECTIONS * 6);
    const lineColors = new Float32Array(MAX_CONNECTIONS * 6);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    lineGeometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const connectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(connectionLines);

    // ===== HERO WIREFRAME GEOMETRY =====
    const heroGroup = new THREE.Group();
    heroGroup.position.set(18, 0, 0);
    scene.add(heroGroup);

    // Main icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(8, 1);
    const icoMat = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        wireframe: true,
        transparent: true,
        opacity: 0.35
    });
    const icosahedron = new THREE.Mesh(icoGeo, icoMat);
    heroGroup.add(icosahedron);

    // Inner icosahedron
    const innerIcoGeo = new THREE.IcosahedronGeometry(5, 1);
    const innerIcoMat = new THREE.MeshBasicMaterial({
        color: 0xec4899,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    const innerIcosahedron = new THREE.Mesh(innerIcoGeo, innerIcoMat);
    heroGroup.add(innerIcosahedron);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(11, 0.08, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    heroGroup.add(ring);

    // Second ring
    const ring2Geo = new THREE.TorusGeometry(13, 0.05, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.15
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    heroGroup.add(ring2);

    // Inner particle cloud
    const innerParticleCount = isMobile ? 40 : 100;
    const innerPositions = new Float32Array(innerParticleCount * 3);
    const innerSizes = new Float32Array(innerParticleCount);
    const innerColors = new Float32Array(innerParticleCount * 3);

    for (let i = 0; i < innerParticleCount; i++) {
        const i3 = i * 3;
        const r = Math.random() * 6;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        innerPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
        innerPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        innerPositions[i3 + 2] = r * Math.cos(phi);
        innerSizes[i] = Math.random() * 1.5 + 0.5;
        const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        innerColors[i3] = c.r;
        innerColors[i3 + 1] = c.g;
        innerColors[i3 + 2] = c.b;
    }

    const innerGeo = new THREE.BufferGeometry();
    innerGeo.setAttribute('position', new THREE.BufferAttribute(innerPositions, 3));
    innerGeo.setAttribute('size', new THREE.BufferAttribute(innerSizes, 1));
    innerGeo.setAttribute('color', new THREE.BufferAttribute(innerColors, 3));

    const innerMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float uTime;
            uniform float uPixelRatio;

            void main() {
                vColor = color;
                vec3 pos = position;
                pos.x += sin(uTime * 0.5 + position.y * 2.0) * 0.3;
                pos.y += cos(uTime * 0.4 + position.x * 2.0) * 0.3;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * uPixelRatio * (60.0 / -mvPosition.z);
                gl_PointSize = max(gl_PointSize, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float alpha = smoothstep(0.5, 0.0, d) * 0.7;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const innerParticles = new THREE.Points(innerGeo, innerMat);
    heroGroup.add(innerParticles);

    // ===== FLOATING AMBIENT SPHERES =====
    const ambientSpheres = [];
    const sphereCount = isMobile ? 5 : 12;
    for (let i = 0; i < sphereCount; i++) {
        const size = Math.random() * 0.8 + 0.2;
        const geo = new THREE.SphereGeometry(size, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
            transparent: true,
            opacity: Math.random() * 0.15 + 0.05
        });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.set(
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 40 - 20
        );
        sphere.userData = {
            speed: Math.random() * 0.3 + 0.1,
            offset: Math.random() * Math.PI * 2,
            amplitude: Math.random() * 3 + 1
        };
        scene.add(sphere);
        ambientSpheres.push(sphere);
    }

    // ===== UPDATE PARTICLES =====
    function updateParticles(time) {
        const pos = particleGeometry.attributes.position.array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;

            // Organic floating motion
            pos[i3] += velocities[i3] + Math.sin(time * 0.3 + i * 0.1) * 0.005;
            pos[i3 + 1] += velocities[i3 + 1] + Math.cos(time * 0.2 + i * 0.15) * 0.005;
            pos[i3 + 2] += velocities[i3 + 2] + Math.sin(time * 0.25 + i * 0.2) * 0.003;

            // Mouse influence in 3D
            const dx = (mouse.x * 30) - pos[i3];
            const dy = (mouse.y * 20) - pos[i3 + 1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20) {
                const force = (20 - dist) / 20 * 0.003;
                pos[i3] += dx * force;
                pos[i3 + 1] += dy * force;
            }

            // Soft boundaries
            const bound = 60;
            if (Math.abs(pos[i3]) > bound) velocities[i3] *= -1;
            if (Math.abs(pos[i3 + 1]) > bound) velocities[i3 + 1] *= -1;
            if (Math.abs(pos[i3 + 2] + 20) > bound) velocities[i3 + 2] *= -1;
        }

        particleGeometry.attributes.position.needsUpdate = true;
    }

    // ===== UPDATE CONNECTIONS =====
    let connectionFrame = 0;
    function updateConnections() {
        // Update connections every 2 frames for performance
        connectionFrame++;
        if (connectionFrame % 2 !== 0) return;

        const pos = particleGeometry.attributes.position.array;
        let lineIndex = 0;
        const lPos = lineGeometry.attributes.position.array;
        const lCol = lineGeometry.attributes.color.array;

        for (let i = 0; i < PARTICLE_COUNT && lineIndex < MAX_CONNECTIONS; i++) {
            for (let j = i + 1; j < PARTICLE_COUNT && lineIndex < MAX_CONNECTIONS; j++) {
                const i3 = i * 3;
                const j3 = j * 3;
                const dx = pos[i3] - pos[j3];
                const dy = pos[i3 + 1] - pos[j3 + 1];
                const dz = pos[i3 + 2] - pos[j3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < CONNECTION_DISTANCE) {
                    const idx = lineIndex * 6;
                    lPos[idx] = pos[i3];
                    lPos[idx + 1] = pos[i3 + 1];
                    lPos[idx + 2] = pos[i3 + 2];
                    lPos[idx + 3] = pos[j3];
                    lPos[idx + 4] = pos[j3 + 1];
                    lPos[idx + 5] = pos[j3 + 2];

                    const alpha = 1 - dist / CONNECTION_DISTANCE;
                    lCol[idx] = 0.545 * alpha;
                    lCol[idx + 1] = 0.361 * alpha;
                    lCol[idx + 2] = 0.965 * alpha;
                    lCol[idx + 3] = 0.545 * alpha;
                    lCol[idx + 4] = 0.361 * alpha;
                    lCol[idx + 5] = 0.965 * alpha;

                    lineIndex++;
                }
            }
        }

        lineGeometry.setDrawRange(0, lineIndex * 2);
        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.attributes.color.needsUpdate = true;
    }

    // ===== ANIMATION LOOP =====
    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();
        const delta = clock.getDelta();

        // Smooth mouse following
        mouse.x += (targetMouse.x - mouse.x) * 0.05;
        mouse.y += (targetMouse.y - mouse.y) * 0.05;

        // Update uniforms
        particleMaterial.uniforms.uTime.value = time;
        innerMat.uniforms.uTime.value = time;

        // Update particles
        updateParticles(time);
        updateConnections();

        // Rotate particle system slowly
        particleSystem.rotation.y = time * 0.02;
        particleSystem.rotation.x = Math.sin(time * 0.01) * 0.1;

        // Hero geometry animations
        icosahedron.rotation.x = time * 0.15 + mouse.y * 0.5;
        icosahedron.rotation.y = time * 0.2 + mouse.x * 0.5;
        icosahedron.rotation.z = time * 0.05;

        innerIcosahedron.rotation.x = -time * 0.2 + mouse.y * 0.3;
        innerIcosahedron.rotation.y = -time * 0.15 + mouse.x * 0.3;

        ring.rotation.z = time * 0.1;
        ring2.rotation.z = -time * 0.08;
        ring2.rotation.x = Math.PI / 3 + Math.sin(time * 0.2) * 0.1;

        // Hero group breathing
        const breathe = Math.sin(time * 0.5) * 0.1 + 1;
        heroGroup.scale.set(breathe, breathe, breathe);

        // Mouse follow for hero group
        heroGroup.rotation.y = mouse.x * 0.3;
        heroGroup.rotation.x = -mouse.y * 0.2;

        // Ambient spheres floating
        ambientSpheres.forEach(sphere => {
            const d = sphere.userData;
            sphere.position.y += Math.sin(time * d.speed + d.offset) * 0.01 * d.amplitude;
            sphere.position.x += Math.cos(time * d.speed * 0.7 + d.offset) * 0.005;
        });

        // Scroll-linked camera
        camera.position.y = -scrollProgress * 15;
        camera.position.z = 50 - scrollProgress * 5;
        camera.lookAt(0, -scrollProgress * 15, 0);

        // Fade hero geometry based on scroll
        const heroOpacity = Math.max(0, 1 - scrollProgress * 3);
        icoMat.opacity = 0.35 * heroOpacity;
        innerIcoMat.opacity = 0.2 * heroOpacity;
        ringMat.opacity = 0.3 * heroOpacity;
        ring2Mat.opacity = 0.15 * heroOpacity;
        heroGroup.visible = heroOpacity > 0.01;

        // Render with or without post-processing
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }

    // ===== EVENT LISTENERS =====
    document.addEventListener('mousemove', (e) => {
        targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('scroll', () => {
        scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    }, { passive: true });

    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (composer) {
            composer.setSize(w, h);
        }
    });

    // ===== INIT =====
    setupPostProcessing();
    animate();

})();
