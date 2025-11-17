// js/user-progress.js
const UserProgress = {
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  load(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  },
  updateDashboard() {
    document.getElementById('totalPoints').textContent = this.load('points', 0);
    document.getElementById('totalWords').textContent = this.load('words', 0);
    document.getElementById('streak').textContent = this.load('streak', 0);
    document.getElementById('level').textContent = this.load('level', 'A1');
  }
};