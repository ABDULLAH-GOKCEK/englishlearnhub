// progress-charts.js
class ProgressCharts {
    static charts = {};

    static initCharts() {
        this.initWeeklyChart();
        this.initMonthlyChart();
        this.initStatsChart();
        this.initAchievementsGrid();
    }

    static initWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        const weeklyStats = this.getWeeklyStats();
        const labels = weeklyStats.map(day => new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' }));
        const pointsData = weeklyStats.map(day => day.points);
        const wordsData = weeklyStats.map(day => day.words);

        if (this.charts.weeklyChart) this.charts.weeklyChart.destroy();

        this.charts.weeklyChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [
                { label: 'Puan', data: pointsData, borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', fill: true },
                { label: 'Kelime', data: wordsData, borderColor: '#f093fb', backgroundColor: 'rgba(240, 147, 251, 0.1)', fill: true }
            ]},
            options: { responsive: true, plugins: { title: { display: true, text: 'Haftalık İlerleme' }}}
        });
    }

    static getWeeklyStats() {
        const today = new Date();
        const stats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayData = JSON.parse(localStorage.getItem(`activity_${dateStr}`) || '{"points":0,"words":0}');
            stats.push({ date: dateStr, points: dayData.points || 0, words: dayData.words || 0 });
        }
        return stats;
    }

    static updateAllCharts() {
        this.destroyAllCharts();
        this.initCharts();
    }

    static destroyAllCharts() {
        Object.values(this.charts).forEach(chart => chart?.destroy());
        this.charts = {};
    }
}

window.ProgressCharts = ProgressCharts;