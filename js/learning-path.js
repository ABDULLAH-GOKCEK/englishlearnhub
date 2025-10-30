class LearningPath {
    constructor() {
        this.currentQuestion = 0;
        this.score = 0;
        this.testData = [];
        this.userAnswers = [];
        this.totalQuestions = 0;
        this.init();
    }

    init() {
        console.log('🚀 LearningPath başlatılıyor...');
        this.bindEvents();
        this.showCorrectSection(); 
        this.addRestartButton(); 
    }

    bindEvents() {
        console.log('🔗 Eventler bağlanıyor...');

        const startTestBtn = document.getElementById('startTestBtn');
        if (startTestBtn) {
            startTestBtn.addEventListener('click', () => {
                console.log('🧪 Test başlat butonuna tıklandı');
                this.startTest();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-btn')) {
                this.selectAnswer(e.target);
            }
        });

        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateQuestion(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateQuestion(1));
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitTest());
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'restartTestBtn') {
                this.resetAndStartTest();
            }
        });
    }
    
    // --- Test Başlatma ve Veri Yükleme ---
    async startTest() {
        const introSection = document.getElementById('levelTestIntroSection');
        if (introSection) {
             introSection.style.display = 'none';
        }

        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.totalQuestions = 0;
        
        // Veri yolu (root dizine göre)
        const testDataUrl = '../data/level_test.json'; 
        
        if (typeof loadData !== 'function') {
            document.getElementById('questionContainer').innerHTML = `<p style="color:red;">Hata: common.js'deki yükleme fonksiyonu bulunamadı.</p>`;
            this.showSection('levelTestSection');
            return;
        }

        try {
            console.log(`📡 Test verisi yükleniyor (URL: ${testDataUrl})...`);
            
            let loadedData = await loadData(testDataUrl); 
            
            // 🔴 KRİTİK KONTROL VE DÜZELTME
            // Eğer JSON dosyası sadece bir dizi içeriyorsa, direkt onu kullan.
            // Eğer JSON verisi bir nesne içinde bir dizi içeriyorsa (ör: { "questions": [...] }), 
            // doğru diziyi bulmaya çalış. Bu, common.js'den gelen data yükleme mantığıyla uyumlu olmalıdır.
            if (loadedData && Array.isArray(loadedData)) {
                 this.testData = loadedData;
            } else if (loadedData && loadedData.questions && Array.isArray(loadedData.questions)) {
                 this.testData = loadedData.questions;
            } else if (loadedData && loadedData.data && Array.isArray(loadedData.data)) {
                 this.testData = loadedData.data;
            } else {
                 // Yine de deneme amaçlı, yüklü olanı kullan.
                 this.testData = loadedData;
            }

            if (!this.testData || !Array.isArray(this.testData) || this.testData.length === 0) {
                throw new Error("Test verisi yüklendi ancak boş veya geçerli bir dizi değil. Yüklenen tip: " + (Array.isArray(loadedData) ? 'Array' : typeof loadedData));
            }

            this.totalQuestions = this.testData.length;
            const totalQCountSpan = document.getElementById('totalQuestionCount');
            if (totalQCountSpan) {
                totalQCountSpan.textContent = this.totalQuestions;
            }

            this.showSection('levelTestSection'); 
            this.renderQuestion(this.currentQuestion);
            this.updateNavigationButtons();

        } catch (error) {
            console.error('❌ Test verisi yükleme hatası:', error.message);
            document.getElementById('questionContainer').innerHTML = 
                `<div style="color: red; padding: 20px;"><h2>Hata! Test Başlatılamadı.</h2><p>Detay: ${error.message}</p></div>`;
            this.showSection('levelTestSection'); 
        }
    }
    
    resetAndStartTest() {
        document.querySelectorAll('.module-section').forEach(sec => sec.style.display = 'none');
        this.showSection('levelTestIntroSection');

        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.testData = [];
        
        document.getElementById('resultsSection').innerHTML = '';
        document.getElementById('learningPathSection').innerHTML = '';
        document.getElementById('questionContainer').innerHTML = 'Lütfen bekleyiniz, test yükleniyor...';
        
        const currentQNum = document.getElementById('currentQuestionNumber');
        const totalQCount = document.getElementById('totalQuestionCount');
        if (currentQNum) currentQNum.textContent = '0';
        if (totalQCount) totalQCount.textContent = '0';
    }

    // --- Soru Render Etme ---
    renderQuestion(index) {
        if (!this.testData[index]) {
            console.error(`Soru verisi mevcut değil: index ${index}`);
            return;
        }

        const question = this.testData[index];
        const container = document.getElementById('questionContainer');
        
        let optionsHtml = question.options.map((option, i) => `
            <button class="answer-btn btn btn-option" data-answer="${option}" data-index="${i}" ${this.userAnswers[index] === option ? 'aria-pressed="true"' : ''}>
                ${option}
            </button>
        `).join('');

        // 🟢 JSON dosyanızdaki "questionText" anahtarını kullanır
        const questionText = question.questionText || 'SORU METNİ YÜKLENEMEDİ'; 

        container.innerHTML = `
            <div class="question-box">
                <p class="question-text">${index + 1}. ${questionText}</p> 
                <div class="options-container">
                    ${optionsHtml}
                </div>
            </div>
        `;
        
        if (this.userAnswers[index]) {
            const selectedBtn = container.querySelector(`[data-answer="${this.userAnswers[index]}"]`);
            if (selectedBtn) {
                this.highlightAnswer(selectedBtn);
            }
        }
        
        const currentQuestionNumber = document.getElementById('currentQuestionNumber');
        if (currentQuestionNumber) {
            currentQuestionNumber.textContent = index + 1;
        }

        this.updateProgressBar(); 
    }
    
    // --- Cevap Seçimi ve Kayıt ---
    selectAnswer(button) {
        const questionIndex = this.currentQuestion;
        const answer = button.getAttribute('data-answer');
        
        this.userAnswers[questionIndex] = answer;
        
        const container = document.getElementById('questionContainer');
        container.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.removeAttribute('aria-pressed');
        });
        
        this.highlightAnswer(button);
        
        setTimeout(() => {
             this.navigateQuestion(1);
        }, 300); 
    }
    
    highlightAnswer(button) {
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
    }

    // --- Navigasyon ---
    navigateQuestion(direction) { 
        const newIndex = this.currentQuestion + direction;
        
        if (newIndex >= 0 && newIndex < this.totalQuestions) {
            this.currentQuestion = newIndex;
            this.renderQuestion(this.currentQuestion);
            this.updateNavigationButtons();
        } else if (newIndex === this.totalQuestions) {
             this.updateNavigationButtons(); 
             const submitBtn = document.getElementById('submitTestBtn');
             if (submitBtn && submitBtn.style.display !== 'none') {
                 this.submitTest();
             }
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');
        
        const lastQuestionIndex = this.totalQuestions - 1;

        if (prevBtn) {
            prevBtn.style.display = this.currentQuestion > 0 ? 'inline-block' : 'none';
        }

        if (nextBtn) {
            nextBtn.style.display = this.currentQuestion < lastQuestionIndex ? 'inline-block' : 'none';
        }
        
        if (submitBtn) {
            const allAnswered = this.userAnswers.length === this.totalQuestions && 
                                this.userAnswers.every(ans => ans !== undefined);
                                
            submitBtn.style.display = (this.currentQuestion === lastQuestionIndex || allAnswered) ? 'inline-block' : 'none';

            if (nextBtn && nextBtn.style.display === 'inline-block') {
                submitBtn.style.display = 'none';
            }
        }
    }
    
    updateProgressBar() { 
        const progressBar = document.getElementById('testProgressBar');
        if (progressBar) {
            const progress = (this.currentQuestion + 1) / this.totalQuestions * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    // --- Testi Bitirme ve Sonuçlar ---
    submitTest() {
        if (this.totalQuestions === 0) {
            alert("Test verisi yüklenemediği için skor hesaplanamıyor.");
            return;
        }
        
        const missingCount = this.totalQuestions - this.userAnswers.filter(ans => ans !== undefined).length;
        if (missingCount > 0) {
            if (!confirm(`Henüz ${missingCount} soru daha cevaplanmadı. Testi yine de bitirmek ister misiniz?`)) {
                return; 
            }
        }
        
        this.calculateScore();
        this.determineLevel();
        this.renderResults();
        this.showSection('resultsSection');
    }

    calculateScore() {
        this.score = 0;
        this.testData.forEach((question, index) => {
            if (this.userAnswers[index] && this.userAnswers[index] === question.correctAnswer) {
                this.score += 1; 
            }
        });
        console.log(`🎯 Nihai Skor: ${this.score}`);
    }

    determineLevel() {
        const totalPossibleScore = this.totalQuestions; 
        const scorePercentage = (this.score / totalPossibleScore) * 100;
        
        if (scorePercentage >= 85) this.level = 'C1';
        else if (scorePercentage >= 70) this.level = 'B2';
        else if (scorePercentage >= 50) this.level = 'B1';
        else if (scorePercentage >= 30) this.level = 'A2';
        else this.level = 'A1';
        
        if (typeof userProfile !== 'undefined') {
            userProfile.updateLevel(this.level);
        } else {
            localStorage.setItem('userLevel', this.level);
        }
    }

    renderResults() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.innerHTML = `
            <div class="result-card">
                <h2>Tebrikler! Testi Tamamladınız.</h2>
                <div class="level-result">
                    <span class="level-badge level-${this.level.toLowerCase()}">${this.level}</span>
                    <h3>İngilizce Seviyeniz</h3>
                    <p class="score-summary">Toplam ${this.totalQuestions} sorudan, ${this.score} doğru cevap verdiniz.</p>
                </div>
                <button id="viewPathBtn" class="btn btn-primary large" style="margin-top: 20px;">Öğrenme Yolumu Gör</button>
            </div>
        `;
        
        document.getElementById('viewPathBtn').addEventListener('click', () => {
            this.renderLearningPath();
            this.showSection('learningPathSection');
        });
    }

    // --- Öğrenme Yolu ---
    renderLearningPath() {
        const contentContainer = document.getElementById('learningPathSection');
        const contentHTML = `
            <h2>${this.level} Seviyesi Öğrenme Yolunuz</h2>
            <p class="path-description">Seviyenizdeki boşlukları doldurmak ve bir sonraki seviyeye geçmek için önerilen öğrenme planınız aşağıdadır.</p>
            
            <div class="path-stats">
                <div class="stat-card">
                    <h4>Mevcut Seviye</h4>
                    <span class="stat-value level-badge level-${this.level.toLowerCase()}">${this.level}</span>
                </div>
                <div class=\"stat-card\">\r\n<h4>Önerilen Günlük Kelime</h4>\r\n<span class=\"stat-value\">${this.getDailyGoal('words')} kelime</span>\r\n</div>
                <div class=\"stat-card\">\r\n<h4>Günlük Pratik Süresi</h4>\r\n<span class=\"stat-value\">${this.getDailyGoal('practice')} dakika</span>\r\n</div>
            </div>
            
            <h3 style="margin-top: 30px;">Pratik Alanları</h3>
            <div class="practice-cards">
                <div class="content-card">
                    <div class="content-icon">📚</div>
                    <h4>Kelime Kartları</h4>
                    <p>Seviyenize uygun temel kelimeler</p>
                    <button class="btn-primary" onclick="window.location.href='flashcards.html?level=${this.level}'">Başla</button>
                </div>
                <div class="content-card">
                    <div class="content-icon">📝</div>
                    <h4>Grammar Exercises</h4>
                    <p>Seviyenizdeki dilbilgisi konularını pekiştirin</p>
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
            
            <div class="path-footer">
                <p>Yeni bir seviyeye geçmeye hazır hissettiğinizde testi istediğiniz zaman yeniden başlatabilirsiniz.</p>
                <button id="restartTestBtnFooter" class="btn btn-secondary large">Testi Yeniden Başlat</button>
            </div>
        `;
        contentContainer.innerHTML = contentHTML;

        document.getElementById('restartTestBtnFooter').addEventListener('click', () => {
            this.resetAndStartTest();
        });
    }

    // --- Yardımcı Fonksiyonlar ---
    showSection(sectionId) {
        document.querySelectorAll('.module-section').forEach(sec => {
            sec.style.display = 'none';
            sec.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.setProperty('display', 'block', 'important'); 
            targetSection.classList.add('active');
        }
    }
    
    showCorrectSection() {
        this.showSection('levelTestIntroSection');
        
        const testSection = document.getElementById('levelTestSection');
        const resultsSection = document.getElementById('resultsSection');
        const learningPathSection = document.getElementById('learningPathSection');
        
        if (testSection) testSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (learningPathSection) learningPathSection.style.display = 'none';
    }
    
    addRestartButton() { 
        if (!document.getElementById('restartTestBtn')) {
            const button = document.createElement('button');
            button.id = 'restartTestBtn';
            button.className = 'btn restart-btn btn-secondary';
            button.textContent = '🔄 Ana Sayfaya Dön';
            
            const header = document.querySelector('header');
            if (header) {
                header.parentNode.insertBefore(button, header.nextSibling); 
            }
        }
    }

    startActivity(type) {
        alert(`🎯 ${type} aktivitesi başlatılıyor...\n\nBu özellik yakında eklenecek!`);
    }

    getCurrentLevel() {
        const saved = localStorage.getItem('englishLearnerProfile');
        if (saved) {
            const profile = JSON.parse(saved);
            return profile.level || 'A1';
        }
        return localStorage.getItem('userLevel') || 'A1';
    }

    getDailyGoal(type) {
        const level = this.getCurrentLevel();
        const goals = {
            'A1': { words: 5, grammar: 2, practice: 15 },
            'A2': { words: 8, grammar: 3, practice: 20 },
            'B1': { words: 12, grammar: 4, practice: 25 },
            'B2': { words: 15, grammar: 5, practice: 30 },
            'C1': { words: 20, grammar: 6, practice: 40 }
        };
        return (goals[level] || goals['A1'])[type];
    }
}

// SAYFA YÜKLENDİĞİNDE
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor');
    window.learningPath = new LearningPath();
});
