class MellstroyGame {
    constructor() {
        this.currentLevel = 1;
        this.moves = 0;
        this.energy = 3;
        this.stars = 0;
        this.history = [];
        this.maxHistory = 50;
        this.gameTime = 0;
        this.timerInterval = null;
        this.levelStartTime = 0;
        
        this.stats = {
            levelsCompleted: 0,
            totalMoves: 0,
            totalTime: 0,
            perfectLevels: 0,
            fastCompletions: 0,
            bestStreak: 0,
            currentStreak: 0,
            consecutiveDays: 0,
            energySpent: 0,
            undoUsed: 0,
            totalStarsEarned: 0,
            themesUnlocked: 1
        };

        this.cellTypes = {
            ' ': 'empty',
            '#': 'wall',
            '$': 'box',
            '.': 'target',
            '@': 'player',
            '+': 'player-on-target',
            '*': 'box-on-target'
        };

        // Инициализация систем
        this.soundSystem = new SoundSystem();
        this.themeSystem = new ThemeSystem();
        this.achievementSystem = new AchievementSystem(this);
        
        this.initializeGame();
        this.loadGameState();
        this.setupEventListeners();
        this.startTimer();
        this.renderLevel();
        this.updateAllDisplays();
    }

    initializeGame() {
        this.Telegram = window.Telegram?.WebApp;
        if (this.Telegram) {
            this.Telegram.ready();
            this.Telegram.expand();
            this.loadTelegramData();
        }
    }

    loadTelegramData() {
        const user = this.Telegram?.initDataUnsafe?.user;
        if (user) {
            console.log('Telegram user:', user);
            // Можно использовать данные пользователя для персонализации
        }
    }

    loadGameState() {
        const saved = localStorage.getItem('mellstroy_save');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentLevel = data.level || 1;
            this.energy = data.energy || 3;
            this.stars = data.stars || 0;
            this.stats = data.stats || this.stats;
            this.lastPlayed = data.lastPlayed;
            
            this.restoreEnergyOverTime();
            this.checkConsecutiveDays();
        }
        
        this.updateUI();
    }

    saveGameState() {
        const data = {
            level: this.currentLevel,
            energy: this.energy,
            stars: this.stars,
            stats: this.stats,
            lastPlayed: new Date().toISOString()
        };
        localStorage.setItem('mellstroy_save', JSON.stringify(data));
    }

    restoreEnergyOverTime() {
        if (!this.lastPlayed) return;
        
        const lastPlayed = new Date(this.lastPlayed);
        const now = new Date();
        const hoursDiff = (now - lastPlayed) / (1000 * 60 * 60);
        
        if (hoursDiff >= 24) {
            this.energy = 3;
            this.saveGameState();
        }
    }

    checkConsecutiveDays() {
        // Упрощенная проверка последовательных дней
        // В реальной игре нужно более сложная логика
        if (this.lastPlayed) {
            const last = new Date(this.lastPlayed);
            const now = new Date();
            const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                this.stats.consecutiveDays++;
            } else if (diffDays > 1) {
                this.stats.consecutiveDays = 0;
            }
        }
    }

    setupEventListeners() {
        // Кнопки управления
        document.getElementById('restart-btn').addEventListener('click', () => this.restartLevel());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoMove());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('buy-energy-btn').addEventListener('click', () => this.showShop());
        document.getElementById('close-modal-btn').addEventListener('click', () => this.hideModals());

        // Навигация по вкладкам
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Магазин
        document.querySelectorAll('.shop-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const energy = parseInt(e.currentTarget.dataset.energy);
                const price = parseInt(e.currentTarget.dataset.price);
                this.purchaseEnergy(energy, price);
            });
        });

        // Настройки
        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            this.soundSystem.setEnabled(e.target.checked);
        });

        document.getElementById('animations-toggle').addEventListener('change', (e) => {
            this.animationsEnabled = e.target.checked;
        });

        document.getElementById('theme-selector').addEventListener('change', (e) => {
            this.themeSystem.applyTheme(e.target.value);
        });

        // Таблица лидеров
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.switchLeaderboard(type);
            });
        });

        // Управление с клавиатуры
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Обработка свайпов для мобильных устройств
        this.setupTouchControls();
    }

    setupTouchControls() {
        let startX, startY;
        const gameBoard = document.getElementById('game-board');

        gameBoard.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            e.preventDefault();
        });

        gameBoard.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Горизонтальный свайп
                if (Math.abs(diffX) > 30) {
                    if (diffX > 0) this.movePlayer(-1, 0); // Влево
                    else this.movePlayer(1, 0); // Вправо
                }
            } else {
                // Вертикальный свайп
                if (Math.abs(diffY) > 30) {
                    if (diffY > 0) this.movePlayer(0, -1); // Вверх
                    else this.movePlayer(0, 1); // Вниз
                }
            }

            startX = null;
            startY = null;
            e.preventDefault();
        });
    }

    handleKeyPress(e) {
        if (this.energy <= 0) {
            this.showNoEnergyModal();
            return;
        }

        let dx = 0, dy = 0;
        
        switch(e.key) {
            case 'ArrowUp': case 'w': case 'W': dy = -1; break;
            case 'ArrowDown': case 's': case 'S': dy = 1; break;
            case 'ArrowLeft': case 'a': case 'A': dx = -1; break;
            case 'ArrowRight': case 'd': case 'D': dx = 1; break;
            default: return;
        }

        e.preventDefault();
        this.movePlayer(dx, dy);
    }

    switchTab(tabName) {
        // Скрываем все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active-tab');
        });
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Показываем выбранную вкладку
        document.getElementById(`${tabName}-tab`).classList.add('active-tab');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Обновляем контент вкладки если нужно
        if (tabName === 'achievements') {
            this.achievementSystem.renderAchievementsList();
        } else if (tabName === 'leaderboard') {
            this.renderLeaderboard('levels');
        } else if (tabName === 'stats') {
            this.updateStatsDisplay();
        }
    }

    switchLeaderboard(type) {
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        this.renderLeaderboard(type);
    }

    startTimer() {
        this.levelStartTime = Date.now();
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            this.gameTime = Math.floor((Date.now() - this.levelStartTime) / 1000);
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    renderLevel() {
        const level = levels[this.currentLevel - 1];
        const board = document.getElementById('game-board');
        board.innerHTML = '';
        
        const rows = level.grid.length;
        const cols = level.grid[0].length;
        board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = document.createElement('div');
                const cellType = level.grid[y][x];
                cell.className = `cell ${this.cellTypes[cellType] || 'empty'}`;
                
                // Кастомные символы для стиля Mellstroy
                if (cellType === '@' || cellType === '+') cell.textContent = '🎭'; // Mellstroy
                else if (cellType === '$') cell.textContent = '💰'; // Деньги
                else if (cellType === '*') cell.textContent = '💎'; // Деньги в сейфе
                else if (cellType === '.') cell.textContent = '🏦'; // Сейф
                else if (cellType === '#') cell.textContent = '🎰'; // Стены казино
                
                board.appendChild(cell);
            }
        }

        this.updateUI();
    }

    movePlayer(dx, dy) {
        if (this.energy <= 0) {
            this.showNoEnergyModal();
            return;
        }

        const level = levels[this.currentLevel - 1];
        const grid = level.grid.map(row => row.split(''));
        
        // Находим игрока
        let playerX, playerY;
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] === '@' || grid[y][x] === '+') {
                    playerX = x;
                    playerY = y;
                }
            }
        }

        const newX = playerX + dx;
        const newY = playerY + dy;

        // Проверка на выход за границы
        if (newY < 0 || newY >= grid.length || newX < 0 || newX >= grid[newY].length) {
            return;
        }

        const targetCell = grid[newY][newX];
        
        // Сохраняем состояние перед ходом
        this.saveState(grid);

        // Движение в пустую клетку или на цель
        if (targetCell === ' ' || targetCell === '.') {
            this.executeMove(grid, playerX, playerY, newX, newY);
        }
        // Толкание коробки с деньгами
        else if (targetCell === '$' || targetCell === '*') {
            const boxNewX = newX + dx;
            const boxNewY = newY + dy;
            
            if (boxNewY >= 0 && boxNewY < grid.length && boxNewX >= 0 && boxNewX < grid[boxNewY].length) {
                const nextCell = grid[boxNewY][boxNewX];
                
                if (nextCell === ' ' || nextCell === '.') {
                    this.executePush(grid, playerX, playerY, newX, newY, boxNewX, boxNewY);
                }
            }
        }
    }

    executeMove(grid, fromX, fromY, toX, toY) {
        const fromCell = grid[fromY][fromX];
        const toCell = grid[toY][toX];
        
        grid[toY][toX] = toCell === '.' ? '+' : '@';
        grid[fromY][fromX] = fromCell === '+' ? '.' : ' ';
        
        this.moves++;
        this.soundSystem.play('move');
        this.checkLevelComplete(grid);
        this.renderLevel();
    }

    executePush(grid, playerX, playerY, boxX, boxY, newBoxX, newBoxY) {
        const playerCell = grid[playerY][playerX];
        const boxCell = grid[boxY][boxX];
        const newBoxCell = grid[newBoxY][newBoxX];
        
        grid[newBoxY][newBoxX] = newBoxCell === '.' ? '*' : '$';
        grid[boxY][boxX] = boxCell === '*' ? '+' : '@';
        grid[playerY][playerX] = playerCell === '+' ? '.' : ' ';
        
        this.moves++;
        this.soundSystem.play('push');
        this.checkLevelComplete(grid);
        this.renderLevel();
    }

    checkLevelComplete(grid) {
        const levelComplete = !grid.some(row => 
            row.includes('$') || row.includes('.')
        );

        if (levelComplete) {
            this.stopTimer();
            setTimeout(() => {
                this.completeLevel();
            }, 300);
        }
    }

    completeLevel() {
        const starsEarned = this.calculateLevelReward();
        this.stars += starsEarned;
        this.stats.totalStarsEarned += starsEarned;
        this.stats.levelsCompleted++;
        this.stats.totalMoves += this.moves;
        this.stats.totalTime += this.gameTime;
        
        // Проверяем достижения
        const newAchievements = this.achievementSystem.checkAchievements(this.stats);
        if (newAchievements.length > 0) {
            this.showAchievementUnlocked(newAchievements[0]);
        }

        this.soundSystem.play('complete');
        this.showLevelCompleteModal(starsEarned);
        this.saveGameState();
    }

    calculateLevelReward() {
        const baseReward = 5;
        const movesBonus = Math.max(0, 50 - this.moves);
        const timeBonus = Math.max(0, 300 - this.gameTime);
        
        return baseReward + Math.floor(movesBonus / 10) + Math.floor(timeBonus / 30);
    }

    showLevelCompleteModal(starsEarned) {
        document.getElementById('final-moves').textContent = this.moves;
        document.getElementById('final-time').textContent = document.getElementById('timer').textContent;
        document.getElementById('stars-earned').textContent = starsEarned;
        document.getElementById('level-complete').classList.remove('hidden');
    }

    showNoEnergyModal() {
        document.getElementById('no-energy').classList.remove('hidden');
    }

    showAchievementUnlocked(achievement) {
        document.getElementById('achievement-title').textContent = achievement.name;
        document.getElementById('achievement-desc').textContent = achievement.description;
        document.getElementById('achievement-unlocked').classList.remove('hidden');
        this.soundSystem.play('achievement');
    }

    hideAchievementModal() {
        document.getElementById('achievement-unlocked').classList.add('hidden');
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    nextLevel() {
        this.hideModals();
        this.currentLevel = Math.min(this.currentLevel + 1, levels.length);
        this.moves = 0;
        this.history = [];
        this.startTimer();
        this.renderLevel();
        this.saveGameState();
    }

    restartLevel() {
        if (this.energy <= 0) {
            this.showNoEnergyModal();
            return;
        }
        
        this.energy--;
        this.stats.energySpent++;
        this.moves = 0;
        this.history = [];
        this.startTimer();
        this.renderLevel();
        this.saveGameState();
        this.updateUI();
    }

    undoMove() {
        if (this.history.length > 0) {
            const previousState = this.history.pop();
            levels[this.currentLevel - 1].grid = previousState;
            this.moves--;
            this.stats.undoUsed++;
            this.renderLevel();
        }
    }

    saveState(grid) {
        const state = grid.map(row => row.join(''));
        this.history.push(state);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    async purchaseEnergy(energyAmount, price) {
        if (this.stars >= price) {
            this.stars -= price;
            this.energy += energyAmount;
            this.soundSystem.play('cash');
            this.saveGameState();
            this.updateUI();
        } else {
            await this.processTelegramPayment(price, energyAmount);
        }
    }

    async processTelegramPayment(price, energyAmount) {
        if (!this.Telegram) {
            alert(`В тестовом режиме: нужно ${price} алмазов для покупки`);
            return;
        }

        try {
            const invoice = {
                title: `Пополнение энергии +${energyAmount}`,
                description: `Получите ${energyAmount} дополнительных единиц энергии`,
                payload: `${energyAmount}_energy_${Date.now()}`,
                currency: 'XTR',
                prices: [{ label: 'Stars', amount: price * 100 }]
            };

            this.Telegram.openInvoice(invoice, (status) => {
                if (status === 'paid') {
                    this.stars += price;
                    this.energy += energyAmount;
                    this.saveGameState();
                    this.updateUI();
                    this.soundSystem.play('cash');
                }
            });
        } catch (error) {
            console.error('Payment error:', error);
        }
    }

    addStars(amount) {
        this.stars += amount;
        this.stats.totalStarsEarned += amount;
        this.updateUI();
    }

    updateUI() {
        document.getElementById('current-level').textContent = this.currentLevel;
        document.getElementById('moves').textContent = this.moves;
        document.getElementById('energy-count').textContent = this.energy;
        document.getElementById('stars-count').textContent = this.stars;
        
        const restartBtn = document.getElementById('restart-btn');
        const undoBtn = document.getElementById('undo-btn');
        
        if (this.energy <= 0) {
            restartBtn.disabled = true;
            undoBtn.disabled = true;
            restartBtn.style.opacity = '0.5';
            undoBtn.style.opacity = '0.5';
        } else {
            restartBtn.disabled = false;
            undoBtn.disabled = this.history.length === 0;
            restartBtn.style.opacity = '1';
            undoBtn.style.opacity = this.history.length === 0 ? '0.5' : '1';
        }
    }

    updateAllDisplays() {
        this.updateUI();
        this.updateStatsDisplay();
        this.achievementSystem.renderAchievementsList();
        this.renderLeaderboard('levels');
    }

    updateStatsDisplay() {
        document.getElementById('stat-levels-completed').textContent = this.stats.levelsCompleted;
        document.getElementById('stat-total-moves').textContent = this.stats.totalMoves;
        
        const avgTime = this.stats.levelsCompleted > 0 ? 
            Math.floor(this.stats.totalTime / this.stats.levelsCompleted) : 0;
        const avgMinutes = Math.floor(avgTime / 60);
        const avgSeconds = avgTime % 60;
        document.getElementById('stat-avg-time').textContent = 
            `${avgMinutes.toString().padStart(2, '0')}:${avgSeconds.toString().padStart(2, '0')}`;
            
        document.getElementById('stat-best-streak').textContent = this.stats.bestStreak;
        document.getElementById('stat-total-stars').textContent = this.stats.totalStarsEarned;
        document.getElementById('stat-achievements').textContent = 
            `${this.achievementSystem.getUnlockedCount()}/${this.achievementSystem.getTotalCount()}`;
    }

    renderLeaderboard(type) {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;

        // В реальной игре здесь должен быть запрос к серверу
        // Для демонстрации создаем mock данные
        const mockLeaderboard = this.generateMockLeaderboard(type);
        
        container.innerHTML = '';
        mockLeaderboard.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            item.innerHTML = `
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-player">
                    <div class="leaderboard-name">${player.name}</div>
                    <div class="leaderboard-score">${this.formatLeaderboardScore(player.score, type)}</div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    generateMockLeaderboard(type) {
        const names = ['Mellstroy', 'Казино_Босс', 'Деньги_Любитель', 'Сейф_Взломщик', 'Алмазный_Король', 
                      'Удача_Наша', 'Джекпот_Охотник', 'Золотой_Игрок', 'Вепок', 'Стример'];
        
        return names.map((name, index) => {
            let score;
            switch(type) {
                case 'levels':
                    score = 100 - index * 5;
                    break;
                case 'moves':
                    score = 5000 - index * 200;
                    break;
                case 'stars':
                    score = 1000 - index * 50;
                    break;
                default:
                    score = 100 - index * 5;
            }
            
            return { name, score };
        }).sort((a, b) => b.score - a.score);
    }

    formatLeaderboardScore(score, type) {
        switch(type) {
            case 'levels':
                return `Уровень: ${score}`;
            case 'moves':
                return `Ходы: ${score}`;
            case 'stars':
                return `Алмазы: ${score}`;
            default:
                return score;
        }
    }
}

// Инициализация игры когда DOM загружен
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new MellstroyGame();
});