const colors = ["#FFFFFF", "#00E676", "#FF1744", "#FF9100", "#FFEA00", "#2979FF"];
let blocksData = []; // ブロックの情報を管理する配列

// p5.jsを使わず標準のAudioを使う（遅延ゼロで重ならないようにクローンを使う）
const snapSound = new Audio('snap.mp3');
function playSnap() {
    // 連続タップでも音が重なって鳴るASMR仕様
    const clone = snapSound.cloneNode();
    clone.play().catch(e => console.log("音の再生に失敗:", e));
}

// 起動時のセットアップ
window.onload = () => {
    const targetsContainer = document.getElementById('targets');
    const stocksContainer = document.getElementById('stocks');

    // HTMLに枠とブロックを9個ずつ自動生成
    for (let i = 0; i < 9; i++) {
        // 1. ターゲット枠の生成
        const target = document.createElement('div');
        target.className = 'target-cell';
        targetsContainer.appendChild(target);

        // 2. ストック枠（見えない初期位置）の生成
        const stock = document.createElement('div');
        stock.className = 'stock-cell';
        stocksContainer.appendChild(stock);

        // 3. 実際に動かすブロックの生成
        const block = document.createElement('div');
        block.className = 'block';
        let colorIdx = Math.floor(Math.random() * colors.length);
        block.dataset.colorIdx = colorIdx;
        block.style.backgroundColor = colors[colorIdx];
        document.body.appendChild(block);

        blocksData.push({
            el: block,
            stockCell: stock,   // 最初の家
            currentCell: stock  // 今いる場所
        });

        setupDrag(blocksData[i]);
    }

    updatePositions();
    
    // 最初のタップでオーディオを許可
    document.body.addEventListener('pointerdown', () => {
        snapSound.play().then(() => { snapSound.pause(); snapSound.currentTime = 0; });
    }, { once: true });
};

// 画面サイズが変わったら、ブロックの位置をCSSに合わせて再計算する
window.addEventListener('resize', updatePositions);

function updatePositions() {
    blocksData.forEach(b => {
        // 現在所属しているセル（CSSが配置した枠）の座標を取得して、ブロックをそこへ移動
        const rect = b.currentCell.getBoundingClientRect();
        b.el.style.left = rect.left + 'px';
        b.el.style.top = rect.top + 'px';
    });
}

function setupDrag(b) {
    let offsetX, offsetY;

    // タッチ・クリックした時
    b.el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        
        // 音と色変え
        playSnap();
        b.el.dataset.colorIdx = (parseInt(b.el.dataset.colorIdx) + 1) % colors.length;
        b.el.style.backgroundColor = colors[b.el.dataset.colorIdx];

        // 掴んだブロックを一番手前に
        blocksData.forEach(blk => blk.el.style.zIndex = 10);
        b.el.style.zIndex = 100;

        b.el.classList.add('dragging');
        b.el.classList.remove('snapped');

        // 指のズレを計算
        const rect = b.el.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        // ドラッグ中は、スマホで指に隠れないように少し上にずらす
        if (window.innerWidth < 768) offsetY += 40; 
    });

    // 動かしている時
    window.addEventListener('pointermove', (e) => {
        if (!b.el.classList.contains('dragging')) return;
        b.el.style.left = (e.clientX - offsetX) + 'px';
        b.el.style.top = (e.clientY - offsetY) + 'px';
    });

    // 離した時
    window.addEventListener('pointerup', (e) => {
        if (!b.el.classList.contains('dragging')) return;
        b.el.classList.remove('dragging');

        const blockRect = b.el.getBoundingClientRect();
        const centerX = blockRect.left + blockRect.width / 2;
        const centerY = blockRect.top + blockRect.height / 2;

        let closestTarget = null;
        let minDist = 60; // 吸い付く距離

        // 全部のターゲット枠をチェック
        document.querySelectorAll('.target-cell').forEach(target => {
            const tRect = target.getBoundingClientRect();
            const tCenterX = tRect.left + tRect.width / 2;
            const tCenterY = tRect.top + tRect.height / 2;
            
            const dist = Math.hypot(centerX - tCenterX, centerY - tCenterY);
            
            // 他のブロックがすでにいないかチェック
            const occupied = blocksData.some(other => other !== b && other.currentCell === target);

            if (dist < minDist && !occupied) {
                minDist = dist;
                closestTarget = target;
            }
        });

        // 枠に入ったか、元の場所に戻るか
        if (closestTarget) {
            b.currentCell = closestTarget;
            b.el.classList.add('snapped');
            playSnap();
            checkClear();
        } else {
            // はまらなかったら元のストック位置へ戻す
            b.currentCell = b.stockCell;
        }

        // CSSの位置にピタッと吸い付かせる（アニメーションはCSSがやってくれる）
        updatePositions(); 
    });
}

function checkClear() {
    const isClear = blocksData.every(b => b.currentCell.classList.contains('target-cell'));
    if (isClear) {
        document.getElementById('clear-screen').classList.add('show');
    }
}

// クリア画面を押したらリセット
document.getElementById('clear-screen').addEventListener('pointerdown', () => {
    document.getElementById('clear-screen').classList.remove('show');
    blocksData.forEach(b => {
        b.currentCell = b.stockCell; // 全員を初期位置に返す
        b.el.classList.remove('snapped');
    });
    updatePositions();
});