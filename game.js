class MellstroyGame {
    constructor() {
        // Определяем мобильное устройство
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Mobile device detected:', this.isMobile);
        
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

        // Безопасная инициализация Telegram Web App
        try {
            this.Telegram = window.Telegram?.WebApp;
            if (this.Telegram) {
                console.log('Telegram Web App detected, initializing...');
                this.Telegram.ready();
                this.Telegram.expand();
                this.Telegram.setHeaderColor('#0A0A0A');
                this.Telegram.setBackgroundColor('#0A0A0A');
                console.log('Telegram Web App initialized successfully');
            } else {
                console.log('Telegram Web App not available, running in browser mode');
            }
        } catch (error) {
            console.error('Telegram Web App initialization error:', error);
            this.Telegram = null;
        }

        // Безопасная инициализация систем
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

    loadTelegramData() {
        try {
            const user = this.Telegram?.initDataUnsafe?.user;
            if (user) {
                console.log('Telegram user:', user);
            }
        } catch (error) {
            console.error('Error loading Telegram data:', error);
        }
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

    restoreEnergyOverTime() {
        if (!this.lastPlayed) return;
        
        try {
            const lastPlayed = new Date(this.lastPlayed);
            const now = new Date();
            const hoursDiff = (now - lastPlayed) / (1000 * 60 * 60);
            
            if (hoursDiff >= 24) {
                this.energy = 3;
                this.saveGameState();
            }
        } catch (error) {
            console.error('Error restoring energy:', error);
        }
    }

    checkConsecutiveDays() {
        try {
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
        } catch (error) {
            console.error('Error checking consecutive days:', error);
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
                restartBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.restartLevel();
                });
                restartBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.restartLevel();
                }, { passive: false });
            }

            if (undoBtn) {
                undoBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.undoMove();
                });
                undoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.undoMove();
                }, { passive: false });
            }

            if (nextLevelBtn) {
                nextLevelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.nextLevel();
                });
                nextLevelBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.nextLevel();
                }, { passive: false });
            }

            if (buyEnergyBtn) {
                buyEnergyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showShop();
                });
                buyEnergyBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showShop();
                }, { passive: false });
            }

            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.hideModals();
                });
                closeModalBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.hideModals();
                }, { passive: false });
            }

            // Навигация по вкладкам
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const tab = e.currentTarget.getAttribute('data-tab');
                    this.switchTab(tab);
                });
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const tab = e.currentTarget.getAttribute('data-tab');
                    this.switchTab(tab);
                }, { passive: false });
            });

            // Магазин
            document.querySelectorAll('.shop-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const energy = parseInt(e.currentTarget.getAttribute('data-energy'));
                    const price = parseInt(e.currentTarget.getAttribute('data-price'));
                    this.purchaseEnergy(energy, price);
                });
                item.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const energy = parseInt(e.currentTarget.getAttribute('data-energy'));
                    const price = parseInt(e.currentTarget.getAttribute('data-price'));
                    this.purchaseEnergy(energy, price);
                }, { passive: false });
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

            // Таблица лидеров
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const type = e.currentTarget.getAttribute('data-type');
                    this.switchLeaderboard(type);
                });
                tab.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const type = e.currentTarget.getAttribute('data-type');
                    this.switchLeaderboard(type);
                }, { passive: false });
            });

            // Управление с клавиатуры
            document.addEventListener('keydown', (e) => this.handleKeyPress(e));

            // Обработка свайпов для мобильных устройств
            this.setupTouchControls();
            
            // Принудительное обновление интерфейса
            setTimeout(() => {
                this.updateAllDisplays();
            }, 1000);
            
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

            gameBoard.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });

            gameBoard.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;

                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const diffX = startX - endX;
                const diffY = startY - endY;

                // Проверяем минимальное расстояние свайпа
                if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
                    if (Math.abs(diffX) > Math.abs(diffY)) {
                        // Горизонтальный свайп
                        if (diffX > 0) this.movePlayer(-1, 0); // Влево
                        else this.movePlayer(1, 0); // Вправо
                    } else {
                        // Вертикальный свайп
                        if (diffY > 0) this.movePlayer(0, -1); // Вверх
                        else this.movePlayer(0, 1); // Вниз
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

        // Не обрабатываем ходы если уровень завершен
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
            console.log('Switching to tab:', tabName);
            
            // Скрываем все вкладки
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active-tab');
                tab.style.display = 'none';
            });
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Показываем выбранную вкладку
            const targetTab = document.getElementById(`${tabName}-tab`);
            const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
            
            if (targetTab) {
                targetTab.classList.add('active-tab');
                targetTab.style.display = 'block';
                console.log('Tab shown:', tabName);
            }
            
            if (targetBtn) {
                targetBtn.classList.add('active');
            }

            // Принудительное обновление DOM
            setTimeout(() => {
                // Обновляем контент вкладки если нужно
                if (tabName === 'achievements') {
                    this.achievementSystem.renderAchievementsList();
                } else if (tabName === 'leaderboard') {
                    this.renderLeaderboard('levels');
                } else if (tabName === 'stats') {
                    this.updateStatsDisplay();
                }
                
                // Принудительный reflow
                if (targetTab) {
                    targetTab.offsetHeight;
                }
            }, 50);
            
        } catch (error) {
            console.error('Error switching tab:', error);
        }
    }

    switchLeaderboard(type) {
        try {
            document.querySelectorAll('.leaderboard-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            const targetTab = document.querySelector(`[data-type="${type}"]`);
            if (targetTab) targetTab.classList.add('active');
            
            this.renderLeaderboard(type);
        } catch (error) {
            console.error('Error switching leaderboard:', error);
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
            if (!board || !level) {
                console.error('Board or level not found');
                return;
            }
            
            console.log('Rendering level:', this.currentLevel);
            
            // Сохраняем текущий размер
            const currentWidth = board.offsetWidth;
            
            board.innerHTML = '';
            
            const rows = level.grid.length;
            const cols = level.grid[0].length;
            
            // Устанавливаем размеры сетки
            board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            
            // Рассчитываем размер клетки для мобильных устройств
            const cellSize = Math.min(35, Math.floor(currentWidth / cols) - 2);
            
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const cell = document.createElement('div');
                    const cellType = level.grid[y][x];
                    cell.className = `cell ${this.cellTypes[cellType] || 'empty'}`;
                    
                    // Устанавливаем фиксированный размер для мобильных
                    cell.style.width = `${cellSize}px`;
                    cell.style.height = `${cellSize}px`;
                    cell.style.minWidth = `${cellSize}px`;
                    cell.style.minHeight = `${cellSize}px`;
                    
                    // Кастомные символы для стиля Mellstroy
                    if (cellType === '@' || cellType === '+') {
                        cell.textContent = '🎭'; // Mellstroy
                        cell.style.fontSize = `${Math.max(12, cellSize - 15)}px`;
                    }
                    else if (cellType === '$') {
                        cell.textContent = '💰'; // Деньги
                        cell.style.fontSize = `${Math.max(12, cellSize - 15)}px`;
                    }
                    else if (cellType === '*') {
                        cell.textContent = '💎'; // Деньги в сейфе
                        cell.style.fontSize = `${Math.max(12, cellSize - 15)}px`;
                    }
                    else if (cellType === '.') {
                        cell.textContent = '🏦'; // Сейф
                        cell.style.fontSize = `${Math.max(12, cellSize - 15)}px`;
                    }
                    else if (cellType === '#') {
                        cell.textContent = '🎰'; // Стены казино
                        cell.style.fontSize = `${Math.max(10, cellSize - 20)}px`;
                    }
                    
                    board.appendChild(cell);
                }
            }

            // Принудительное обновление DOM
            setTimeout(() => {
                board.offsetHeight; // trigger reflow
                this.updateUI();
            }, 10);
            
        } catch (error) {
            console.error('Error rendering level:', error);
        }
    }

    movePlayer(dx, dy) {
        if (this.energy <= 0) {
            this.showNoEnergyModal();
            return;
        }

        // Не обрабатываем ходы если уровень завершен
        if (this.levelCompleted) return;

        try {
            const level = levels[this.currentLevel - 1];
            // Создаем глубокую копию сетки для работы
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
            
            // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Обновляем исходный уровень
            this.updateLevelGrid(grid);
            
            this.moves++;
            this.soundSystem.play('move');
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
            
            // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Обновляем исходный уровень
            this.updateLevelGrid(grid);
            
            this.moves++;
            this.soundSystem.play('push');
            this.checkLevelComplete();
            this.renderLevel();
        } catch (error) {
            console.error('Error executing push:', error);
        }
    }

    // НОВЫЙ МЕТОД: Обновление исходной сетки уровня
    updateLevelGrid(grid) {
        try {
            const level = levels[this.currentLevel - 1];
            // Преобразуем массив символов обратно в строки
            level.grid = grid.map(row => row.join(''));
        } catch (error) {
            console.error('Error updating level grid:', error);
        }
    }

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная проверка завершения уровня
    checkLevelComplete() {
        try {
            const level = levels[this.currentLevel - 1];
            const grid = level.grid;
            
            // Уровень завершен, когда все цели заняты коробками (нет '$' и '.')
            let hasBox = false;
            let hasTarget = false;
            
            for (let y = 0; y < grid.length; y++) {
                for (let x = 0; x < grid[y].length; x++) {
                    if (grid[y][x] === '$') {
                        hasBox = true;
                    }
                    if (grid[y][x] === '.') {
                        hasTarget = true;
                    }
                    // Если нашли и коробку и цель, можно выйти раньше
                    if (hasBox && hasTarget) break;
                }
                if (hasBox && hasTarget) break;
            }
            
            const levelComplete = !hasBox && !hasTarget;
            
            console.log('Level complete check:', { hasBox, hasTarget, levelComplete });

            if (levelComplete && !this.levelCompleted) {
                this.levelCompleted = true;
                this.stopTimer();
                setTimeout(() => {
                    this.completeLevel();
                }, 500);
            }
        } catch (error) {
            console.error('Error checking level completion:', error);
        }
    }

    completeLevel() {
        try {
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
            const finalMoves = document.getElementById('final-moves');
            const finalTime = document.getElementById('final-time');
            const starsEarnedElement = document.getElementById('stars-earned');
            const modal = document.getElementById('level-complete');
            
            if (finalMoves) finalMoves.textContent = this.moves;
            if (finalTime) finalTime.textContent = document.getElementById('timer')?.textContent || '00:00';
            if (starsEarnedElement) starsEarnedElement.textContent = starsEarned;
            if (modal) modal.classList.remove('hidden');
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
            
            // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Восстанавливаем исходное состояние уровня
            const originalLevel = this.originalLevels[this.currentLevel - 1];
            levels[this.currentLevel - 1] = JSON.parse(JSON.stringify(originalLevel));
            
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
                // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильно восстанавливаем уровень
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
            // Сохраняем состояние как массив строк
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
            // Переключаем на вкладку игры, где находится магазин
            this.switchTab('game');
            
            // Прокручиваем к магазину
            const shopSection = document.querySelector('.shop-section');
            if (shopSection) {
                shopSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            console.log('Shop opened');
        } catch (error) {
            console.error('Error showing shop:', error);
        }
    }

    async purchaseEnergy(energyAmount, price) {
        try {
            if (this.stars >= price) {
                this.stars -= price;
                this.energy += energyAmount;
                this.soundSystem.play('cash');
                this.saveGameState();
                this.updateUI();
            } else {
                await this.processTelegramPayment(price, energyAmount);
            }
        } catch (error) {
            console.error('Error purchasing energy:', error);
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
                if (restartBtn) {
                    restartBtn.disabled = true;
                    restartBtn.style.opacity = '0.5';
                }
                if (undoBtn) {
                    undoBtn.disabled = true;
                    undoBtn.style.opacity = '0.5';
                }
            } else {
                if (restartBtn) {
                    restartBtn.disabled = false;
                    restartBtn.style.opacity = '1';
                }
                if (undoBtn) {
                    undoBtn.disabled = this.history.length === 0 || this.levelCompleted;
                    undoBtn.style.opacity = (this.history.length === 0 || this.levelCompleted) ? '0.5' : '1';
                }
            }
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    forceUIUpdate() {
        try {
            // Принудительно обновляем все счетчики
            this.updateUI();
            this.updateStatsDisplay();
            
            // Принудительный reflow для игрового поля
            const gameBoard = document.getElementById('game-board');
            if (gameBoard) {
                gameBoard.style.display = 'none';
                gameBoard.offsetHeight; // trigger reflow
                gameBoard.style.display = 'grid';
            }
            
            console.log('UI forced update completed');
        } catch (error) {
            console.error('Error forcing UI update:', error);
        }
    }

    updateAllDisplays() {
        this.updateUI();
        this.updateStatsDisplay();
        this.achievementSystem.renderAchievementsList();
        this.renderLeaderboard('levels');
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

    renderLeaderboard(type) {
        try {
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
        } catch (error) {
            console.error('Error rendering leaderboard:', error);
        }
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
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('DOM loaded, initializing game...');
        game = new MellstroyGame();
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
        
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
