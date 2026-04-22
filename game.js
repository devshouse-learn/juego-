// Survival Zombie 3D - Ultra Realista
// Variables globales del juego
let scene, camera, renderer, controls;
let player, zombies = [], items = [], bullets = [];
let colisionables = []; // {x, z, ancho, profundo} para colisiones
let cajas = []; // cajas rompibles
let luzSol, luzAmbiental, luzHemi; // referencias globales para ciclo día/noche
let vistaTerceraPersona = false;
let modeloJugador = null; // modelo visible en 3ra persona
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
    scene.fog = new THREE.FogExp2(0x88aabb, 0.008);

    // Crear cámara
    camera = new THREE.PerspectiveCamera(config.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.rotation.order = 'YXZ';

    // Crear renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x88aabb);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    // Crear mundo
    crearMundo();
    crearLuces();
    crearPlayer();
    
    // Generar contenido inicial
    generarZombies(15);
    // Items solo salen de cajas, no se generan en el suelo

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
    const geometriaSuelo = new THREE.PlaneGeometry(200, 200, 20, 20);
    const materialSuelo = new THREE.MeshPhongMaterial({ 
        color: 0x4a5c3a,
        shininess: 5,
        map: crearTexturaProcedural(256, 0x4a5c3a, 0x3d4f2a)
    });
    const suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    scene.add(suelo);

    // Edificios y obstáculos
    crearEdificios();
    crearObstaculos();
}

// Crear edificios procedurales con detalles
function crearEdificios() {
    for (let i = 0; i < 20; i++) {
        const ancho = Math.random() * 10 + 5;
        const alto = Math.random() * 20 + 10;
        const profundo = Math.random() * 10 + 5;
        const grupo = new THREE.Group();

        // Cuerpo principal del edificio
        const hue = Math.random() * 0.1 + 0.05;
        const lightness = Math.random() * 0.2 + 0.35;
        const colorEdificio = new THREE.Color().setHSL(hue, 0.15, lightness);
        const geometria = new THREE.BoxGeometry(ancho, alto, profundo);
        const material = new THREE.MeshPhongMaterial({ 
            color: colorEdificio,
            shininess: 20
        });
        const cuerpo = new THREE.Mesh(geometria, material);
        cuerpo.position.y = alto / 2;
        cuerpo.castShadow = true;
        cuerpo.receiveShadow = true;
        grupo.add(cuerpo);

        // Borde superior / cornisa
        const cornisa = new THREE.Mesh(
            new THREE.BoxGeometry(ancho + 0.3, 0.4, profundo + 0.3),
            new THREE.MeshPhongMaterial({ color: colorEdificio.clone().multiplyScalar(0.7), shininess: 10 })
        );
        cornisa.position.y = alto;
        cornisa.castShadow = true;
        grupo.add(cornisa);

        // Ventanas
        const matVentana = new THREE.MeshPhongMaterial({ 
            color: 0x88ccff, 
            emissive: 0x112233, 
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        const matVentanaApagada = new THREE.MeshPhongMaterial({ 
            color: 0x334455, 
            shininess: 30
        });

        const pisos = Math.floor(alto / 3.5);
        const ventanasPorPiso = Math.floor(ancho / 2.5);
        const ventanaAlto = 1.2;
        const ventanaAncho = 0.9;

        for (let piso = 0; piso < pisos; piso++) {
            for (let v = 0; v < ventanasPorPiso; v++) {
                const encendida = Math.random() > 0.5;
                const mat = encendida ? matVentana : matVentanaApagada;
                
                // Ventanas frente
                const ventFrente = new THREE.Mesh(
                    new THREE.PlaneGeometry(ventanaAncho, ventanaAlto),
                    mat
                );
                ventFrente.position.set(
                    -ancho / 2 + 1.2 + v * 2.3,
                    2 + piso * 3.5,
                    profundo / 2 + 0.01
                );
                grupo.add(ventFrente);

                // Ventanas atrás
                const ventAtras = ventFrente.clone();
                ventAtras.position.z = -profundo / 2 - 0.01;
                ventAtras.rotation.y = Math.PI;
                grupo.add(ventAtras);
            }
        }

        // Puerta
        const puerta = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 2.5),
            new THREE.MeshPhongMaterial({ color: 0x553311, shininess: 5 })
        );
        puerta.position.set(0, 1.25, profundo / 2 + 0.02);
        grupo.add(puerta);

        // Marco de puerta
        const marcoPuerta = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 2.7, 0.15),
            new THREE.MeshPhongMaterial({ color: 0x332200, shininess: 5 })
        );
        marcoPuerta.position.set(0, 1.35, profundo / 2 + 0.05);
        grupo.add(marcoPuerta);

        grupo.position.x = (Math.random() - 0.5) * 180;
        grupo.position.z = (Math.random() - 0.5) * 180;

        // No generar cerca del spawn del jugador (0, 5)
        if (Math.abs(grupo.position.x) < ancho + 5 && Math.abs(grupo.position.z - 5) < profundo + 5) {
            grupo.position.x += (grupo.position.x >= 0 ? 1 : -1) * (ancho + 10);
        }

        // Registrar colisión del edificio
        colisionables.push({
            x: grupo.position.x,
            z: grupo.position.z,
            ancho: ancho / 2 + 1,
            profundo: profundo / 2 + 1
        });

        scene.add(grupo);
    }
}

// Crear obstáculos menores con detalle
function crearObstaculos() {
    for (let i = 0; i < 50; i++) {
        const tipo = Math.random();
        let obstaculo;

        if (tipo < 0.45) {
            // Cajas de madera ROMPIBLES (más cajas para compensar)
            obstaculo = new THREE.Group();
            const caja = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshPhongMaterial({ color: 0x8B6914, shininess: 10 })
            );
            caja.castShadow = true;
            obstaculo.add(caja);
            // Listones
            for (let l = -0.7; l <= 0.7; l += 0.7) {
                const liston = new THREE.Mesh(
                    new THREE.BoxGeometry(2.05, 0.12, 0.08),
                    new THREE.MeshPhongMaterial({ color: 0x6B4914 })
                );
                liston.position.set(0, l, 1.01);
                obstaculo.add(liston);
            }
            obstaculo.userData.esCaja = true;
            obstaculo.userData.vida = 30;
        } else if (tipo < 0.6) {
            // Barriles metálicos
            obstaculo = new THREE.Group();
            const barril = new THREE.Mesh(
                new THREE.CylinderGeometry(0.7, 0.75, 2, 12),
                new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 60 })
            );
            barril.castShadow = true;
            obstaculo.add(barril);
            // Anillos del barril
            for (let y = -0.6; y <= 0.6; y += 0.6) {
                const anillo = new THREE.Mesh(
                    new THREE.TorusGeometry(0.72, 0.04, 6, 12),
                    new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 80 })
                );
                anillo.position.y = y;
                anillo.rotation.x = Math.PI / 2;
                obstaculo.add(anillo);
            }
        } else {
            // Árboles con tronco + copa
            obstaculo = new THREE.Group();
            const tronco = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.35, 4, 8),
                new THREE.MeshPhongMaterial({ color: 0x5C3A1E, shininess: 5 })
            );
            tronco.position.y = 2;
            tronco.castShadow = true;
            obstaculo.add(tronco);

            // Copa del árbol (2-3 esferas superpuestas)
            const matCopa = new THREE.MeshPhongMaterial({ color: 0x2d5a1e, shininess: 10 });
            const copa1 = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), matCopa);
            copa1.position.y = 5;
            copa1.scale.y = 0.8;
            copa1.castShadow = true;
            obstaculo.add(copa1);

            const copa2 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), matCopa);
            copa2.position.set(0.5, 6.2, 0.3);
            copa2.castShadow = true;
            obstaculo.add(copa2);

            const copa3 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), matCopa);
            copa3.position.set(-0.4, 6, -0.3);
            copa3.castShadow = true;
            obstaculo.add(copa3);
        }

        obstaculo.position.x = (Math.random() - 0.5) * 180;
        obstaculo.position.y = tipo >= 0.6 ? 0 : 1;
        obstaculo.position.z = (Math.random() - 0.5) * 180;

        // Registrar colisión de obstáculo (radio circular)
        const radio = tipo < 0.3 ? 1.5 : (tipo < 0.6 ? 1.2 : 0.8);
        obstaculo.userData.colisionIndex = colisionables.length;
        colisionables.push({
            x: obstaculo.position.x,
            z: obstaculo.position.z,
            radio: radio
        });

        if (obstaculo.userData.esCaja) cajas.push(obstaculo);
        scene.add(obstaculo);
    }
}

// Crear sistema de luces
function crearLuces() {
    // Luz ambiental
    luzAmbiental = new THREE.AmbientLight(0x667788, 0.5);
    scene.add(luzAmbiental);

    // Luz hemisférica (cielo/suelo)
    luzHemi = new THREE.HemisphereLight(0x88aacc, 0x445522, 0.4);
    scene.add(luzHemi);

    // Luz direccional (sol)
    luzSol = new THREE.DirectionalLight(0xffeedd, 1.0);
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

// Crear zombie humanoide
function crearModeloZombie() {
    const grupo = new THREE.Group();
    const pielColor = new THREE.Color().setHSL(0.25, 0.4, Math.random() * 0.15 + 0.2);
    const ropaColor = new THREE.Color().setHSL(Math.random() * 0.1, 0.3, Math.random() * 0.15 + 0.15);
    const matPiel = new THREE.MeshPhongMaterial({ color: pielColor, shininess: 10 });
    const matRopa = new THREE.MeshPhongMaterial({ color: ropaColor, shininess: 5 });
    const matOjos = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    // Cabeza
    const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.5), matPiel);
    cabeza.position.y = 1.85;
    cabeza.castShadow = true;
    grupo.add(cabeza);

    // Ojos rojos brillantes
    const ojoIzq = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), matOjos);
    ojoIzq.position.set(-0.12, 1.9, 0.26);
    grupo.add(ojoIzq);
    const ojoDer = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), matOjos);
    ojoDer.position.set(0.12, 1.9, 0.26);
    grupo.add(ojoDer);

    // Boca (corte oscuro)
    const boca = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.06, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x220000 })
    );
    boca.position.set(0, 1.73, 0.26);
    grupo.add(boca);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), matRopa);
    torso.position.y = 1.15;
    torso.castShadow = true;
    grupo.add(torso);

    // Brazos (ligeramente extendidos al frente, postura zombie)
    const brazoGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const brazoIzq = new THREE.Mesh(brazoGeo, matPiel);
    brazoIzq.position.set(-0.48, 1.2, 0.2);
    brazoIzq.rotation.x = -0.5;
    brazoIzq.castShadow = true;
    brazoIzq.name = 'brazoIzq';
    grupo.add(brazoIzq);

    const brazoDer = new THREE.Mesh(brazoGeo, matPiel);
    brazoDer.position.set(0.48, 1.2, 0.2);
    brazoDer.rotation.x = -0.4;
    brazoDer.castShadow = true;
    brazoDer.name = 'brazoDer';
    grupo.add(brazoDer);

    // Piernas
    const piernaGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
    const piernaIzq = new THREE.Mesh(piernaGeo, matRopa);
    piernaIzq.position.set(-0.18, 0.35, 0);
    piernaIzq.castShadow = true;
    piernaIzq.name = 'piernaIzq';
    grupo.add(piernaIzq);

    const piernaDer = new THREE.Mesh(piernaGeo, matRopa);
    piernaDer.position.set(0.18, 0.35, 0);
    piernaDer.castShadow = true;
    piernaDer.name = 'piernaDer';
    grupo.add(piernaDer);

    // Guardar fase de animación
    grupo.userData.animFase = Math.random() * Math.PI * 2;

    return grupo;
}

// Generar zombies
function generarZombies(cantidad) {
    for (let i = 0; i < cantidad; i++) {
        const zombie = crearModeloZombie();

        // Posición aleatoria lejos del jugador pero visible
        let x, z;
        do {
            x = (Math.random() - 0.5) * 120;
            z = (Math.random() - 0.5) * 120;
        } while (Math.abs(x) < 10 && Math.abs(z) < 10);

        zombie.position.set(x, 0, z);
        zombie.userData.vida = 100;
        zombie.userData.velocidad = 0.12 + Math.random() * 0.06;
        zombie.userData.tipo = 'zombie';
        zombie.userData.ultimaIA = 0;

        scene.add(zombie);
        zombies.push(zombie);
    }
}

// Generar zombies mejorados según oleada
function generarZombiesMejorados(cantidad, oleada) {
    for (let i = 0; i < cantidad; i++) {
        const zombie = crearModeloZombie();

        let x, z;
        do {
            x = (Math.random() - 0.5) * 120;
            z = (Math.random() - 0.5) * 120;
        } while (Math.abs(x) < 10 && Math.abs(z) < 10);

        zombie.position.set(x, 0, z);

        // Escalar dificultad por oleada
        const velBase = 0.12 + oleada * 0.03;
        const vidaBase = 100 + oleada * 30;
        const dañoExtra = oleada * 3;

        zombie.userData.vida = vidaBase;
        zombie.userData.velocidad = velBase + Math.random() * 0.06;
        zombie.userData.tipo = 'zombie';
        zombie.userData.ultimaIA = 0;
        zombie.userData.dañoExtra = dañoExtra;

        // Zombies más fuertes se ven más oscuros/rojos
        if (oleada > 0) {
            zombie.traverse((child) => {
                if (child.isMesh && child.material && child.material.color) {
                    child.material = child.material.clone();
                    child.material.color.lerp(new THREE.Color(0x880000), Math.min(oleada * 0.15, 0.6));
                }
            });
        }

        scene.add(zombie);
        zombies.push(zombie);
    }
}

// Crear modelo 3D de item según tipo
function crearModeloItem(tipo) {
    const grupo = new THREE.Group();
    
    switch (tipo) {
        case 'municion': {
            // Caja de munición dorada con balas visibles
            const caja = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.3, 0.35),
                new THREE.MeshPhongMaterial({ color: 0xB8860B, shininess: 40 })
            );
            grupo.add(caja);
            // Tapa
            const tapa = new THREE.Mesh(
                new THREE.BoxGeometry(0.52, 0.05, 0.37),
                new THREE.MeshPhongMaterial({ color: 0xDAA520, shininess: 60 })
            );
            tapa.position.y = 0.17;
            grupo.add(tapa);
            // Balas asomando
            for (let b = 0; b < 3; b++) {
                const bala = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6),
                    new THREE.MeshPhongMaterial({ color: 0xFFD700, shininess: 100 })
                );
                bala.position.set(-0.1 + b * 0.1, 0.22, 0);
                grupo.add(bala);
                // Punta de bala
                const punta = new THREE.Mesh(
                    new THREE.ConeGeometry(0.03, 0.06, 6),
                    new THREE.MeshPhongMaterial({ color: 0xCC6600, shininess: 80 })
                );
                punta.position.set(-0.1 + b * 0.1, 0.32, 0);
                grupo.add(punta);
            }
            break;
        }
        case 'botiquin': {
            // Botiquín blanco con cruz roja
            const cuerpo = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.4, 0.35),
                new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 30 })
            );
            grupo.add(cuerpo);
            // Asa
            const asa = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.08, 0.06),
                new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 40 })
            );
            asa.position.y = 0.24;
            grupo.add(asa);
            // Cruz roja horizontal
            const cruzH = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.08, 0.01),
                new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.3 })
            );
            cruzH.position.set(0, 0, 0.18);
            grupo.add(cruzH);
            // Cruz roja vertical
            const cruzV = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.25, 0.01),
                new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.3 })
            );
            cruzV.position.set(0, 0, 0.18);
            grupo.add(cruzV);
            // Cierre
            const cierre = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.06, 0.37),
                new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 80 })
            );
            cierre.position.set(0, 0.2, 0);
            grupo.add(cierre);
            break;
        }
        case 'arma': {
            // Rifle/arma detallada
            // Cuerpo principal
            const cuerpo = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 0.15, 0.12),
                new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 60 })
            );
            grupo.add(cuerpo);
            // Cañón
            const canon = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.035, 0.5, 8),
                new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 90 })
            );
            canon.rotation.z = Math.PI / 2;
            canon.position.set(0.7, 0.03, 0);
            grupo.add(canon);
            // Culata
            const culata = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.2, 0.1),
                new THREE.MeshPhongMaterial({ color: 0x5C3A1E, shininess: 15 })
            );
            culata.position.set(-0.55, -0.02, 0);
            grupo.add(culata);
            // Gatillo/guardamonte
            const gatillo = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.12, 0.08),
                new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 50 })
            );
            gatillo.position.set(-0.1, -0.12, 0);
            grupo.add(gatillo);
            // Cargador
            const cargador = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.18, 0.1),
                new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 50 })
            );
            cargador.position.set(0.05, -0.15, 0);
            grupo.add(cargador);
            // Mira
            const mira = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.06, 0.04),
                new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 40 })
            );
            mira.position.set(0.2, 0.12, 0);
            grupo.add(mira);
            break;
        }
    }
    
    grupo.userData = { tipo: tipo };
    return grupo;
}

// Generar items
function generarItems(cantidad) {
    const tiposItems = ['municion', 'botiquin', 'arma'];
    
    for (let i = 0; i < cantidad; i++) {
        const tipo = tiposItems[Math.floor(Math.random() * tiposItems.length)];
        const item = crearModeloItem(tipo);

        item.position.x = (Math.random() - 0.5) * 180;
        item.position.y = 0.5;
        item.position.z = (Math.random() - 0.5) * 180;

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

            camera.rotation.y -= movementX * 0.0008 * (config.sensibilidad / 5);
            camera.rotation.x -= movementY * 0.0008 * (config.sensibilidad / 5) * (config.invertirY ? -1 : 1);
            // Limitar a 80 grados arriba/abajo para no voltear
            camera.rotation.x = Math.max(-1.4, Math.min(1.4, camera.rotation.x));
            // Bloquear rotación Z para que nunca se ladee
            camera.rotation.z = 0;
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
    document.getElementById('btn-reanudar').addEventListener('click', togglePausa);
    document.getElementById('btn-reiniciar').addEventListener('click', reiniciarJuego);
    document.getElementById('btn-reinicio-rapido').addEventListener('click', reiniciarJuego);
    document.getElementById('btn-opciones').addEventListener('click', mostrarOpciones);
    document.getElementById('btn-volver').addEventListener('click', ocultarOpciones);

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
        case 'KeyE':
            recogerItem();
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

// Verificar colisión en una posición
function hayColision(x, z) {
    for (let i = 0; i < colisionables.length; i++) {
        const col = colisionables[i];
        if (col.eliminado) continue;
        if (col.radio) {
            // Colisión circular (obstáculos)
            const dx = x - col.x;
            const dz = z - col.z;
            if (dx * dx + dz * dz < col.radio * col.radio) return true;
        } else {
            // Colisión rectangular (edificios)
            if (Math.abs(x - col.x) < col.ancho && Math.abs(z - col.z) < col.profundo) return true;
        }
    }
    return false;
}

// Actualizar movimiento del jugador
function actualizarMovimiento() {
    if (gameState.pausado) return;

    // Si el jugador está atrapado en un colisionable, sacarlo
    if (hayColision(camera.position.x, camera.position.z)) {
        camera.position.x += 2;
        camera.position.z += 2;
        return;
    }

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
        direccion.y = 0;
        direccion.normalize();
        
        const nuevaPos = camera.position.clone().addScaledVector(direccion, vel * gameState.timeScale);
        
        // Colisión: intentar mover en X y Z por separado
        if (!hayColision(nuevaPos.x, camera.position.z)) {
            camera.position.x = nuevaPos.x;
        }
        if (!hayColision(camera.position.x, nuevaPos.z)) {
            camera.position.z = nuevaPos.z;
        }
        
        // Limitar al borde del mapa
        camera.position.x = Math.max(-95, Math.min(95, camera.position.x));
        camera.position.z = Math.max(-95, Math.min(95, camera.position.z));
        
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
    
    // Detectar cajas
    const hijosCajas = [];
    cajas.forEach(c => c.traverse(child => { if (child.isMesh) { child.userData.parentCaja = c; hijosCajas.push(child); } }));
    const hitCajas = raycaster.intersectObjects(hijosCajas);
    if (hitCajas.length > 0 && hitCajas[0].distance < 15) {
        const caja = hitCajas[0].object.userData.parentCaja;
        if (caja && caja.userData.esCaja) {
            dañarCaja(caja, armas[gameState.armaActual].daño);
        }
    }
    
    // Detectar zombies
    const todosHijosZombies = [];
    zombies.forEach(z => z.traverse(child => { if (child.isMesh) { child.userData.parentZombie = z; todosHijosZombies.push(child); } }));
    const intersecciones = raycaster.intersectObjects(todosHijosZombies);

    if (intersecciones.length > 0) {
        const zombie = intersecciones[0].object.userData.parentZombie || intersecciones[0].object;
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

// Actualizar linterna para que siga la cámara siempre
function actualizarLinterna() {
    if (player && player.linterna) {
        player.linterna.position.copy(camera.position);
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        player.linterna.target.position.copy(camera.position).add(dir.multiplyScalar(5));
        player.linterna.target.updateMatrixWorld();
    }
}

// Verificar si un zombie está iluminado por la linterna
function zombieIluminado(zombie) {
    if (!player || !player.linterna || !player.linterna.visible) return false;
    
    const dirLinterna = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const dirZombie = new THREE.Vector3().subVectors(zombie.position, camera.position);
    dirZombie.y = 0;
    dirLinterna.y = 0;
    dirZombie.normalize();
    dirLinterna.normalize();
    
    const angulo = dirLinterna.dot(dirZombie);
    const distancia = zombie.position.distanceTo(camera.position);
    
    // Dentro del cono de luz (cos ~30° = 0.87) y a menos de 30m
    return angulo > 0.85 && distancia < 30;
}

// Verificar si es de noche
function esDeNoche() {
    return gameState.hora < 6 || gameState.hora > 18;
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

        // Velocidad: base, x2 de noche, x3 si iluminado por linterna
        let velMultiplier = 1;
        if (esDeNoche()) velMultiplier = 2;
        if (zombieIluminado(zombie)) velMultiplier = 3;

        zombie.position.addScaledVector(direccion, zombie.userData.velocidad * velMultiplier * gameState.timeScale);
        zombie.lookAt(new THREE.Vector3(camera.position.x, zombie.position.y, camera.position.z));

        // Animación de caminar
        zombie.userData.animFase += 0.15 * velMultiplier;
        const fase = zombie.userData.animFase;
        const amplitud = 0.5 + velMultiplier * 0.15; // Más rápido = zancada más amplia

        const piernaIzq = zombie.getObjectByName('piernaIzq');
        const piernaDer = zombie.getObjectByName('piernaDer');
        const brazoIzq = zombie.getObjectByName('brazoIzq');
        const brazoDer = zombie.getObjectByName('brazoDer');

        if (piernaIzq) piernaIzq.rotation.x = Math.sin(fase) * amplitud;
        if (piernaDer) piernaDer.rotation.x = Math.sin(fase + Math.PI) * amplitud;
        if (brazoIzq) brazoIzq.rotation.x = -0.5 + Math.sin(fase + Math.PI) * amplitud * 0.6;
        if (brazoDer) brazoDer.rotation.x = -0.4 + Math.sin(fase) * amplitud * 0.6;

        // Balanceo del torso
        zombie.rotation.z = Math.sin(fase) * 0.05;

        // Verificar colisión con jugador
        const distancia = zombie.position.distanceTo(camera.position);
        if (distancia < 2.5) {
            // Cooldown de ataque: solo dañar cada 800ms
            if (!zombie.userData.ultimoAtaque || tiempoActual - zombie.userData.ultimoAtaque > 800) {
                zombie.userData.ultimoAtaque = tiempoActual;
                dañarJugador(15 + (zombie.userData.dañoExtra || 0));
                
                // Efecto visual: zombie parpadea rojo al atacar
                zombie.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const origColor = child.material.color.getHex();
                        child.material = child.material.clone();
                        child.material.emissive = new THREE.Color(0xff0000);
                        child.material.emissiveIntensity = 0.5;
                        setTimeout(() => {
                            if (child.material) {
                                child.material.emissive = new THREE.Color(0x000000);
                                child.material.emissiveIntensity = 0;
                            }
                        }, 300);
                    }
                });
            }
            // Empujar zombie ligeramente
            zombie.position.addScaledVector(direccion, -0.5);
        }
    });
}

// Dañar caja y soltar items
function dañarCaja(caja, daño) {
    caja.userData.vida -= daño;
    
    // Efecto visual
    caja.traverse((child) => {
        if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color.setHex(0xffcc00);
            setTimeout(() => { if (child.material) child.material.color.setHex(0x8B6914); }, 100);
        }
    });

    if (caja.userData.vida <= 0) {
        // Soltar 1-3 items aleatorios
        const cantItems = Math.floor(Math.random() * 3) + 1;
        const tiposItems = ['municion', 'botiquin', 'arma'];
        for (let i = 0; i < cantItems; i++) {
            const tipo = tiposItems[Math.floor(Math.random() * tiposItems.length)];
            const item = crearModeloItem(tipo);
            item.position.set(
                caja.position.x + (Math.random() - 0.5) * 3,
                0.5,
                caja.position.z + (Math.random() - 0.5) * 3
            );
            scene.add(item);
            items.push(item);
        }

        // Eliminar colisionable (marcar como inactivo)
        if (caja.userData.colisionIndex !== undefined) {
            colisionables[caja.userData.colisionIndex].eliminado = true;
        }

        // Efecto de destrucción: partículas simples
        for (let p = 0; p < 8; p++) {
            const particula = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.3, 0.3),
                new THREE.MeshPhongMaterial({ color: 0x8B6914 })
            );
            particula.position.copy(caja.position);
            particula.position.y = 1 + Math.random();
            scene.add(particula);
            const velX = (Math.random() - 0.5) * 0.3;
            const velZ = (Math.random() - 0.5) * 0.3;
            let velY = 0.15 + Math.random() * 0.1;
            const animar = () => {
                velY -= 0.008;
                particula.position.x += velX;
                particula.position.y += velY;
                particula.position.z += velZ;
                particula.rotation.x += 0.1;
                particula.rotation.z += 0.1;
                if (particula.position.y > 0) {
                    requestAnimationFrame(animar);
                } else {
                    scene.remove(particula);
                }
            };
            animar();
        }

        mostrarMensajeRecogida('📦 ¡Caja destruida!');
        scene.remove(caja);
        const idx = cajas.indexOf(caja);
        if (idx > -1) cajas.splice(idx, 1);
        gameState.puntos += 50;
        actualizarHUD();
    }
}

// Dañar zombie
function dañarZombie(zombie, daño) {
    zombie.userData.vida -= daño;
    
    // Efecto visual de daño - recorrer hijos del grupo
    const coloresOriginales = [];
    zombie.traverse((child) => {
        if (child.isMesh && child.material && child.material.color) {
            coloresOriginales.push({ mesh: child, color: child.material.color.getHex() });
            child.material = child.material.clone();
            child.material.color.setHex(0xFF0000);
        }
    });
    setTimeout(() => {
        coloresOriginales.forEach(({ mesh, color }) => {
            if (mesh.material) mesh.material.color.setHex(color);
        });
    }, 100);

    if (zombie.userData.vida <= 0) {
        // Quitar del array para que no siga atacando
        const index = zombies.indexOf(zombie);
        if (index > -1) {
            zombies.splice(index, 1);
            gameState.zombiesEliminados++;
            gameState.puntos += 100;
            actualizarHUD();

            // Animación de muerte: cae al suelo y se desvanece
            zombie.userData.muriendo = true;
            let caida = 0;
            const posOriginal = zombie.position.y;
            
            const animarMuerte = () => {
                caida += 0.02;
                // Inclinar hacia atrás
                zombie.rotation.x = Math.min(caida * 2, Math.PI / 2);
                // Bajar al suelo
                zombie.position.y = posOriginal - caida * 0.5;
                // Hacerlo transparente gradualmente
                zombie.traverse((child) => {
                    if (child.isMesh && child.material) {
                        if (!child.material.transparent) {
                            child.material = child.material.clone();
                            child.material.transparent = true;
                        }
                        child.material.opacity = Math.max(0, 1 - caida);
                    }
                });
                
                if (caida < 1.5) {
                    requestAnimationFrame(animarMuerte);
                } else {
                    scene.remove(zombie);
                }
            };
            animarMuerte();

            // Generar nuevo zombie con dificultad escalada
            setTimeout(() => {
                if (zombies.length < 15) {
                    const oleada = Math.floor(gameState.zombiesEliminados / 20);
                    generarZombiesMejorados(1, oleada);
                }
            }, Math.max(1000, 3000 - gameState.zombiesEliminados * 50));
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
            renderer.setClearColor(0x88aabb);
            scene.fog.density = 0.008;
            break;
    }
    
    actualizarHUD();
}

// Recoger items cercanos
function recogerItem() {
    const distanciaRecogida = 5;
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const distancia = item.position.distanceTo(camera.position);
        if (distancia < distanciaRecogida) {
            const tipo = item.userData.tipo;
            switch (tipo) {
                case 'municion':
                    gameState.municionTotal += 30;
                    mostrarMensajeRecogida('+30 Munición');
                    break;
                case 'botiquin':
                    gameState.vida = Math.min(100, gameState.vida + 40);
                    mostrarMensajeRecogida('+40 Vida');
                    break;
                case 'arma':
                    const armasDisponibles = Object.keys(armas);
                    const armaRandom = armasDisponibles[Math.floor(Math.random() * armasDisponibles.length)];
                    gameState.armaActual = armaRandom;
                    mostrarMensajeRecogida('Arma: ' + armaRandom.toUpperCase());
                    break;
            }
            scene.remove(item);
            items.splice(i, 1);
            gameState.puntos += 25;
            actualizarHUD();
            return;
        }
    }
}

// Mostrar mensaje temporal al recoger
function mostrarMensajeRecogida(texto) {
    const msg = document.createElement('div');
    msg.textContent = texto;
    msg.style.cssText = 'position:fixed;top:40%;left:50%;transform:translateX(-50%);z-index:3000;' +
        'background:rgba(0,200,0,0.8);color:white;padding:12px 25px;border-radius:8px;' +
        'font-size:22px;font-weight:bold;pointer-events:none;font-family:monospace;' +
        'text-shadow:1px 1px 3px rgba(0,0,0,0.5);animation:fadeIn 0.3s ease-out;';
    document.body.appendChild(msg);
    setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(msg), 500);
    }, 1200);
}

// También recoger automáticamente al pasar cerca
function verificarRecogidaAutomatica() {
    const distanciaAuto = 2.5;
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const distancia = item.position.distanceTo(camera.position);
        if (distancia < distanciaAuto) {
            recogerItem();
            return;
        }
    }
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
    vistaTerceraPersona = !vistaTerceraPersona;
    
    if (vistaTerceraPersona) {
        // Crear modelo del jugador si no existe
        if (!modeloJugador) {
            modeloJugador = new THREE.Group();
            const matCuerpo = new THREE.MeshPhongMaterial({ color: 0x2255aa, shininess: 20 });
            const matPiel = new THREE.MeshPhongMaterial({ color: 0xddaa77, shininess: 10 });
            
            // Cabeza
            const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), matPiel);
            cabeza.position.y = 1.75;
            modeloJugador.add(cabeza);
            
            // Torso
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.35), matCuerpo);
            torso.position.y = 1.1;
            modeloJugador.add(torso);
            
            // Brazos
            const brazoGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
            const brazoIzq = new THREE.Mesh(brazoGeo, matPiel);
            brazoIzq.position.set(-0.45, 1.1, 0);
            modeloJugador.add(brazoIzq);
            const brazoDer = new THREE.Mesh(brazoGeo, matPiel);
            brazoDer.position.set(0.45, 1.1, 0);
            modeloJugador.add(brazoDer);
            
            // Piernas
            const piernaGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
            const piernaIzq = new THREE.Mesh(piernaGeo, matCuerpo);
            piernaIzq.position.set(-0.16, 0.35, 0);
            modeloJugador.add(piernaIzq);
            const piernaDer = new THREE.Mesh(piernaGeo, matCuerpo);
            piernaDer.position.set(0.16, 0.35, 0);
            modeloJugador.add(piernaDer);
            
            scene.add(modeloJugador);
        }
        modeloJugador.visible = true;
    } else {
        if (modeloJugador) modeloJugador.visible = false;
    }
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
    camera.rotation.order = 'YXZ';
    
    // Limpiar zombies y regenerar
    zombies.forEach(zombie => scene.remove(zombie));
    zombies = [];
    generarZombies(15);
    
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

// Ciclo día/noche
function actualizarCicloDiaNoche() {
    const hora = gameState.hora;
    
    // Factor de luz: 1.0 = mediodía, 0.0 = medianoche
    let factorLuz;
    if (hora >= 6 && hora <= 18) {
        // Día: sube de 6-12, baja de 12-18
        if (hora <= 12) {
            factorLuz = (hora - 6) / 6;
        } else {
            factorLuz = (18 - hora) / 6;
        }
    } else {
        // Noche
        factorLuz = 0;
    }
    
    // Amanecer/atardecer (transición suave)
    if (hora >= 5 && hora < 6) factorLuz = (hora - 5) * 0.15;
    if (hora > 18 && hora <= 19) factorLuz = (19 - hora) * 0.15;
    
    factorLuz = Math.max(0.05, factorLuz); // Nunca completamente oscuro
    
    // Actualizar intensidad de luces
    if (luzSol) {
        luzSol.intensity = factorLuz * 1.0;
        // Mover sol según hora
        const angulo = ((hora - 6) / 12) * Math.PI;
        luzSol.position.set(Math.cos(angulo) * 100, Math.sin(angulo) * 100, 50);
    }
    if (luzAmbiental) {
        luzAmbiental.intensity = 0.1 + factorLuz * 0.4;
    }
    if (luzHemi) {
        luzHemi.intensity = 0.1 + factorLuz * 0.3;
    }
    
    // Color del cielo según hora
    const r = Math.max(0.05, factorLuz * 0.53);
    const g = Math.max(0.05, factorLuz * 0.67);
    const b = Math.max(0.1, factorLuz * 0.73);
    renderer.setClearColor(new THREE.Color(r, g, b));
    
    // Niebla más densa de noche
    scene.fog.density = 0.008 + (1 - factorLuz) * 0.012;
    
    // Linterna más visible de noche
    if (player && player.linterna) {
        player.linterna.intensity = 0.5 + (1 - factorLuz) * 2.0;
    }
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
        actualizarLinterna();
        actualizarZombies();
        actualizarBalas();
        verificarRecogidaAutomatica();
        
        // Actualizar tiempo del juego
        gameState.hora += 0.01 * gameState.timeScale;
        if (gameState.hora >= 24) gameState.hora = 0;
        
        // Ciclo día/noche
        actualizarCicloDiaNoche();
        
        actualizarHUD();
    }
    
    // Renderizar con offset de cámara en 3ra persona
    if (vistaTerceraPersona) {
        // Guardar posición real
        const posReal = camera.position.clone();
        const rotReal = camera.rotation.clone();
        
        // Actualizar modelo del jugador
        if (modeloJugador) {
            modeloJugador.position.set(posReal.x, 0, posReal.z);
            modeloJugador.rotation.y = camera.rotation.y;
        }
        
        // Mover cámara detrás y arriba del jugador
        const offset = new THREE.Vector3(0, 3, 6);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
        camera.position.add(offset);
        camera.lookAt(posReal.x, posReal.y, posReal.z);
        
        renderer.render(scene, camera);
        
        // Restaurar posición real
        camera.position.copy(posReal);
        camera.rotation.copy(rotReal);
    } else {
        renderer.render(scene, camera);
    }
}

// Iniciar el juego cuando la página cargue
window.addEventListener('load', () => {
    init();
    document.getElementById('controles').addEventListener('click', () => {
        gameState.gameStarted = true;
        document.getElementById('controles').style.display = 'none';
    });
});