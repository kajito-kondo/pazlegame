let blocks = []; 
let targets = []; 
let size;    
let snapSound;
let gameClear = false;
let isMobile = false;

const cubeColors = ["#FFFFFF", "#00E676", "#FF1744", "#FF9100", "#FFEA00", "#2979FF"];

function preload() {
    soundFormats('mp3', 'ogg');
    snapSound = loadSound('snap.mp3'); 
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    checkDevice();
    initGame();
}

function checkDevice() {
    // 画面の横幅が768px未満、または「縦長画面（高さ＞幅）」の場合はスマホ版と判定する
    isMobile = (windowWidth < 768) || (windowHeight > windowWidth);
}

function initGame() {
    blocks = [];
    targets = [];
    gameClear = false;
    
    let targetStartX, targetStartY;

    if (isMobile) {
        // ==========================================
        // 【スマホ版：確実なレイアウト】
        // ==========================================
        size = min(width, height) * 0.22;
        
        // 枠（ターゲット）全体の幅と高さを計算
        let gridOffset = (size * 1.5) + 15; 
        
        // 1. 枠を画面の「中央より上（高さ30%の位置）」に配置
        targetStartX = width / 2 - gridOffset;
        targetStartY = height * 0.3 - gridOffset; 
    } else {
        // ==========================================
        // 【PC版：横長レイアウト】
        // ==========================================
        size = min(width, height) * 0.15;
        let gridOffset = (size * 1.5) + 15; 
        targetStartX = width * 0.65 - gridOffset;
        targetStartY = height / 2 - gridOffset;
    }

    // 枠（ターゲット）の生成
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            targets.push({
                x: targetStartX + i * (size + 15),
                y: targetStartY + j * (size + 15),
                occupied: false
            });
        }
    }

    // ブロックの生成
    for (let i = 0; i < 9; i++) {
        let bx, by;
        if (isMobile) {
            // 2. スマホ版：ブロックを「画面の下35%のエリア」に確実に固める
            let safeBottomStart = height * 0.65; // 下から35%の位置からスタート
            bx = random(20, width - size - 20);
            by = random(safeBottomStart, height - size - 20); 
        } else {
            // PC版：ブロックを画面の左側に配置
            bx = random(50, width * 0.3);
            by = random(size, height - size - 50);
        }

        blocks.push({
            x: bx,
            y: by,
            w: size,
            h: size,
            isDragging: false,
            currentSnap: null,
            colorIdx: floor(random(cubeColors.length)),
            pulse: 0
        });
    }
}

function draw() {
    background(15, 20, 30);

    // 枠の描画
    for (let t of targets) {
        noFill();
        stroke(255, 40);
        strokeWeight(2);
        rect(t.x, t.y, size, size, 15);
    }

    // ブロックの描画
    for (let b of blocks) {
        let drawSize = b.w + b.pulse;
        fill(cubeColors[b.colorIdx]);
        
        if (b.currentSnap) {
            stroke(255);
            strokeWeight(4);
            b.pulse *= 0.8; // はまった時のポヨヨン演出
        } else {
            noStroke();
            if (b.isDragging) {
                // ドラッグ中の影
                fill(255, 30);
                rect(b.x + 8, b.y + 8, drawSize, drawSize, 15);
                fill(cubeColors[b.colorIdx]);
            }
        }
        rect(b.x - b.pulse/2, b.y - b.pulse/2, drawSize, drawSize, 15);
    }

    if (gameClear) {
        drawClearUI();
    }
}

function drawClearUI() {
    fill(0, 200);
    rect(0, 0, width, height);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(isMobile ? 40 : 60);
    text("COMPLETE! ✨", width/2, height/2);
    textSize(18);
    text("タップでリトライ", width/2, height/2 + 60);
}

function mousePressed() {
    if (getAudioContext().state !== 'running') userStartAudio();
    if (gameClear) { initGame(); return; }

    for (let i = blocks.length - 1; i >= 0; i--) {
        let b = blocks[i];
        if (mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h) {
            if (b.currentSnap) {
                b.currentSnap.occupied = false;
                b.currentSnap = null;
            }
            
            b.colorIdx = (b.colorIdx + 1) % cubeColors.length;
            if (snapSound && snapSound.isLoaded()) {
                snapSound.currentTime = 0;
                snapSound.play();
            }

            b.isDragging = true;
            b.pulse = 20; // クリック時に少し大きくする
            blocks.push(blocks.splice(i, 1)[0]);
            break; 
        }
    }
}

function mouseDragged() {
    for (let b of blocks) {
        if (b.isDragging) {
            b.x = mouseX - b.w / 2;
            // スマホ時は、指に隠れないようにブロックを指の「上」に表示する
            b.y = isMobile ? mouseY - b.h * 1.5 : mouseY - b.h / 2;
        }
    }
}

function mouseReleased() {
    for (let b of blocks) {
        if (b.isDragging) {
            b.isDragging = false;
            let closest = null;
            let minDist = size * 0.7;

            for (let t of targets) {
                if (!t.occupied) {
                    let d = dist(b.x + b.w/2, b.y + b.h/2, t.x + size/2, t.y + size/2);
                    if (d < minDist) {
                        minDist = d;
                        closest = t;
                    }
                }
            }

            if (closest) {
                b.x = closest.x;
                b.y = closest.y;
                b.currentSnap = closest;
                closest.occupied = true;
                b.pulse = 15;
                if (snapSound.isLoaded()) snapSound.play();
                checkClear();
            }
        }
    }
}

function checkClear() {
    gameClear = blocks.every(b => b.currentSnap !== null);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    checkDevice();
    initGame();
}