let blocks = []; 
let targets = []; 
let size = 80;    
let snapSound;
let gameClear = false;

const cubeColors = ["#FFFFFF", "#009B48", "#B71234", "#FF5800", "#FFD500", "#0046AD"];

function preload() {
    soundFormats('mp3', 'ogg');
    snapSound = loadSound('snap.mp3');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    initGame();
}

function initGame() {
    blocks = [];
    targets = [];
    gameClear = false;
    
    let startX = width / 2 - (size * 1.1);
    let startY = height / 2 - (size * 1.1);

    // 枠（ターゲット）を生成
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            targets.push({
                x: startX + i * (size + 10),
                y: startY + j * (size + 10),
                occupied: false // 誰かがはまっているかどうかのフラグ
            });
        }
    }

    // ブロックを生成
    for (let i = 0; i < 9; i++) {
        blocks.push({
            x: random(20, width - size - 20),
            y: random(50, 150),
            isDragging: false,
            currentSnap: null, // 現在どの枠にはまっているか
            colorIdx: floor(random(cubeColors.length))
        });
    }
}

function draw() {
    background(34, 34, 34);

    // 枠の描画
    for (let t of targets) {
        noFill();
        stroke(255, 50);
        strokeWeight(2);
        rect(t.x, t.y, size, size, 10);
    }

    // ブロックの描画
    for (let b of blocks) {
        fill(cubeColors[b.colorIdx]);
        if (b.currentSnap) {
            stroke(255);
            strokeWeight(4);
        } else {
            stroke(200);
            strokeWeight(1);
        }
        rect(b.x, b.y, size, size, 10);
    }

    if (gameClear) {
        fill(255);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("COMPLETE! 🌈", width / 2, height - 80);
    }
}

function mousePressed() {
    if (getAudioContext().state !== 'running') userStartAudio();
    if (gameClear) { initGame(); return; }

    for (let i = blocks.length - 1; i >= 0; i--) {
        let b = blocks[i];
        if (mouseX > b.x && mouseX < b.x + size && mouseY > b.y && mouseY < b.y + size) {
            // はまっていた枠を解放する
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
            blocks.push(blocks.splice(i, 1)[0]);
            break; 
        }
    }
}

function mouseDragged() {
    for (let b of blocks) {
        if (b.isDragging) {
            b.x = mouseX - size / 2;
            b.y = mouseY - size / 2;
        }
    }
}

function mouseReleased() {
    for (let b of blocks) {
        if (b.isDragging) {
            b.isDragging = false;
            
            // 手を離したとき、一番近い「空いている枠」を探す
            let closest = null;
            let minDist = 40; // 吸い付く距離の閾値

            for (let t of targets) {
                if (!t.occupied) {
                    let d = dist(b.x, b.y, t.x, t.y);
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
                if (snapSound.isLoaded()) snapSound.play();
                checkClear();
            }
        }
    }
}

function checkClear() {
    gameClear = blocks.every(b => b.currentSnap !== null);
}