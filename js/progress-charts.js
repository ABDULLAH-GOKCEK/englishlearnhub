// progress-charts.js - Grafikler ve İstatistikler
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

        const weeklyStats = userProfile.getWeeklyStats();
        const labels = weeklyStats.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('tr-TR', { weekday: 'short' });
        });
        
        const pointsData = weeklyStats.map(day => day.points);
        const wordsData = weeklyStats.map(day => day.words);

        // Mevcut chart'ı temizle
        if (this.charts.weeklyChart) {
            this.charts.weeklyChart.destroy();
        }

        this.charts.weeklyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Günlük Puan',
                        data: pointsData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Kelime Sayısı',
                        data: wordsData,
                        borderColor: '#f093fb',
                        backgroundColor: 'rgba(240, 147, 251, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#f093fb',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Haftalık İlerleme',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#333',
                        padding: 20
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                    if (context.dataset.label.includes('Puan')) {
                                        label += ' puan';
                                    } else {
                                        label += ' kelime';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animations: {
                    tension: {
                        duration: 1000,
                        easing: 'linear'
                    }
                }
            }
        });
    }

    static initMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;

        const monthlyStats = userProfile.getMonthlyStats();
        const today = new Date().getDate();
        const labels = monthlyStats.map(day => day.day <= today ? `Gün ${day.day}` : '');
        const pointsData = monthlyStats.map(day => day.points);
        const completedData = monthlyStats.map(day => day.completed ? 1 : 0);

        // Mevcut chart'ı temizle
        if (this.charts.monthlyChart) {
            this.charts.monthlyChart.destroy();
        }

        this.charts.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Günlük Puan',
                        data: pointsData,
                        backgroundColor: 'rgba(102, 126, 234, 0.7)',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'Hedef Tamamlandı',
                        data: completedData,
                        backgroundColor: 'rgba(76, 175, 80, 0.3)',
                        borderColor: 'rgba(76, 175, 80, 0.8)',
                        borderWidth: 2,
                        type: 'line',
                        fill: false,
                        pointStyle: 'circle',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Aylık İlerleme',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#333',
                        padding: 20
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Puan: ${context.parsed.y}`;
                                } else {
                                    return context.parsed.y === 1 ? 'Hedef tamamlandı ✓' : 'Hedef tamamlanmadı';
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            maxRotation: 0
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    static initStatsChart() {
        const ctx = document.getElementById('statsChart');
        if (!ctx) return;

        const stats = userProfile.getOverallStats();
        const data = [
            stats.totalWords,
            stats.totalExercises,
            stats.timeSpent,
            stats.accuracy
        ];

        // Mevcut chart'ı temizle
        if (this.charts.statsChart) {
            this.charts.statsChart.destroy();
        }

        this.charts.statsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Toplam Kelime', 'Alıştırma Sayısı', 'Çalışma Süresi (dk)', 'Doğruluk Oranı (%)'],
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#667eea',
                        '#f093fb',
                        '#4ecdc4',
                        '#ff6b6b'
                    ],
                    borderColor: [
                        '#556cd6',
                        '#dd77e8',
                        '#3dbdb4',
                        '#e55a5a'
                    ],
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Genel İstatistikler',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#333',
                        padding: 20
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                let suffix = '';
                                
                                if (label.includes('Süre')) {
                                    suffix = ' dakika';
                                } else if (label.includes('Oranı')) {
                                    suffix = '%';
                                } else if (label.includes('Kelime')) {
                                    suffix = ' kelime';
                                } else {
                                    suffix = ' alıştırma';
                                }
                                
                                return `${label}: ${value}${suffix}`;
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }

    static initAchievementsGrid() {
        const container = document.getElementById('achievementsGrid');
        if (!container) return;

        const achievements = AchievementSystem.getAchievementProgress(userProfile.profile);
        
        // Kategorilere göre grupla
        const categories = {};
        achievements.forEach(achievement => {
            if (!categories[achievement.category]) {
                categories[achievement.category] = [];
            }
            categories[achievement.category].push(achievement);
        });

        let html = '';
        
        Object.keys(categories).forEach(category => {
            const categoryAchievements = categories[category];
            const unlockedCount = categoryAchievements.filter(a => a.unlocked).length;
            const totalCount = categoryAchievements.length;
            
            html += `
                <div class="achievement-category">
                    <h4 style="color: #333; margin: 0 0 15px 0; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
                        <span>${this.getCategoryDisplayName(category)}</span>
                        <span style="font-size: 0.9rem; color: #666;">${unlockedCount}/${totalCount}</span>
                    </h4>
                    <div class="achievements-category-grid">
                        ${categoryAchievements.map(achievement => `
                            <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                                <div class="achievement-icon">${achievement.icon}</div>
                                <div class="achievement-info">
                                    <h4>${achievement.name}</h4>
                                    <p>${achievement.description}</p>
                                    <div class="achievement-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${achievement.progress}%"></div>
                                        </div>
                                        <span>${Math.round(achievement.progress)}%</span>
                                    </div>
                                </div>
                                <div class="achievement-points">+${achievement.points}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    static getCategoryDisplayName(category) {
        const names = {
            'başlangıç': '🎯 Başlangıç',
            'kelime': '📚 Kelime Başarıları',
            'disiplin': '🔥 Disiplin',
            'performans': '⚡ Performans',
            'zaman': '⏰ Zaman Yatırımı',
            'seviye': '📈 Seviye Atlama'
        };
        return names[category] || category;
    }

    static updateAllCharts() {
        // Tüm chart'ları güncelle
        this.initWeeklyChart();
        this.initMonthlyChart();
        this.initStatsChart();
        this.initAchievementsGrid();
        
        console.log('📊 Tüm grafikler güncellendi');
    }

    static destroyAllCharts() {
        // Tüm chart'ları temizle
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    // Yeni: Progress verilerini dışa aktarma
    static exportProgressData() {
        const stats = userProfile.getOverallStats();
        const weeklyStats = userProfile.getWeeklyStats();
        const monthlyStats = userProfile.getMonthlyStats();
        const achievements = AchievementSystem.getAchievementProgress(userProfile.profile);
        
        const exportData = {
            exportDate: new Date().toISOString(),
            profile: userProfile.profile,
            stats: stats,
            weeklyProgress: weeklyStats,
            monthlyProgress: monthlyStats,
            achievements: achievements.filter(a => a.unlocked),
            totalPoints: AchievementSystem.getTotalPoints(userProfile.profile),
            unlockedAchievements: AchievementSystem.getUnlockedCount(userProfile.profile),
            totalAchievements: AchievementSystem.getTotalCount()
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    // Yeni: Progress raporu oluşturma
    static generateProgressReport() {
        const stats = userProfile.getOverallStats();
        const unlockedCount = AchievementSystem.getUnlockedCount(userProfile.profile);
        const totalCount = AchievementSystem.getTotalCount();
        const totalPoints = AchievementSystem.getTotalPoints(userProfile.profile);
        
        const report = `
İLERLEME RAPORU
────────────────
📊 Genel İstatistikler:
   • Toplam Kelime: ${stats.totalWords}
   • Alıştırma Sayısı: ${stats.totalExercises}
   • Doğruluk Oranı: ${stats.accuracy}%
   • Çalışma Süresi: ${stats.timeSpent} dakika
   • Gün Streak: ${stats.streak}

🏆 Başarılar:
   • Rozetler: ${unlockedCount}/${totalCount}
   • Toplam Puan: ${totalPoints}

📈 Mevcut Seviye: ${stats.level}
────────────────
Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}
        `.trim();
        
        return report;
    }
}

// Global charts instance
window.ProgressCharts = ProgressCharts;

// Sayfa yüklendiğinde chart'ları başlat
document.addEventListener('DOMContentLoaded', function() {
    // Chart.js yüklendi mi kontrol et
    if (typeof Chart !== 'undefined') {
        console.log('📈 Chart.js yüklendi, grafikler hazır');
    } else {
        console.warn('❌ Chart.js yüklenmedi, grafikler gösterilemeyecek');
    }
});