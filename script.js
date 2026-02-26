const colors = ["#FFFFFF", "#00E676", "#FF1744", "#FF9100", "#FFEA00", "#2979FF", "#D500F9"];

const shapeDefs = [
    [[1,1,1,1,1]],                
    [[1,1],[1,1]],                
    [[1,1],[1,0]],                
    [[0,1],[1,1],[1,0]],          
    [[1,1,1],[0,0,1]],            
    [[0,1],[1,1]],                
    [[1,1]]                       
];

let pieces = [];
let targetGrid = []; 

const snapSound = new Audio('snap.mp3');
function playSnap() {
    const clone = snapSound.cloneNode();
    clone.play().catch(e => console.log("Audio Error:", e));
}

window.onload = () => {
    initGame();
    document.body.addEventListener('pointerdown', () => {
        snapSound.play().then(() => { snapSound.pause(); snapSound.currentTime = 0; });
    }, { once: true });
};

function initGame() {
    const targetsContainer = document.getElementById('targets');
    targetsContainer.innerHTML = '';
    
    // 既存のピースをすべて削除（リトライ用）
    document.querySelectorAll('.piece').forEach(p => p.remove());
    pieces = [];
    targetGrid = Array(5).fill().map(() => Array(5).fill(null));

    // 1. 5x5のターゲットマスを生成
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'target-cell';
            targetsContainer.appendChild(cell);
        }
    }

    // 2. ピースを生成してBodyに追加（座標ズレを防ぐため）
    shapeDefs.forEach((matrix, index) => {
        const el = document.createElement('div');
        el.className = 'piece';
        el.style.gridTemplateColumns = `repeat(${matrix[0].length}, var(--cell-size))`;

        let colorIdx = index % colors.length;
        el.dataset.colorIdx = colorIdx;

        matrix.forEach(row => {
            row.forEach(val => {
                const cell = document.createElement('div');
                cell.className = val === 1 ? 'piece-cell solid' : 'piece-cell empty';
                if (val === 1) cell.style.backgroundColor = colors[colorIdx];
                el.appendChild(cell);
            });
        });

        // blockAreaではなくbodyに直接追加する
        document.body.appendChild(el);

        const pieceObj = { el, matrix, colorIdx, row: -1, col: -1 };
        pieces.push(pieceObj);
        setupDrag(pieceObj);
    });

    // 描画が終わってから配置を計算
    setTimeout(scatterPieces, 50); 
}

function scatterPieces() {
    const isMobile = window.innerWidth < 768;
    
    pieces.forEach(p => {
        // 配置済みのものは動かさない
        if (p.row !== -1) return;

        let startX, startY;
        
        if (isMobile) {
            // スマホ：画面の下半分（55%以降）に配置
            startX = Math.random() * (window.innerWidth - 120) + 10;
            startY = (window.innerHeight * 0.55) + Math.random() * (window.innerHeight * 0.35);
        } else {
            // PC：画面の右側に配置
            startX = (window.innerWidth * 0.55) + Math.random() * (window.innerWidth * 0.35);
            startY = Math.random() * (window.innerHeight - 150) + 20;
        }

        p.el.style.left = startX + 'px';
        p.el.style.top = startY + 'px';
    });
}

function setupDrag(p) {
    let offsetX, offsetY;

    p.el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        
        p.colorIdx = (p.colorIdx + 1) % colors.length;
        p.el.querySelectorAll('.solid').forEach(c => c.style.backgroundColor = colors[p.colorIdx]);
        playSnap();

        if (p.row !== -1) {
            p.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val === 1) targetGrid[p.row + r][p.col + c] = null;
                });
            });
            p.row = -1; p.col = -1;
        }

        pieces.forEach(blk => blk.el.style.zIndex = 10);
        p.el.style.zIndex = 100;
        p.el.classList.add('dragging');

        const rect = p.el.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // スマホで指に隠れないように上にずらす
        if (window.innerWidth < 768) offsetY += 60; 
    });

    window.addEventListener('pointermove', (e) => {
        if (!p.el.classList.contains('dragging')) return;
        p.el.style.left = (e.clientX - offsetX) + 'px';
        p.el.style.top = (e.clientY - offsetY) + 'px';
    });

    window.addEventListener('pointerup', (e) => {
        if (!p.el.classList.contains('dragging')) return;
        p.el.classList.remove('dragging');

        const targetsRect = document.getElementById('targets').getBoundingClientRect();
        const pieceRect = p.el.getBoundingClientRect();
        
        const cellSize = targetsRect.width / 5;
        const relativeX = pieceRect.left - targetsRect.left;
        const relativeY = pieceRect.top - targetsRect.top;
        
        const targetCol = Math.round(relativeX / cellSize);
        const targetRow = Math.round(relativeY / cellSize);

        let canSnap = true;
        
        if (targetCol < 0 || targetRow < 0 || 
            targetCol + p.matrix[0].length > 5 || 
            targetRow + p.matrix.length > 5) {
            canSnap = false;
        }

        if (canSnap) {
            for (let r = 0; r < p.matrix.length; r++) {
                for (let c = 0; c < p.matrix[r].length; c++) {
                    if (p.matrix[r][c] === 1) {
                        if (targetGrid[targetRow + r][targetCol + c] !== null) {
                            canSnap = false; 
                        }
                    }
                }
            }
        }

        if (canSnap) {
            p.row = targetRow;
            p.col = targetCol;
            
            p.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val === 1) targetGrid[targetRow + r][targetCol + c] = p;
                });
            });

            p.el.style.left = (targetsRect.left + targetCol * cellSize) + 'px';
            p.el.style.top = (targetsRect.top + targetRow * cellSize) + 'px';
            
            playSnap();
            checkClear();
        }
    });
}

function checkClear() {
    const isClear = targetGrid.every(row => row.every(cell => cell !== null));
    if (isClear) {
        setTimeout(() => {
            document.getElementById('clear-screen').classList.add('show');
        }, 300);
    }
}

document.getElementById('clear-screen').addEventListener('pointerdown', () => {
    document.getElementById('clear-screen').classList.remove('show');
    initGame();
});

window.addEventListener('resize', () => {
    const targetsRect = document.getElementById('targets').getBoundingClientRect();
    const cellSize = targetsRect.width / 5;
    
    pieces.forEach(p => {
        if (p.row !== -1) {
            p.el.style.left = (targetsRect.left + p.col * cellSize) + 'px';
            p.el.style.top = (targetsRect.top + p.row * cellSize) + 'px';
        }
    });
    // はまっていないピースを再配置
    scatterPieces();
});