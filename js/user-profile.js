// user-profile.js - TAM GÜNCEL VERSİYON
class UserProfile {
    constructor() {
        this.profile = this.loadProfile();
        this.initializeDefaultStats();
    }

    loadProfile() {
        try {
            const saved = localStorage.getItem('englishLearnerProfile');
            if (saved) {
                const profile = JSON.parse(saved);
                console.log('📁 Profil yüklendi:', profile);
                return profile;
            }
        } catch (error) {
            console.error('❌ Profil yüklenirken hata:', error);
        }
        
        // Varsayılan profil
        const defaultProfile = {
            level: 'A1',
            dailyGoal: 5,
            learnedWords: 0,
            streak: 0,
            lastActive: null,
            weakAreas: [],
            strengths: [],
            testResults: null,
            weeklyProgress: this.initializeWeeklyProgress(),
            monthlyProgress: this.initializeMonthlyProgress(),
            achievements: [],
            stats: {
                totalWords: 0,
                totalExercises: 0,
                correctAnswers: 0,
                totalPoints: 0,
                timeSpent: 0,
                sessions: 0,
                dailyCompletions: 0
            },
            preferences: {
                focus: 'vocabulary',
                dailyTime: 30,
                learningStyle: 'visual'
            },
            dailyProgress: {
                wordsToday: 0,
                pointsToday: 0,
                exercisesToday: 0,
                date: new Date().toISOString().split('T')[0]
            }
        };
        
        console.log('🆕 Yeni profil oluşturuldu');
        return defaultProfile;
    }

    initializeDefaultStats() {
        const today = new Date().toISOString().split('T')[0];
        if (this.profile.dailyProgress.date !== today) {
            this.profile.dailyProgress = {
                wordsToday: 0,
                pointsToday: 0,
                exercisesToday: 0,
                date: today
            };
            this.saveProfile();
        }
    }

    initializeWeeklyProgress() {
        const week = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            week.push({
                date: date.toISOString().split('T')[0],
                points: Math.floor(Math.random() * 20),
                words: Math.floor(Math.random() * 15),
                exercises: Math.floor(Math.random() * 5),
                time: Math.floor(Math.random() * 30),
                completed: Math.random() > 0.3
            });
        }
        return week;
    }

    initializeMonthlyProgress() {
        const month = [];
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            month.push({
                day: i,
                points: i <= today.getDate() ? Math.floor(Math.random() * 25) : 0,
                words: i <= today.getDate() ? Math.floor(Math.random() * 20) : 0,
                exercises: i <= today.getDate() ? Math.floor(Math.random() * 6) : 0,
                completed: i <= today.getDate() ? Math.random() > 0.4 : false
            });
        }
        return month;
    }

    saveProfile() {
        try {
            localStorage.setItem('englishLearnerProfile', JSON.stringify(this.profile));
            console.log('💾 Profil kaydedildi');
        } catch (error) {
            console.error('❌ Profil kaydedilemedi:', error);
        }
    }

    updateDailyProgress(points = 0, words = 0, exercises = 0, time = 0) {
        const today = new Date().toISOString().split('T')[0];
        
        // Günlük progresi güncelle
        if (this.profile.dailyProgress.date === today) {
            this.profile.dailyProgress.wordsToday += words;
            this.profile.dailyProgress.pointsToday += points;
            this.profile.dailyProgress.exercisesToday += exercises;
        } else {
            this.profile.dailyProgress = {
                wordsToday: words,
                pointsToday: points,
                exercisesToday: exercises,
                date: today
            };
        }

        // Haftalık progresi güncelle
        const dayProgress = this.profile.weeklyProgress.find(day => day.date === today);
        if (dayProgress) {
            dayProgress.points += points;
            dayProgress.words += words;
            dayProgress.exercises += exercises;
            dayProgress.time += time;
            dayProgress.completed = dayProgress.words >= this.profile.dailyGoal;
        }

        // Aylık progresi güncelle
        const dayOfMonth = new Date().getDate();
        const monthProgress = this.profile.monthlyProgress.find(day => day.day === dayOfMonth);
        if (monthProgress) {
            monthProgress.points += points;
            monthProgress.words += words;
            monthProgress.exercises += exercises;
            monthProgress.completed = words >= this.profile.dailyGoal;
        }

        // Genel istatistikleri güncelle
        this.profile.stats.totalPoints += points;
        this.profile.stats.totalWords += words;
        this.profile.stats.totalExercises += exercises;
        this.profile.stats.timeSpent += time;
        this.profile.stats.sessions += 1;

        // Günlük hedef kontrolü
        if (this.profile.dailyProgress.wordsToday >= this.profile.dailyGoal) {
            this.profile.stats.dailyCompletions += 1;
        }

        this.updateStreak();
        this.checkAchievements();
        this.saveProfile();

        console.log(`📈 İlerleme: +${points}p, +${words}kelime, +${exercises}alıştırma`);
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastActive = this.profile.lastActive;
        
        if (!lastActive) {
            this.profile.streak = 1;
        } else {
            const lastDate = new Date(lastActive);
            const todayDate = new Date();
            const diffTime = todayDate - lastDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                this.profile.streak++;
            } else if (diffDays > 1) {
                this.profile.streak = 1;
            }
        }
        
        this.profile.lastActive = today;
    }

    addLearnedWords(count) {
        this.profile.learnedWords += count;
        this.updateDailyProgress(count, count, 0, 0);
    }

    addExerciseCompleted(correct, total, timeSpent = 5) {
        this.profile.stats.correctAnswers += correct;
        this.updateDailyProgress(correct * 0.5, 0, 1, timeSpent);
    }

    addTimeSpent(minutes) {
        this.updateDailyProgress(0, 0, 0, minutes);
    }

    checkAchievements() {
        if (typeof AchievementSystem !== 'undefined') {
            const achievements = AchievementSystem.checkAchievements(this.profile);
            achievements.forEach(achievement => {
                if (!this.profile.achievements.includes(achievement.id)) {
                    this.profile.achievements.push(achievement.id);
                    this.showAchievementNotification(achievement);
                }
            });
        }
    }

    showAchievementNotification(achievement) {
        if (typeof AchievementSystem !== 'undefined') {
            AchievementSystem.showNotification(achievement);
        }
    }

    setTestResults(results) {
        this.profile.testResults = results;
        this.profile.level = results.determinedLevel;
        this.profile.weakAreas = results.weakAreas;
        this.saveProfile();
        console.log('🎯 Test sonuçları kaydedildi:', results);
    }

    getWeeklyStats() {
        return this.profile.weeklyProgress;
    }

    getMonthlyStats() {
        return this.profile.monthlyProgress;
    }

    getDailyProgress() {
        return this.profile.dailyProgress;
    }

    getOverallStats() {
        const stats = this.profile.stats;
        const accuracy = stats.totalExercises > 0 ? 
            (stats.correctAnswers / stats.totalExercises) * 100 : 0;
        
        return {
            totalWords: stats.totalWords,
            totalPoints: stats.totalPoints,
            totalExercises: stats.totalExercises,
            accuracy: Math.round(accuracy),
            timeSpent: stats.timeSpent,
            sessions: stats.sessions,
            streak: this.profile.streak,
            level: this.profile.level,
            dailyCompletions: stats.dailyCompletions || 0
        };
    }

    getDailyPlan() {
        const plans = {
            'A1': {
                dailyWords: 5,
                focus: 'Temel kelimeler ve selamlaşma',
                activities: ['Kartlarla kelime öğrenme', 'Temel diyaloglar', 'Alfabe tekrarı'],
                pointsPerWord: 1
            },
            'A2': {
                dailyWords: 8,
                focus: 'Basit cümle yapıları',
                activities: ['Cümle kurma çalışması', 'Günlük konuşmalar', 'Temel gramer'],
                pointsPerWord: 1.2
            },
            'B1': {
                dailyWords: 12,
                focus: 'Orta seviye konuşma',
                activities: ['Okuma parçaları', 'Diyalog tamamlama', 'Zamanlar pratiği'],
                pointsPerWord: 1.5
            },
            'B2': {
                dailyWords: 15,
                focus: 'Akıcı konuşma',
                activities: ['Kompozisyon yazma', 'Dinleme pratiği', 'Kelime oyunları'],
                pointsPerWord: 2
            }
        };

        return plans[this.profile.level] || plans['A1'];
    }

    updateLevel(newLevel) {
        const oldLevel = this.profile.level;
        this.profile.level = newLevel;
        this.saveProfile();
        console.log(`🎓 Seviye güncellendi: ${oldLevel} → ${newLevel}`);
        return true;
    }

    isDailyGoalCompleted() {
        return this.profile.dailyProgress.wordsToday >= this.profile.dailyGoal;
    }

    getDailyGoalProgress() {
        const progress = (this.profile.dailyProgress.wordsToday / this.profile.dailyGoal) * 100;
        return Math.min(100, progress);
    }

    getWeeklyCompletionCount() {
        return this.profile.weeklyProgress.filter(day => day.completed).length;
    }

    getMonthlyCompletionCount() {
        return this.profile.monthlyProgress.filter(day => day.completed).length;
    }

    // Yeni metod: Profili sıfırla
    resetProfile() {
        this.profile = this.loadProfile();
        this.saveProfile();
        console.log('🔄 Profil sıfırlandı');
    }

    // Yeni metod: İstatistikleri getir
    getProgressReport() {
        const stats = this.getOverallStats();
        return {
            level: this.profile.level,
            streak: this.profile.streak,
            totalWords: stats.totalWords,
            totalPoints: stats.totalPoints,
            accuracy: stats.accuracy,
            timeSpent: stats.timeSpent,
            achievements: this.profile.achievements.length,
            dailyProgress: this.getDailyGoalProgress(),
            testResults: this.profile.testResults
        };
    }
}

// Global user profile instance
const userProfile = new UserProfile();

// Sayfa yüklendiğinde kontrol
document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 Kullanıcı profili hazır:', userProfile.profile);
});