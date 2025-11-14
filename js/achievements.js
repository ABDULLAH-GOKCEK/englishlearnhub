// achievements.js - DÜZELTİLMİŞ VERSİYON
class AchievementSystem {
    constructor() {
        this.achievements = this.initializeAchievements();
    }

    initializeAchievements() {
        return [
            {
                id: 'first_steps',
                name: 'İlk Adımlar',
                description: 'İlk kelimeni öğren',
                icon: '🎯',
                condition: (profile) => (profile.stats?.totalWords || 0) >= 1,
                points: 10,
                category: 'başlangıç'
            },
            {
                id: 'word_learner',
                name: 'Kelime Öğrenici',
                description: '10 kelime öğren',
                icon: '📚',
                condition: (profile) => (profile.stats?.totalWords || 0) >= 10,
                points: 25,
                category: 'kelime'
            },
            {
                id: 'vocabulary_master',
                name: 'Kelime Ustası',
                description: '50 kelime öğren',
                icon: '🏆',
                condition: (profile) => (profile.stats?.totalWords || 0) >= 50,
                points: 100,
                category: 'kelime'
            },
            {
                id: 'word_expert',
                name: 'Kelime Uzmanı',
                description: '100 kelime öğren',
                icon: '🌟',
                condition: (profile) => (profile.stats?.totalWords || 0) >= 100,
                points: 200,
                category: 'kelime'
            },
            {
                id: 'streak_3',
                name: 'İstikrarlı',
                description: '3 gün üst üste çalış',
                icon: '🔥',
                condition: (profile) => (profile.streak || 0) >= 3,
                points: 30,
                category: 'disiplin'
            },
            {
                id: 'streak_7',
                name: 'Disiplinli',
                description: '7 gün üst üste çalış',
                icon: '⚡',
                condition: (profile) => (profile.streak || 0) >= 7,
                points: 70,
                category: 'disiplin'
            },
            {
                id: 'streak_30',
                name: 'Efsane',
                description: '30 gün üst üste çalış',
                icon: '💎',
                condition: (profile) => (profile.streak || 0) >= 30,
                points: 300,
                category: 'disiplin'
            },
            {
                id: 'accuracy_90',
                name: 'Keskin Nişancı',
                description: '%90 doğru cevap oranı',
                icon: '🎯',
                condition: (profile) => {
                    const stats = profile.stats || {};
                    const totalExercises = stats.totalExercises || 0;
                    if (totalExercises === 0) return false;
                    const accuracy = (stats.correctAnswers || 0) / totalExercises * 100;
                    return accuracy >= 90;
                },
                points: 80,
                category: 'performans'
            },
            {
                id: 'time_investor',
                name: 'Zaman Yatırımcısı',
                description: 'Toplam 1 saat çalış',
                icon: '⏰',
                condition: (profile) => (profile.stats?.timeSpent || 0) >= 60,
                points: 60,
                category: 'zaman'
            },
            {
                id: 'level_up_a2',
                name: 'Yolun Başı',
                description: 'A2 seviyesine ulaş',
                icon: '📈',
                condition: (profile) => profile.level === 'A2',
                points: 150,
                category: 'seviye'
            },
            {
                id: 'level_up_b1',
                name: 'Orta Seviye',
                description: 'B1 seviyesine ulaş',
                icon: '🎓',
                condition: (profile) => profile.level === 'B1',
                points: 300,
                category: 'seviye'
            },
            {
                id: 'level_up_b2',
                name: 'İleri Seviye',
                description: 'B2 seviyesine ulaş',
                icon: '🚀',
                condition: (profile) => profile.level === 'B2',
                points: 500,
                category: 'seviye'
            }
        ];
    }

    checkAchievements(profile) {
        if (!profile || !Array.isArray(profile.achievements)) {
            return [];
        }

        return this.achievements.filter(achievement => {
            try {
                return achievement.condition(profile) && !profile.achievements.includes(achievement.id);
            } catch (error) {
                console.warn('Achievement kontrol hatası:', achievement.id, error);
                return false;
            }
        });
    }

    showNotification(achievement) {
        if (!achievement) return;

        // Mevcut bildirimleri temizle
        document.querySelectorAll('.achievement-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-popup">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <h4>Yeni Rozet Kazandın!</h4>
                    <h3>${achievement.name}</h3>
                    <p>${achievement.description}</p>
                    <div class="achievement-points">+${achievement.points} puan</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // 4 saniye sonra kaldır
        setTimeout(() => notification.remove(), 4000);
    }

    getAchievementProgress(profile) {
        if (!profile) return [];

        return this.achievements.map(achievement => {
            const unlocked = Array.isArray(profile.achievements) && 
                           profile.achievements.includes(achievement.id);
            const progress = this.calculateProgress(achievement, profile);
            
            return {
                ...achievement,
                unlocked,
                progress: Math.max(0, Math.min(100, progress))
            };
        });
    }

    calculateProgress(achievement, profile) {
        if (!profile) return 0;

        const stats = profile.stats || {};
        try {
            switch(achievement.id) {
                case 'word_learner':
                    return Math.min(100, (stats.totalWords || 0) / 10 * 100);
                case 'vocabulary_master':
                    return Math.min(100, (stats.totalWords || 0) / 50 * 100);
                case 'word_expert':
                    return Math.min(100, (stats.totalWords || 0) / 100 * 100);
                case 'streak_3':
                    return Math.min(100, (profile.streak || 0) / 3 * 100);
                case 'streak_7':
                    return Math.min(100, (profile.streak || 0) / 7 * 100);
                case 'streak_30':
                    return Math.min(100, (profile.streak || 0) / 30 * 100);
                case 'time_investor':
                    return Math.min(100, (stats.timeSpent || 0) / 60 * 100);
                case 'accuracy_90':
                    const totalExercises = stats.totalExercises || 0;
                    if (totalExercises === 0) return 0;
                    return Math.min(100, (stats.correctAnswers || 0) / totalExercises * 100);
                default:
                    return achievement.condition(profile) ? 100 : 0;
            }
        } catch (error) {
            return 0;
        }
    }

    getAchievementsByCategory(profile) {
        const achievements = this.getAchievementProgress(profile);
        const categories = {};
        
        achievements.forEach(achievement => {
            const category = achievement.category || 'diğer';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(achievement);
        });
        
        return categories;
    }

    getTotalPoints(profile) {
        if (!profile || !Array.isArray(profile.achievements)) return 0;
        
        return this.achievements
            .filter(a => profile.achievements.includes(a.id))
            .reduce((total, a) => total + (a.points || 0), 0);
    }

    getUnlockedCount(profile) {
        return Array.isArray(profile?.achievements) ? profile.achievements.length : 0;
    }

    getTotalCount() {
        return this.achievements.length;
    }
}

// Global instance
AchievementSystem.instance = null;

// Static methods
AchievementSystem.getInstance = function() {
    if (!AchievementSystem.instance) {
        AchievementSystem.instance = new AchievementSystem();
    }
    return AchievementSystem.instance;
};

AchievementSystem.checkAchievements = function(profile) {
    return AchievementSystem.getInstance().checkAchievements(profile);
};

AchievementSystem.showNotification = function(achievement) {
    return AchievementSystem.getInstance().showNotification(achievement);
};

AchievementSystem.getAchievementProgress = function(profile) {
    return AchievementSystem.getInstance().getAchievementProgress(profile);
};

AchievementSystem.getAchievementsByCategory = function(profile) {
    return AchievementSystem.getInstance().getAchievementsByCategory(profile);
};

AchievementSystem.getTotalPoints = function(profile) {
    return AchievementSystem.getInstance().getTotalPoints(profile);
};

AchievementSystem.getUnlockedCount = function(profile) {
    return AchievementSystem.getInstance().getUnlockedCount(profile);
};

AchievementSystem.getTotalCount = function() {
    return AchievementSystem.getInstance().getTotalCount();
};

window.AchievementSystem = AchievementSystem;