// Survival Zombie 3D - Ultra Realista
// Variables globales del juego
let scene, camera, renderer, controls;
let player, zombies = [], items = [], bullets = [];
let gameState = {
    vida: 100,
    municion: 30,
    municionTotal: 120,
    zombiesEliminados: 0,
    puntos: 0,
    armaActual: 'pistola',
    inventario: [],
    pausado: false,
    recargando: false,
    gameStarted: false,
    clima: 'despejado',
    hora: 12,
    timeScale: 1
};

// Configuraciones
let config = {
    sensibilidad: 5,
    volumen: 50,
    calidad: 'media',
    fov: 75,
    mostrarFps: false,
    invertirY: false
};

// Sistemas del juego
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let keys = {};
let lastTime = 0;
let fps = 0;

// Armas disponibles
const armas = {
    pistola: { municion: 30, daño: 25, rango: 50, recarga: 2000 },
    rifle: { municion: 40, daño: 35, rango: 80, recarga: 3000 },
    escopeta: { municion: 8, daño: 60, rango: 20, recarga: 2500 },
    ametralladora: { municion: 100, daño: 20, rango: 60, recarga: 4000 },
    francotirador: { municion: 10, daño: 100, rango: 150, recarga: 3500 }
};

// Tipos de clima
const climas = ['despejado', 'lluvia', 'tormenta', 'niebla', 'nieve'];
let climaActual = 0;

// Inicialización del juego
function init() {
    // Crear escena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x404040, 50, 200);

    // Crear cámara
    camera = new THREE.PerspectiveCamera(config.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    // Crear renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Crear mundo
    crearMundo();
    crearLuces();
    crearPlayer();
    
    // Generar contenido inicial
    generarZombies(10);
    generarItems(15);

    // Configurar controles
    setupControles();
    setupEventListeners();

    // Iniciar minimapa
    setupMinimapa();

    // Mostrar controles inicialmente
    document.getElementById('controles').style.display = 'block';

    // Comenzar loop del juego
    animate();
}

// Crear el mundo 3D
function crearMundo() {
    // Suelo
    const geometriaSuelo = new THREE.PlaneGeometry(200, 200);
    const materialSuelo = new THREE.MeshLambertMaterial({ 
        color: 0x4a5c3a,
        map: crearTexturaProcedural(128, 0x4a5c3a, 0x3d4f2a)
    });
    const suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    scene.add(suelo);

    // Edificios y obstáculos
    crearEdificios();
    crearObstaculos();
}

// Crear edificios procedurales
function crearEdificios() {
    for (let i = 0; i < 20; i++) {
        const ancho = Math.random() * 10 + 5;
        const alto = Math.random() * 20 + 10;
        const profundo = Math.random() * 10 + 5;

        const geometria = new THREE.BoxGeometry(ancho, alto, profundo);
        const material = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0.1, 0.2, Math.random() * 0.3 + 0.3)
        });
        const edificio = new THREE.Mesh(geometria, material);

        edificio.position.x = (Math.random() - 0.5) * 180;
        edificio.position.y = alto / 2;
        edificio.position.z = (Math.random() - 0.5) * 180;
        edificio.castShadow = true;
        edificio.receiveShadow = true;

        scene.add(edificio);
    }
}

// Crear obstáculos menores
function crearObstaculos() {
    for (let i = 0; i < 50; i++) {
        const tipo = Math.random();
        let obstaculo;

        if (tipo < 0.3) {
            // Cajas
            const geometria = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            obstaculo = new THREE.Mesh(geometria, material);
        } else if (tipo < 0.6) {
            // Barriles
            const geometria = new THREE.CylinderGeometry(0.8, 0.8, 2, 8);
            const material = new THREE.MeshLambertMaterial({ color: 0x404040 });
            obstaculo = new THREE.Mesh(geometria, material);
        } else {
            // Árboles simples
            const geometria = new THREE.CylinderGeometry(0.3, 0.5, 8, 6);
            const material = new THREE.MeshLambertMaterial({ color: 0x4a5c3a });
            obstaculo = new THREE.Mesh(geometria, material);
        }

        obstaculo.position.x = (Math.random() - 0.5) * 180;
        obstaculo.position.y = 1;
        obstaculo.position.z = (Math.random() - 0.5) * 180;
        obstaculo.castShadow = true;
        obstaculo.receiveShadow = true;

        scene.add(obstaculo);
    }
}

// Crear sistema de luces
function crearLuces() {
    // Luz ambiental
    const luzAmbiental = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(luzAmbiental);

    // Luz direccional (sol)
    const luzSol = new THREE.DirectionalLight(0xffffff, 0.8);
    luzSol.position.set(100, 100, 50);
    luzSol.castShadow = true;
    luzSol.shadow.mapSize.width = 2048;
    luzSol.shadow.mapSize.height = 2048;
    luzSol.shadow.camera.near = 0.5;
    luzSol.shadow.camera.far = 500;
    luzSol.shadow.camera.left = -100;
    luzSol.shadow.camera.right = 100;
    luzSol.shadow.camera.top = 100;
    luzSol.shadow.camera.bottom = -100;
    scene.add(luzSol);

    // Linterna del jugador
    const linterna = new THREE.SpotLight(0xffffff, 1, 30, Math.PI / 6, 0.3);
    linterna.position.set(0, 2, 0);
    linterna.target.position.set(0, 0, -5);
    linterna.castShadow = true;
    scene.add(linterna);
    scene.add(linterna.target);

    // Guardar referencia a la linterna
    player = { linterna: linterna };
}

// Crear jugador
function crearPlayer() {
    // El jugador es representado por la cámara y la linterna
    player.position = camera.position;
    player.rotation = camera.rotation;
    player.velocidad = new THREE.Vector3();
    player.enSuelo = true;
    player.agachado = false;
    player.corriendo = false;
}

// Generar zombies
function generarZombies(cantidad) {
    for (let i = 0; i < cantidad; i++) {
        const geometria = new THREE.BoxGeometry(1, 2, 0.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const zombie = new THREE.Mesh(geometria, material);

        // Posición aleatoria lejos del jugador
        let x, z;
        do {
            x = (Math.random() - 0.5) * 180;
            z = (Math.random() - 0.5) * 180;
        } while (Math.abs(x) < 20 && Math.abs(z) < 20);

        zombie.position.set(x, 1, z);
        zombie.castShadow = true;
        zombie.userData = {
            vida: 100,
            velocidad: 0.02,
            tipo: 'zombie',
            ultimaIA: 0
        };

        scene.add(zombie);
        zombies.push(zombie);
    }
}

// Generar items
function generarItems(cantidad) {
    const tiposItems = ['municion', 'botiquin', 'arma'];
    
    for (let i = 0; i < cantidad; i++) {
        const tipo = tiposItems[Math.floor(Math.random() * tiposItems.length)];
        let geometria, material, color;

        switch (tipo) {
            case 'municion':
                geometria = new THREE.BoxGeometry(0.5, 0.3, 0.3);
                color = 0xFFD700;
                break;
            case 'botiquin':
                geometria = new THREE.BoxGeometry(0.8, 0.3, 0.6);
                color = 0xFF0000;
                break;
            case 'arma':
                geometria = new THREE.BoxGeometry(1.2, 0.2, 0.3);
                color = 0x808080;
                break;
        }

        material = new THREE.MeshLambertMaterial({ color: color });
        const item = new THREE.Mesh(geometria, material);

        item.position.x = (Math.random() - 0.5) * 180;
        item.position.y = 0.5;
        item.position.z = (Math.random() - 0.5) * 180;
        item.userData = { tipo: tipo };

        scene.add(item);
        items.push(item);
    }
}

// Configurar controles
function setupControles() {
    // Bloqueo de puntero para controles de mouse
    document.addEventListener('click', () => {
        if (!gameState.pausado) {
            document.body.requestPointerLock();
        }
    });

    // Movimiento del mouse
    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === document.body && !gameState.pausado) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            camera.rotation.y -= movementX * 0.002 * (config.sensibilidad / 5);
            camera.rotation.x -= movementY * 0.002 * (config.sensibilidad / 5) * (config.invertirY ? -1 : 1);
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Teclado
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        manejarTeclado(event.code, true);
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
        manejarTeclado(event.code, false);
    });

    // Mouse
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0 && !gameState.pausado) { // Click izquierdo
            disparar();
        }
    });

    // Botones UI
    document.getElementById('btn-pausa').addEventListener('click', togglePausa);
    document.getElementById('btn-reanudar').addEventListener('click', togglePausa);
    document.getElementById('btn-reiniciar').addEventListener('click', reiniciarJuego);
    document.getElementById('btn-reinicio-rapido').addEventListener('click', reiniciarJuego);
    document.getElementById('btn-opciones').addEventListener('click', mostrarOpciones);
    document.getElementById('btn-volver').addEventListener('click', ocultarOpciones);
    document.getElementById('btn-vista').addEventListener('click', cambiarVista);

    // Configuraciones
    document.getElementById('sensibilidad').addEventListener('input', (e) => {
        config.sensibilidad = e.target.value;
        document.getElementById('valor-sensibilidad').textContent = e.target.value;
    });

    document.getElementById('volumen').addEventListener('input', (e) => {
        config.volumen = e.target.value;
        document.getElementById('valor-volumen').textContent = e.target.value + '%';
    });

    document.getElementById('fov').addEventListener('input', (e) => {
        config.fov = e.target.value;
        camera.fov = config.fov;
        camera.updateProjectionMatrix();
        document.getElementById('valor-fov').textContent = e.target.value + '°';
    });

    document.getElementById('mostrar-fps').addEventListener('change', (e) => {
        config.mostrarFps = e.target.checked;
        document.getElementById('fps-counter').style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('invertir-y').addEventListener('change', (e) => {
        config.invertirY = e.target.checked;
    });

    // Redimensionamiento de ventana
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Manejar entrada de teclado
function manejarTeclado(codigo, presionado) {
    if (!presionado) return;

    switch (codigo) {
        case 'KeyR':
            recargar();
            break;
        case 'KeyI':
            toggleInventario();
            break;
        case 'KeyF':
            toggleLinterna();
            break;
        case 'KeyV':
            cambiarVista();
            break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
            cambiarArma(parseInt(codigo.slice(-1)) - 1);
            break;
        case 'Digit7':
            cambiarClima();
            break;
        case 'Digit8':
            gameState.timeScale = Math.min(gameState.timeScale * 2, 8);
            break;
        case 'Digit9':
            gameState.timeScale = Math.max(gameState.timeScale / 2, 0.25);
            break;
        case 'Digit0':
            gameState.hora = 12;
            break;
        case 'Escape':
            togglePausa();
            break;
    }
}

// Actualizar movimiento del jugador
function actualizarMovimiento() {
    if (gameState.pausado) return;

    const velocidad = 0.1;
    const velocidadCorrer = 0.2;
    const velocidadAgachado = 0.05;
    
    let vel = velocidad;
    if (keys['ShiftLeft'] && gameState.vida > 20) vel = velocidadCorrer;
    if (keys['KeyC']) vel = velocidadAgachado;

    const direccion = new THREE.Vector3();
    
    if (keys['KeyW']) direccion.z -= 1;
    if (keys['KeyS']) direccion.z += 1;
    if (keys['KeyA']) direccion.x -= 1;
    if (keys['KeyD']) direccion.x += 1;

    if (direccion.length() > 0) {
        direccion.normalize();
        direccion.applyQuaternion(camera.quaternion);
        direccion.y = 0; // No volar
        direccion.normalize();
        
        camera.position.addScaledVector(direccion, vel * gameState.timeScale);
        
        // Actualizar posición de linterna
        if (player.linterna) {
            player.linterna.position.copy(camera.position);
            player.linterna.target.position.copy(camera.position).add(
                new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
            );
        }
    }

    // Salto básico
    if (keys['Space'] && player.enSuelo) {
        player.velocidad.y = 0.2;
        player.enSuelo = false;
    }

    // Gravedad simple
    if (!player.enSuelo) {
        player.velocidad.y -= 0.01;
        camera.position.y += player.velocidad.y;
        
        if (camera.position.y <= 2) {
            camera.position.y = 2;
            player.velocidad.y = 0;
            player.enSuelo = true;
        }
    }
}

// Sistema de disparo
function disparar() {
    if (gameState.recargando || gameState.municion <= 0) return;

    gameState.municion--;
    actualizarHUD();

    // Crear bala visual
    const geometriaBala = new THREE.SphereGeometry(0.05);
    const materialBala = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const bala = new THREE.Mesh(geometriaBala, materialBala);

    bala.position.copy(camera.position);
    const direccion = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    bala.userData = { direccion: direccion, velocidad: 2, vida: 100 };

    scene.add(bala);
    bullets.push(bala);

    // Raycast para detección inmediata
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersecciones = raycaster.intersectObjects(zombies);

    if (intersecciones.length > 0) {
        const zombie = intersecciones[0].object;
        dañarZombie(zombie, armas[gameState.armaActual].daño);
    }

    // Auto-recarga
    if (gameState.municion === 0 && gameState.municionTotal > 0) {
        setTimeout(() => recargar(), 500);
    }
}

// Sistema de recarga
function recargar() {
    if (gameState.recargando || gameState.municionTotal === 0) return;

    gameState.recargando = true;
    document.getElementById('mensaje-recarga').style.display = 'block';

    setTimeout(() => {
        const arma = armas[gameState.armaActual];
        const recarga = Math.min(arma.municion - gameState.municion, gameState.municionTotal);
        gameState.municion += recarga;
        gameState.municionTotal -= recarga;
        gameState.recargando = false;
        document.getElementById('mensaje-recarga').style.display = 'none';
        actualizarHUD();
    }, armas[gameState.armaActual].recarga);
}

// Actualizar zombies (IA básica)
function actualizarZombies() {
    const tiempoActual = Date.now();
    
    zombies.forEach((zombie, index) => {
        if (tiempoActual - zombie.userData.ultimaIA < 100) return;
        zombie.userData.ultimaIA = tiempoActual;

        // IA simple: moverse hacia el jugador
        const direccion = new THREE.Vector3();
        direccion.subVectors(camera.position, zombie.position);
        direccion.y = 0;
        direccion.normalize();

        zombie.position.addScaledVector(direccion, zombie.userData.velocidad * gameState.timeScale);
        zombie.lookAt(camera.position);

        // Verificar colisión con jugador
        const distancia = zombie.position.distanceTo(camera.position);
        if (distancia < 2) {
            dañarJugador(10);
            // Empujar zombie hacia atrás
            zombie.position.addScaledVector(direccion, -2);
        }
    });
}

// Dañar zombie
function dañarZombie(zombie, daño) {
    zombie.userData.vida -= daño;
    
    // Efecto visual de daño
    zombie.material.color.setHex(0xFF0000);
    setTimeout(() => {
        if (zombie.material) zombie.material.color.setHex(0x228B22);
    }, 100);

    if (zombie.userData.vida <= 0) {
        // Eliminar zombie
        const index = zombies.indexOf(zombie);
        if (index > -1) {
            zombies.splice(index, 1);
            scene.remove(zombie);
            gameState.zombiesEliminados++;
            gameState.puntos += 100;
            actualizarHUD();

            // Generar nuevo zombie después de un tiempo
            setTimeout(() => {
                if (zombies.length < 15) generarZombies(1);
            }, 5000);
        }
    }
}

// Dañar jugador
function dañarJugador(daño) {
    gameState.vida = Math.max(0, gameState.vida - daño);
    actualizarHUD();

    // Efecto visual de daño
    const efectoDaño = document.createElement('div');
    efectoDaño.className = 'screen-damage';
    document.body.appendChild(efectoDaño);
    setTimeout(() => document.body.removeChild(efectoDaño), 500);

    if (gameState.vida <= 0) {
        gameOver();
    }
}

// Actualizar balas
function actualizarBalas() {
    bullets.forEach((bala, index) => {
        bala.position.addScaledVector(bala.userData.direccion, bala.userData.velocidad);
        bala.userData.vida--;

        if (bala.userData.vida <= 0) {
            scene.remove(bala);
            bullets.splice(index, 1);
        }
    });
}

// Actualizar HUD
function actualizarHUD() {
    document.getElementById('vida').textContent = `Vida: ${gameState.vida}`;
    document.getElementById('municion').textContent = `Munición: ${gameState.municion}/${gameState.municionTotal}`;
    document.getElementById('zombies').textContent = `Zombies: ${gameState.zombiesEliminados}`;
    document.getElementById('puntos').textContent = `Puntos: ${gameState.puntos}`;
    document.getElementById('arma-actual').textContent = `Arma: ${gameState.armaActual}`;
    document.getElementById('clima').textContent = `Clima: ${gameState.clima}`;
    document.getElementById('hora').textContent = `Hora: ${Math.floor(gameState.hora)}:00`;
}

// Sistema de clima
function cambiarClima() {
    climaActual = (climaActual + 1) % climas.length;
    gameState.clima = climas[climaActual];
    
    // Remover efectos anteriores
    document.querySelectorAll('.rain-effect, .fog-effect').forEach(el => el.remove());
    
    switch (gameState.clima) {
        case 'lluvia':
            renderer.setClearColor(0x404040);
            scene.fog.density = 0.01;
            const lluvia = document.createElement('div');
            lluvia.className = 'rain-effect';
            document.body.appendChild(lluvia);
            break;
        case 'niebla':
            renderer.setClearColor(0x808080);
            scene.fog.density = 0.02;
            const niebla = document.createElement('div');
            niebla.className = 'fog-effect';
            document.body.appendChild(niebla);
            break;
        default:
            renderer.setClearColor(0x87CEEB);
            scene.fog.density = 0.005;
            break;
    }
    
    actualizarHUD();
}

// Funciones de utilidad
function togglePausa() {
    gameState.pausado = !gameState.pausado;
    document.getElementById('menu-pausa').style.display = gameState.pausado ? 'block' : 'none';
    
    if (gameState.pausado) {
        document.exitPointerLock();
    }
}

function toggleInventario() {
    const inventario = document.getElementById('inventario');
    inventario.style.display = inventario.style.display === 'none' ? 'block' : 'none';
}

function toggleLinterna() {
    if (player.linterna) {
        player.linterna.visible = !player.linterna.visible;
    }
}

function cambiarVista() {
    // Implementación básica - en un juego completo tendría más opciones
    document.getElementById('btn-vista').textContent = 
        document.getElementById('btn-vista').textContent.includes('Primera') ? 
        '📷 Vista: Tercera Persona' : '📷 Vista: Primera Persona';
}

function cambiarArma(indice) {
    const armasArray = Object.keys(armas);
    if (indice < armasArray.length) {
        gameState.armaActual = armasArray[indice];
        actualizarHUD();
    }
}

function mostrarOpciones() {
    document.getElementById('menu-pausa').style.display = 'none';
    document.getElementById('menu-opciones-config').style.display = 'block';
}

function ocultarOpciones() {
    document.getElementById('menu-opciones-config').style.display = 'none';
    document.getElementById('menu-pausa').style.display = 'block';
}

function reiniciarJuego() {
    // Reiniciar estado del juego
    gameState.vida = 100;
    gameState.municion = 30;
    gameState.municionTotal = 120;
    gameState.zombiesEliminados = 0;
    gameState.puntos = 0;
    gameState.pausado = false;
    
    // Ocultar menús
    document.getElementById('menu-pausa').style.display = 'none';
    document.getElementById('menu-opciones-config').style.display = 'none';
    
    // Resetear posición
    camera.position.set(0, 2, 5);
    camera.rotation.set(0, 0, 0);
    
    // Limpiar zombies y regenerar
    zombies.forEach(zombie => scene.remove(zombie));
    zombies = [];
    generarZombies(10);
    
    actualizarHUD();
}

function gameOver() {
    alert(`Game Over! Puntos: ${gameState.puntos}, Zombies eliminados: ${gameState.zombiesEliminados}`);
    reiniciarJuego();
}

// Setup minimapa
function setupMinimapa() {
    const canvas = document.getElementById('canvas-minimapa');
    const ctx = canvas.getContext('2d');
    
    function actualizarMinimapa() {
        ctx.clearRect(0, 0, 200, 200);
        ctx.fillStyle = '#001100';
        ctx.fillRect(0, 0, 200, 200);
        
        // Dibujar jugador
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(98, 98, 4, 4);
        
        // Dibujar zombies
        ctx.fillStyle = '#ff0000';
        zombies.forEach(zombie => {
            const x = (zombie.position.x + 100) * 200 / 200;
            const z = (zombie.position.z + 100) * 200 / 200;
            if (x >= 0 && x < 200 && z >= 0 && z < 200) {
                ctx.fillRect(x - 1, z - 1, 2, 2);
            }
        });
        
        // Dibujar items
        ctx.fillStyle = '#ffff00';
        items.forEach(item => {
            const x = (item.position.x + 100) * 200 / 200;
            const z = (item.position.z + 100) * 200 / 200;
            if (x >= 0 && x < 200 && z >= 0 && z < 200) {
                ctx.fillRect(x - 1, z - 1, 2, 2);
            }
        });
    }
    
    setInterval(actualizarMinimapa, 100);
}

// Crear textura procedural
function crearTexturaProcedural(tamaño, color1, color2) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = tamaño;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(tamaño, tamaño);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const ruido = Math.random();
        const color = ruido > 0.5 ? color1 : color2;
        
        data[i] = (color >> 16) & 255;     // R
        data[i + 1] = (color >> 8) & 255;  // G  
        data[i + 2] = color & 255;         // B
        data[i + 3] = 255;                 // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    
    return texture;
}

// Contador de FPS
function actualizarFPS(currentTime) {
    if (currentTime - lastTime >= 1000) {
        document.getElementById('fps-value').textContent = fps + ' FPS';
        fps = 0;
        lastTime = currentTime;
    }
    fps++;
}

// Loop principal del juego
function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    actualizarFPS(currentTime);
    
    if (!gameState.pausado) {
        actualizarMovimiento();
        actualizarZombies();
        actualizarBalas();
        
        // Actualizar tiempo del juego
        gameState.hora += 0.01 * gameState.timeScale;
        if (gameState.hora >= 24) gameState.hora = 0;
        
        actualizarHUD();
    }
    
    renderer.render(scene, camera);
}

// Iniciar el juego cuando la página cargue
window.addEventListener('load', () => {
    init();
    document.getElementById('controles').addEventListener('click', () => {
        gameState.gameStarted = true;
        document.getElementById('controles').style.display = 'none';
    });
});