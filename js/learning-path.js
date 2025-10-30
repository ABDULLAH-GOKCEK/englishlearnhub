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
        // Sayfa yüklendiğinde, sadece HTML'deki #levelTestIntroSection'ın görünür kalmasını sağlar.
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
                this.startTest(); // Sadece startTest'i çağır
            });
        }
        
        // ... (Diğer eventler aynı kalacak: selectAnswer, navigateQuestion, submitTest)
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
        // 🟢 GÜÇLENDİRME: Intro ekranını hemen gizle.
        const introSection = document.getElementById('levelTestIntroSection');
        if (introSection) {
             introSection.style.display = 'none';
        }
        
        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.totalQuestions = 0;
        
        const testDataUrl = '../data/level_test.json'; 
        
        // loadData'nın common.js'den geldiğini varsayıyoruz
        if (typeof loadData !== 'function') {
            document.getElementById('questionContainer').innerHTML = `<p style="color:red;">Hata: common.js'deki yükleme fonksiyonu bulunamadı.</p>`;
            this.showSection('levelTestSection');
            return;
        }

        try {
            console.log(`📡 Test verisi yükleniyor (URL: ${testDataUrl})...`);
            
            this.testData = await loadData(testDataUrl); 

            if (!this.testData || !Array.isArray(this.testData) || this.testData.length === 0) {
                throw new Error("Test verisi yüklendi ancak boş veya geçerli bir dizi değil.");
            }

            this.totalQuestions = this.testData.length;
            const totalQCountSpan = document.getElementById('totalQuestionCount');
            if (totalQCountSpan) {
                totalQCountSpan.textContent = this.totalQuestions;
            }

            // 🟢 BAŞARILI YÜKLEME SONRASI GÖRÜNÜMÜ GEÇİR
            this.showSection('levelTestSection'); 

            this.renderQuestion(this.currentQuestion);
            this.updateNavigationButtons();

        } catch (error) {
            console.error('❌ Test verisi yükleme hatası:', error.message);
            document.getElementById('questionContainer').innerHTML = 
                `<div style="color: red;"><h2>Hata! Test Başlatılamadı.</h2><p>Detay: ${error.message}</p></div>`;
            this.showSection('levelTestSection'); 
        }
    }
    
    resetAndStartTest() {
        // Tüm section'ları gizle
        document.querySelectorAll('.module-section').forEach(sec => sec.style.display = 'none');
        
        // Giriş ekranını göster (HTML'den gelen varsayılan stil ile)
        this.showSection('levelTestIntroSection');

        // State'leri sıfırla
        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];
        this.testData = [];
        
        // Sayfa içeriğini temizle
        document.getElementById('resultsSection').innerHTML = '';
        document.getElementById('learningPathSection').innerHTML = '';
        document.getElementById('questionContainer').innerHTML = 'Lütfen bekleyiniz, test yükleniyor...';
    }

    // --- Yardımcı Fonksiyonlar ---
    
    // KRİTİK FONKSİYON: CSS ÇAKIŞMASINI AŞAR
    showSection(sectionId) {
        // Tüm section'ları gizle
        document.querySelectorAll('.module-section').forEach(sec => {
            sec.style.display = 'none';
            sec.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            // KRİTİK: display: block !important ile zorla görünür yap
            targetSection.style.setProperty('display', 'block', 'important'); 
            targetSection.classList.add('active');
        }
    }
    
    // Başlangıçta sadece Intro'yu gösterir
    showCorrectSection() {
        // showSection, Intro'yu gösterirken diğerlerini zaten gizleyecek.
        this.showSection('levelTestIntroSection'); 
    }
    
    // ... (renderQuestion, selectAnswer, navigateQuestion, updateNavigationButtons,
    // updateProgressBar, submitTest, calculateScore, determineLevel, renderResults,
    // renderLearningPath, addRestartButton, startActivity, getCurrentLevel, getDailyGoal aynı kalacak) ...
    
    // Bu kısım tam kopyalamada bulunmuyorsa, dosyanın en altına eklediğinizden emin olun:
    renderQuestion(index) {
        // ... (renderQuestion fonksiyonunun tam içeriği) ...
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
    
    // ... (Diğer fonksiyonlar) ...
}

// SAYFA YÜKLENDİĞİNDE
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor');
    window.learningPath = new LearningPath();
});
