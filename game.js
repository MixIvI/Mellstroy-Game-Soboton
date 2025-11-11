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
        this.animationsEnabled = true;
        this.levelCompleted = false;
        
        // Сохраняем оригинальные уровни для перезапуска
        this.originalLevels = JSON.parse(JSON.stringify(levels));
        
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
        try {
            this.soundSystem = new SoundSystem();
        } catch (error) {
            console.error('SoundSystem initialization error:', error);
            this.soundSystem = { 
                play: () => {}, 
                setEnabled: () => {},
                enabled: false 
            };
        }

        try {
            this.themeSystem = new ThemeSystem();
        } catch (error) {
            console.error('ThemeSystem initialization error:', error);
            this.themeSystem = {
                applyTheme: () => {},
                getCurrentTheme: () => 'casino'
            };
        }

        try {
            this.achievementSystem = new AchievementSystem(this);
        } catch (error) {
            console.error('AchievementSystem initialization error:', error);
            this.achievementSystem = {
                checkAchievements: () => [],
                renderAchievementsList: () => {},
                getUnlockedCount: () => 0,
                getTotalCount: () => 0
            };
        }

        this.loadGameState();
        this.setupEventListeners();
        this.startTimer();
        this.renderLevel();
        this.updateAllDisplays();
    }

    loadGameState() {
        try {
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
        } catch (error) {
            console.error('Error loading game state:', error);
        }
        
        this.updateUI();
    }

    saveGameState() {
        try {
            const data = {
                level: this.currentLevel,
                energy: this.energy,
                stars: this.stars,
                stats: this.stats,
                lastPlayed: new Date().toISOString()
            };
            localStorage.setItem('mellstroy_save', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }

    setupEventListeners() {
        try {
            // Кнопки управления
            const restartBtn = document.getElementById('restart-btn');
            const undoBtn = document.getElementById('undo-btn');
            const nextLevelBtn = document.getElementById('next-level-btn');
            const buyEnergyBtn = document.getElementById('buy-energy-btn');
            const closeModalBtn = document.getElementById('close-modal-btn');

            if (restartBtn) {
                restartBtn.addEventListener('click', () => this.restartLevel());
            }
            if (undoBtn) {
                undoBtn.addEventListener('click', () => this.undoMove());
            }
            if (nextLevelBtn) {
                nextLevelBtn.addEventListener('click', () => this.nextLevel());
            }
            if (buyEnergyBtn) {
                buyEnergyBtn.addEventListener('click', () => this.showShop());
            }
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', () => this.hideModals());
            }

            // Навигация по вкладкам
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = e.currentTarget.getAttribute('data-tab');
                    this.switchTab(tab);
                });
            });

            // Магазин
            document.querySelectorAll('.shop-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const energy = parseInt(e.currentTarget.getAttribute('data-energy'));
                    const price = parseInt(e.currentTarget.getAttribute('data-price'));
                    this.purchaseEnergy(energy, price);
                });
            });

            // Настройки
            const soundToggle = document.getElementById('sound-toggle');
            const animationsToggle = document.getElementById('animations-toggle');
            const themeSelector = document.getElementById('theme-selector');

            if (soundToggle) {
                soundToggle.addEventListener('change', (e) => {
                    this.soundSystem.setEnabled(e.target.checked);
                });
            }
            if (animationsToggle) {
                animationsToggle.addEventListener('change', (e) => {
                    this.animationsEnabled = e.target.checked;
                });
            }
            if (themeSelector) {
                themeSelector.addEventListener('change', (e) => {
                    this.themeSystem.applyTheme(e.target.value);
                });
            }

            // Управление с клавиатуры
            document.addEventListener('keydown', (e) => this.handleKeyPress(e));

            // Обработка свайпов для мобильных устройств
            this.setupTouchControls();
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    setupTouchControls() {
        try {
            let startX, startY;
            const gameBoard = document.getElementById('game-board');
            const minSwipeDistance = 20;

            if (!gameBoard) return;

            gameBoard.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                e.preventDefault();
            }, { passive: false });

            gameBoard.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;

                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const diffX = startX - endX;
                const diffY = startY - endY;

                if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
                    if (Math.abs(diffX) > Math.abs(diffY)) {
                        if (diffX > 0) this.movePlayer(-1, 0);
                        else this.movePlayer(1, 0);
                    } else {
                        if (diffY > 0) this.movePlayer(0, -1);
                        else this.movePlayer(0, 1);
                    }
                }

                startX = null;
                startY = null;
                e.preventDefault();
            }, { passive: false });
            
        } catch (error) {
            console.error('Error setting up touch controls:', error);
        }
    }

    handleKeyPress(e) {
        if (this.energy <= 0) {
            this.showNoEnergyModal();
            return;
        }

        if (this.levelCompleted) return;

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
        try {
            // Скрываем все вкладки
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active-tab');
            });
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Показываем выбранную вкладку
            const targetTab = document.getElementById(`${tabName}-tab`);
            const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
            
            if (targetTab) {
                targetTab.classList.add('active-tab');
            }
            if (targetBtn) {
                targetBtn.classList.add('active');
            }

            // Обновляем контент вкладки если нужно
            if (tabName === 'achievements') {
                this.achievementSystem.renderAchievementsList();
            } else if (tabName === 'stats') {
                this.updateStatsDisplay();
            }
            
        } catch (error) {
            console.error('Error switching tab:', error);
        }
    }

    startTimer() {
        try {
            this.levelStartTime = Date.now();
            if (this.timerInterval) clearInterval(this.timerInterval);
            
            this.timerInterval = setInterval(() => {
                this.gameTime = Math.floor((Date.now() - this.levelStartTime) / 1000);
                this.updateTimerDisplay();
            }, 1000);
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }

    stopTimer() {
        try {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
        }
    }

    updateTimerDisplay() {
        try {
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = this.gameTime % 60;
            const timerElement = document.getElementById('timer');
            if (timerElement) {
                timerElement.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Error updating timer display:', error);
        }
    }

    renderLevel() {
        try {
            const level = levels[this.currentLevel - 1];
            const board = document.getElementById('game-board');
            if (!board || !level) return;
            
            board.innerHTML = '';
            
            const rows = level.grid.length;
            const cols = level.grid[0].length;
            
            // Устанавливаем размеры сетки
            board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            
            // Рассчитываем размер клетки
            const cellSize = Math.min(35, Math.floor(board.offsetWidth / cols) - 2);
            
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const cell = document.createElement('div');
                    const cellType = level.grid[y][x];
                    cell.className = `cell ${this.cellTypes[cellType] || 'empty'}`;
                    
                    // Устанавливаем фиксированный размер
                    cell.style.width = `${cellSize}px`;
                    cell.style.height = `${cellSize}px`;
                    cell.style.minWidth = `${cellSize}px`;
                    cell.style.minHeight = `${cellSize}px`;
                    
                    // Кастомные символы
                    if (cellType === '@' || cellType === '+') {
                        cell.textContent = '🎭';
                    }
                    else if (cellType === '$') {
                        cell.textContent = '💰';
                    }
                    else if (cellType === '*') {
                        cell.textContent = '💎';
                    }
                    else if (cellType === '.') {
                        cell.textContent = '🏦';
                    }
                    else if (cellType === '#') {
                        cell.textContent = '🎰';
                    }
                    
                    board.appendChild(cell);
                }
            }

            this.updateUI();
            
        } catch (error) {
            console.error('Error rendering level:', error);
        }
    }

    movePlayer(dx, dy) {
        if (this.energy <= 0 || this.levelCompleted) return;

        try {
            const level = levels[this.currentLevel - 1];
            const grid = level.grid.map(row => [...row]);
            
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
            // Толкание коробки
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
        } catch (error) {
            console.error('Error moving player:', error);
        }
    }

    executeMove(grid, fromX, fromY, toX, toY) {
        try {
            const fromCell = grid[fromY][fromX];
            const toCell = grid[toY][toX];
            
            grid[toY][toX] = toCell === '.' ? '+' : '@';
            grid[fromY][fromX] = fromCell === '+' ? '.' : ' ';
            
            // Обновляем уровень
            this.updateLevelGrid(grid);
            
            this.moves++;
            this.soundSystem.play('move');
            
            // Сразу проверяем завершение уровня
            this.checkLevelComplete();
            this.renderLevel();
        } catch (error) {
            console.error('Error executing move:', error);
        }
    }

    executePush(grid, playerX, playerY, boxX, boxY, newBoxX, newBoxY) {
        try {
            const playerCell = grid[playerY][playerX];
            const boxCell = grid[boxY][boxX];
            const newBoxCell = grid[newBoxY][newBoxX];
            
            grid[newBoxY][newBoxX] = newBoxCell === '.' ? '*' : '$';
            grid[boxY][boxX] = boxCell === '*' ? '+' : '@';
            grid[playerY][playerX] = playerCell === '+' ? '.' : ' ';
            
            // Обновляем уровень
            this.updateLevelGrid(grid);
            
            this.moves++;
            this.soundSystem.play('push');
            
            // Сразу проверяем завершение уровня
            this.checkLevelComplete();
            this.renderLevel();
        } catch (error) {
            console.error('Error executing push:', error);
        }
    }

    updateLevelGrid(grid) {
        try {
            const level = levels[this.currentLevel - 1];
            level.grid = grid.map(row => row.join(''));
        } catch (error) {
            console.error('Error updating level grid:', error);
        }
    }

    // ПРОСТАЯ И НАДЕЖНАЯ ПРОВЕРКА ЗАВЕРШЕНИЯ УРОВНЯ
    checkLevelComplete() {
        try {
            if (this.levelCompleted) return;
            
            const level = levels[this.currentLevel - 1];
            const grid = level.grid;
            
            // Простая проверка: если нет ни одного '$' и ни одного '.', уровень завершен
            let hasBox = false;
            let hasTarget = false;
            
            for (let y = 0; y < grid.length; y++) {
                const row = grid[y];
                for (let x = 0; x < row.length; x++) {
                    const cell = row[x];
                    if (cell === '$') hasBox = true;
                    if (cell === '.') hasTarget = true;
                    
                    // Ранний выход если нашли и то и другое
                    if (hasBox && hasTarget) break;
                }
                if (hasBox && hasTarget) break;
            }
            
            const levelComplete = !hasBox && !hasTarget;
            
            console.log('Level complete check:', { 
                level: this.currentLevel,
                hasBox, 
                hasTarget, 
                levelComplete 
            });

            if (levelComplete) {
                console.log('🎉 УРОВЕНЬ ЗАВЕРШЕН!');
                this.levelCompleted = true;
                this.stopTimer();
                this.completeLevel();
            }
        } catch (error) {
            console.error('Error checking level completion:', error);
        }
    }

    completeLevel() {
        try {
            console.log('Завершаем уровень...');
            
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
            
        } catch (error) {
            console.error('Error completing level:', error);
        }
    }

    calculateLevelReward() {
        const baseReward = 5;
        const movesBonus = Math.max(0, 50 - this.moves);
        const timeBonus = Math.max(0, 300 - this.gameTime);
        
        return baseReward + Math.floor(movesBonus / 10) + Math.floor(timeBonus / 30);
    }

    showLevelCompleteModal(starsEarned) {
        try {
            console.log('Показываем модальное окно завершения уровня');
            
            const finalMoves = document.getElementById('final-moves');
            const finalTime = document.getElementById('final-time');
            const starsEarnedElement = document.getElementById('stars-earned');
            const modal = document.getElementById('level-complete');
            
            if (finalMoves) finalMoves.textContent = this.moves;
            if (finalTime) finalTime.textContent = document.getElementById('timer')?.textContent || '00:00';
            if (starsEarnedElement) starsEarnedElement.textContent = starsEarned;
            
            if (modal) {
                modal.classList.remove('hidden');
                console.log('Модальное окно показано');
            }
        } catch (error) {
            console.error('Error showing level complete modal:', error);
        }
    }

    showNoEnergyModal() {
        try {
            const modal = document.getElementById('no-energy');
            if (modal) modal.classList.remove('hidden');
        } catch (error) {
            console.error('Error showing no energy modal:', error);
        }
    }

    showAchievementUnlocked(achievement) {
        try {
            const title = document.getElementById('achievement-title');
            const desc = document.getElementById('achievement-desc');
            const modal = document.getElementById('achievement-unlocked');
            
            if (title) title.textContent = achievement.name;
            if (desc) desc.textContent = achievement.description;
            if (modal) modal.classList.remove('hidden');
            this.soundSystem.play('achievement');
        } catch (error) {
            console.error('Error showing achievement modal:', error);
        }
    }

    hideAchievementModal() {
        try {
            const modal = document.getElementById('achievement-unlocked');
            if (modal) modal.classList.add('hidden');
        } catch (error) {
            console.error('Error hiding achievement modal:', error);
        }
    }

    hideModals() {
        try {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        } catch (error) {
            console.error('Error hiding modals:', error);
        }
    }

    nextLevel() {
        try {
            console.log('Переходим на следующий уровень');
            this.hideModals();
            this.levelCompleted = false;
            this.currentLevel = Math.min(this.currentLevel + 1, levels.length);
            this.moves = 0;
            this.history = [];
            this.startTimer();
            this.renderLevel();
            this.saveGameState();
        } catch (error) {
            console.error('Error going to next level:', error);
        }
    }

    restartLevel() {
        if (this.energy <= 0) {
            this.showNoEnergyModal();
            return;
        }
        
        try {
            this.energy--;
            this.stats.energySpent++;
            this.levelCompleted = false;
            this.moves = 0;
            this.history = [];
            
            // Восстанавливаем исходное состояние уровня
            const originalLevel = this.originalLevels[this.currentLevel - 1];
            if (originalLevel) {
                levels[this.currentLevel - 1] = JSON.parse(JSON.stringify(originalLevel));
            }
            
            this.startTimer();
            this.renderLevel();
            this.saveGameState();
            this.updateUI();
        } catch (error) {
            console.error('Error restarting level:', error);
        }
    }

    undoMove() {
        try {
            if (this.history.length > 0 && !this.levelCompleted) {
                const previousState = this.history.pop();
                levels[this.currentLevel - 1].grid = previousState;
                this.moves--;
                this.stats.undoUsed++;
                this.renderLevel();
            }
        } catch (error) {
            console.error('Error undoing move:', error);
        }
    }

    saveState(grid) {
        try {
            const state = grid.map(row => row.join(''));
            this.history.push(state);
            
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            }
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    showShop() {
        try {
            this.switchTab('game');
            const shopSection = document.querySelector('.shop-section');
            if (shopSection) {
                shopSection.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error showing shop:', error);
        }
    }

    purchaseEnergy(energyAmount, price) {
        try {
            if (this.stars >= price) {
                this.stars -= price;
                this.energy += energyAmount;
                this.soundSystem.play('cash');
                this.saveGameState();
                this.updateUI();
            } else {
                alert(`Недостаточно алмазов! Нужно: ${price}`);
            }
        } catch (error) {
            console.error('Error purchasing energy:', error);
        }
    }

    addStars(amount) {
        try {
            this.stars += amount;
            this.stats.totalStarsEarned += amount;
            this.updateUI();
        } catch (error) {
            console.error('Error adding stars:', error);
        }
    }

    updateUI() {
        try {
            const currentLevel = document.getElementById('current-level');
            const moves = document.getElementById('moves');
            const energyCount = document.getElementById('energy-count');
            const starsCount = document.getElementById('stars-count');
            const restartBtn = document.getElementById('restart-btn');
            const undoBtn = document.getElementById('undo-btn');
            
            if (currentLevel) currentLevel.textContent = this.currentLevel;
            if (moves) moves.textContent = this.moves;
            if (energyCount) energyCount.textContent = this.energy;
            if (starsCount) starsCount.textContent = this.stars;
            
            if (this.energy <= 0) {
                if (restartBtn) restartBtn.disabled = true;
                if (undoBtn) undoBtn.disabled = true;
            } else {
                if (restartBtn) restartBtn.disabled = false;
                if (undoBtn) undoBtn.disabled = this.history.length === 0 || this.levelCompleted;
            }
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    updateStatsDisplay() {
        try {
            const levelsCompleted = document.getElementById('stat-levels-completed');
            const totalMoves = document.getElementById('stat-total-moves');
            const avgTime = document.getElementById('stat-avg-time');
            const bestStreak = document.getElementById('stat-best-streak');
            const totalStars = document.getElementById('stat-total-stars');
            const achievements = document.getElementById('stat-achievements');
            
            if (levelsCompleted) levelsCompleted.textContent = this.stats.levelsCompleted;
            if (totalMoves) totalMoves.textContent = this.stats.totalMoves;
            
            const avgTimeValue = this.stats.levelsCompleted > 0 ? 
                Math.floor(this.stats.totalTime / this.stats.levelsCompleted) : 0;
            const avgMinutes = Math.floor(avgTimeValue / 60);
            const avgSeconds = avgTimeValue % 60;
            
            if (avgTime) {
                avgTime.textContent = 
                    `${avgMinutes.toString().padStart(2, '0')}:${avgSeconds.toString().padStart(2, '0')}`;
            }
                
            if (bestStreak) bestStreak.textContent = this.stats.bestStreak;
            if (totalStars) totalStars.textContent = this.stats.totalStarsEarned;
            if (achievements) {
                achievements.textContent = 
                    `${this.achievementSystem.getUnlockedCount()}/${this.achievementSystem.getTotalCount()}`;
            }
        } catch (error) {
            console.error('Error updating stats display:', error);
        }
    }

    updateAllDisplays() {
        this.updateUI();
        this.updateStatsDisplay();
        this.achievementSystem.renderAchievementsList();
    }
}

// Инициализация игры
let game;
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('Загружаем игру...');
        game = new MellstroyGame();
        console.log('Игра успешно загружена!');
    } catch (error) {
        console.error('Ошибка загрузки игры:', error);
        
        // Показать сообщение об ошибке пользователю
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            font-family: Arial;
            max-width: 300px;
        `;
        errorDiv.innerHTML = `
            <h3>Ошибка загрузки игры</h3>
            <p>Попробуйте обновить страницу</p>
            <button onclick="location.reload()" style="padding: 10px; margin-top: 10px;">Обновить</button>
        `;
        document.body.appendChild(errorDiv);
    }
});
