let blocks = []; 
let targets = []; 
let size;    
let snapSound;
let gameClear = false;
let isMobile = false;

const cubeColors = ["#FFFFFF", "#00E676", "#FF1744", "#FF9100", "#FFEA00", "#2979FF"];

function preload() {
    soundFormats('mp3', 'ogg');
    // ユーザーのファイルを読み込み
    snapSound = loadSound('snap.mp3'); 
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    checkDevice();
    initGame();
}

function checkDevice() {
    isMobile = windowWidth < 600;
}

function initGame() {
    blocks = [];
    targets = [];
    gameClear = false;
    
    let startX, startY;

    if (isMobile) {
        // スマホ用：縦長レイアウト（上にブロック、下に3x3枠）
        size = min(width, height) * 0.22;
        startX = width / 2 - (size * 1.1);
        startY = height * 0.6 - (size * 1.1);
    } else {
        // PC用：横長レイアウト（左にブロック、右に3x3枠）
        size = min(width, height) * 0.15;
        startX = width * 0.65 - (size * 1.1);
        startY = height / 2 - (size * 1.1);
    }

    // 枠（ターゲット）の生成
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            targets.push({
                x: startX + i * (size + 15),
                y: startY + j * (size + 15),
                occupied: false
            });
        }
    }

    // ブロックの生成
    for (let i = 0; i < 9; i++) {
        let bx, by;
        if (isMobile) {
            bx = random(20, width - size - 20);
            by = random(size, height * 0.3);
        } else {
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
        stroke(255, 30);
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
            b.pulse *= 0.8;
        } else {
            noStroke();
            if (b.isDragging) {
                fill(255, 30); // 影
                rect(b.x + 8, b.y + 8, drawSize, drawSize, 15);
                fill(cubeColors[b.colorIdx]);
            }
        }
        rect(b.x - b.pulse/2, b.y - b.pulse/2, drawSize, drawSize, 15);
    }

    // クリア演出
    if (gameClear) {
        fill(0, 180);
        rect(0, 0, width, height);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(isMobile ? 40 : 60);
        text("COMPLETE! ✨", width/2, height/2);
        textSize(20);
        text("Click to Restart", width/2, height/2 + 60);
    }
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
            
            // 色替えと音
            b.colorIdx = (b.colorIdx + 1) % cubeColors.length;
            if (snapSound.isLoaded()) {
                snapSound.currentTime = 0;
                snapSound.play();
            }

            b.isDragging = true;
            b.pulse = 20;
            blocks.push(blocks.splice(i, 1)[0]);
            break; 
        }
    }
}

function mouseDragged() {
    for (let b of blocks) {
        if (b.isDragging) {
            b.x = mouseX - b.w / 2;
            // スマホ時は指で見えるよう少し上にずらす
            b.y = isMobile ? mouseY - b.h * 1.2 : mouseY - b.h / 2;
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