// js/user-progress.js – İlerleme kaydediyor
const UserProgress = {
  update(points = 0, words = 0) {
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

    this.updateDashboard();
  },
  updateStreak(current) {
    const last = localStorage.getItem('lastActivityDate') || today;
    localStorage.setItem('lastActivityDate', new Date().toISOString().split('T')[0]);
    const diff = (new Date() - new Date(last)) / 86400000;
    return diff === 1 ? current + 1 : diff === 0 ? current : 1;
  },
  updateDashboard() {
    const data = JSON.parse(localStorage.getItem('userProgress') || '{"totalPoints":0,"totalWords":0,"level":"A1","streak":0}');
    ['totalPoints', 'totalWords', 'streak', 'level'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = data[id] || 0;
    });
  }
};
window.UserProgress = UserProgress;