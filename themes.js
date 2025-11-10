// Система тем оформления
const themes = {
    casino: {
        name: 'Казино',
        colors: {
            primary: '#FFD700',
            secondary: '#DC143C',
            background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 50%, #16213e 100%)',
            text: '#F8F8FF',
            accent: '#8A2BE2'
        },
        class: 'theme-casino'
    },
    dark: {
        name: 'Темная',
        colors: {
            primary: '#00FF00',
            secondary: '#FF6B6B',
            background: 'linear-gradient(135deg, #0c0c0c, #1a1a1a)',
            text: '#ffffff',
            accent: '#4ECDC4'
        },
        class: 'theme-dark'
    },
    luxury: {
        name: 'Люкс',
        colors: {
            primary: '#C9B037',
            secondary: '#D4AF37',
            background: 'linear-gradient(135deg, #2c0b0e, #1a0b0e)',
            text: '#ffd700',
            accent: '#B8860B'
        },
        class: 'theme-luxury'
    },
    money: {
        name: 'Деньги',
        colors: {
            primary: '#32CD32',
            secondary: '#228B22',
            background: 'linear-gradient(135deg, #006400, #004d00)',
            text: '#ffffff',
            accent: '#FFD700'
        },
        class: 'theme-money'
    }
};

class ThemeSystem {
    constructor() {
        this.currentTheme = 'casino';
        this.loadTheme();
    }

    loadTheme() {
        try {
            const saved = localStorage.getItem('mellstroy_theme');
            if (saved && themes[saved]) {
                this.currentTheme = saved;
            }
            this.applyTheme(this.currentTheme);
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    }

    applyTheme(themeName) {
        try {
            const theme = themes[themeName];
            if (!theme) return;

            // Удаляем предыдущие классы тем
            Object.values(themes).forEach(t => {
                document.body.classList.remove(t.class);
            });

            // Добавляем новую тему
            document.body.classList.add(theme.class);
            
            // Применяем CSS переменные
            const root = document.documentElement;
            Object.entries(theme.colors).forEach(([key, value]) => {
                root.style.setProperty(`--casino-${key}`, value);
            });

            this.currentTheme = themeName;
            localStorage.setItem('mellstroy_theme', themeName);

            // Обновляем селектор темы в настройках
            const themeSelector = document.getElementById('theme-selector');
            if (themeSelector) {
                themeSelector.value = themeName;
            }
        } catch (error) {
            console.error('Error applying theme:', error);
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getAvailableThemes() {
        return Object.keys(themes);
    }
}
