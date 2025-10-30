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
        // 🟢 Sayfa yüklendiğinde sadece intro ekranını göstermeyi garanti et
        this.showCorrectSection(); 
        this.addRestartButton(); 
    }

    bindEvents() {
        console.log('🔗 Eventler bağlanıyor...');

        // TEST BAŞLAT BUTONU
        const startTestBtn = document.getElementById('startTestBtn');
        if (startTestBtn) {
            startTestBtn.addEventListener('click', () => {
                console.log('🧪 Test başlat butonuna tıklandı');
                // showSection'ı kaldırıyoruz, veri yüklendikten sonra startTest içinde çağrılacak.
                this.startTest();
            });
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

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateQuestion(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateQuestion(1));
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitTest());
        
        // TESTİ YENİDEN BAŞLAT BUTONU (Header'daki)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'restartTestBtn') {
                this.resetAndStartTest();
            }
        });
    }
    
    // --- Test Başlatma ve Veri Yükleme ---
    async startTest() {
        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.totalQuestions = 0;
        
        const testDataUrl = '../data/level_test.json'; 
        
        if (typeof loadData !== 'function') {
            document.getElementById('questionContainer').innerHTML = `<p style="color:red;">Hata: common.js'deki yükleme fonksiyonu bulunamadı.</p>`;
            this.showSection('levelTestSection');
            return;
        }

        try {
            console.log(`📡 Test verisi yükleniyor (URL: ${testDataUrl})...`);
            
            // Veri yükleniyor...
            this.testData = await loadData(testDataUrl); 

            if (!this.testData || !Array.isArray(this.testData) || this.testData.length === 0) {
                throw new Error("Test verisi yüklendi ancak boş veya geçerli bir dizi değil. JSON dosya içeriğini kontrol edin.");
            }

            this.totalQuestions = this.testData.length;
            this.totalQuestionCountSpan = document.getElementById('totalQuestionCount');
            
            if (this.totalQuestionCountSpan) {
                this.totalQuestionCountSpan.textContent = this.totalQuestions;
            }

            // 🟢 BAŞARILI YÜKLEME SONRASI GÖRÜNÜMÜ GEÇİR
            this.showSection('levelTestSection'); 

            this.renderQuestion(this.currentQuestion);
            this.updateNavigationButtons();

        } catch (error) {
            console.error('❌ Test verisi yükleme hatası:', error.message);
            
            document.getElementById('questionContainer').innerHTML = 
                `<div style="color: red; padding: 20px; border: 1px solid red; border-radius: 8px;">
                    <h2>Hata! Test Başlatılamadı.</h2>
                    <p>Detay: ${error.message}</p>
                    <p>⚠️ **VERİ HATASI:** Lütfen projenizdeki <strong>data/level_test.json</strong> dosyasının adı, konumu ve içeriğinin doğru JSON formatında olduğundan emin olun.</p>
                </div>`;
            this.showSection('levelTestSection'); 
        }
    }
    
    resetAndStartTest() {
        // Tüm section'ları gizle
        document.querySelectorAll('.module-section').forEach(sec => sec.style.display = 'none');
        
        // Giriş ekranını göster
        this.showSection('levelTestIntroSection');

        // State'leri sıfırla
        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.testData = [];
        
        // Sonuçları ve ilerleme yolunu temizle
        document.getElementById('resultsSection').innerHTML = '';
        document.getElementById('learningPathSection').innerHTML = '';
        
        // Sayaçları sıfırla
        const currentQNum = document.getElementById('currentQuestionNumber');
        const totalQCount = document.getElementById('totalQuestionCount');
        if (currentQNum) currentQNum.textContent = '0';
        if (totalQCount) totalQCount.textContent = '0';
    }

    // --- Soru Render Etme ---
    renderQuestion(index) {
        if (!this.testData[index]) return;

        const question = this.testData[index];
        const container = document.getElementById('questionContainer');
        
        let optionsHtml = question.options.map((option, i) => `
            <button class="answer-btn btn btn-option" data-answer="${option}" data-index="${i}" ${this.userAnswers[index] === option ? 'aria-pressed="true"' : ''}>
                ${option}
            </button>
        `).join('');

        container.innerHTML = `
            <div class="question-box">
                <p class="question-text">${index + 1}. ${question.text}</p>
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
        
        // Otomatik olarak bir sonraki soruya geç
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

            // İlerle butonu görünüyorsa Bitir butonu görünmemeli
            if (nextBtn && nextBtn.style.display === 'inline-block') {
                submitBtn.style.display = 'none';
            }
        }
    }
    
    updateProgressBar() {
        const progressBar = document.getElementById('testProgressBar');
        if (progressBar) {
            const progress = ((this.currentQuestion + 1) / this.totalQuestions) * 100;
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
            if (!confirm(`Henüz ${missingCount} soru daha cevaplanmadı. Testi yine de bitirmek istiyor musunuz?`)) {
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
                const weight = question.difficulty === 'hard' ? 3 : 
                               question.difficulty === 'medium' ? 2 : 1;
                this.score += weight;
            }
        });
        console.log(`🎯 Nihai Skor: ${this.score}`);
    }

    determineLevel() {
        const maxScore = this.testData.reduce((acc, q) => {
            const weight = q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1;
            return acc + weight;
        }, 0);
        
        const scorePercentage = this.totalQuestions > 0 ? (this.score / maxScore) * 100 : 0;
        
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
        const pathSection = document.getElementById('learningPathSection');

        resultsSection.innerHTML = `
            <div class="result-card">
                <h2>Tebrikler! Testi Tamamladınız.</h2>
                <div class="level-result">
                    <span class="level-badge level-${this.level.toLowerCase()}">${this.level}</span>
                    <h3>İngilizce Seviyeniz</h3>
                    <p class="score-summary">Toplam ${this.totalQuestions} sorudan, ağırlıklı puanınız ${this.score} oldu.</p>
                </div>
                <button id="viewPathBtn" class="btn btn-primary large" style="margin-top: 20px;">Öğrenme Yolumu Gör</button>
            </div>
        `;
        
        pathSection.style.display = 'none';

        document.getElementById('viewPathBtn').addEventListener('click', () => {
            this.renderLearningPath();
            this.showSection('learningPathSection');
        });
    }

    // --- Öğrenme Yolu ---
    renderLearningPath() {
        const contentContainer = document.getElementById('learningPathSection');
        contentContainer.innerHTML = `
            <h2>${this.level} Seviyesi Öğrenme Yolunuz</h2>
            <p class="path-description">Seviyenizdeki boşlukları doldurmak ve bir sonraki seviyeye geçmek için önerilen öğrenme planınız aşağıdadır.</p>
            
            <div class="path-stats">
                <div class="stat-card">
                    <h4>Mevcut Seviye</h4>
                    <span class="stat-value level-badge level-${this.level.toLowerCase()}">${this.level}</span>
                </div>
                <div class="stat-card">
                    <h4>Önerilen Günlük Kelime</h4>
                    <span class="stat-value">${this.getDailyGoal('words')} kelime</span>
                </div>
                <div class="stat-card">
                    <h4>Günlük Pratik Süresi</h4>
                    <span class="stat-value">${this.getDailyGoal('practice')} dakika</span>
                </div>
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
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
        }
    }
    
    // 🟢 DEĞİŞİKLİK BURADA: Sadece Intro'yu gösterirken, diğerlerini gizlediğimizden emin oluyoruz.
    showCorrectSection() {
        this.showSection('levelTestIntroSection');
        
        // Diğer bölümleri başlangıçta gizle (HTML'den style="display: none;" kaldırdığımız için JS ile gizliyoruz)
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
                // Butonu header'ın hemen sonrasına, sayfada her zaman görünür olacak şekilde ekle
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
