// Система звуков для игры
class SoundSystem {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.loadSounds();
    }

    loadSounds() {
        try {
            this.sounds = {
                move: document.getElementById('move-sound'),
                push: document.getElementById('push-sound'),
                complete: document.getElementById('complete-sound'),
                achievement: document.getElementById('achievement-sound'),
                cash: document.getElementById('cash-sound')
            };

            // Устанавливаем громкость и обработку ошибок
            Object.values(this.sounds).forEach(sound => {
                if (sound) {
                    sound.volume = 0.3;
                    sound.addEventListener('error', () => {
                        console.warn('Sound file not found:', sound.src);
                    });
                }
            });
        } catch (error) {
            console.error('Error loading sounds:', error);
        }
    }

    play(soundName) {
        if (!this.enabled) return;
        
        try {
            const sound = this.sounds[soundName];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => {
                    console.log('Audio play failed:', e);
                });
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
