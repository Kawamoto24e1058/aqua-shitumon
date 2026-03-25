<script>
  import { onMount, onDestroy } from 'svelte';
  import Matter from 'matter-js';
  /** @type {any} */
  const MatterJS = Matter;
  const Engine = MatterJS.Engine;
  const Render = MatterJS.Render;
  const Runner = MatterJS.Runner;
  const Bodies = MatterJS.Bodies;
  const Composite = MatterJS.Composite;
  const Body = MatterJS.Body;
  const Events = MatterJS.Events;
  
  import { db } from '$lib/firebase';
  import { 
    collection, 
    onSnapshot, 
    query, 
    doc 
  } from 'firebase/firestore';
  import { fade, scale } from 'svelte/transition';
  import { elasticOut, cubicOut } from 'svelte/easing';

  /** @type {HTMLCanvasElement} */
  let canvas;
  /** @type {any} */
  let engine;
  /** @type {any} */
  let runner;
  /** @type {any} */
  let render;
  /** @type {any[]} */
  let capsules = [];
  /** @type {any[]} */
  let halves = [];
  /** @type {any} */
  let currentDisplay = null;
  /** @type {any} */
  let unsubscribe;
  /** @type {any} */
  let unsubscribeDisplay;
  
  let isBreaking = false;
  let showOverlay = false;
  let width = 0;
  let height = 0;

  /** @type {HTMLCanvasElement} */
  let bgCanvas;

  /** @type {any} */
  let bgAnimationId;

  const COLORS = [
    '#f87171', // Red
    '#60a5fa', // Blue
    '#34d399', // Green
    '#fbbf24', // Yellow
    '#a78bfa'  // Purple
  ];

  /** @type {any} */
  let ground;
  /** @type {any} */
  let wallL;
  /** @type {any} */
  let wallR;

  onMount(() => {
    updateDimensions();

    // === BACKGROUND NETWORK GRAPH ANIMATION ===
    const bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) {
      /** @type {Array<{x: number, y: number, vx: number, vy: number, radius: number}>} */
      let particles = [];
      const numParticles = 80;

      const initParticles = () => {
        particles = [];
        for (let i = 0; i < numParticles; i++) {
          particles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1
          });
        }
      };

      const resizeBg = () => {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
        initParticles();
      };
      window.addEventListener('resize', resizeBg);
      resizeBg();

      const drawBg = () => {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        
        bgCtx.fillStyle = 'rgba(212, 175, 55, 0.6)'; // Gold particles
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          
          if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;
          
          bgCtx.beginPath();
          bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          bgCtx.fill();
        });
        
        bgCtx.lineWidth = 0.5;
        for (let i = 0; i < numParticles; i++) {
          for (let j = i + 1; j < numParticles; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 150) {
              // Gold edges
              bgCtx.strokeStyle = `rgba(212, 175, 55, ${0.3 * (1 - dist/150)})`;
              bgCtx.beginPath();
              bgCtx.moveTo(particles[i].x, particles[i].y);
              bgCtx.lineTo(particles[j].x, particles[j].y);
              bgCtx.stroke();
            }
          }
        }
        bgAnimationId = requestAnimationFrame(drawBg);
      };
      drawBg();
    }

    engine = Engine.create();    engine.world.gravity.y = 1.0;
    
    render = Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: 'transparent',
        wireframes: false,
        pixelRatio: window.devicePixelRatio,
        hasBounds: false
      }
    });

    // CUSTOM RENDERER: Two-tone capsules with gloss
    Events.on(render, 'afterRender', () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const allBodies = Composite.allBodies(engine.world);

      allBodies.forEach(/** @param {any} body */ body => {
        if (!body.parts || body.parts.length > 1) return; // Skip compound/walls
        
        // Only draw our capsules (circles with specific properties)
        if (body.circleRadius) {
          const { x, y } = body.position;
          const r = body.circleRadius;
          const angle = body.angle;
          const color = body.render.fillStyle;

          ctx.save();
          // Context is already scaled by PixelRatio internally by Matter.js Render
          ctx.translate(x, y);
          ctx.rotate(angle);

          // 1. Bottom Half (Colored) - 0 to PI
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();

          // 2. Top Half (Clear/Gray) - PI to 2PI
          ctx.beginPath();
          ctx.arc(0, 0, r, Math.PI, Math.PI * 2, false);
          ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
          ctx.fill();

          // 3. Shine/Gloss (Radial Gradient)
          const gradient = ctx.createRadialGradient(-r/3, -r/3, r/10, 0, 0, r);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.1)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // 4. Border (White)
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.stroke();

          // 5. Middle Join Line
          ctx.beginPath();
          ctx.moveTo(-r, 0);
          ctx.lineTo(r, 0);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.stroke();

          ctx.restore();
        }
      });
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    // INCREASE INTERNAL ITERATIONS FOR COLLISION STABILITY
    engine.positionIterations = 10;
    engine.velocityIterations = 10;

    const wallThickness = 500;
    // Position floor so its top edge is at height - 20 (y = height - 20 + 250)
    ground = Bodies.rectangle(width / 2, height - 20 + 250, width, wallThickness, { 
      isStatic: true,
      render: { visible: false }
    });
    wallL = Bodies.rectangle(-250, height / 2, wallThickness, height * 2, { 
      isStatic: true,
      render: { visible: false } 
    });
    wallR = Bodies.rectangle(width + 250, height / 2, wallThickness, height * 2, { 
      isStatic: true,
      render: { visible: false } 
    });
    
    Composite.add(engine.world, [ground, wallL, wallR]);

    unsubscribe = onSnapshot(query(collection(db, 'questions')), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') addCapsule(change.doc.id);
        else if (change.type === 'removed') removePhysicalCapsule(change.doc.id);
      });
    });

    unsubscribeDisplay = onSnapshot(doc(db, 'appState', 'currentDisplay'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.text && (!currentDisplay || currentDisplay.id !== data.id)) {
          handleNewProjection(data);
        } else if (!data.text) {
          currentDisplay = null;
          resetStage();
        }
      } else {
        currentDisplay = null;
        resetStage();
      }
    });

    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (unsubscribeDisplay) unsubscribeDisplay();
    if (render) Render.stop(render);
    if (bgAnimationId) cancelAnimationFrame(bgAnimationId);
  });

  function updateDimensions() {
    width = window.innerWidth;
    height = window.innerHeight;
  }

  function handleResize() {
    updateDimensions();
    if (render) {
      render.options.width = width;
      render.options.height = height;
      render.canvas.width = width;
      render.canvas.height = height;
    }

    const wallThickness = 500;
    // Position floor so its top edge is at height - 20 (y = height - 20 + 250)
    if (ground) Body.setPosition(ground, { x: width / 2, y: height - 20 + 250 });
    if (wallL) Body.setPosition(wallL, { x: -250, y: height / 2 });
    if (wallR) Body.setPosition(wallR, { x: width + 250, y: height / 2 });
  }

  /** @param {string} id */
  function addCapsule(id) {
    const radius = 45 + Math.random() * 25;
    const startX = width * 0.1 + Math.random() * (width * 0.8);
    const startY = -100;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const body = Bodies.circle(startX, startY, radius, {
      restitution: 0.6,
      friction: 0.5,
      render: { visible: false }
    });

    Body.setMass(body, 1); // Constant mass

    /** @type {any} */ (body).firebaseId = id;
    Composite.add(engine.world, body);
    capsules = [...capsules, { id, body, color, radius }];
  }

  /** @param {string} id */
  function removePhysicalCapsule(id) {
    const caps = capsules.find(c => c.id === id);
    if (caps) {
      Composite.remove(engine.world, caps.body);
      capsules = capsules.filter(c => c.id !== id);
    }
  }

  /** @param {any} data */
  async function handleNewProjection(data) {
    isBreaking = true;
    showOverlay = false;
    currentDisplay = data;

    const target = capsules.find(c => c.id === data.id) || capsules[0];
    
    if (target) {
      const body = target.body;
      Body.setStatic(body, true);
      
      const startPos = { ...body.position };
      const startAngle = body.angle;
      const endPos = { x: width / 2, y: height / 2 };
      const start = Date.now();
      const duration = 1000;
      
      const animate = () => {
        let elapsed = Date.now() - start;
        let progress = Math.min(elapsed / duration, 1);
        let ease = cubicOut(progress);
        
        Body.setPosition(body, {
          x: startPos.x + (endPos.x - startPos.x) * ease,
          y: startPos.y + (endPos.y - startPos.y) * ease
        });
        
        // Rotate to upright position (split line vertical)
        Body.setAngle(body, startAngle + (0 - startAngle) * ease);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          breakCapsule(target);
        }
      };
      animate();
    } else {
      showOverlay = true;
      isBreaking = false;
    }
  }

  /** @param {any} target */
  function breakCapsule(target) {
    const { body, color, radius } = target;
    const pos = body.position;
    
    Composite.remove(engine.world, body);
    capsules = capsules.filter(c => c.id !== target.id);
    
    const points = 15;
    const bottomVerts = [];
    const topVerts = [];
    
    // Bottom Half (Colored) - 0 to PI
    for (let i = 0; i <= points; i++) {
       const theta = (Math.PI * i) / points;
       bottomVerts.push({ x: radius * Math.cos(theta), y: radius * Math.sin(theta) });
    }
    bottomVerts.push({ x: -radius, y: 0 }, { x: radius, y: 0 });

    // Top Half (Clear) - -PI to 0
    for (let i = 0; i <= points; i++) {
       const theta = Math.PI + (Math.PI * i) / points;
       topVerts.push({ x: radius * Math.cos(theta), y: radius * Math.sin(theta) });
    }
    topVerts.push({ x: radius, y: 0 }, { x: -radius, y: 0 });

    const bottomBody = Bodies.fromVertices(pos.x, pos.y + 5, [bottomVerts], {
      render: { fillStyle: color, strokeStyle: 'white', lineWidth: 1 }
    });
    const topBody = Bodies.fromVertices(pos.x, pos.y - 5, [topVerts], {
      render: { fillStyle: 'rgba(200, 200, 200, 0.4)', strokeStyle: 'white', lineWidth: 1 }
    });

    Body.setVelocity(bottomBody, { x: 0, y: 10 });
    Body.setVelocity(topBody, { x: 0, y: -10 });
    Body.setAngularVelocity(bottomBody, 0.1);
    Body.setAngularVelocity(topBody, -0.1);

    Composite.add(engine.world, [bottomBody, topBody]);
    halves = [...halves, bottomBody, topBody];
    
    setTimeout(() => {
      showOverlay = true;
      isBreaking = false;
    }, 400);
  }

  function resetStage() {
    halves.forEach(h => Composite.remove(engine.world, h));
    halves = [];
    showOverlay = false;
    isBreaking = false;
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@900&family=Oswald:wght@700&family=Noto+Sans+JP:wght@400;900&display=swap" rel="stylesheet">
</svelte:head>

<main class="page">
  <canvas bind:this={bgCanvas} class="bg-canvas"></canvas>
  <canvas bind:this={canvas} class="physics-canvas"></canvas>

  <div class="header" class:dim={showOverlay}>
    <h1 class="stage-title">ガイダンス質問</h1>
    <div class="subtitle">2026年度 経済学部 新入生ガイダンス</div>
  </div>

  {#if showOverlay && currentDisplay}
    <div class="display-overlay" in:fade>
      <div class="question-container" in:scale={{ duration: 700, easing: elasticOut, start: 0.8 }}>
        <div class="on-air">NOW PROJECTING</div>
        <p class="text">{currentDisplay.text}</p>
        <div class="meta">
          <span class="user-label">QUESTION BY</span>
          <span class="nickname">@{currentDisplay.nickname || '匿名希望'}</span>
        </div>
      </div>
    </div>
  {/if}

  <div class="footer">
    <div class="status">
      {#if isBreaking}
        <span class="pulse">ANALYZING GACHA DATA...</span>
      {/if}
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: radial-gradient(circle at 50% 50%, #0b132b 0%, #050914 100%);
    font-family: 'Noto Sans JP', sans-serif;
  }

  .page {
    position: relative;
    width: 100vw;
    height: 100vh;
  }

  .bg-canvas {
    position: absolute;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    z-index: 1; /* Below physics */
  }

  .physics-canvas {
    position: absolute;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    z-index: 10;
  }

  .header {
    position: absolute;
    top: 60px;
    width: 100%;
    text-align: center;
    z-index: 5;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .header.dim {
    opacity: 0.1;
    transform: scale(0.95) translateY(-20px);
  }

  .stage-title {
    color: white;
    font-family: 'Montserrat', sans-serif;
    font-size: 7rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    margin: 0;
    line-height: 1;
    text-transform: uppercase;
    background: linear-gradient(to bottom, #fff 30%, #e2e8f0 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.8)) drop-shadow(0 0 40px rgba(212, 175, 55, 0.4));
  }

  .subtitle {
    color: #d4af37;
    font-family: 'Oswald', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.5em;
    margin-top: 1rem;
    text-transform: uppercase;
    opacity: 0.9;
    text-shadow: 0 0 10px rgba(212, 175, 55, 0.6);
  }

  .display-overlay {
    position: absolute;
    inset: 0;
    z-index: 100;
    background: rgba(2, 6, 23, 0.6);
    backdrop-filter: blur(40px) saturate(150%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
  }

  .question-container {
    background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 6rem;
    border-radius: 5rem;
    max-width: 1200px;
    width: 100%;
    text-align: center;
    box-shadow: 0 100px 150px -50px rgba(0,0,0,0.8), 
                inset 0 0 50px rgba(99, 102, 241, 0.1);
  }

  .on-air {
    display: inline-block;
    background: #6366f1;
    color: white;
    padding: 0.6rem 2rem;
    border-radius: 1rem;
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    font-size: 1.2rem;
    margin-bottom: 4rem;
    letter-spacing: 0.2em;
    box-shadow: 0 0 40px rgba(99, 102, 241, 0.5);
  }

  .text {
    color: white;
    font-family: 'Noto Sans JP', sans-serif;
    font-size: 5.5rem;
    font-weight: 900;
    line-height: 1.1;
    margin: 0 0 4rem 0;
    text-shadow: 0 0 20px rgba(212, 175, 55, 0.6), 0 5px 15px rgba(0,0,0,0.8);
    word-break: break-all;
  }

  .meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .user-label {
    color: #475569;
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.3em;
  }

  .nickname {
    color: #6366f1;
    font-family: 'Montserrat', sans-serif;
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: 0.05em;
  }

  .footer {
    position: absolute;
    bottom: 60px;
    width: 100%;
    text-align: center;
    z-index: 20;
    pointer-events: none;
  }

  .status {
    color: #334155;
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.4em;
  }

  .pulse {
    animation: blink 0.8s infinite alternate;
  }

  @keyframes blink {
    from { opacity: 0.1; }
    to { opacity: 0.6; }
  }
</style>
