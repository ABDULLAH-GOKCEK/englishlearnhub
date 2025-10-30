class LearningPath {
    constructor() {
        this.currentQuestion = 0;
        this.score = 0;
        this.testData = [];
        this.userAnswers = [];
        this.init();
    }

    init() {
        console.log('🚀 LearningPath başlatılıyor...');
        this.bindEvents();
        this.showCorrectSection();
    }

    bindEvents() {
        console.log('🔗 Eventler bağlanıyor...');

        // TEST BAŞLAT BUTONU - Kesin çözüm
        const startTestBtn = document.getElementById('startTestBtn');
        if (startTestBtn) {
            startTestBtn.addEventListener('click', () => {
                console.log('🧪 Test başlat butonuna tıklandı');
                this.showSection('levelTestSection');
                this.startTest();
            });
        } else {
            console.log('❌ startTestBtn bulunamadı!');
        }

        // CEVAP BUTONLARI
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-btn')) {
                this.selectAnswer(e.target);
            }
        });

        // TEST NAVIGASYON BUTONLARI
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.prevQuestion());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitTest());

        // TESTİ YENİDEN BAŞLAT
        document.addEventListener('click', (e) => {
            if (e.target.id === 'restartTestBtn') {
                this.restartTest();
            }
        });
    }

    // SECTION YÖNETİMİ
    showSection(sectionId) {
        console.log('📁 Section gösteriliyor:', sectionId);
        
        // Tüm section'ları gizle
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // İstenen section'ı göster
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    showCorrectSection() {
        const saved = localStorage.getItem('englishLearnerProfile');
        
        if (saved) {
            try {
                const profile = JSON.parse(saved);
                if (profile.testResults) {
                    this.showSection('learningPathSection');
                    setTimeout(() => this.loadProfileForDisplay(), 100);
                    return;
                }
            } catch (e) {
                console.log('Profil okuma hatası:', e);
            }
        }
        
        this.showSection('welcomeSection');
    }

    // TEST İŞLEVLERİ
    startTest() {
        console.log('🧪 TEST BAŞLATILIYOR...');
        this.loadTestData();
        this.showQuestion(0);
    }

    loadTestData() {
        this.testData = [
            {
                id: 1,
                question: "Hello, how ___ you?",
                answers: ["is", "are", "am", "be"],
                correct: 1,
                area: "Basic Verbs"
            },
            {
                id: 2, 
                question: "She ___ to school every day.",
                answers: ["go", "goes", "going", "went"],
                correct: 1,
                area: "Present Simple"
            },
            {
                id: 3,
                question: "If I ___ time, I will call you.",
                answers: ["have", "has", "had", "will have"],
                correct: 0,
                area: "Conditionals"
            },
            {
                id: 4,
                question: "They ___ watching TV when I arrived.",
                answers: ["are", "were", "is", "was"],
                correct: 1,
                area: "Past Continuous"
            },
            {
                id: 5,
                question: "This is ___ book I told you about.",
                answers: ["a", "an", "the", "-"],
                correct: 2,
                area: "Articles"
            }
        ];
        
        this.userAnswers = new Array(this.testData.length).fill(null);
        this.currentQuestion = 0;
        this.score = 0;
    }

    showQuestion(questionIndex) {
        if (questionIndex < 0 || questionIndex >= this.testData.length) return;
        
        this.currentQuestion = questionIndex;
        const question = this.testData[questionIndex];
        
        // SORU METNİ
        const questionElement = document.getElementById('questionText');
        if (questionElement) {
            questionElement.textContent = question.question;
        }

        // CEVAPLAR
        const answersContainer = document.getElementById('answersContainer');
        if (answersContainer) {
            answersContainer.innerHTML = '';
            question.answers.forEach((answer, index) => {
                const isSelected = this.userAnswers[questionIndex] === index;
                const button = document.createElement('button');
                button.className = isSelected ? 'answer-btn selected' : 'answer-btn';
                button.textContent = answer;
                button.dataset.index = index;
                answersContainer.appendChild(button);
            });
        }
        
        this.updateProgress();
        this.updateNavigationButtons();
    }

    selectAnswer(button) {
        const answerIndex = parseInt(button.dataset.index);
        this.userAnswers[this.currentQuestion] = answerIndex;
        
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        button.classList.add('selected');
    }

    prevQuestion() {
        if (this.currentQuestion > 0) {
            this.showQuestion(this.currentQuestion - 1);
        }
    }

    nextQuestion() {
        if (this.currentQuestion < this.testData.length - 1) {
            this.showQuestion(this.currentQuestion + 1);
        }
    }

    updateProgress() {
        const progressText = document.getElementById('progressText');
        const progressBar = document.getElementById('progressBar');
        
        if (progressText) {
            progressText.textContent = `Soru ${this.currentQuestion + 1}/${this.testData.length}`;
        }
        
        if (progressBar) {
            const progress = ((this.currentQuestion + 1) / this.testData.length) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');
        
        if (prevBtn) prevBtn.style.display = this.currentQuestion > 0 ? 'inline-block' : 'none';
        if (nextBtn) nextBtn.style.display = this.currentQuestion < this.testData.length - 1 ? 'inline-block' : 'none';
        if (submitBtn) submitBtn.style.display = this.currentQuestion === this.testData.length - 1 ? 'inline-block' : 'none';
    }

    submitTest() {
        // Skoru hesapla
        this.calculateScore();
        
        // Sonuçları hazırla
        const results = {
            score: Math.round((this.score / this.testData.length) * 100),
            correctAnswers: this.score,
            totalQuestions: this.testData.length,
            determinedLevel: this.determineLevel(),
            weakAreas: this.analyzeWeakAreas(),
            levelExplanation: this.getLevelExplanation(),
            testDate: new Date().toISOString()
        };
        
        // Kaydet
        this.saveTestResults(results);
        
        // Learning Path'e git
        this.showSection('learningPathSection');
        setTimeout(() => this.loadProfileForDisplay(), 100);
    }

    calculateScore() {
        this.score = 0;
        this.testData.forEach((question, index) => {
            if (this.userAnswers[index] === question.correct) {
                this.score++;
            }
        });
    }

    determineLevel() {
        const percentage = (this.score / this.testData.length) * 100;
        if (percentage >= 80) return 'B2';
        if (percentage >= 60) return 'B1';
        if (percentage >= 40) return 'A2';
        return 'A1';
    }

    analyzeWeakAreas() {
        const areas = {};
        this.testData.forEach((question, index) => {
            if (this.userAnswers[index] !== question.correct) {
                areas[question.area] = (areas[question.area] || 0) + 1;
            }
        });
        return Object.keys(areas).slice(0, 3);
    }

    getLevelExplanation() {
        const level = this.determineLevel();
        const explanations = {
            'A1': 'Başlangıç seviyesindesin. Temel kelimeler ve basit cümleler üzerine odaklan.',
            'A2': 'Temel seviyedesin. Günlük konuşmaları anlamaya başla ve basit diyaloglar kur.',
            'B1': 'Orta seviyedesin. Kendini ifade etmeye ve daha karmaşık cümleler kurmaya çalış.',
            'B2': 'İleri seviyedesin. Akıcı konuşma ve karmaşık metinleri anlama üzerine çalış.'
        };
        return explanations[level] || 'Seviye belirlendi.';
    }

    saveTestResults(results) {
        const profile = {
            testResults: results,
            level: results.determinedLevel,
            stats: {
                totalExercises: 1,
                totalPoints: results.score,
                totalWords: 0
            },
            dailyProgress: {
                wordsToday: 0,
                pointsToday: results.score,
                exercisesToday: 1,
                date: new Date().toISOString().split('T')[0]
            },
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('englishLearnerProfile', JSON.stringify(profile));
    }

    restartTest() {
        if (confirm('Testi yeniden başlatmak istediğinizden emin misiniz?')) {
            localStorage.removeItem('englishLearnerProfile');
            this.showSection('welcomeSection');
        }
    }

    // ÖĞRENME YOLU
    loadProfileForDisplay() {
        try {
            const saved = localStorage.getItem('englishLearnerProfile');
            if (saved) {
                const profile = JSON.parse(saved);
                this.showLevelInfo(profile);
                this.updateDashboard(profile);
                this.showWeeklyPlan();
                this.showRecommendedContent();
                this.addRestartButton();
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
        }
    }

    showLevelInfo(profile) {
        const results = profile.testResults;
        if (!results) return;

        const levelHTML = `
            <div class="level-explanation-card">
                <div class="level-header">
                    <h3 style="margin: 0; color: white;">🎓 Seviye Sonucun: <span class="level-badge">${results.determinedLevel}</span></h3>
                    <div class="level-score">${results.score}% Başarı</div>
                </div>
                <p class="level-description">${results.levelExplanation}</p>
                <div class="level-details">
                    <div class="detail-item">
                        <span class="detail-label">Doğru Cevaplar:</span>
                        <span class="detail-value">${results.correctAnswers}/${results.totalQuestions}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Geliştirilecek Alanlar:</span>
                        <span class="detail-value">${results.weakAreas.length > 0 ? results.weakAreas.join(', ') : 'Çok iyi! 🎉'}</span>
                    </div>
                </div>
            </div>
        `;

        const existing = document.querySelector('.level-explanation-card');
        if (existing) existing.remove();

        const pathHeader = document.querySelector('.path-header');
        if (pathHeader) {
            pathHeader.insertAdjacentHTML('afterend', levelHTML);
        }
    }

    updateDashboard(profile) {
        const elements = {
            'userLevel': profile.level,
            'dailyGoal': '10',
            'learnedWords': profile.stats?.totalWords || '0',
            'streakDays': '0'
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = elements[id];
        });

        const greeting = document.getElementById('userGreeting');
        if (greeting) {
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'Tünaydın' : 'İyi akşamlar';
            greeting.textContent = `${timeGreeting}! ${profile.level} seviyesindesin.`;
        }
    }

    showWeeklyPlan() {
        const planContainer = document.getElementById('weeklyPlan');
        if (!planContainer) return;

        const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const tasks = [
            '5 yeni kelime öğren',
            '3 gramer kuralı çalış',
            'Dinleme pratiği yap',
            'Okuma çalışması yap',
            'Konuşma pratiği yap',
            'Yazma alıştırması yap',
            'Tekrar günü'
        ];

        const today = new Date().getDay();
        const adjustedToday = today === 0 ? 6 : today - 1;

        let planHTML = '<div class="weekly-plan">';
        days.forEach((day, index) => {
            const isToday = index === adjustedToday;
            const dayClass = isToday ? 'day-card today' : 'day-card';
            
            planHTML += `
                <div class="${dayClass}">
                    <div class="day-name">${day}</div>
                    <div class="day-task">${tasks[index]}</div>
                    ${isToday ? '<div class="today-badge">Bugün</div>' : ''}
                </div>
            `;
        });
        planHTML += '</div>';
        planContainer.innerHTML = planHTML;
    }

    showRecommendedContent() {
        const contentContainer = document.getElementById('recommendedContent');
        if (!contentContainer) return;

        const contentHTML = `
            <div class="content-grid">
                <div class="content-card">
                    <div class="content-icon">📚</div>
                    <h4>Grammar Lessons</h4>
                    <p>Temel gramer kurallarını öğren ve pratik yap</p>
                    <button class="btn-primary" onclick="learningPath.startActivity('grammar')">Başla</button>
                </div>
                <div class="content-card">
                    <div class="content-icon">🎧</div>
                    <h4>Listening Practice</h4>
                    <p>İngilizce dinleme becerilerini geliştir</p>
                    <button class="btn-primary" onclick="learningPath.startActivity('listening')">Başla</button>
                </div>
                <div class="content-card">
                    <div class="content-icon">💬</div>
                    <h4>Speaking Exercises</h4>
                    <p>Konuşma pratiği yap ve telaffuzunu geliştir</p>
                    <button class="btn-primary" onclick="learningPath.startActivity('speaking')">Başla</button>
                </div>
            </div>
        `;
        contentContainer.innerHTML = contentHTML;
    }

    addRestartButton() {
        if (!document.getElementById('restartTestBtn')) {
            const button = document.createElement('button');
            button.id = 'restartTestBtn';
            button.className = 'restart-btn';
            button.textContent = '🔄 Testi Yeniden Başlat';
            
            const container = document.querySelector('.learning-path-container');
            if (container) {
                container.appendChild(button);
            }
        }
    }

    startActivity(type) {
        alert(`🎯 ${type} aktivitesi başlatılıyor...\n\nBu özellik yakında eklenecek!`);
    }
}

// SAYFA YÜKLENDİĞİNDE
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor');
    window.learningPath = new LearningPath();
});
