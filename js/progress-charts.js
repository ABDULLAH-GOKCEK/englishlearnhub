// js/progress-charts.js
class ProgressCharts {
    static charts = {};

    static initCharts() {
        this.initWeeklyChart();
        this.initMonthlyChart();
    }

    static initWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const data = this.getLast7Days();

        if (this.charts.weekly) this.charts.weekly.destroy();
        this.charts.weekly = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Puan', data, borderColor: '#6366f1', fill: true }] },
            options: { responsive: true, plugins: { title: { display: true, text: 'Haftalık' }}}
        });
    }

    static initMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;

        const labels = Array.from({length: 30}, (_, i) => i + 1);
        const data = this.getLast30Days();

        if (this.charts.monthly) this.charts.monthly.destroy();
        this.charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Kelime', data, backgroundColor: '#8b5cf6' }] },
            options: { responsive: true, plugins: { title: { display: true, text: 'Aylık' }}}
        });
    }

    static getLast7Days() {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = `activity_${date.toISOString().split('T')[0]}`;
            const day = JSON.parse(localStorage.getItem(key) || '{"points":0}');
            data.push(day.points || 0);
        }
        return data;
    }

    static getLast30Days() {
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = `activity_${date.toISOString().split('T')[0]}`;
            const day = JSON.parse(localStorage.getItem(key) || '{"words":0}');
            data.push(day.words || 0);
        }
        return data;
    }

    static updateAll() {
        this.initCharts();
    }
}

window.ProgressCharts = ProgressCharts;