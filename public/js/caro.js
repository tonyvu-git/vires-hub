/* ══════════════════════════════════════════════════════
   CARO (TIC-TAC-TOE) MINI GAME
══════════════════════════════════════════════════════ */
let caroRoomId = null;
let caroMySymbol = null; // 'X' or 'O'
let caroMyTurn = false;
let caroGameState = Array(9).fill(null);
let isCaroSearching = false;

document.addEventListener('DOMContentLoaded', () => {
    const btnFind = document.getElementById('btn-caro-find');
    const waitingText = document.getElementById('caro-waiting-text');
    const menuEl = document.getElementById('caro-menu');
    const matchEl = document.getElementById('caro-match');
    const boardEl = document.getElementById('caro-board');
    const btnLeave = document.getElementById('btn-caro-leave');
    const btnRematch = document.getElementById('btn-caro-rematch');
    const turnIndicator = document.getElementById('caro-turn-indicator');

    // Khởi tạo Lưới 3x3 ban đầu để giao diện không bị giật
    renderBoard();

    // onclick is moved and bound above

    btnLeave.onclick = () => {
        if (!caroRoomId) {
            resetCaroUI(); // Already finished
            return;
        }
        if (confirm('Bạn muốn thoát trận? Đối phương sẽ tự động thắng.')) {
            socket.emit('caro_leave_match', { roomId: caroRoomId });
            resetCaroUI();
        }
    };

    btnRematch.onclick = () => {
        if (btnRematch.disabled) return;
        btnRematch.textContent = 'Đang đợi...';
        btnRematch.disabled = true;
        socket.emit('caro_request_rematch');
    };

    let caroSocketBound = false;

    function bindCaroSocketEvents() {
        if (!socket || caroSocketBound) return;
        caroSocketBound = true;

        socket.on('caro_match_found', (data) => {
            // data: { roomId, opponent: {fullname, avatar}, symbol: 'X'|'O', turn: 'X' }
            isCaroSearching = false;
            caroRoomId = data.roomId;
            caroMySymbol = data.symbol;
            caroGameState = Array(9).fill(null);
            
            // UI Setup
            menuEl.classList.add('hidden');
            matchEl.classList.remove('hidden');
            
            // Me
            document.getElementById('caro-me-avatar').src = getAvatar(USER.avatar);
            const mySymEl = document.querySelector('.caro-player.me .caro-player-symbol');
            mySymEl.textContent = data.symbol;
            mySymEl.className = `caro-player-symbol ${data.symbol === 'X' ? 'highlight-x' : 'highlight-o'}`;
            
            // Enemy
            const enemySymbol = data.symbol === 'X' ? 'O' : 'X';
            document.getElementById('caro-enemy-avatar').src = getAvatar(data.opponent.avatar);
            document.getElementById('caro-enemy-name').textContent = data.opponent.fullname;
            const enemySymEl = document.querySelector('.caro-player.enemy .caro-player-symbol');
            enemySymEl.textContent = enemySymbol;
            enemySymEl.className = `caro-player-symbol ${enemySymbol === 'X' ? 'highlight-x' : 'highlight-o'}`;
            
            btnRematch.classList.add('hidden');
            btnLeave.textContent = 'Rời Trận';
            btnLeave.style.color = 'var(--danger)';
            
            updateTurnIndicator(data.turn);
            renderBoard();
        });

        socket.on('caro_update', (data) => {
            // data: { board, turn, winner, winLine }
            caroGameState = data.board;
            
            if (data.winner) {
                renderBoard(data.winLine);
                caroMyTurn = false;
                if (data.winner === 'draw') {
                    turnIndicator.textContent = 'Hòa cờ!';
                    turnIndicator.className = 'caro-turn-indicator';
                } else if (data.winner === caroMySymbol) {
                    turnIndicator.textContent = '🏆 Bạn đã THẮNG!';
                    turnIndicator.className = 'caro-turn-indicator ur-turn';
                } else {
                    turnIndicator.textContent = '💀 Bạn đã THUA!';
                    turnIndicator.className = 'caro-turn-indicator';
                }
                
                // Cập nhật UI nút
                btnLeave.textContent = 'Về Sảnh';
                btnLeave.style.color = 'var(--text)';
                btnRematch.classList.remove('hidden');
                btnRematch.textContent = 'Ván mới';
                btnRematch.disabled = false;
                
                // Set roomId to null ONLY if we wanted to prevent moves, but we still need it for Rematch tracking?
                // Actually server prevents moves via status='finished'. Client side we just disable click if winLine or data.winner
                // So we do not nullify caroRoomId here.
                caroMyTurn = false;
            } else {
                renderBoard();
                updateTurnIndicator(data.turn);
            }
        });

        socket.on('caro_enemy_left', () => {
            // Đối thủ rời trận (khi đang chơi hoặc khi đang chờ rematch)
            alert('Đối thủ đã rời trận!');
            resetCaroUI();
        });

        socket.on('caro_rematch_started', (data) => {
            // data: { symbol: 'X'|'O', turn: 'X' }
            caroMySymbol = data.symbol;
            caroGameState = Array(9).fill(null);
            
            // Cập nhật UI
            const mySymEl = document.querySelector('.caro-player.me .caro-player-symbol');
            mySymEl.textContent = data.symbol;
            mySymEl.className = `caro-player-symbol ${data.symbol === 'X' ? 'highlight-x' : 'highlight-o'}`;
            
            const enemySymbol = data.symbol === 'X' ? 'O' : 'X';
            const enemySymEl = document.querySelector('.caro-player.enemy .caro-player-symbol');
            enemySymEl.textContent = enemySymbol;
            enemySymEl.className = `caro-player-symbol ${enemySymbol === 'X' ? 'highlight-x' : 'highlight-o'}`;

            btnRematch.classList.add('hidden');
            btnLeave.textContent = 'Rời Trận';
            btnLeave.style.color = 'var(--danger)';

            updateTurnIndicator(data.turn);
            renderBoard();
        });
    }

    btnFind.onclick = () => {
        if (!socket) return alert('Chưa kết nối máy chủ realtime!');
        bindCaroSocketEvents(); // Ensure events are bound before joining

        isCaroSearching = !isCaroSearching;
        
        if (isCaroSearching) {
            btnFind.textContent = 'Hủy Tìm Kiếm';
            btnFind.className = 'btn btn-ghost';
            waitingText.classList.remove('hidden');
            socket.emit('caro_join_queue', { id: USER.id, fullname: USER.fullname, avatar: USER.avatar });
        } else {
            btnFind.textContent = 'Tìm Đối Thủ (1vs1)';
            btnFind.className = 'btn btn-primary';
            waitingText.classList.add('hidden');
            socket.emit('caro_leave_queue');
        }
    };

    function updateTurnIndicator(currentTurnSymbol) {
        caroMyTurn = (currentTurnSymbol === caroMySymbol);
        if (caroMyTurn) {
            turnIndicator.textContent = `Lượt của Bạn (${caroMySymbol})`;
            turnIndicator.className = 'caro-turn-indicator ur-turn';
        } else {
            turnIndicator.textContent = `Đang đợi đối thủ đánh...`;
            turnIndicator.className = 'caro-turn-indicator';
        }
    }

    function renderBoard(winLine = null) {
        boardEl.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'caro-cell';
            if (caroGameState[i]) {
                cell.textContent = caroGameState[i];
                cell.classList.add(caroGameState[i]);
            }
            if (winLine && winLine.includes(i)) {
                cell.classList.add('highlight-win');
            }
            // Allow click only if cell is empty, it's my turn, and game is not over
            cell.onclick = () => {
                 if (caroRoomId && caroMyTurn && !caroGameState[i]) handleCellClick(i);
            };
            boardEl.appendChild(cell);
        }
    }

    function handleCellClick(index) {
        caroGameState[index] = caroMySymbol;
        caroMyTurn = false; 
        updateTurnIndicator(caroMySymbol === 'X' ? 'O' : 'X');
        renderBoard();
        socket.emit('caro_make_move', { roomId: caroRoomId, index: index, symbol: caroMySymbol });
    }

    function resetCaroUI() {
        caroRoomId = null;
        isCaroSearching = false;
        
        btnFind.textContent = 'Tìm Đối Thủ (1vs1)';
        btnFind.className = 'btn btn-primary';
        waitingText.classList.add('hidden');
        
        menuEl.classList.remove('hidden');
        matchEl.classList.add('hidden');
        btnRematch.classList.add('hidden');
        
        btnLeave.textContent = 'Rời Trận';
        btnLeave.style.color = 'var(--danger)';
    }

});
