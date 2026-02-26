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
    document.querySelectorAll('.piece').forEach(p => p.remove());
    pieces = [];
    targetGrid = Array(5).fill().map(() => Array(5).fill(null));

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'target-cell';
            targetsContainer.appendChild(cell);
        }
    }

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

        document.body.appendChild(el);
        const pieceObj = { el, matrix, colorIdx, row: -1, col: -1 };
        pieces.push(pieceObj);
        setupDrag(pieceObj);
    });

    setTimeout(scatterPieces, 50); 
}

function scatterPieces() {
    const isMobile = window.innerWidth < 768;
    pieces.forEach(p => {
        if (p.row !== -1) return;
        let startX, startY;
        if (isMobile) {
            startX = Math.random() * (window.innerWidth - 120) + 10;
            startY = (window.innerHeight * 0.55) + Math.random() * (window.innerHeight * 0.35);
        } else {
            startX = (window.innerWidth * 0.55) + Math.random() * (window.innerWidth * 0.35);
            startY = Math.random() * (window.innerHeight - 150) + 20;
        }
        p.el.style.left = startX + 'px';
        p.el.style.top = startY + 'px';
    });
}

function setupDrag(p) {
    // タップした位置とブロックの左上とのズレを記憶する変数
    let dragOffsetX, dragOffsetY;

    p.el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        
        // ここでの位置変更は行わない！（ワープの原因）

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

        // 【重要】タップした点と、ブロックの現在の左上位置との差分を計算
        const rect = p.el.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        // ここではまだスマホ用の補正は加えない！
    });

    window.addEventListener('pointermove', (e) => {
        if (!p.el.classList.contains('dragging')) return;

        // 現在のマウス位置から、記憶しておいた差分を引くことで、
        // ブロックの左上があるべき位置を計算する
        let newLeft = e.clientX - dragOffsetX;
        let newTop = e.clientY - dragOffsetY;

        // 【重要】スマホで指に隠れない補正は、移動中のみ適用する
        if (window.innerWidth < 768) {
            newTop -= 60; 
        }

        p.el.style.left = newLeft + 'px';
        p.el.style.top = newTop + 'px';
    });

    window.addEventListener('pointerup', (e) => {
        if (!p.el.classList.contains('dragging')) return;
        p.el.classList.remove('dragging');

        const targetsRect = document.getElementById('targets').getBoundingClientRect();
        const pieceRect = p.el.getBoundingClientRect();
        
        const cellSize = targetsRect.width / 5;
        // 判定基準をピースの「中心」にする
        const pieceCenterX = pieceRect.left + pieceRect.width / 2;
        const pieceCenterY = pieceRect.top + pieceRect.height / 2;

        const relativeX = pieceCenterX - targetsRect.left;
        const relativeY = pieceCenterY - targetsRect.top;
        
        // 中心がどのマスに近いかで判定
        let targetCol = Math.floor(relativeX / cellSize);
        let targetRow = Math.floor(relativeY / cellSize);

        // ピースの形状に合わせて左上の基準マスを調整
        // (例: 2x2のピースなら、中心から左上に1マス分ずらした所を基準にする)
        targetCol -= Math.floor((p.matrix[0].length - 1) / 2);
        targetRow -= Math.floor((p.matrix.length - 1) / 2);

        let canSnap = true;
        
        // 1. 枠内チェック
        if (targetCol < 0 || targetRow < 0 || 
            targetCol + p.matrix[0].length > 5 || 
            targetRow + p.matrix.length > 5) {
            canSnap = false;
        }

        // 2. 重なりチェック
        if (canSnap) {
            for (let r = 0; r < p.matrix.length; r++) {
                for (let c = 0; c < p.matrix[r].length; c++) {
                    if (p.matrix[r][c] === 1) {
                        // ターゲット座標が配列の範囲外じゃないか確認
                        if (targetGrid[targetRow + r] && targetGrid[targetRow + r][targetCol + c] !== null) {
                            canSnap = false; 
                        }
                    }
                }
            }
        }

        if (canSnap) {
            // スナップ成功
            p.row = targetRow;
            p.col = targetCol;
            p.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val === 1) targetGrid[targetRow + r][targetCol + c] = p;
                });
            });
            // CSSのtransitionが効いて、ピタッと吸い付くアニメーションになる
            p.el.style.left = (targetsRect.left + targetCol * cellSize) + 'px';
            p.el.style.top = (targetsRect.top + targetRow * cellSize) + 'px';
            playSnap();
            checkClear();
        } else {
            // スナップ失敗時の処理（今はそのままの位置に残る）
            // 必要なら初期位置に戻す処理などをここに追加
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
    scatterPieces();
});