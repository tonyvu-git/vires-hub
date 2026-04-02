/* ══════════════════════════════════════════════════════
   BA LÁ (3-CARD) MINI GAME
   ══════════════════════════════════════════════════════ */
let balaRoomId = null;
let balaMyCards = [];       // [{rank, suit, value}, ...]
let balaFlipped = [false, false, false];
let balaIsSearching = false;
let balaGamePhase = 'idle'; // 'idle' | 'flipping' | 'ready' | 'revealed' | 'finished'

// ─── Suit / Rank helpers ────────────────────────────────
const SUIT_SYMBOLS = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' };
const SUIT_COLORS = { spade: 'black', heart: 'red', diamond: 'red', club: 'black' };
const RANK_DISPLAY = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankToDisplay(rank) {
    return RANK_DISPLAY[rank] || String(rank);
}

document.addEventListener('DOMContentLoaded', () => {
    // ─── Game Selector (switch Caro ↔ Ba Lá) ────────────
    const gameSelector = document.getElementById('game-selector');
    const gameTitle = document.getElementById('game-title');
    const caroContainer = document.getElementById('caro-container');
    const balaContainer = document.getElementById('bala-container');

    if (gameSelector) {
        gameSelector.addEventListener('change', () => {
            const game = gameSelector.value;
            if (game === 'caro') {
                caroContainer.classList.remove('hidden');
                balaContainer.classList.add('hidden');
                gameTitle.textContent = 'GIẢI TRÍ: CỜ CARO';
            } else {
                caroContainer.classList.add('hidden');
                balaContainer.classList.remove('hidden');
                gameTitle.textContent = 'GIẢI TRÍ: BA LÁ';
            }
        });
    }

    // ─── DOM refs ─────────────────────────────────────────
    const btnFind = document.getElementById('btn-bala-find');
    const waitingText = document.getElementById('bala-waiting-text');
    const menuEl = document.getElementById('bala-menu');
    const matchEl = document.getElementById('bala-match');
    const statusText = document.getElementById('bala-status-text');
    const myCardsEl = document.getElementById('bala-my-cards');
    const enemyCardsEl = document.getElementById('bala-enemy-cards');
    const btnCompare = document.getElementById('btn-bala-compare');
    const btnRematch = document.getElementById('btn-bala-rematch');
    const btnLeave = document.getElementById('btn-bala-leave');
    const meScore = document.getElementById('bala-me-score');
    const enemyScore = document.getElementById('bala-enemy-score');

    if (!btnFind) return; // Safeguard

    // ─── Find match ──────────────────────────────────────
    btnFind.onclick = () => {
        if (!socket) return alert('Chưa kết nối máy chủ realtime!');
        bindBalaSocketEvents();

        balaIsSearching = !balaIsSearching;
        if (balaIsSearching) {
            btnFind.textContent = 'Hủy Tìm Kiếm';
            btnFind.className = 'btn btn-ghost';
            waitingText.classList.remove('hidden');
            socket.emit('bala_join_queue', { id: USER.id, fullname: USER.fullname, avatar: USER.avatar });
        } else {
            btnFind.textContent = 'Tìm Đối Thủ (1vs1)';
            btnFind.className = 'btn btn-primary';
            waitingText.classList.add('hidden');
            socket.emit('bala_leave_queue');
        }
    };

    btnLeave.onclick = () => {
        if (!balaRoomId) { resetBalaUI(); return; }
        if (confirm('Bạn muốn rời trận?')) {
            socket.emit('bala_leave_match', { roomId: balaRoomId });
            resetBalaUI();
        }
    };

    btnCompare.onclick = () => {
        if (btnCompare.disabled) return;
        btnCompare.textContent = 'Đang đợi...';
        btnCompare.disabled = true;
        socket.emit('bala_compare', { roomId: balaRoomId });
    };

    btnRematch.onclick = () => {
        if (btnRematch.disabled) return;
        btnRematch.textContent = 'Đang đợi...';
        btnRematch.disabled = true;
        socket.emit('bala_request_rematch');
    };

    // ─── Render cards ────────────────────────────────────
    function renderMyCards() {
        myCardsEl.innerHTML = '';
        balaMyCards.forEach((card, i) => {
            const el = document.createElement('div');
            const isRed = card.suit === 'heart' || card.suit === 'diamond';

            if (balaFlipped[i]) {
                el.className = 'bala-card bala-card-front' + (isRed ? ' red' : '');
                el.innerHTML = `
                    <span class="bala-card-rank-tl">${rankToDisplay(card.rank)}</span>
                    <span class="bala-card-suit">${SUIT_SYMBOLS[card.suit]}</span>
                    <span class="bala-card-rank-br">${rankToDisplay(card.rank)}</span>
                `;
            } else {
                el.className = 'bala-card bala-card-back';
                el.innerHTML = '<span class="bala-card-back-logo">V</span>';
                el.onclick = () => flipCard(i);
            }
            myCardsEl.appendChild(el);
        });
    }

    function renderEnemyCards(enemyCards, showFront) {
        enemyCardsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const el = document.createElement('div');
            if (showFront && enemyCards && enemyCards[i]) {
                const card = enemyCards[i];
                const isRed = card.suit === 'heart' || card.suit === 'diamond';
                el.className = 'bala-card bala-card-front' + (isRed ? ' red' : '');
                el.innerHTML = `
                    <span class="bala-card-rank-tl">${rankToDisplay(card.rank)}</span>
                    <span class="bala-card-suit">${SUIT_SYMBOLS[card.suit]}</span>
                    <span class="bala-card-rank-br">${rankToDisplay(card.rank)}</span>
                `;
            } else {
                el.className = 'bala-card bala-card-back';
                el.innerHTML = '<span class="bala-card-back-logo">V</span>';
            }
            enemyCardsEl.appendChild(el);
        }
    }

    function flipCard(index) {
        if (balaFlipped[index] || balaGamePhase !== 'flipping') return;
        balaFlipped[index] = true;
        renderMyCards();

        // Notify server
        socket.emit('bala_flip_card', { roomId: balaRoomId, index });

        // Check if all 3 flipped → show "So Điểm"
        if (balaFlipped.every(f => f)) {
            balaGamePhase = 'ready';
            statusText.textContent = 'Đã lật đủ 3 lá — Nhấn So Điểm!';
            statusText.className = 'caro-turn-indicator ur-turn';
            btnCompare.classList.remove('hidden');
            btnCompare.textContent = 'So Điểm';
            btnCompare.disabled = false;
        } else {
            const remaining = balaFlipped.filter(f => !f).length;
            statusText.textContent = `Nhấn vào lá bài để lật (còn ${remaining} lá)`;
        }
    }

    // ─── Socket events ───────────────────────────────────
    let balaSocketBound = false;

    function bindBalaSocketEvents() {
        if (!socket || balaSocketBound) return;
        balaSocketBound = true;

        socket.on('bala_match_found', (data) => {
            // data: { roomId, opponent: {fullname, avatar}, cards: [{rank, suit, value},...] }
            balaIsSearching = false;
            balaRoomId = data.roomId;
            balaMyCards = data.cards;
            balaFlipped = [false, false, false];
            balaGamePhase = 'flipping';

            menuEl.classList.add('hidden');
            matchEl.classList.remove('hidden');

            // Me
            document.getElementById('bala-me-avatar').src = getAvatar(USER.avatar);
            meScore.textContent = '? điểm';
            meScore.className = 'bala-score-badge';

            // Enemy
            document.getElementById('bala-enemy-avatar').src = getAvatar(data.opponent.avatar);
            document.getElementById('bala-enemy-name').textContent = data.opponent.fullname;
            enemyScore.textContent = '? điểm';
            enemyScore.className = 'bala-score-badge';

            statusText.textContent = 'Nhấn vào lá bài để lật (còn 3 lá)';
            statusText.className = 'caro-turn-indicator ur-turn';

            btnCompare.classList.add('hidden');
            btnRematch.classList.add('hidden');
            btnLeave.textContent = 'Rời Trận';

            renderMyCards();
            renderEnemyCards(null, false);
        });

        socket.on('bala_result', (data) => {
            // data: { myScore, enemyScore, myCards, enemyCards, result: 'win'|'lose'|'draw' }
            balaGamePhase = 'finished';

            // Show scores
            meScore.textContent = `${data.myScore} điểm`;
            enemyScore.textContent = `${data.enemyScore} điểm`;

            if (data.result === 'win') {
                meScore.className = 'bala-score-badge score-win';
                enemyScore.className = 'bala-score-badge score-lose';
                statusText.textContent = '🏆 Bạn THẮNG!';
                statusText.className = 'caro-turn-indicator ur-turn';
            } else if (data.result === 'lose') {
                meScore.className = 'bala-score-badge score-lose';
                enemyScore.className = 'bala-score-badge score-win';
                statusText.textContent = '💀 Bạn THUA!';
                statusText.className = 'caro-turn-indicator';
            } else {
                meScore.className = 'bala-score-badge score-draw';
                enemyScore.className = 'bala-score-badge score-draw';
                statusText.textContent = '🤝 HÒA!';
                statusText.className = 'caro-turn-indicator';
            }

            // Reveal enemy cards
            renderEnemyCards(data.enemyCards, true);

            btnCompare.classList.add('hidden');
            btnRematch.classList.remove('hidden');
            btnRematch.textContent = 'Ván mới';
            btnRematch.disabled = false;
            btnLeave.textContent = 'Về Sảnh';
        });

        socket.on('bala_enemy_left', () => {
            alert('Đối thủ đã rời trận!');
            resetBalaUI();
        });

        socket.on('bala_rematch_started', (data) => {
            // data: { cards: [...] }
            balaMyCards = data.cards;
            balaFlipped = [false, false, false];
            balaGamePhase = 'flipping';

            meScore.textContent = '? điểm';
            meScore.className = 'bala-score-badge';
            enemyScore.textContent = '? điểm';
            enemyScore.className = 'bala-score-badge';

            statusText.textContent = 'Nhấn vào lá bài để lật (còn 3 lá)';
            statusText.className = 'caro-turn-indicator ur-turn';

            btnCompare.classList.add('hidden');
            btnRematch.classList.add('hidden');
            btnLeave.textContent = 'Rời Trận';

            renderMyCards();
            renderEnemyCards(null, false);
        });
    }

    function resetBalaUI() {
        balaRoomId = null;
        balaIsSearching = false;
        balaGamePhase = 'idle';

        btnFind.textContent = 'Tìm Đối Thủ (1vs1)';
        btnFind.className = 'btn btn-primary';
        waitingText.classList.add('hidden');

        menuEl.classList.remove('hidden');
        matchEl.classList.add('hidden');
        btnCompare.classList.add('hidden');
        btnRematch.classList.add('hidden');
    }
});
