// js/user-progress.js
class UserProgress {
    static update(points = 0, words = 0) {
        const today = new Date().toISOString().split('T')[0];
        const dayKey = `activity_${today}`;
        const dayData = JSON.parse(localStorage.getItem(dayKey) || '{"points":0,"words":0}');
        dayData.points += points;
        dayData.words += words;
        localStorage.setItem(dayKey, JSON.stringify(dayData));

        const total = JSON.parse(localStorage.getItem('userProgress') || '{"totalPoints":0,"totalWords":0,"level":"A1","streak":0}');
        total.totalPoints += points;
        total.totalWords += words;
        total.streak = this.updateStreak(total.streak);
        localStorage.setItem('userProgress', JSON.stringify(total));

        // Grafik güncelle
        if (typeof ProgressCharts !== 'undefined') {
            setTimeout(() => ProgressCharts.updateAllCharts(), 100);
        }

        // Dashboard güncelle
        this.updateDashboard();
    }

    static updateStreak(current) {
        const last = localStorage.getItem('lastActivityDate');
        const today = new Date().toISOString().split('T')[0];
        if (!last) return 1;
        const diff = (new Date(today) - new Date(last)) / 86400000;
        return diff === 1 ? current + 1 : diff === 0 ? current : 1;
    }

    static updateDashboard() {
        const data = JSON.parse(localStorage.getItem('userProgress') || '{"totalPoints":0,"totalWords":0,"level":"A1","streak":0}');
        document.getElementById('totalPoints')?.then(e => e.textContent = data.totalPoints);
        document.getElementById('totalWords')?.then(e => e.textContent = data.totalWords);
        document.getElementById('level')?.then(e => e.textContent = data.level);
        document.getElementById('streak')?.then(e => e.textContent = data.streak);
    }
}

window.UserProgress = UserProgress;