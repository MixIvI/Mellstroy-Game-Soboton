// Система достижений для Mellstroy Game
const achievements = {
    firstSteps: {
        id: 'firstSteps',
        name: 'Первые шаги в казино',
        description: 'Пройдите первый уровень',
        icon: '🚶',
        reward: 5,
        condition: (stats) => stats.levelsCompleted >= 1,
        unlocked: false
    },
    level10: {
        id: 'level10',
        name: 'Начинающий крупье',
        description: 'Пройдите 10 уровней',
        icon: '🎯',
        reward: 10,
        condition: (stats) => stats.levelsCompleted >= 10,
        unlocked: false
    },
    level25: {
        id: 'level25',
        name: 'Опытный игрок',
        description: 'Пройдите 25 уровней',
        icon: '🎰',
        reward: 25,
        condition: (stats) => stats.levelsCompleted >= 25,
        unlocked: false
    },
    level50: {
        id: 'level50',
        name: 'Казино профессионал',
        description: 'Пройдите 50 уровней',
        icon: '💎',
        reward: 50,
        condition: (stats) => stats.levelsCompleted >= 50,
        unlocked: false
    },
    level100: {
        id: 'level100',
        name: 'Король казино',
        description: 'Пройдите все 100 уровней',
        icon: '👑',
        reward: 100,
        condition: (stats) => stats.levelsCompleted >= 100,
        unlocked: false
    },
    perfectLevel: {
        id: 'perfectLevel',
        name: 'Идеальная игра',
        description: 'Пройдите уровень за минимальное количество ходов',
        icon: '⭐',
        reward: 15,
        condition: (stats) => stats.perfectLevels >= 1,
        unlocked: false
    },
    speedRunner: {
        id: 'speedRunner',
        name: 'Спидранер',
        description: 'Пройдите уровень менее чем за 30 секунд',
        icon: '⚡',
        reward: 20,
        condition: (stats) => stats.fastCompletions >= 1,
        unlocked: false
    },
    moneyMover: {
        id: 'moneyMover',
        name: 'Перевозчик денег',
        description: 'Сделайте 1000 ходов',
        icon: '💰',
        reward: 30,
        condition: (stats) => stats.totalMoves >= 1000,
        unlocked: false
    },
    starCollector: {
        id: 'starCollector',
        name: 'Коллекционер алмазов',
        description: 'Заработайте 500 алмазов',
        icon: '💎',
        reward: 50,
        condition: (stats) => stats.totalStarsEarned >= 500,
        unlocked: false
    },
    noMistakes: {
        id: 'noMistakes',
        name: 'Без ошибок',
        description: 'Пройдите 5 уровней подряд без отмены хода',
        icon: '🎯',
        reward: 25,
        condition: (stats) => stats.bestStreak >= 5,
        unlocked: false
    },
    earlyBird: {
        id: 'earlyBird',
        name: 'Ранняя пташка',
        description: 'Играйте 3 дня подряд',
        icon: '🐦',
        reward: 15,
        condition: (stats) => stats.consecutiveDays >= 3,
        unlocked: false
    },
    nightOwl: {
        id: 'nightOwl',
        name: 'Ночная сова',
        description: 'Играйте после полуночи',
        icon: '🦉',
        reward: 20,
        condition: (stats) => stats.nightPlays >= 1,
        unlocked: false
    },
    energySaver: {
        id: 'energySaver',
        name: 'Экономный',
        description: 'Пройдите 10 уровней без покупки энергии',
        icon: '🔋',
        reward: 30,
        condition: (stats) => stats.levelsWithoutEnergyPurchase >= 10,
        unlocked: false
    },
    comebackKing: {
        id: 'comebackKing',
        name: 'Король возвращений',
        description: 'Вернитесь к игре после недельного перерыва',
        icon: '↩️',
        reward: 25,
        condition: (stats) => stats.comebacks >= 1,
        unlocked: false
    },
    socialButterfly: {
        id: 'socialButterfly',
        name: 'Социальная бабочка',
        description: 'Поделитесь игрой с друзьями',
        icon: '🦋',
        reward: 10,
        condition: (stats) => stats.shares >= 1,
        unlocked: false
    },
    luckyStreak: {
        id: 'luckyStreak',
        name: 'Счастливая серия',
        description: 'Пройдите 3 уровня подряд без единой ошибки',
        icon: '🍀',
        reward: 35,
        condition: (stats) => stats.luckyStreak >= 3,
        unlocked: false
    },
    persistence: {
        id: 'persistence',
        name: 'Упорство',
        description: 'Потратьте 50 единиц энергии',
        icon: '💪',
        reward: 40,
        condition: (stats) => stats.energySpent >= 50,
        unlocked: false
    },
    strategist: {
        id: 'strategist',
        name: 'Стратег',
        description: 'Используйте отмену хода 50 раз',
        icon: '🧠',
        reward: 25,
        condition: (stats) => stats.undoUsed >= 50,
        unlocked: false
    },
    explorer: {
        id: 'explorer',
        name: 'Исследователь',
        description: 'Испробуйте все темы оформления',
        icon: '🎨',
        reward: 20,
        condition: (stats) => stats.themesUnlocked >= 4,
        unlocked: false
    },
    completionist: {
        id: 'completionist',
        name: 'Завершитель',
        description: 'Получите все достижения',
        icon: '🏆',
        reward: 100,
        condition: (stats) => {
            const unlocked = Object.values(achievements).filter(a => a.unlocked).length;
            return unlocked >= Object.keys(achievements).length - 1;
        },
        unlocked: false
    }
};

class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.achievements = JSON.parse(JSON.stringify(achievements)); // Deep copy
        this.loadAchievements();
    }

    loadAchievements() {
        try {
            const saved = localStorage.getItem('mellstroy_achievements');
            if (saved) {
                const data = JSON.parse(saved);
                Object.keys(data).forEach(achievementId => {
                    if (this.achievements[achievementId]) {
                        this.achievements[achievementId].unlocked = data[achievementId];
                    }
                });
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    }

    saveAchievements() {
        try {
            const data = {};
            Object.keys(this.achievements).forEach(achievementId => {
                data[achievementId] = this.achievements[achievementId].unlocked;
            });
            localStorage.setItem('mellstroy_achievements', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving achievements:', error);
        }
    }

    checkAchievements(stats) {
        const newlyUnlocked = [];
        
        Object.values(this.achievements).forEach(achievement => {
            if (!achievement.unlocked && achievement.condition(stats)) {
                achievement.unlocked = true;
                newlyUnlocked.push(achievement);
                if (this.game && this.game.addStars) {
                    this.game.addStars(achievement.reward);
                }
                this.saveAchievements();
            }
        });

        return newlyUnlocked;
    }

    getUnlockedCount() {
        return Object.values(this.achievements).filter(a => a.unlocked).length;
    }

    getTotalCount() {
        return Object.keys(this.achievements).length;
    }

    renderAchievementsList() {
        try {
            const container = document.getElementById('achievements-list');
            if (!container) return;

            container.innerHTML = '';

            Object.values(this.achievements).forEach(achievement => {
                const achievementElement = document.createElement('div');
                achievementElement.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
                
                const progress = this.calculateAchievementProgress(achievement, this.game?.stats || {});
                
                achievementElement.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-desc">${achievement.description}</div>
                        ${!achievement.unlocked ? `
                            <div class="achievement-progress">
                                <div class="achievement-progress-bar" style="width: ${progress}%"></div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="achievement-reward">+💎${achievement.reward}</div>
                `;

                container.appendChild(achievementElement);
            });
        } catch (error) {
            console.error('Error rendering achievements list:', error);
        }
    }

    calculateAchievementProgress(achievement, stats) {
        if (achievement.unlocked) return 100;
        
        // Базовая логика прогресса - можно улучшить
        switch(achievement.id) {
            case 'firstSteps':
                return stats.levelsCompleted >= 1 ? 100 : 0;
            case 'level10':
                return Math.min((stats.levelsCompleted / 10) * 100, 100);
            case 'level25':
                return Math.min((stats.levelsCompleted / 25) * 100, 100);
            case 'level50':
                return Math.min((stats.levelsCompleted / 50) * 100, 100);
            case 'level100':
                return Math.min((stats.levelsCompleted / 100) * 100, 100);
            case 'moneyMover':
                return Math.min((stats.totalMoves / 1000) * 100, 100);
            case 'starCollector':
                return Math.min((stats.totalStarsEarned / 500) * 100, 100);
            case 'persistence':
                return Math.min((stats.energySpent / 50) * 100, 100);
            case 'strategist':
                return Math.min((stats.undoUsed / 50) * 100, 100);
            default:
                return 0;
        }
    }
}
