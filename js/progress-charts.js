// js/progress-charts.js
const ProgressCharts = {
  initCharts() {
    const weeklyCtx = document.getElementById('weeklyChart');
    if (weeklyCtx) {
      new Chart(weeklyCtx, {
        type: 'line',
        data: { labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'], datasets: [{ label: 'Puan', data: [0,10,20,15,30,25,40], borderColor: '#6366f1', fill: true }]},
        options: { responsive: true, plugins: { title: { display: true, text: 'Haftalık İlerleme' }}}
      });
    }

    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
      new Chart(monthlyCtx, {
        type: 'bar',
        data: { labels: ['1', '5', '10', '15', '20', '25', '30'], datasets: [{ label: 'Kelime', data: [5,15,25,40,55,70,90], backgroundColor: '#a78bfa' }]},
        options: { responsive: true, plugins: { title: { display: true, text: 'Aylık İlerleme' }}}
      });
    }
  }
};
window.ProgressCharts = ProgressCharts;