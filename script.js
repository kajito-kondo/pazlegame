const colors = ["#FFFFFF", "#00E676", "#FF1744", "#FF9100", "#FFEA00", "#2979FF", "#D500F9"];

// 絶対に5x5にピッタリはまるように計算された7つの形（1=ブロック、0=空白）
const shapeDefs = [
    [[1,1,1,1,1]],                // 5マス棒
    [[1,1],[1,1]],                // 四角
    [[1,1],[1,0]],                // 小さいL字
    [[0,1],[1,1],[1,0]],          // Z字
    [[1,1,1],[0,0,1]],            // 長いL字
    [[0,1],[1,1]],                // ミニL字
    [[1,1]]                       // 2マス棒
];

let pieces = [];
let targetGrid = []; // 5x5のマス目管理配列

const snapSound = new Audio('snap.mp3');
function playSnap() {
    const clone = snapSound.cloneNode();
    clone.play().catch(e => console.log("Audio Error:", e));
}

window.onload = () => {
    initGame();
    // 最初のタップでオーディオ許可
    document.body.addEventListener('pointerdown', () => {
        snapSound.play().then(() => { snapSound.pause(); snapSound.currentTime = 0; });
    }, { once: true });
};

function initGame() {
    const targetsContainer = document.getElementById('targets');
    const blockArea = document.getElementById('block-area');
    targetsContainer.innerHTML = '';
    blockArea.innerHTML = '';
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

    // 2. ピースを生成
    shapeDefs.forEach((matrix, index) => {
        const el = document.createElement('div');
        el.className = 'piece';
        // 形に合わせて列数を設定
        el.style.gridTemplateColumns = `repeat(${matrix[0].length}, var(--cell-size))`;

        let colorIdx = index % colors.length;
        el.dataset.colorIdx = colorIdx;

        // ブロックの形を組み立てる
        matrix.forEach(row => {
            row.forEach(val => {
                const cell = document.createElement('div');
                cell.className = val === 1 ? 'piece-cell solid' : 'piece-cell empty';
                if (val === 1) cell.style.backgroundColor = colors[colorIdx];
                el.appendChild(cell);
            });
        });

        blockArea.appendChild(el);

        const pieceObj = { el, matrix, colorIdx, row: -1, col: -1 };
        pieces.push(pieceObj);
        setupDrag(pieceObj);
    });

    scatterPieces(); // 初期配置をバラバラにする
}

function scatterPieces() {
    const blockArea = document.getElementById('block-area');
    const rect = blockArea.getBoundingClientRect();
    
    pieces.forEach(p => {
        p.el.style.left = (Math.random() * (rect.width - 150)) + 20 + 'px';
        p.el.style.top = (Math.random() * (rect.height - 150)) + 20 + 'px';
    });
}

function setupDrag(p) {
    let offsetX, offsetY;

    p.el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        
        // 色変更ギミック
        p.colorIdx = (p.colorIdx + 1) % colors.length;
        p.el.querySelectorAll('.solid').forEach(c => c.style.backgroundColor = colors[p.colorIdx]);
        playSnap();

        // 盤面から剥がす（グリッドの登録を解除）
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
        if (window.innerWidth < 768) offsetY += 60; // スマホでの指隠れ防止
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
        
        // グリッドの1マスのサイズ＋隙間
        const cellSize = targetsRect.width / 5;

        // ピースの左上が、ターゲットのどのマスに近いか計算
        const relativeX = pieceRect.left - targetsRect.left;
        const relativeY = pieceRect.top - targetsRect.top;
        const targetCol = Math.round(relativeX / cellSize);
        const targetRow = Math.round(relativeY / cellSize);

        // はまるかどうかの判定
        let canSnap = true;
        
        // 1. 枠からはみ出さないかチェック
        if (targetCol < 0 || targetRow < 0 || 
            targetCol + p.matrix[0].length > 5 || 
            targetRow + p.matrix.length > 5) {
            canSnap = false;
        }

        // 2. 他のブロックと重ならないかチェック
        if (canSnap) {
            for (let r = 0; r < p.matrix.length; r++) {
                for (let c = 0; c < p.matrix[r].length; c++) {
                    if (p.matrix[r][c] === 1) {
                        if (targetGrid[targetRow + r][targetCol + c] !== null) {
                            canSnap = false; // すでに誰かいる
                        }
                    }
                }
            }
        }

        if (canSnap) {
            // スナップ成功！
            p.row = targetRow;
            p.col = targetCol;
            
            // 盤面に登録
            p.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val === 1) targetGrid[targetRow + r][targetCol + c] = p;
                });
            });

            // 位置をピッタリ合わせる
            p.el.style.left = (targetsRect.left + targetCol * cellSize) + 'px';
            p.el.style.top = (targetsRect.top + targetRow * cellSize) + 'px';
            
            playSnap();
            checkClear();
        }
    });
}

function checkClear() {
    // 25マスすべてが埋まっているか確認
    const isClear = targetGrid.every(row => row.every(cell => cell !== null));
    if (isClear) {
        setTimeout(() => {
            document.getElementById('clear-screen').classList.add('show');
        }, 300);
    }
}

// クリア画面タップでリセット
document.getElementById('clear-screen').addEventListener('pointerdown', () => {
    document.getElementById('clear-screen').classList.remove('show');
    initGame();
});

// 画面リサイズ対応
window.addEventListener('resize', () => {
    // スナップ済みのピースの位置を再計算
    const targetsRect = document.getElementById('targets').getBoundingClientRect();
    const cellSize = targetsRect.width / 5;
    pieces.forEach(p => {
        if (p.row !== -1) {
            p.el.style.left = (targetsRect.left + p.col * cellSize) + 'px';
            p.el.style.top = (targetsRect.top + p.row * cellSize) + 'px';
        }
    });
});