/* Diagnóstico de erros: mostra mensagens de falha na tela em vez de deixar o jogo aparentemente travado. */
(function () {
    function showGameError(message) {
        let panel = document.getElementById('game-js-error-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'game-js-error-panel';
            panel.style.cssText = 'position:fixed;z-index:999999;left:8px;right:8px;bottom:8px;max-height:40vh;overflow:auto;padding:12px 14px;background:#260b0b;color:#fff;border:2px solid #ef4444;border-radius:10px;font:13px/1.45 monospace;white-space:pre-wrap;';
            document.body.appendChild(panel);
        }
        panel.textContent = 'ERRO AO INICIAR O TAPE MARANGATU 3D\n' + String(message) + '\n\nConfira a conexão com a internet e se index.html, style.css e game.js estão na mesma pasta.';
    }
    window.addEventListener('error', function (event) {
        showGameError((event.message || 'Erro JavaScript') + (event.filename ? '\nArquivo: ' + event.filename : '') + (event.lineno ? '\nLinha: ' + event.lineno : ''));
    });
    window.addEventListener('unhandledrejection', function (event) {
        const reason = event.reason && (event.reason.stack || event.reason.message) || event.reason || 'Falha assíncrona';
        showGameError(reason);
    });
    window.addEventListener('DOMContentLoaded', function () {
        if (!window.THREE) showGameError('A biblioteca Three.js não carregou. Verifique a internet ou o acesso ao cdnjs.cloudflare.com.');
        if (!document.getElementById('canvas-container')) showGameError('O index.html não contém o elemento #canvas-container. Use o index.html do mesmo pacote.');
    });
})();

let selectedCharacter = null;
        let gameStarted = false;
        let isGameOver = false;
        let currentPhase = 1;
        let activeInteractiveObject = null;

        // PEDAGOGICAL QUIZ BANK
        const quizBank = {
            phase1: [
                {
                    question: "No caderno didático da Kwatiá, qual expressão se refere especificamente ao milho branco?",
                    options: [
                        { text: "Awati Ũ", correct: false },
                        { text: "Awati Morõti", correct: true },
                        { text: "Awati Pynta", correct: false },
                        { text: "Awati Pará", correct: false }
                    ]
                },
                {
                    question: "Qual tipo de Awati é associado à cor vermelha nas tradições Nhandewa?",
                    options: [
                        { text: "Awati Pynta", correct: true },
                        { text: "Awati Morõti", correct: false },
                        { text: "Awati Djegwá", correct: false },
                        { text: "Awati Mara'ẽy", correct: false }
                    ]
                },
                {
                    question: "O termo 'Awati Mara'ẽy' refere-se a qual qualidade sagrada do milho?",
                    options: [
                        { text: "Milho preto ou escuro", correct: false },
                        { text: "Milho colorido / mesclado", correct: false },
                        { text: "Milho verdadeiro, puro e perfeito", correct: true },
                        { text: "Milho enfeitado para rituais", correct: false }
                    ]
                }
            ],
            phase2: [
                {
                    question: "No texto sobre o Djagwarete, qual expressão descreve a onça que habita a verdadeira floresta?",
                    options: [
                        { text: "Djagwarete Ipara Porã", correct: false },
                        { text: "Djagwarete Ka'agwy Ete Regwa", correct: true },
                        { text: "Djagwarete Yy Remberé", correct: false },
                        { text: "Djagwarete Yyaká Rarõá", correct: false }
                    ]
                },
                {
                    question: "Qual expressão relaciona a Onça com a proteção das margens dos rios e águas?",
                    options: [
                        { text: "Djagwarete Yy Remberé", correct: true },
                        { text: "Djagwarete O'okwe U'á", correct: false },
                        { text: "Djagwarete Ipotxy Atsy", correct: false },
                        { text: "Djagwarete Ka'agwy Ete Regwa", correct: false }
                    ]
                }
            ]
        };

        const gameData = {
            phase1: {
                letter: "A a A a",
                title: "AWATI",
                icon: "🌽",
                lines: ["AWATI MORÕTI", "AWATI Ũ", "AWATI PARÁ", "AWATI PYNTA", "AWATI DJEGWÁ", "AWATI MARA'ẼY"]
            },
            phase2: {
                letter: "DJ dj Dj dj",
                title: "DJAGWARETE",
                icon: "🐆",
                lines: [
                    "DJAGWARETE YY REMBERÉ", "DJAGWARETE IPARA PORÃ", "DJAGWARETE IPOTXY ATSY",
                    "DJAGWARETE O'OKWE U'Á", "DJAGWARETE KA'AGWY ETE REGWA", "DJAGWARETE YYAKÁ RARÕÁ",
                    "DJAGWARETE NHANDẼ PY'Y ÃWÃ O'Á YWYRUPI"
                ]
            }
        };

        // --- THREE.JS DAYTIME & INFINITE HORIZON SETUP ---
        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        
        scene.background = new THREE.Color(0x87ceeb); // Bright daytime sky
        scene.fog = new THREE.FogExp2(0x9be2ff, 0.009); // Dense fog blending sky into terrain horizon

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // --- DAYLIGHTING & SUN ---
        const ambientLight = new THREE.AmbientLight(0xfffaed, 0.75);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff5cc, 1.25);
        sunLight.position.set(40, 70, 30);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 250;
        const d = 60;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        scene.add(sunLight);

        const sunMesh = new THREE.Mesh(
            new THREE.SphereGeometry(5, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xfff066 })
        );
        // Sol colocado no campo de visão, com halo suave para ficar visível durante a exploração.
        sunMesh.position.set(-24, 30, -28);
        sunMesh.scale.setScalar(1.15);
        scene.add(sunMesh);
        const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(7.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe58a, transparent: true, opacity: 0.16, depthWrite: false }));
        sunHalo.position.copy(sunMesh.position);
        scene.add(sunHalo);

        // Nuvens cúbicas leves, no estilo sandbox, sem imagens externas.
        const clouds = [];
        function createCloud(x, y, z, scale = 1) {
            const cloud = new THREE.Group();
            const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
            [[0,0,0,2.6,0.8,1.25],[-1.45,-0.12,0.08,1.65,0.85,1.1],[1.35,-0.08,-0.05,1.8,0.95,1.15],[-0.35,0.45,0,1.55,0.85,1.05]].forEach(a => {
                const puff = new THREE.Mesh(new THREE.BoxGeometry(a[3]*scale,a[4]*scale,a[5]*scale), cloudMat);
                puff.position.set(a[0]*scale,a[1]*scale,a[2]*scale);
                cloud.add(puff);
            });
            cloud.position.set(x,y,z);
            scene.add(cloud);
            clouds.push({ mesh: cloud, baseX: x, phase: Math.random()*Math.PI*2 });
        }
        createCloud(-18, 22, 4, 1.5);
        createCloud(5, 26, -18, 1.2);
        createCloud(24, 23, -40, 1.65);
        createCloud(-30, 25, -55, 1.1);
        createCloud(15, 29, 25, 1.0);

        // --- LARGE TERRAIN ---
        const terrainGeo = new THREE.PlaneGeometry(350, 350, 32, 32);
        const terrainMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        scene.add(terrain);

        // --- CURVED WINDING TRAIL (TRILHA SINUOSA) ---
        // Smooth spline defining the winding trail curve
        const curvePoints = [
            new THREE.Vector3(0, 0, 45),
            new THREE.Vector3(3, 0, 30),
            new THREE.Vector3(-6, 0, 15),
            new THREE.Vector3(-4, 0, 0),
            new THREE.Vector3(5, 0, -15),
            new THREE.Vector3(2, 0, -30),
            new THREE.Vector3(0, 0, -50)
        ];
        const pathSpline = new THREE.CatmullRomCurve3(curvePoints);

        // Draw curved dirt trail mesh
        const trailGeometry = new THREE.PlaneGeometry(8, 140, 32, 64);
        const trailVertices = trailGeometry.attributes.position;
        // Warp plane along spline
        for (let i = 0; i < trailVertices.count; i++) {
            const u = (trailVertices.getY(i) + 70) / 140; // Normalize 0 to 1
            const pointOnCurve = pathSpline.getPointAt(Math.max(0, Math.min(1, u)));
            const tangent = pathSpline.getTangentAt(Math.max(0, Math.min(1, u)));
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            
            const offsetX = trailVertices.getX(i);
            const finalPos = pointOnCurve.clone().add(normal.multiplyScalar(offsetX));
            trailVertices.setXYZ(i, finalPos.x, finalPos.z, 0.03); // Y is Z for Plane before rotation
        }
        trailGeometry.computeVertexNormals();

        const pathMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63, side: THREE.DoubleSide });
        const curvedPathMesh = new THREE.Mesh(trailGeometry, pathMat);
        curvedPathMesh.rotation.x = -Math.PI / 2;
        curvedPathMesh.receiveShadow = true;
        scene.add(curvedPathMesh);

        // Helper function: get trail X position at any Z coordinate
        function getTrailXAtZ(z) {
            const u = Math.max(0, Math.min(1, (45 - z) / 95));
            return pathSpline.getPointAt(u).x;
        }

        // Lista de colisões: precisa ser criada antes de árvores e arbustos.
        const worldObstacles = [];

        // --- DENSE TREES AND BUSHES FOR CAMOUFLAGE ---
        function createTree(x, z, scale = 1) {
            const treeGroup = new THREE.Group();
            
            const trunkGeo = new THREE.BoxGeometry(1.05 * scale, 9 * scale, 1.05 * scale);
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = (4.5) * scale;
            trunk.castShadow = true;
            treeGroup.add(trunk);
            // Marcas de casca em blocos dão textura sem imagens externas.
            const barkMat = new THREE.MeshLambertMaterial({ color: 0x76513b });
            for (let b = 0; b < 3; b++) {
                const bark = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, (1.1 + b * 0.25) * scale, 0.035 * scale), barkMat);
                bark.position.set((b - 1) * 0.23 * scale, (2.0 + b * 1.8) * scale, 0.54 * scale);
                treeGroup.add(bark);
            }

            const leafColors = [0x1b5e20, 0x2e7d32, 0x43a047, 0x65a30d];
            // Copas em blocos empilhados: visual de jogo sandbox, sem modelos externos.
            for(let i = 0; i < 4; i++) {
                const side = (5.2 - i * 0.8) * scale;
                const leaves = new THREE.Mesh(
                    new THREE.BoxGeometry(side, 2.7 * scale, side),
                    new THREE.MeshLambertMaterial({ color: leafColors[i], flatShading: true })
                );
                leaves.position.set((i % 2 ? 0.25 : -0.15) * scale, (6.8 + i * 1.65) * scale, (i % 2 ? -0.15 : 0.15) * scale);
                leaves.castShadow = true;
                treeGroup.add(leaves);
            }

            treeGroup.position.set(x, 0, z);
            scene.add(treeGroup);
            worldObstacles.push({ x, z, radius: 0.78 * scale, type: 'tree' });
            return treeGroup;
        }

        function createBush(x, z, scale = 1) {
            const bushGroup = new THREE.Group();
            const bushColors = [0x2e7d32, 0x388e3c, 0x4d7c0f];
            for (let i = 0; i < 5; i++) {
                const size = (0.65 + Math.random() * 0.35) * scale;
                const block = new THREE.Mesh(
                    new THREE.BoxGeometry(size, size * (0.8 + Math.random() * 0.4), size),
                    new THREE.MeshLambertMaterial({ color: bushColors[i % bushColors.length], flatShading: true })
                );
                block.position.set((Math.random() - 0.5) * 1.3 * scale, (0.35 + Math.random() * 0.45) * scale, (Math.random() - 0.5) * 1.3 * scale);
                block.castShadow = true;
                bushGroup.add(block);
            }
            bushGroup.position.set(x, 0, z);
            scene.add(bushGroup);
            worldObstacles.push({ x, z, radius: 0.48 * scale, type: 'bush' });
            return bushGroup;
        }

        // Generate dense forest borders along winding path
        for (let z = -70; z <= 70; z += 10) {
            const trailX = getTrailXAtZ(z);
            createTree(trailX - 9 - Math.random() * 25, z + (Math.random() - 0.5) * 4, 1 + Math.random() * 0.4);
            createTree(trailX + 9 + Math.random() * 25, z + (Math.random() - 0.5) * 4, 1 + Math.random() * 0.4);

            // Foliage/Bushes along trail edges for hiding animals
            createBush(trailX - 4.5 - Math.random() * 2, z, 1.2);
            createBush(trailX + 4.5 + Math.random() * 2, z, 1.2);
        }

        // --- PROCEDURAL CHARACTER MODEL & ORIGINAL ANIMATION (KONOMI & KUNHATAĨ) ---
        function buildCharacterModel(isKunhatai = false) {
            const group = new THREE.Group();

            // Colors
            const skinColor = 0xb87352;
            const clothesColor = isKunhatai ? 0x059669 : 0xd97706; // Emerald vs Amber
            const hairColor = 0x1c1917;

            // Torso
            const torsoGeo = new THREE.BoxGeometry(0.78, 1.05, 0.48);
            const torsoMat = new THREE.MeshLambertMaterial({ color: clothesColor });
            const torso = new THREE.Mesh(torsoGeo, torsoMat);
            torso.position.y = 1.0;
            torso.castShadow = true;
            group.add(torso);

            // Head
            const headGeo = new THREE.BoxGeometry(0.76, 0.76, 0.72);
            const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
            const head = new THREE.Mesh(headGeo, skinMat);
            head.position.y = 1.8;
            head.castShadow = true;
            group.add(head);

            // Hair
            const hairGeo = isKunhatai
                ? new THREE.BoxGeometry(0.82, 0.34, 0.78)
                : new THREE.BoxGeometry(0.82, 0.28, 0.78);
            const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.set(0, 1.95, isKunhatai ? -0.1 : -0.05);
            if (isKunhatai) hair.rotation.x = -0.08;
            group.add(hair);

            // Olhos quadrados expressivos, estilo personagem de jogo.
            const eyeWhite = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const eyeDark = new THREE.MeshLambertMaterial({ color: 0x171717 });
            [-1, 1].forEach(function(side) {
                const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.055), eyeWhite);
                eye.position.set(side * 0.17, 1.83, 0.375);
                group.add(eye);
                const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.085, 0.035), eyeDark);
                pupil.position.set(side * 0.17, 1.82, 0.415);
                group.add(pupil);
            });
            const smile = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.035), eyeDark);
            smile.position.set(0, 1.63, 0.39);
            group.add(smile);

            // Pena/cocar em bloco colorido.
            const featherGeo = new THREE.BoxGeometry(0.12, 0.48, 0.12);
            const featherMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
            const feather = new THREE.Mesh(featherGeo, featherMat);
            feather.position.set(isKunhatai ? 0.2 : 0, 2.2, -0.1);
            feather.rotation.z = isKunhatai ? -0.3 : 0;
            group.add(feather);

            // Arms (Pivoted for procedural swiveling animation)
            const armGeo = new THREE.BoxGeometry(0.24, 0.72, 0.28);

            const leftArmPivot = new THREE.Group();
            leftArmPivot.position.set(-0.48, 1.45, 0);
            const leftArm = new THREE.Mesh(armGeo, skinMat);
            leftArm.position.y = -0.35;
            leftArmPivot.add(leftArm);
            group.add(leftArmPivot);

            const rightArmPivot = new THREE.Group();
            rightArmPivot.position.set(0.48, 1.45, 0);
            const rightArm = new THREE.Mesh(armGeo, skinMat);
            rightArm.position.y = -0.35;
            rightArmPivot.add(rightArm);
            group.add(rightArmPivot);

            // Legs (Pivoted for walking animation)
            const legGeo = new THREE.BoxGeometry(0.29, 0.75, 0.34);

            const leftLegPivot = new THREE.Group();
            leftLegPivot.position.set(-0.2, 0.7, 0);
            const leftLeg = new THREE.Mesh(legGeo, skinMat);
            leftLeg.position.y = -0.375;
            leftLegPivot.add(leftLeg);
            group.add(leftLegPivot);

            const rightLegPivot = new THREE.Group();
            rightLegPivot.position.set(0.2, 0.7, 0);
            const rightLeg = new THREE.Mesh(legGeo, skinMat);
            rightLeg.position.y = -0.375;
            rightLegPivot.add(rightLeg);
            group.add(rightLegPivot);

            group.position.set(0, 0, 35);
            return {
                mesh: group,
                head, torso,
                leftArmPivot, rightArmPivot,
                leftLegPivot, rightLegPivot
            };
        }

        let player = buildCharacterModel(false);
        scene.add(player.mesh);

        // --- LANDMARKS / OBJECTIVES ---

        // 1. AWATI (Corn Stalk - Phase 1 Landmark)
        const awatiGroup = new THREE.Group();
        const stalkMat = new THREE.MeshLambertMaterial({ color: 0x65a30d });
        const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.2, 0.28), stalkMat);
        stalk.position.y = 2.1;
        awatiGroup.add(stalk);
        for (let i = 0; i < 5; i++) {
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.5, 0.72), stalkMat);
            leaf.position.set(0, 1 + i * 0.6, 0);
            leaf.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.7;
            leaf.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.25;
            awatiGroup.add(leaf);
        }
        const corn = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.4, 0.52), new THREE.MeshLambertMaterial({ color: 0xeab308 }));
        corn.position.set(0.35, 2.3, 0);
        corn.rotation.z = -0.4;
        awatiGroup.add(corn);

        const ring1 = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 24), new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide }));
        ring1.rotation.x = -Math.PI / 2;
        ring1.position.y = 0.05;
        awatiGroup.add(ring1);

        const awatiX = getTrailXAtZ(15) - 4;
        awatiGroup.position.set(awatiX, 0, 15);
        scene.add(awatiGroup);

        // 2. DJAGWARETE (Jaguar 3D Model - Phase 2 Landmark)
        const jaguarGroup = new THREE.Group();
        // Peças provisórias: permanecem visíveis caso o arquivo GLB não carregue.
        const jaguarFallbackParts = [];
        const jagMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
        const jagBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2.8), jagMat);
        jagBody.position.y = 1.1;
        jagBody.castShadow = true;
        jaguarGroup.add(jagBody);
        jaguarFallbackParts.push(jagBody);

        const jagHead = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.1), jagMat);
        jagHead.position.set(0, 1.7, 1.6);
        jagHead.castShadow = true;
        jaguarGroup.add(jagHead);
        jaguarFallbackParts.push(jagHead);

        const spotMat = new THREE.MeshBasicMaterial({ color: 0x451a03 });
        for(let s = 0; s < 8; s++) {
            const spot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), spotMat);
            spot.position.set((s % 2 === 0 ? 0.71 : -0.71), 1.1 + (s % 3) * 0.2, -0.8 + s * 0.3);
            jaguarGroup.add(spot);
            jaguarFallbackParts.push(spot);
        }

        // Patas, orelhas, olhos e cauda em blocos para dar silhueta de onça.
        const jagLegMat = new THREE.MeshLambertMaterial({ color: 0xc47a12 });
        for (const xSide of [-0.48, 0.48]) {
            for (const zSide of [-0.85, 0.85]) {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.72, 0.38), jagLegMat);
                leg.position.set(xSide, 0.38, zSide);
                leg.castShadow = true;
                jaguarGroup.add(leg);
                jaguarFallbackParts.push(leg);
            }
            const ear = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.2), jagMat);
            ear.position.set(xSide * 0.75, 2.18, 1.72);
            jaguarGroup.add(ear);
            jaguarFallbackParts.push(ear);
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), new THREE.MeshLambertMaterial({ color: 0x171717 }));
            eye.position.set(xSide * 0.62, 1.83, 2.16);
            jaguarGroup.add(eye);
            jaguarFallbackParts.push(eye);
        }
        const jagTail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.25), jagLegMat);
        jagTail.position.set(0, 0.95, -1.95);
        jagTail.rotation.x = -0.2;
        jaguarGroup.add(jagTail);
        jaguarFallbackParts.push(jagTail);
        const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.28), spotMat);
        tailTip.position.set(0, 0.82, -2.58);
        jaguarGroup.add(tailTip);
        jaguarFallbackParts.push(tailTip);

        // Detalhes de pelagem: focinho claro, nariz, manchas no dorso e orelhas internas.
        const jagCream = new THREE.MeshLambertMaterial({ color: 0xf6d58a });
        const jagNoseMat = new THREE.MeshLambertMaterial({ color: 0x24140d });
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.28, 0.28), jagCream);
        muzzle.position.set(0, 1.48, 2.19);
        jaguarGroup.add(muzzle); jaguarFallbackParts.push(muzzle);
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.10), jagNoseMat);
        nose.position.set(0, 1.57, 2.36);
        jaguarGroup.add(nose); jaguarFallbackParts.push(nose);
        const earInnerMat = new THREE.MeshLambertMaterial({ color: 0x5b2b18 });
        for (const side of [-1, 1]) {
            const inner = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.045), earInnerMat);
            inner.position.set(side * 0.36, 2.19, 1.84);
            jaguarGroup.add(inner); jaguarFallbackParts.push(inner);
        }
        for (const z of [-0.78, -0.2, 0.42, 0.92]) {
            for (const side of [-1, 1]) {
                const spotTop = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.055, 0.19), spotMat);
                spotTop.position.set(side * (0.25 + (z > 0.5 ? 0.04 : 0)), 1.67, z);
                jaguarGroup.add(spotTop); jaguarFallbackParts.push(spotTop);
            }
        }

        const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 24), new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }));
        ring2.rotation.x = -Math.PI / 2;
        ring2.position.y = 0.05;
        jaguarGroup.add(ring2);

        const jagX = getTrailXAtZ(-35);
        jaguarGroup.position.set(jagX, 0, -35);
        scene.add(jaguarGroup);

        // A onça usa o modelo procedural em blocos; não precisa baixar arquivos GLB.
        // Grupo, posição, anel e distância de interação permanecem iguais.

        // --- CAMOUFLAGED ANIMALS WITH NATURAL PROCEDURAL BEHAVIOR ---

        // 1. MBO'I (Cobra Cascavel 🐍) - Undulating S-curve movement on ground leaves
        const mboiGroup = new THREE.Group();
        const mboiSegments = [];
        const snakeMats = [0x4d7c0f, 0x658b22, 0x365314];
        const snakeBellyMat = new THREE.MeshLambertMaterial({ color: 0xd6c58a });
        for (let b = 0; b < 9; b++) {
            const size = 0.42 - b * 0.025;
            const seg = new THREE.Mesh(new THREE.BoxGeometry(size, 0.30 - b * 0.012, size), new THREE.MeshLambertMaterial({ color: snakeMats[b % snakeMats.length], flatShading: true }));
            seg.castShadow = true;
            const belly = new THREE.Mesh(new THREE.BoxGeometry(size * 0.68, 0.055, size * 0.82), snakeBellyMat);
            belly.position.set(0, -0.13, 0);
            seg.add(belly);
            mboiSegments.push(seg);
            mboiGroup.add(seg);
        }
        const snakeHead = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.30, 0.42), new THREE.MeshLambertMaterial({ color: 0x6b8e23, flatShading: true }));
        snakeHead.position.set(0, 0.06, -0.27);
        mboiGroup.add(snakeHead);
        const snakeEyeMat = new THREE.MeshLambertMaterial({ color: 0xffd54f });
        const snakePupilMat = new THREE.MeshLambertMaterial({ color: 0x171717 });
        [-1,1].forEach(side => {
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.10,0.10,0.06), snakeEyeMat);
            eye.position.set(side*0.15,0.17,-0.38); mboiGroup.add(eye);
            const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.035,0.065,0.025), snakePupilMat);
            pupil.position.set(side*0.15,0.17,-0.415); mboiGroup.add(pupil);
        });
        const rattle = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.20), new THREE.MeshLambertMaterial({ color: 0xc8a85a }));
        rattle.position.set(0,0.06,2.82); mboiGroup.add(rattle);
        // Hiding bush patch for cobra
        const cobraBushX = getTrailXAtZ(5) + 3.2;
        createBush(cobraBushX, 5, 1.5);
        mboiGroup.position.set(cobraBushX - 0.5, 0.1, 5);
        scene.add(mboiGroup);
        const mboiHomeX = mboiGroup.position.x;
        const mboiHomeZ = mboiGroup.position.z;
        let mboiRoamPhase = Math.random() * Math.PI * 2;

        // 2. NHANDU (Aranha Gigante 🕷️) - Camouflaged on silk web between trees
        const nhanduGroup = new THREE.Group();
        const spiderMat = new THREE.MeshLambertMaterial({ color: 0x21152e, emissive: 0x16091f });
        const spiderBody = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.56, 1.0), spiderMat);
        spiderBody.scale.set(1, 0.7, 1.3);
        nhanduGroup.add(spiderBody);

        const spiderAbdomen = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.46,0.72), new THREE.MeshLambertMaterial({ color: 0x292524, flatShading: true }));
        spiderAbdomen.position.set(0,0.02,-0.62); nhanduGroup.add(spiderAbdomen);
        const spiderMarkMat = new THREE.MeshLambertMaterial({ color: 0xffd400, emissive: 0x5c4200 });
        for (let m = 0; m < 3; m++) {
            const mark = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.045,0.15), spiderMarkMat);
            mark.position.set((m-1)*0.17,0.25,-0.68); nhanduGroup.add(mark);
        }
        const spiderEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
        [-1,1].forEach(side => {
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.07), spiderEyeMat);
            eye.position.set(side*0.2,0.12,0.54); nhanduGroup.add(eye);
        });
        const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-1,1].forEach(side => {
            const fang = new THREE.Mesh(new THREE.BoxGeometry(0.09,0.20,0.10), fangMat);
            fang.position.set(side*0.14,-0.17,0.55); nhanduGroup.add(fang);
        });
        const spiderLegs = [];
        for (let l = 0; l < 8; l++) {
            const legPivot = new THREE.Group();
            const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.95, 0.16), spiderMat);
            legMesh.position.set(l < 4 ? 0.45 : -0.45, -0.2, 0);
            legMesh.rotation.z = l < 4 ? -0.8 : 0.8;
            legPivot.add(legMesh);
            legPivot.position.set(0, 0, (l % 4) * 0.22 - 0.33);
            spiderLegs.push(legPivot);
            nhanduGroup.add(legPivot);
        }

        // Fio curto de seda: fica abaixo da aranha, entre as folhas da copa.
        const threadGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6);
        const threadMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.68 });
        const webThread = new THREE.Mesh(threadGeo, threadMat);
        // A teia fica independente do corpo da aranha para continuar visível
        // enquanto ela desce e sobe, ligando a copa ao solo.
        webThread.material.opacity = 0.95;
        scene.add(webThread);

        const nhanduTreeX = getTrailXAtZ(-12) - 3.8;
        // Árvore dedicada. A aranha fica na borda frontal da copa, sem ficar escondida dentro das folhas.
        createTree(nhanduTreeX, -12, 1.35);
        nhanduGroup.position.set(nhanduTreeX + 2.35, 12.0, -10.0); // Borda frontal da copa, visível e alinhada com a árvore
        nhanduGroup.scale.setScalar(1.2); // Aumenta a silhueta para ficar fácil de enxergar
        scene.add(nhanduGroup);

        // 3. ANGUDJÁ (Rato/Preá 🐀) - Quick random dash between bushes
        const angudjaGroup = new THREE.Group();
        const ratMat = new THREE.MeshLambertMaterial({ color: 0x57534e });
        const ratBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.68), ratMat);
        ratBody.scale.set(0.8, 0.7, 1.4);
        ratBody.position.y = 0.2;
        ratBody.castShadow = true;
        angudjaGroup.add(ratBody);

        const ratSnout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.28), ratMat);
        ratSnout.rotation.x = -Math.PI / 2;
        ratSnout.position.set(0, 0.2, 0.5);
        angudjaGroup.add(ratSnout);
        const ratEarMat = new THREE.MeshLambertMaterial({ color: 0x9f8b7b });
        const ratPinkMat = new THREE.MeshLambertMaterial({ color: 0xf0a6a6 });
        const ratNose = new THREE.Mesh(new THREE.BoxGeometry(0.11,0.09,0.10), ratPinkMat);
        ratNose.position.set(0,0.22,0.66); angudjaGroup.add(ratNose);
        const whiskerMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 });
        [-1,1].forEach(side => {
            for (let w=0; w<2; w++) {
                const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.025,0.025), whiskerMat);
                whisker.position.set(side*0.25,0.22+w*0.05,0.55);
                whisker.rotation.z = side * (w===0 ? 0.12 : -0.12);
                angudjaGroup.add(whisker);
            }
        });
        const ratFurPatch = new THREE.Mesh(new THREE.BoxGeometry(0.26,0.055,0.36), new THREE.MeshLambertMaterial({ color: 0x8b8178 }));
        ratFurPatch.position.set(0,0.36,-0.05); angudjaGroup.add(ratFurPatch);
        [-1, 1].forEach(function(side) {
            const ear = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.12), ratEarMat);
            ear.position.set(side * 0.18, 0.42, -0.12);
            angudjaGroup.add(ear);
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), new THREE.MeshLambertMaterial({ color: 0x111111 }));
            eye.position.set(side * 0.19, 0.31, 0.2);
            angudjaGroup.add(eye);
        });
        const ratTail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), new THREE.MeshLambertMaterial({ color: 0x78716c }));
        ratTail.position.set(0, 0.13, -0.58);
        angudjaGroup.add(ratTail);

        const ratX = getTrailXAtZ(25) + 3.8;
        // Três arbustos de referência: o rato percorre o trajeto entre eles.
        const ratBushStops = [
            { x: ratX, z: 25 },
            { x: ratX - 6, z: 25 },
            { x: ratX - 10, z: 29 }
        ];
        ratBushStops.forEach(stop => createBush(stop.x, stop.z, 1.3));
        angudjaGroup.position.set(ratBushStops[0].x, 0, ratBushStops[0].z);
        scene.add(angudjaGroup);

        // --- POWER-UPS: CURA, VELOCIDADE E ESCUDO ---
        const powerUps = [];
        let collectedPowerUps = 0;
        let playerHealth = 100;
        let phaseTimeLeft = 90;
        let damageCooldown = 0;
        let speedBoostTimer = 0;
        let shieldTimer = 0;
        let feedbackTimer = 0;
        function showGameFeedback(message) {
            const el = document.getElementById('game-feedback');
            if (el) {
                const isDangerAlert = /Txakeke\s+(Nhandu|Angudja|Mboi|Djagwarete)/i.test(message);
                el.classList.toggle('danger-alert', isDangerAlert);
                el.textContent = isDangerAlert ? '⚠️ TXAKEKE! ' + message.replace(/^Txakeke\s*/i, '') : message;
                feedbackTimer = isDangerAlert ? 3.6 : 2.2;
            }
        }
        function updateSurvivalHUD() {
            const healthFill = document.getElementById('health-fill');
            const healthLabel = document.getElementById('health-label');
            const timerEl = document.getElementById('phase-timer');
            const powerEl = document.getElementById('powerup-count');
            if (healthFill) {
                healthFill.style.width = playerHealth + '%';
                healthFill.className = 'h-full rounded-full transition-all duration-200 ' + (playerHealth <= 30 ? 'bg-rose-600' : playerHealth <= 60 ? 'bg-amber-400' : 'bg-gradient-to-r from-rose-600 to-lime-400');
            }
            if (healthLabel) healthLabel.textContent = Math.ceil(playerHealth) + ' / 100';
            if (timerEl) {
                const seconds = Math.max(0, Math.ceil(phaseTimeLeft));
                timerEl.textContent = String(Math.floor(seconds/60)).padStart(2,'0') + ':' + String(seconds%60).padStart(2,'0');
                timerEl.classList.toggle('text-rose-400', seconds <= 15);
                timerEl.classList.toggle('text-amber-300', seconds > 15);
            }
            if (powerEl) powerEl.textContent = '✦ ' + collectedPowerUps;
        }
        function createPowerUp(z, type, color) {
            const group = new THREE.Group();
            const crystal = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.62,0.62), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.24, flatShading: true }));
            crystal.rotation.set(0.25, Math.PI/4, 0.25); crystal.castShadow = true; group.add(crystal);
            const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62,0.055,6,18), new THREE.MeshBasicMaterial({ color: 0xfff4a3 }));
            halo.rotation.x = Math.PI/2; halo.position.y = -0.18; group.add(halo);
            group.position.set(getTrailXAtZ(z),0.8,z);
            scene.add(group);
            powerUps.push({ mesh: group, type, baseY: 0.8, taken: false });
        }
        createPowerUp(27, 'cura', 0x4ade80);
        createPowerUp(-5, 'velocidade', 0xa78bfa);
        createPowerUp(-30, 'escudo', 0x38bdf8);

        function distanceXZ(x1,z1,x2,z2) {
            const dx=x1-x2, dz=z1-z2;
            return Math.sqrt(dx*dx+dz*dz);
        }
        function isBlockedAt(x,z) {
            // No ar, o guardião pode saltar por cima de árvores, arbustos e animais.
            if (player && player.mesh && (isJumping || player.mesh.position.y > 0.45)) return false;
            // No chão, mantém as colisões já existentes.
            if (worldObstacles.some(o => distanceXZ(x,z,o.x,o.z) < o.radius + 0.36)) return true;
            if (typeof mboiSegments !== 'undefined' && mboiSegments.some(seg => {
                const worldPos = new THREE.Vector3();
                seg.getWorldPosition(worldPos);
                return distanceXZ(x,z,worldPos.x,worldPos.z) < 0.72;
            })) return true;
            if (typeof nhanduGroup !== 'undefined' && distanceXZ(x,z,nhanduGroup.position.x,nhanduGroup.position.z) < 0.86) return true;
            if (typeof angudjaGroup !== 'undefined' && distanceXZ(x,z,angudjaGroup.position.x,angudjaGroup.position.z) < 0.72) return true;
            if (typeof jaguarGroup !== 'undefined' && distanceXZ(x,z,jaguarGroup.position.x,jaguarGroup.position.z) < 1.18) return true;
            if (typeof extraDangerAnimals !== 'undefined' && extraDangerAnimals.some(a => distanceXZ(x,z,a.mesh.position.x,a.mesh.position.z) < a.blockRadius)) return true;
            return false;
        }
        function respawnAfterKnockout() {
            if (isGameOver) return;
            isGameOver = true;
            const overlay = document.getElementById('game-over-overlay');
            const phaseText = document.getElementById('game-over-phase');
            const phaseName = currentPhase === 1 ? 'Fase 1 — AWATI (milho)' : 'Fase ' + currentPhase + ' — desafio do DJAGWARETE (onça)';
            if (phaseText) phaseText.textContent = 'Você perdeu na ' + phaseName + '. Reinicie para tentar novamente nesta mesma fase.';
            if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }
        }

        function restartCurrentPhase() {
            // Mantém currentPhase: a morte não faz o jogador voltar à fase 1.
            isGameOver = false;
            playerHealth = 100;
            phaseTimeLeft = 90;
            damageCooldown = 1.5;
            speedBoostTimer = 0;
            shieldTimer = 0;
            player.mesh.position.set(0, 0, 35);
            player.mesh.rotation.y = 0;
            const overlay = document.getElementById('game-over-overlay');
            if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
            updateSurvivalHUD();
            showGameFeedback('Você voltou! Continue na fase ' + currentPhase + '.');
        }
        window.restartCurrentPhase = restartCurrentPhase;
        // Animais perigosos adicionais: a cada nova fase, a quantidade dobra.
        // As cópias ficam em pontos diferentes da trilha e também causam dano.
        const extraDangerAnimals = [];
        let hazardsDoubledForPhase = 1;
        function doubleDangerAnimalsForPhase() {
            if (currentPhase <= hazardsDoubledForPhase) return;
            const templates = [
                { mesh: mboiGroup, name: 'Mbo’i', radius: 1.35, blockRadius: 0.72 },
                { mesh: nhanduGroup, name: 'Nhandu', radius: 1.55, blockRadius: 0.86 },
                { mesh: angudjaGroup, name: 'Angudjá', radius: 1.1, blockRadius: 0.72 }
            ];
            // Acrescenta uma cópia de cada ameaça base, dobrando 3 para 6 na fase 2.
            const positions = [
                { x: getTrailXAtZ(16) - 4.5, z: 16 },
                { x: getTrailXAtZ(-22) + 4.5, z: -22 },
                { x: getTrailXAtZ(-42) - 4.0, z: -42 }
            ];
            templates.forEach((template, i) => {
                const clone = template.mesh.clone(true);
                clone.position.set(positions[i].x, template.name === 'Nhandu' ? 12.0 : template.mesh.position.y, positions[i].z);
                scene.add(clone);
                const animal = {
                    mesh: clone, name: template.name, radius: template.radius, blockRadius: template.blockRadius,
                    homeX: positions[i].x, homeZ: positions[i].z,
                    roamPhase: Math.random() * Math.PI * 2,
                    baseY: template.name === 'Nhandu' ? 12.0 : template.mesh.position.y,
                    // Cada cópia mantém as mesmas peças animadas do animal original.
                    segments: template.name === 'Mbo’i' ? clone.children.slice(0, 9) : [],
                    legs: template.name === 'Nhandu' ? clone.children.filter(child => child.type === 'Group' && child.children && child.children.some(part => part.isMesh)) : [],
                    web: null,
                    targetIndex: 0,
                    targetTimer: 0
                };
                if (template.name === 'Nhandu') {
                    // Cada aranha tem sua própria teia, como a Nhandu da primeira fase.
                    animal.web = new THREE.Mesh(threadGeo, threadMat.clone());
                    animal.web.material.opacity = 0.95;
                    scene.add(animal.web);
                }
                if (template.name === 'Angudjá') {
                    // Patrulha curta entre três pontos, igual ao rato original.
                    animal.ratStops = [
                        { x: animal.homeX, z: animal.homeZ },
                        { x: animal.homeX - 3.2, z: animal.homeZ + 1.5 },
                        { x: animal.homeX + 2.2, z: animal.homeZ + 3.0 }
                    ];
                    animal.targetIndex = 1;
                    animal.targetTimer = 0;
                }
                extraDangerAnimals.push(animal);
            });
            hazardsDoubledForPhase = currentPhase;
            showGameFeedback('A mata ficou mais perigosa: os animais dobraram!');
        }

        function applyAnimalDamage() {
            if (damageCooldown > 0 || shieldTimer > 0) return;
            const px=player.mesh.position.x, pz=player.mesh.position.z;
            const threats = [
                {name:'Mbo’i', x:mboiGroup.position.x, z:mboiGroup.position.z, radius:1.35},
                {name:'Nhandu', x:nhanduGroup.position.x, z:nhanduGroup.position.z, radius:1.55},
                {name:'Angudjá', x:angudjaGroup.position.x, z:angudjaGroup.position.z, radius:1.1}
            ];
            if (currentPhase >= 2) threats.push({name:'Djagwarete', x:jaguarGroup.position.x, z:jaguarGroup.position.z, radius:1.8});
            extraDangerAnimals.forEach(a => threats.push({ name: a.name, x: a.mesh.position.x, z: a.mesh.position.z, radius: a.radius }));
            // Agachado, o personagem fica baixo o suficiente para evitar o ataque da aranha.
            // Também vale para cópias da Nhandu criadas nas fases mais perigosas.
            const danger = threats.find(a => !(isCrouching && String(a.name).toLowerCase().includes('nhandu')) && distanceXZ(px,pz,a.x,a.z) < a.radius);
            if (danger) {
                playerHealth = Math.max(0, playerHealth - 15);
                damageCooldown = 1.35;
                const dangerCallout = ({'Angudjá':'Angudja', 'Mbo’i':'Mboi', 'Mboi':'Mboi', 'Nhandu':'Nhandu', 'Djagwarete':'Djagwarete'})[danger.name] || danger.name;
                showGameFeedback('Txakeke ' + dangerCallout + '! -15 de vida');
                if (playerHealth <= 0) respawnAfterKnockout();
            }
        }
        function collectPowerUps(time) {
            powerUps.forEach(item => {
                if (item.taken) return;
                item.mesh.rotation.y += 0.025;
                item.mesh.position.y = item.baseY + Math.sin(time*3 + item.mesh.position.z)*0.13;
                if (distanceXZ(player.mesh.position.x,player.mesh.position.z,item.mesh.position.x,item.mesh.position.z) < 1.35) {
                    item.taken = true; scene.remove(item.mesh); collectedPowerUps++;
                    if (item.type === 'cura') {
                        playerHealth = Math.min(100, playerHealth + 35);
                        showGameFeedback('Folha de cura! +35 de vida');
                    } else if (item.type === 'velocidade') {
                        speedBoostTimer = 7;
                        showGameFeedback('Energia da mata! Velocidade aumentada por 7 segundos');
                    } else {
                        shieldTimer = 7;
                        showGameFeedback('Escudo protetor! Sem dano por 7 segundos');
                    }
                }
            });
        }

        // --- CAMERA LIVRE REAL: ARRASTAR PELO CENÁRIO COM O MOUSE ---
        // Usa eventos no documento em fase de captura porque HUDs e controles podem
        // interceptar eventos do canvas. Os controles e diálogos ficam excluídos.
        let isMouseDown = false;
        let previousMousePosition = { x: 0, y: 0 };
        let cameraAngleYaw = 0;
        // Mantém a câmera acima do solo: evita enxergar por baixo do terreno e revelar o céu azul abaixo da terra.
        let cameraAnglePitch = 0.45;
        let cameraDistance = 12;
        const cameraCanvas = renderer.domElement;
        cameraCanvas.style.cursor = 'grab';
        cameraCanvas.style.touchAction = 'none';
        cameraCanvas.style.userSelect = 'none';
        container.style.cursor = 'grab';

        function isCameraUiTarget(target) {
            return !!(target && target.closest && target.closest(
                'button, a, input, textarea, select, label, [role="button"], #touch-controls, .mobile-controls, #question-modal, #read-modal, #game-over-modal, #character-select, #rotate-screen-button, #btn-interact, .hud, .controls, .joystick'
            ));
        }
        function isGameSceneTarget(target) {
            return !!(target && (target === cameraCanvas || container.contains(target))) && !isCameraUiTarget(target);
        }
        function startCameraDrag(e) {
            if (e.button !== 0 || !isGameSceneTarget(e.target)) return;
            isMouseDown = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
            cameraCanvas.style.cursor = 'grabbing';
            container.style.cursor = 'grabbing';
        }
        function moveFreeCamera(e) {
            if (!isMouseDown) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            cameraAngleYaw -= deltaX * 0.009;
            cameraAnglePitch = Math.max(0.28, Math.min(1.25, cameraAnglePitch + deltaY * 0.008));
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
        function stopCameraDrag() {
            isMouseDown = false;
            cameraCanvas.style.cursor = 'grab';
            container.style.cursor = 'grab';
        }
        // Mouse: arraste com o botão esquerdo para girar a câmera.
        document.addEventListener('mousedown', startCameraDrag, true);
        document.addEventListener('mousemove', moveFreeCamera, true);
        document.addEventListener('mouseup', stopCameraDrag, true);

        // Celular/tablet: arraste um dedo diretamente sobre o cenário 3D.
        // O joystick, os botões de pular/agachar e as janelas ficam excluídos.
        let touchCameraPointerId = null;
        function startTouchCamera(e) {
            if (e.pointerType !== 'touch' || !isGameSceneTarget(e.target)) return;
            touchCameraPointerId = e.pointerId;
            isMouseDown = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
            cameraCanvas.style.cursor = 'grabbing';
        }
        function moveTouchCamera(e) {
            if (e.pointerType !== 'touch' || !isMouseDown || e.pointerId !== touchCameraPointerId) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            cameraAngleYaw -= deltaX * 0.009;
            cameraAnglePitch = Math.max(0.28, Math.min(1.25, cameraAnglePitch + deltaY * 0.008));
            previousMousePosition = { x: e.clientX, y: e.clientY };
            if (e.cancelable) e.preventDefault();
        }
        function stopTouchCamera(e) {
            if (e && e.pointerType === 'touch' && e.pointerId !== touchCameraPointerId) return;
            touchCameraPointerId = null;
            stopCameraDrag();
        }
        document.addEventListener('pointerdown', startTouchCamera, { capture: true, passive: false });
        document.addEventListener('pointermove', moveTouchCamera, { capture: true, passive: false });
        document.addEventListener('pointerup', stopTouchCamera, true);
        document.addEventListener('pointercancel', stopTouchCamera, true);
        window.addEventListener('blur', stopCameraDrag);
        cameraCanvas.addEventListener('contextmenu', e => e.preventDefault());
        container.addEventListener('wheel', (e) => {
            if (isCameraUiTarget(e.target)) return;
            cameraDistance = Math.max(5, Math.min(28, cameraDistance + e.deltaY * 0.018));
            e.preventDefault();
        }, { passive: false });

        // --- CONTROLS & JUMP SYSTEM ---
        let playerVelocityY = 0;
        let isJumping = false;
        const gravity = -22;

        function triggerJump() {
            if (!isJumping) {
                playerVelocityY = 8.5;
                isJumping = true;
            }
        }

        const keys = {};
        let touchDir = { x: 0, z: 0 };
        let isTouchCrouching = false;
        let isCrouching = false;

        window.addEventListener('keydown', e => {
            keys[e.key.toLowerCase()] = true;
            // A seta para baixo é reservada para agachar e se proteger da Nhandu.
            if (e.key === 'ArrowDown') e.preventDefault();
            if (e.key === ' ' || e.code === 'Space') {
                if (activeInteractiveObject) {
                    openKwatiaModal();
                } else {
                    triggerJump();
                }
            }
        });
        window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

        // Joystick virtual: o personagem se move na direção em que o controle é arrastado.
        const mobileJoystick = document.getElementById('mobile-joystick');
        const joystickKnob = document.getElementById('joystick-knob');
        let joystickPointerId = null;
        function updateJoystick(e) {
            if (!mobileJoystick) return;
            const rect = mobileJoystick.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const maxRadius = rect.width * 0.31;
            let dx = e.clientX - cx, dy = e.clientY - cy;
            const length = Math.hypot(dx, dy);
            if (length > maxRadius) { dx = dx / length * maxRadius; dy = dy / length * maxRadius; }
            joystickKnob.style.left = `calc(50% + ${dx}px)`;
            joystickKnob.style.top = `calc(50% + ${dy}px)`;
            touchDir.x = Math.max(-1, Math.min(1, dx / maxRadius));
            touchDir.z = Math.max(-1, Math.min(1, dy / maxRadius));
        }
        function resetJoystick() {
            joystickPointerId = null;
            touchDir.x = 0; touchDir.z = 0;
            if (joystickKnob) { joystickKnob.style.left = '50%'; joystickKnob.style.top = '50%'; }
        }
        if (mobileJoystick) {
            mobileJoystick.addEventListener('pointerdown', e => {
                e.preventDefault();
                joystickPointerId = e.pointerId;
                if (mobileJoystick.setPointerCapture) mobileJoystick.setPointerCapture(e.pointerId);
                updateJoystick(e);
            });
            mobileJoystick.addEventListener('pointermove', e => {
                if (e.pointerId === joystickPointerId) { e.preventDefault(); updateJoystick(e); }
            });
            ['pointerup','pointercancel','lostpointercapture'].forEach(evt => mobileJoystick.addEventListener(evt, resetJoystick));
        }
        const crouchButton = document.getElementById('btn-crouch');
        if (crouchButton) {
            const startCrouch = e => {
                e.preventDefault();
                isTouchCrouching = true;
                if (crouchButton.setPointerCapture && e.pointerId !== undefined) crouchButton.setPointerCapture(e.pointerId);
                crouchButton.classList.add('pressed');
            };
            const endCrouch = e => { if (e) e.preventDefault(); isTouchCrouching = false; crouchButton.classList.remove('pressed'); };
            crouchButton.addEventListener('pointerdown', startCrouch);
            ['pointerup','pointercancel','lostpointercapture'].forEach(evt => crouchButton.addEventListener(evt, endCrouch));
        }
        const jumpButton = document.getElementById('btn-jump');
        if (jumpButton) {
            jumpButton.addEventListener('pointerdown', e => {
                e.preventDefault();
                if (jumpButton.setPointerCapture && e.pointerId !== undefined) jumpButton.setPointerCapture(e.pointerId);
                jumpButton.classList.add('pressed');
                triggerJump();
            });
            ['pointerup','pointercancel','lostpointercapture'].forEach(evt => jumpButton.addEventListener(evt, () => jumpButton.classList.remove('pressed')));
        }

        // Primeira tela -> escolha de personagem -> início da partida.
        function beginCharacterSelection() {
            const start = document.getElementById('start-screen');
            const selection = document.getElementById('character-select-screen');
            if (start) start.classList.add('hidden');
            if (selection) selection.classList.remove('hidden');
            // A tela cheia é solicitada após o toque do jogador, quando permitido pelo navegador.
            if (document.documentElement.requestFullscreen && window.matchMedia('(pointer: coarse)').matches) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        }

        // Versão PC: não bloqueia computadores sem tela de toque.
        // Os controles de teclado já existentes continuam ativos e o CSS oculta os controles táteis.
        function detectTouchDevice() {
            document.body.classList.remove('desktop-no-touch');
        }
        detectTouchDevice();

        function selectCharacter(char) {
            selectedCharacter = char;
            gameStarted = true;

            // Rebuild character visually if Kunhatai is chosen
            if (char === 'kunhatai') {
                scene.remove(player.mesh);
                player = buildCharacterModel(true);
                scene.add(player.mesh);
            }

            document.getElementById('character-select-screen').classList.add('hidden');
            document.getElementById('game-header').classList.remove('hidden');
            document.getElementById('touch-controls').classList.remove('hidden');
            document.getElementById('survival-hud').classList.remove('hidden');
            phaseTimeLeft = 90;
            playerHealth = 100;
            collectedPowerUps = 0;
            updateSurvivalHUD();

            if (char === 'konomi') {
                document.getElementById('player-avatar-icon').innerText = "👦🏽";
                document.getElementById('player-name-display').innerText = "Guardião: Konomi";
            } else {
                document.getElementById('player-avatar-icon').innerText = "👧🏽";
                document.getElementById('player-name-display').innerText = "Guardiã: Kunhataĩ";
            }
        }

        // --- MAIN GAME LOOP & ANIMATION ---
        const clock = new THREE.Clock();

        // Variables for animal behavioral AI
        let ratTargetIndex = 1;
        let ratTargetX = ratBushStops[ratTargetIndex].x;
        let ratTargetZ = ratBushStops[ratTargetIndex].z;
        let ratTimer = 0;

        function animate() {
            requestAnimationFrame(animate);

            if (!gameStarted || isGameOver) {
                renderer.render(scene, camera);
                return;
            }

            // Enquanto a caixa de leitura ou de pergunta estiver aberta, pausa o jogo:
            // animais, cronômetro e dano ficam suspensos até o jogador fechar a caixa.
            const interactionModalOpen = ['read-modal', 'question-modal'].some(id => {
                const modal = document.getElementById(id);
                return modal && !modal.classList.contains('hidden');
            });
            if (interactionModalOpen) {
                // Atualiza o relógio mesmo durante a pausa para evitar um salto de tempo ao voltar.
                clock.getDelta();
                renderer.render(scene, camera);
                return;
            }

            const delta = clock.getDelta();
            const time = clock.getElapsedTime();
            if (damageCooldown > 0) damageCooldown = Math.max(0, damageCooldown - delta);
            if (speedBoostTimer > 0) speedBoostTimer = Math.max(0, speedBoostTimer - delta);
            if (shieldTimer > 0) shieldTimer = Math.max(0, shieldTimer - delta);
            if (feedbackTimer > 0) {
                feedbackTimer -= delta;
                if (feedbackTimer <= 0) { const feedbackEl = document.getElementById('game-feedback'); feedbackEl.textContent = ''; feedbackEl.classList.remove('danger-alert'); }
            }
            phaseTimeLeft -= delta;
            if (phaseTimeLeft <= 0) {
                // Tempo esgotado usa o mesmo aviso Manó e reinício da fase que a vida zerada.
                phaseTimeLeft = 0;
                updateSurvivalHUD();
                respawnAfterKnockout();
                renderer.render(scene, camera);
                return;
            }
            updateSurvivalHUD();
            const speed = 9 * delta * (speedBoostTimer > 0 ? 1.55 : 1);
            let moveX = 0, moveZ = 0;

            // Segure a seta para baixo para agachar; use S para andar para trás.
            const wantsCrouch = !!keys['arrowdown'] || isTouchCrouching;
            if (wantsCrouch !== isCrouching) {
                isCrouching = wantsCrouch;
                player.mesh.scale.y = isCrouching ? 0.52 : 1;
                if (isCrouching) showGameFeedback('Agachado! A Nhandu não consegue te atingir enquanto você se abaixa.');
            }

            if (keys['w'] || keys['arrowup']) moveZ -= 1;
            if (keys['s']) moveZ += 1;
            if (keys['a'] || keys['arrowleft']) moveX -= 1;
            if (keys['d'] || keys['arrowright']) moveX += 1;

            if (touchDir.x !== 0 || touchDir.z !== 0) {
                moveX = touchDir.x;
                moveZ = touchDir.z;
            }

            const isMoving = (moveX !== 0 || moveZ !== 0);

            // Movement & Procedural Character Animation
            if (isMoving) {
                const moveAngle = Math.atan2(moveX, moveZ) + cameraAngleYaw;
                player.mesh.rotation.y = moveAngle;

                let nextX = player.mesh.position.x + Math.sin(moveAngle) * speed;
                let nextZ = player.mesh.position.z + Math.cos(moveAngle) * speed;

                // Invisible forest barrier for Phase 1
                if (currentPhase === 1 && nextZ < -8) {
                    nextZ = -8;
                }

                const boundedX = Math.max(-18, Math.min(18, nextX));
                const boundedZ = Math.max(-55, Math.min(48, nextZ));
                // Colisão sólida: o jogador não atravessa troncos nem arbustos; pode deslizar pela lateral.
                if (!isBlockedAt(boundedX, player.mesh.position.z)) player.mesh.position.x = boundedX;
                if (!isBlockedAt(player.mesh.position.x, boundedZ)) player.mesh.position.z = boundedZ;

                // Natural Procedural Walking Animation
                const walkCycle = time * 11;
                player.leftLegPivot.rotation.x = Math.sin(walkCycle) * 0.65;
                player.rightLegPivot.rotation.x = -Math.sin(walkCycle) * 0.65;
                player.leftArmPivot.rotation.x = -Math.sin(walkCycle) * 0.6;
                player.rightArmPivot.rotation.x = Math.sin(walkCycle) * 0.6;
                player.torso.position.y = 1.0 + Math.abs(Math.sin(walkCycle * 2)) * 0.06;
                player.head.rotation.y = Math.sin(walkCycle) * 0.08;
            } else {
                // Idle breathing animation
                player.leftLegPivot.rotation.x = 0;
                player.rightLegPivot.rotation.x = 0;
                player.leftArmPivot.rotation.x = Math.sin(time * 2) * 0.05;
                player.rightArmPivot.rotation.x = -Math.sin(time * 2) * 0.05;
                player.torso.position.y = 1.0 + Math.sin(time * 2) * 0.02;
            }

            // Jump Physics & Animation
            if (isJumping) {
                player.mesh.position.y += playerVelocityY * delta;
                playerVelocityY += gravity * delta;

                player.leftLegPivot.rotation.x = -0.4;
                player.rightLegPivot.rotation.x = 0.4;

                if (player.mesh.position.y <= 0) {
                    player.mesh.position.y = 0;
                    playerVelocityY = 0;
                    isJumping = false;
                }
            }

            // --- BEHAVIORAL ANIMAL ANIMATIONS ---

            // 1. Mbo'i (Cobra) - rasteja livremente pelo cenário, mantendo-se dentro da mata.
            mboiRoamPhase += delta * 0.48;
            mboiGroup.position.x = Math.max(-16, Math.min(16, mboiHomeX + Math.sin(mboiRoamPhase) * 5.5));
            mboiGroup.position.z = Math.max(-49, Math.min(43, mboiHomeZ + Math.cos(mboiRoamPhase * 0.63) * 18));
            // A cabeça aponta para -Z no modelo; alinhe essa frente com a direção real do movimento.
            const mboiVelocityX = Math.cos(mboiRoamPhase) * 5.5;
            const mboiVelocityZ = -Math.sin(mboiRoamPhase * 0.63) * 0.63 * 18;
            mboiGroup.rotation.y = Math.atan2(-mboiVelocityX, -mboiVelocityZ);
            for (let i = 0; i < mboiSegments.length; i++) {
                const wave = Math.sin(time * 4 - i * 0.4) * 0.35;
                mboiSegments[i].position.set(wave, 0, i * 0.32);
            }

            // 2. Nhandu: sai da copa, desce pela teia até perto do chão e retorna.
            const spiderTopY = 12.0;
            const spiderBottomY = 0.95;
            const spiderCycle = (Math.sin(time * 0.48) + 1) / 2;
            const spiderY = spiderBottomY + spiderCycle * (spiderTopY - spiderBottomY);
            nhanduGroup.position.y = spiderY;
            webThread.position.set(nhanduGroup.position.x, spiderY / 2, nhanduGroup.position.z);
            webThread.scale.y = Math.max(0.1, spiderY);
            spiderLegs.forEach((leg, idx) => {
                leg.rotation.z = Math.sin(time * 6 + idx) * 0.2;
            });

            // 3. Angudjá (Rato) - corre de um arbusto ao próximo e muda de rota.
            ratTimer += delta;
            const ratDx = ratTargetX - angudjaGroup.position.x;
            const ratDz = ratTargetZ - angudjaGroup.position.z;
            if (ratTimer > 2.0 && Math.hypot(ratDx, ratDz) < 1.0) {
                ratTimer = 0;
                ratTargetIndex = (ratTargetIndex + 1) % ratBushStops.length;
                ratTargetX = ratBushStops[ratTargetIndex].x;
                ratTargetZ = ratBushStops[ratTargetIndex].z;
            }
            const ratStep = Math.min(1, delta * 2.8);
            angudjaGroup.position.x += ratDx * ratStep;
            angudjaGroup.position.z += ratDz * ratStep;
            angudjaGroup.rotation.y = Math.atan2(ratDx, ratDz);

            // REGRA PARA TODAS AS FASES: toda cópia deve usar a mesma lógica de movimento e animação
            // do animal original. Não criar uma IA alternativa por fase.
            // Cópias das fases seguintes usam a MESMA lógica de movimento e animação
            // dos animais originais da fase 1, incluindo patas, corpo, orientação e teia.
            extraDangerAnimals.forEach((animal, index) => {
                if (animal.name !== 'Nhandu') animal.roamPhase += delta * 0.48;
                const oldX = animal.mesh.position.x;
                const oldZ = animal.mesh.position.z;

                if (animal.name === 'Mbo’i') {
                    // Mesmo rastejar sinuoso da cobra original, com centro próprio.
                    animal.mesh.position.x = Math.max(-16, Math.min(16, animal.homeX + Math.sin(animal.roamPhase) * 5.5));
                    animal.mesh.position.z = Math.max(-49, Math.min(43, animal.homeZ + Math.cos(animal.roamPhase * 0.63) * 18));
                    animal.mesh.position.y = animal.baseY;
                    for (let j = 0; j < animal.segments.length; j++) {
                        animal.segments[j].position.set(Math.sin(time * 4 - j * 0.4) * 0.35, 0, j * 0.32);
                    }
                } else if (animal.name === 'Nhandu') {
                    // Mesma descida/subida da aranha original; a teia acompanha o corpo.
                    // Ciclo estável: cada cópia também desce da copa até quase o chão.
                    if (animal.spiderPhaseOffset === undefined) animal.spiderPhaseOffset = index * 1.7 + 0.8;
                    const spiderTopY = 12.0;
                    const spiderBottomY = 0.95;
                    const spiderCycle = (Math.sin(time * 0.48 + animal.spiderPhaseOffset) + 1) / 2;
                    const spiderY = spiderBottomY + spiderCycle * (spiderTopY - spiderBottomY);
                    animal.mesh.position.x = animal.homeX + Math.sin(time * 0.32 + animal.spiderPhaseOffset) * 0.8;
                    animal.mesh.position.z = animal.homeZ;
                    animal.mesh.position.y = spiderY;
                    if (animal.web) {
                        animal.web.position.set(animal.mesh.position.x, spiderY / 2, animal.mesh.position.z);
                        animal.web.scale.y = Math.max(0.1, spiderY);
                    }
                    animal.legs.forEach((leg, j) => { leg.rotation.z = Math.sin(time * 6 + j) * 0.2; });
                } else if (animal.name === 'Angudjá') {
                    // Mesmo deslocamento entre pontos do rato original, sem movimento errático.
                    animal.targetTimer += delta;
                    const stops = animal.ratStops;
                    let target = stops[animal.targetIndex];
                    let dx = target.x - animal.mesh.position.x;
                    let dz = target.z - animal.mesh.position.z;
                    if (animal.targetTimer > 2.0 && Math.hypot(dx, dz) < 1.0) {
                        animal.targetTimer = 0;
                        animal.targetIndex = (animal.targetIndex + 1) % stops.length;
                        target = stops[animal.targetIndex];
                        dx = target.x - animal.mesh.position.x;
                        dz = target.z - animal.mesh.position.z;
                    }
                    const step = Math.min(1, delta * 2.8);
                    animal.mesh.position.x += dx * step;
                    animal.mesh.position.z += dz * step;
                    animal.mesh.position.y = animal.baseY;
                    animal.mesh.rotation.y = Math.atan2(dx, dz);
                }

                // A cobra também vira para onde realmente está se deslocando.
                if (animal.name === 'Mbo’i') {
                    const vx = Math.cos(animal.roamPhase) * 5.5;
                    const vz = -Math.sin(animal.roamPhase * 0.63) * 0.63 * 18;
                    animal.mesh.rotation.y = Math.atan2(-vx, -vz);
                }
            });

            // Power-ups flutuam e são coletados ao se aproximar; animais perigosos causam dano com intervalo.
            collectPowerUps(time);
            applyAnimalDamage();
            clouds.forEach(c => { c.mesh.position.x = c.baseX + Math.sin(time*0.035 + c.phase) * 1.4; });

            // Camera Tracking 360 Orbit
            camera.position.x = player.mesh.position.x + Math.sin(cameraAngleYaw) * cameraDistance * Math.cos(cameraAnglePitch);
            camera.position.y = player.mesh.position.y + Math.sin(cameraAnglePitch) * cameraDistance;
            camera.position.z = player.mesh.position.z + Math.cos(cameraAngleYaw) * cameraDistance * Math.cos(cameraAnglePitch);
            camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1.2, player.mesh.position.z);

            // Update Compass HUD Needle
            const needle = document.getElementById('compass-needle');
            if (needle) {
                const deg = (cameraAngleYaw * 180 / Math.PI);
                needle.style.transform = `rotate(${deg}deg)`;
            }

            // Proximity Check for Interactions
            const distAwati = player.mesh.position.distanceTo(awatiGroup.position);
            const distJaguar = player.mesh.position.distanceTo(jaguarGroup.position);
            const interactBtn = document.getElementById('btn-interact');
            const interactLabel = document.getElementById('interact-label');

            if (currentPhase === 1 && distAwati < 4.8) {
                activeInteractiveObject = 'phase1';
                interactBtn.classList.remove('hidden');
                interactLabel.innerText = "Ler Kwatiá (A - AWATI)";
            } else if (currentPhase === 2 && distJaguar < 4.8) {
                activeInteractiveObject = 'phase2';
                interactBtn.classList.remove('hidden');
                interactLabel.innerText = "Ler Kwatiá (DJ - DJAGWARETE)";
            } else {
                activeInteractiveObject = null;
                interactBtn.classList.add('hidden');
            }

            // Mostra a ação sobre o jogador, e não no canto inferior direito onde ficam
            // os botões PULAR e AGACHAR. A posição acompanha a câmera e o personagem.
            if (activeInteractiveObject && !interactBtn.classList.contains('hidden')) {
                const marker = player.mesh.position.clone();
                marker.y += 2.7;
                marker.project(camera);
                const screenX = (marker.x * 0.5 + 0.5) * window.innerWidth;
                const screenY = (-marker.y * 0.5 + 0.5) * window.innerHeight;
                const safeX = Math.max(115, Math.min(window.innerWidth - 115, screenX));
                const safeY = Math.max(54, Math.min(window.innerHeight - 70, screenY));
                interactBtn.style.left = `${safeX}px`;
                interactBtn.style.top = `${safeY}px`;
            }

            renderer.render(scene, camera);
        }

        animate();

        // --- INTERACTION & MODAL HANDLERS ---
        function checkCurrentProximity() {
            if (activeInteractiveObject) openKwatiaModal();
        }

   
function openKwatiaModal() {
    const data = gameData[activeInteractiveObject];

    // Impede erro se os dados da fase não existirem.
    if (!data) {
        console.warn(
            "Dados não encontrados para:",
            activeInteractiveObject
        );
        return;
    }

    const letra = document.getElementById('kwatia-letter');
    const titulo = document.getElementById('kwatia-title');
    const ilustracao = document.getElementById('kwatia-illustration');
    const listContainer = document.getElementById('kwatia-text-list');

    if (!letra || !titulo || !ilustracao || !listContainer) {
        console.error(
            "Não foram encontrados todos os elementos da janela de leitura."
        );
        return;
    }

    // Compatibilidade com os nomes usados nas 20 fases.
    letra.innerText = data.letter ?? data.letra ?? "";
    titulo.innerText = data.title ?? data.titulo ?? "";
    ilustracao.innerText = data.icon ?? data.icone ?? "";

    const linhas = Array.isArray(data.lines)
        ? data.lines
        : Array.isArray(data.linhas)
        ? data.linhas
        : [];

    listContainer.innerHTML = "";

    linhas.forEach(function (linha) {
        const p = document.createElement('p');

        p.className =
            "border-b border-amber-900/15 pb-1 " +
            "text-amber-950 font-serif font-bold";

        p.innerText = String(linha);
        listContainer.appendChild(p);
    });

    openModal('read-modal');
}


        function openQuestionModal() {
            closeModal('read-modal');
            const questions = quizBank[activeInteractiveObject];
            const selectedQ = questions[Math.floor(Math.random() * questions.length)];

            document.getElementById('question-prompt').innerText = selectedQ.question;
            const shuffledOptions = [...selectedQ.options].sort(() => Math.random() - 0.5);

            const optionsBox = document.getElementById('options-container');
            optionsBox.innerHTML = '';
            shuffledOptions.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = "w-full py-3.5 px-4 bg-emerald-900/85 hover:bg-emerald-700 border border-emerald-500/40 text-emerald-100 text-xs rounded-xl font-semibold transition text-left flex justify-between items-center";
                btn.innerHTML = `<span>${opt.text}</span> <i class="fas fa-chevron-right text-emerald-400/50"></i>`;
                btn.onclick = () => answerQuestion(opt.correct);
                optionsBox.appendChild(btn);
            });
            openModal('question-modal');
        }

function answerQuestion(isCorrect) {
    if (!isCorrect) {
        alert("Nhanderu! Resposta incorreta. Releia a Kwatiá e tente novamente.");
        return;
    }

    // FASE 1: mantém a passagem original para o desafio 3D da onça.
    if (currentPhase === 1) {
        alert(
            "✨ AGUYJEVETE! Resposta correta!\n\n" +
            "A passagem pela trilha foi liberada!"
        );

        currentPhase = 2;
        doubleDangerAnimalsForPhase();

        phaseTimeLeft = 90;
        updateSurvivalHUD();

        document.getElementById("phase-indicator").innerText =
            "Fase 2: O Desafio do DJAGWARETE";

        showGameFeedback(
            "Fase 2 liberada! Continue pela trilha e fique atento aos animais."
        );

        closeModal("question-modal");
        return;
    }

    // FASE 2: mantém a etapa 3D existente e inicia os desafios de língua.
    if (currentPhase === 2) {
        currentPhase = 3;
        activeInteractiveObject = "phase3";

        phaseTimeLeft = 90;
        updateSurvivalHUD();

        document.getElementById("phase-indicator").innerText =
            "Fase 3: Y — Água";

        showGameFeedback(
            "Desafio da língua iniciado! Responda às atividades para avançar."
        );

        closeModal("question-modal");

        // Abre imediatamente a próxima atividade, sem depender
        // da aproximação do personagem a um novo objeto 3D.
        openQuestionModal();
        return;
    }

    // FASES 3 A 19: avança pelos desafios de aprendizagem.
    if (currentPhase >= 3 && currentPhase < 20) {
        currentPhase++;

        activeInteractiveObject = "phase" + currentPhase;

        const nomesFases = {
            3: "Y — Água",
            4: "Ywyrá — Árvore",
            5: "Ava — Pessoa",
            6: "Nhanderu — Respeito",
            7: "Cumprimentos",
            8: "Pytyõ — Ajudar",
            9: "Família",
            10: "Animais",
            11: "Plantas e natureza",
            12: "Cores",
            13: "Números",
            14: "Ações e verbos",
            15: "Formação de palavras",
            16: "Escuta e pronúncia",
            17: "Frases",
            18: "Leitura e compreensão",
            19: "Memória da língua",
            20: "Desafio final"
        };

        const nomeFase = nomesFases[currentPhase] || "Desafio da língua";

        document.getElementById("phase-indicator").innerText =
            "Fase " + currentPhase + ": " + nomeFase;

        showGameFeedback(
            "Fase " + currentPhase + " liberada: " + nomeFase + "!"
        );

        closeModal("question-modal");
        openQuestionModal();
        return;
    }

    // FASE 20: conclusão do percurso de aprendizagem.
    if (currentPhase === 20) {
        closeModal("question-modal");

        alert(
            "🎉 AGUYJEVETE!\n\n" +
            "Você concluiu as 20 fases do Tape Marangatu!\n\n" +
            "Você percorreu desafios sobre Awati, Djagwarete, " +
            "natureza, vocabulário, leitura e valorização da língua.\n\n" +
            "Continue aprendendo com os falantes e os conhecimentos " +
            "da sua comunidade!"
        );

        phaseTimeLeft = 90;
        playerHealth = 100;
        updateSurvivalHUD();

        showGameFeedback(
            "Percurso concluído! A língua vive na comunidade."
        );
    }
}
        function openModal(id) { document.getElementById(id).classList.add('flex'); document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.remove('flex'); document.getElementById(id).classList.add('hidden'); }


        // Solicita tela cheia e orientação horizontal em navegadores móveis compatíveis.
        // A orientação é controlada pelo navegador; se não houver suporte, orienta o usuário a girar o aparelho.
        const rotateScreenButton = document.getElementById('rotate-screen-button');
        if (rotateScreenButton) {
            rotateScreenButton.addEventListener('click', async () => {
                try {
                    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                    }
                    if (screen.orientation && screen.orientation.lock) {
                        await screen.orientation.lock('landscape');
                        rotateScreenButton.innerHTML = '<i class="fas fa-mobile-screen-button"></i><span>TELA HORIZONTAL</span><i class="fas fa-check"></i>';
                    } else {
                        alert('Para jogar na horizontal, gire o celular de lado e ative a rotação automática nas configurações do aparelho.');
                    }
                } catch (err) {
                    alert('Este navegador não permite girar a tela automaticamente. Ative a rotação automática do celular e vire o aparelho de lado.');
                }
            });
        }

        // Redimensionamento robusto: usa a caixa real do canvas, não apenas innerWidth/innerHeight.
        // Em celulares, a barra do navegador e a rotação podem atualizar essas medidas em momentos diferentes.
        let resizeFramePending = false;
        function resizeGameViewport() {
            if (resizeFramePending) return;
            resizeFramePending = true;
            requestAnimationFrame(() => {
                resizeFramePending = false;
                const rect = container.getBoundingClientRect();
                const width = Math.max(1, Math.round(rect.width || document.documentElement.clientWidth || window.innerWidth));
                const height = Math.max(1, Math.round(rect.height || document.documentElement.clientHeight || window.innerHeight));
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2));
                renderer.setSize(width, height, false);
                renderer.domElement.style.width = width + 'px';
                renderer.domElement.style.height = height + 'px';
            });
        }
        function settleOrientationResize() {
            // Alguns navegadores reportam o novo tamanho após a animação de rotação.
            [0, 120, 300, 550].forEach(delay => setTimeout(resizeGameViewport, delay));
        }
        window.addEventListener('resize', resizeGameViewport, { passive: true });
        window.addEventListener('orientationchange', settleOrientationResize, { passive: true });
        window.addEventListener('pageshow', settleOrientationResize, { passive: true });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeGameViewport, { passive: true });
        if (screen.orientation && screen.orientation.addEventListener) {
            screen.orientation.addEventListener('change', settleOrientationResize);
        }
        settleOrientationResize();

// Funções chamadas pelos atributos onclick do index.html.
// Mantém o HTML e o JavaScript externo comunicando-se como esperado.
window.beginCharacterSelection = beginCharacterSelection;
window.selectCharacter = selectCharacter;
window.restartCurrentPhase = restartCurrentPhase;
window.checkCurrentProximity = checkCurrentProximity;
window.triggerJump = triggerJump;
window.closeModal = closeModal;
window.openQuestionModal = openQuestionModal;

/* =========================================================
   TAPE MARANGATU 3D — MOTOR DAS 20 FASES
   Cole este bloco no FINAL do arquivo game.js.
   Mantém os cenários e personagens 3D existentes.
========================================================= */

(function () {
    "use strict";

    const fasesTapeMarangatu = [
        {
            titulo: "Awati — O milho",
            tipo: "quiz",
            pergunta: "Qual palavra identifica o milho neste desafio?",
            opcoes: ["Awati", "Mbo'i", "Nhandu"],
            correta: "Awati"
        },
        {
            titulo: "Djagwarete — A onça",
            tipo: "charada",
            pergunta: "Sou um grande felino da floresta. Quem sou eu?",
            opcoes: ["Angudjá", "Djagwarete", "Awati"],
            correta: "Djagwarete"
        },
        {
            titulo: "Ligue a palavra",
            tipo: "ligar",
            pergunta: "Encontre a palavra usada neste jogo para cobra.",
            opcoes: ["Mbo'i", "Nhandu", "Awati"],
            correta: "Mbo'i"
        },
        {
            titulo: "Conhecendo a aranha",
            tipo: "quiz",
            pergunta: "Qual palavra está associada à aranha neste jogo?",
            opcoes: ["Nhandu", "Djagwarete", "Awati"],
            correta: "Nhandu"
        },
        {
            titulo: "Complete a frase",
            tipo: "completar",
            pergunta: "Complete: Awati significa ______ neste desafio.",
            opcoes: ["milho", "cobra", "aranha"],
            correta: "milho"
        },
        {
            titulo: "Caça-palavras",
            tipo: "cacapalavras",
            pergunta: "Localize a palavra que identifica o milho.",
            opcoes: ["AWATI", "MBOI", "NHANDU"],
            correta: "AWATI"
        },
        {
            titulo: "Animais da floresta",
            tipo: "ligar",
            pergunta: "Qual palavra corresponde à onça?",
            opcoes: ["Djagwarete", "Awati", "Nhandu"],
            correta: "Djagwarete"
        },
        {
            titulo: "Cruzadinha",
            tipo: "cruzadinha",
            pergunta: "Digite a palavra usada neste jogo para milho.",
            opcoes: [],
            correta: "awati"
        },
        {
            titulo: "Desafio da cobra",
            tipo: "charada",
            pergunta: "Qual palavra você deve encontrar para continuar a trilha?",
            opcoes: ["Mbo'i", "Awati", "Angudjá"],
            correta: "Mbo'i"
        },
        {
            titulo: "Memória da floresta",
            tipo: "quiz",
            pergunta: "Qual palavra identifica a aranha neste jogo?",
            opcoes: ["Nhandu", "Awati", "Djagwarete"],
            correta: "Nhandu"
        },
        {
            titulo: "Complete a palavra",
            tipo: "completar",
            pergunta: "Complete a palavra: A-W-A-__.",
            opcoes: ["TI", "DU", "BO"],
            correta: "TI"
        },
        {
            titulo: "Desafio dos animais",
            tipo: "ligar",
            pergunta: "Escolha a palavra associada ao rato neste jogo.",
            opcoes: ["Angudjá", "Nhandu", "Mbo'i"],
            correta: "Angudjá"
        },
        {
            titulo: "Caça-palavras da trilha",
            tipo: "cacapalavras",
            pergunta: "Encontre o nome da aranha.",
            opcoes: ["DJAGWARETE", "NHANDU", "AWATI"],
            correta: "NHANDU"
        },
        {
            titulo: "Charada da mata",
            tipo: "charada",
            pergunta: "Qual destes nomes é associado à cobra no jogo?",
            opcoes: ["Mbo'i", "Angudjá", "Awati"],
            correta: "Mbo'i"
        },
        {
            titulo: "Cruzadinha da onça",
            tipo: "cruzadinha",
            pergunta: "Digite o nome usado neste jogo para a onça.",
            opcoes: [],
            correta: "djagwarete"
        },
        {
            titulo: "Complete a frase",
            tipo: "completar",
            pergunta: "Escolha a palavra que completa: A aranha é ______ neste jogo.",
            opcoes: ["Nhandu", "Awati", "Angudjá"],
            correta: "Nhandu"
        },
        {
            titulo: "Desafio de associação",
            tipo: "ligar",
            pergunta: "Qual palavra corresponde ao milho?",
            opcoes: ["Awati", "Mbo'i", "Djagwarete"],
            correta: "Awati"
        },
        {
            titulo: "Caça-palavras final",
            tipo: "cacapalavras",
            pergunta: "Encontre a palavra associada ao rato.",
            opcoes: ["ANGUDJA", "AWATI", "NHANDU"],
            correta: "ANGUDJA"
        },
        {
            titulo: "Charada final",
            tipo: "charada",
            pergunta: "Qual destes nomes está associado à onça?",
            opcoes: ["Djagwarete", "Mbo'i", "Nhandu"],
            correta: "Djagwarete"
        },
        {
            titulo: "Grande desafio — Karumbé",
            tipo: "quiz",
            pergunta: "Qual palavra identifica o milho neste conjunto de desafios?",
            opcoes: ["Awati", "Nhandu", "Mbo'i"],
            correta: "Awati"
        }
    ];

    // Completa os dados das fases sem apagar as configurações existentes.
    fasesTapeMarangatu.forEach(function (fase, indice) {
        const numero = indice + 1;
        const chave = "phase" + numero;

        if (typeof gameData !== "undefined") {
            gameData[chave] = {
                titulo: fase.titulo,
                letra: String(numero),
                icone: "🌿",
                linhas: [
                    fase.titulo,
                    "Desafio " + numero + " de 20",
                    "Responda para avançar na trilha."
                ]
            };
        }

        if (typeof quizBank !== "undefined") {
            quizBank[chave] = [{
                question: fase.pergunta,
                options: fase.opcoes,
                answer: fase.correta
            }];
        }
    });

    let respostaDestaFase = false;
    let faseEmExibicao = 1;

    function normalizarResposta(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, "")
            .trim()
            .toLowerCase();
    }

    function abrirModalDePergunta() {
        faseEmExibicao = currentPhase;
        respostaDestaFase = false;

        const fase = fasesTapeMarangatu[currentPhase - 1];
        const modal = document.getElementById("question-modal");
        const pergunta = document.getElementById("question-prompt");
        const opcoes = document.getElementById("options-container");

        if (!fase || !modal || !pergunta || !opcoes) {
            console.error(
                "Não foi possível abrir a fase. Confira os IDs do index.html:",
                "question-modal, question-prompt e options-container."
            );
            return;
        }

        activeInteractiveObject = "phase" + currentPhase;
        pergunta.textContent =
            "FASE " + currentPhase + " — " + fase.titulo +
            "\n\n" + fase.pergunta;

        opcoes.innerHTML = "";

        // A cruzadinha usa resposta digitada.
        if (fase.tipo === "cruzadinha") {
            const campo = document.createElement("input");
            campo.type = "text";
            campo.id = "resposta-fase";
            campo.placeholder = "Digite sua resposta";
            campo.autocomplete = "off";
            campo.style.cssText =
                "width:100%;padding:14px;margin:10px 0;" +
                "font-size:18px;border-radius:10px;";

            const enviar = document.createElement("button");
            enviar.type = "button";
            enviar.textContent = "Conferir resposta";
            enviar.style.cssText =
                "padding:12px 18px;margin:6px;border-radius:10px;" +
                "cursor:pointer;font-size:16px;";

            enviar.onclick = function () {
                const digitada = document.getElementById("resposta-fase").value;
                conferirResposta(digitada, fase.correta);
            };

            campo.addEventListener("keydown", function (evento) {
                if (evento.key === "Enter") enviar.click();
            });

            opcoes.appendChild(campo);
            opcoes.appendChild(enviar);
        } else {
            // Perguntas, charadas, associação, completar e caça-palavras.
            const instrucoes = document.createElement("p");
            instrucoes.textContent =
                fase.tipo === "ligar"
                    ? "🔗 DESAFIO DE ASSOCIAÇÃO: escolha a palavra correspondente."
                    : fase.tipo === "cacapalavras"
                    ? "🔎 CAÇA-PALAVRAS: encontre e selecione a palavra correta."
                    : fase.tipo === "completar"
                    ? "✏️ COMPLETE: escolha a opção que completa o desafio."
                    : fase.tipo === "charada"
                    ? "🧩 CHARADA: descubra a resposta."
                    : "🌿 Escolha a resposta correta.";
            instrucoes.style.cssText = "margin:8px 0 14px;font-weight:bold;";
            opcoes.appendChild(instrucoes);

            fase.opcoes.forEach(function (opcao) {
                const botao = document.createElement("button");
                botao.type = "button";
                botao.textContent = opcao;
                botao.style.cssText =
                    "display:block;width:100%;padding:13px;margin:8px 0;" +
                    "border:0;border-radius:10px;cursor:pointer;" +
                    "font-size:17px;";

                botao.onclick = function () {
                    conferirResposta(opcao, fase.correta);
                };

                opcoes.appendChild(botao);
            });
        }

        modal.style.display = "flex";
        modal.style.visibility = "visible";
        modal.style.opacity = "1";

        const indicador = document.getElementById("phase-indicator");
        if (indicador) {
            indicador.textContent =
                "Fase " + currentPhase + " / 20 — " + fase.titulo;
        }
    }

    function conferirResposta(resposta, correta) {
        if (respostaDestaFase || faseEmExibicao !== currentPhase) return;

        if (normalizarResposta(resposta) !== normalizarResposta(correta)) {
            alert("Ndaipóri! Tente novamente. 🌿");
            return;
        }

        respostaDestaFase = true;
        window.answerQuestion(true);
    }

    function responderFase(isCorrect) {
        if (!isCorrect) {
            alert("Tente novamente para continuar a trilha!");
            return;
        }

        if (currentPhase !== faseEmExibicao) return;

       
        // Ao concluir a fase 1, multiplica os animais perigosos.
        if (
            currentPhase === 1 &&
            typeof doubleDangerAnimalsForPhase === "function"
        ) {
            doubleDangerAnimalsForPhase();
        }

        // Se a fase 20 foi respondida, encerra a trilha.
        if (currentPhase >= 20) {
            if (typeof closeModal === "function") {
                closeModal("question-modal");
            } else {
                const modal = document.getElementById("question-modal");
                if (modal) modal.style.display = "none";
            }

            alert(
                "🎉 AGUYJEVETE!\n\n" +
                "Você concluiu as 20 fases do Tape Marangatu 3D!\n\n" +
                "Parabéns por aprender e valorizar a língua Guarani Nhandewa."
            );

            isGameOver = false;
            gameStarted = false;
            currentPhase = 1;
            playerHealth = 100;
            phaseTimeLeft = 90;
            collectedPowerUps = 0;
            respostaDestaFase = false;
            faseEmExibicao = 1;

            const indicador = document.getElementById("phase-indicator");
            if (indicador) indicador.textContent = "Fase 1 / 20";

            if (typeof updateSurvivalHUD === "function") {
                updateSurvivalHUD();
            }

            const inicio = document.getElementById("start-screen");
            if (inicio) inicio.classList.remove("hidden");

            const cabecalho = document.getElementById("game-header");
            if (cabecalho) cabecalho.classList.add("hidden");

            const controles = document.getElementById("touch-controls");
            if (controles) controles.classList.add("hidden");

            const hud = document.getElementById("survival-hud");
            if (hud) hud.classList.add("hidden");

            return;
        }

        // Avança para a próxima fase.
        currentPhase++;
        activeInteractiveObject = "phase" + currentPhase;
        respostaDestaFase = false;

        if (typeof phaseTimeLeft !== "undefined") {
            phaseTimeLeft = 90;
        }

        if (typeof updateSurvivalHUD === "function") {
            updateSurvivalHUD();
        }

        abrirModalDePergunta();
    }

    // Substitui as funções globais utilizadas pelos botões do jogo.
    window.openQuestionModal = abrirModalDePergunta;
    window.answerQuestion = responderFase;

    // Também disponibiliza uma função de teste para abrir a fase atual.
    window.abrirFaseTapeMarangatu = abrirModalDePergunta;

    console.log(
        "Tape Marangatu 3D: motor de 20 fases carregado.",
        fasesTapeMarangatu
    );
})();

