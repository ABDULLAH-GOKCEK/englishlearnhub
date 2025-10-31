/**
 * learning-path.js
 * Seviye Testi ve Öğrenme Yolu Modülünün Ana Logic'i (TAMAMEN GÜNCEL)
 */

console.log('🚀 LearningPath başlatılıyor...');

const LearningPath = {
    allQuestions: [], // Tüm soruları tutacak dizi
    userAnswers: [], // Kullanıcının cevaplarını tutacak dizi
    currentQuestionIndex: 0, // Şu anki soru numarası
    totalQuestions: 0,
    testStarted: false,
    
    // =================================================================
    // 1. BAŞLATMA VE EVENT YÖNETİMİ
    // =================================================================

    init: function() {
        console.log('🔗 Eventler bağlanıyor...');
        // startTestBtn, test bittiğinde sıfırlama mekanizması ile tekrar aktif edilir.
        document.getElementById('startTestBtn').addEventListener('click', this.startTest.bind(this));
        
        document.getElementById('nextQuestionBtn').addEventListener('click', this.navigateTest.bind(this, 1));
        document.getElementById('prevQuestionBtn').addEventListener('click', this.navigateTest.bind(this, -1));
        document.getElementById('submitTestBtn').addEventListener('click', this.submitTest.bind(this));

        // Sayfa yüklendiğinde her zaman giriş ekranını göster
        this.resetTest(); 
    },
    
    // =================================================================
    // 2. TESTİ SIFIRLAMA VE BAŞLATMA (YENİ EKLEME)
    // =================================================================
    
    resetTest: function() {
        this.allQuestions = []; 
        this.userAnswers = []; 
        this.currentQuestionIndex = 0;
        this.totalQuestions = 0;
        this.testStarted = false; // KRİTİK: Test durumu sıfırlandı
        
        // Arayüzdeki göstergeleri temizle ve Giriş ekranına dön
        document.getElementById('currentQuestionNumber').textContent = '0';
        document.getElementById('totalQuestionCount').textContent = '0';
        document.getElementById('testProgressBar').style.width = '0%';
        document.getElementById('questionContainer').innerHTML = 'Lütfen bekleyiniz, test yükleniyor...';

        console.log('🔄 Test başarıyla sıfırlandı. Giriş ekranı gösteriliyor.');
        this.showSection('levelTestIntroSection'); 
    },

    startTest: async function() {
        // Eğer zaten başlamış ve bitmemişse (koruma)
        if (this.testStarted && this.allQuestions.length > 0 && this.currentQuestionIndex < this.totalQuestions) {
             return; 
        }

        this.resetTest(); // Başlamadan önce sıfırla
        this.testStarted = true; // Başladı olarak işaretle

        this.showSection('levelTestSection');
        
        const totalCountEl = document.getElementById('totalQuestionCount');
        totalCountEl.textContent = '20'; 

        try {
            // Dosya yolu: 'data/level_test.json'
            const response = await fetch('data/level_test.json'); 
            if (!response.ok) {
                throw new Error(`HTTP hata kodu: ${response.status}`);
            }
            this.allQuestions = await response.json();
            this.totalQuestions = this.allQuestions.length;
            
            this.userAnswers = new Array(this.totalQuestions).fill(null);
            
            console.log(`✅ ${this.totalQuestions} soru yüklendi.`);

            this.currentQuestionIndex = 0;
            this.renderQuestion();
            this.updateTestHeader();

        } catch (error) {
            console.error('❌ Sorular yüklenirken hata oluştu:', error);
            document.getElementById('questionContainer').innerHTML = 
                `<p class="text-danger">Sorular yüklenemedi. Lütfen dosya yolunu (data/level_test.json) kontrol edin. (${error.message})</p>`;
        }
    },

    // =================================================================
    // 3. SORU GÖSTERİMİ VE YÖNETİMİ
    // =================================================================

    renderQuestion: function() {
        if (!this.allQuestions[this.currentQuestionIndex]) return;

        const question = this.allQuestions[this.currentQuestionIndex];
        const container = document.getElementById('questionContainer');
        const currentAnswer = this.userAnswers[this.currentQuestionIndex];

        container.innerHTML = `
            <p class="question-text">${this.currentQuestionIndex + 1}. ${question.questionText}</p>
            <div class="options-container" id="optionsContainer">
                ${question.options.map(option => `
                    <button class="answer-btn ${currentAnswer === option ? 'selected' : ''}" 
                            data-answer="${option}">
                        ${option}
                    </button>
                `).join('')}
            </div>
        `;

        // Tıklama event'i sadece kullanıcı tıkladığında çalışır (Otomatik cevaplamayı önler)
        document.querySelectorAll('.answer-btn').forEach(button => {
            button.addEventListener('click', this.handleAnswerSelection.bind(this)); 
        });

        this.updateNavigationButtons();
    },

    handleAnswerSelection: function(e) {
        // Tıklanan eleman veya onun ebeveyni olan .answer-btn'i bul
        const selectedButton = e.target.closest('.answer-btn');
        if (!selectedButton) return;

        const answer = selectedButton.dataset.answer;
        
        // Görsel güncellemeler
        selectedButton.closest('.options-container').querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        selectedButton.classList.add('selected');

        // Cevabı kaydet
        this.userAnswers[this.currentQuestionIndex] = answer;
        console.log(`📝 Soru ${this.currentQuestionIndex + 1} için cevap kaydedildi: ${answer}`);
    },

    navigateTest: function(direction) {
        if (direction === 1 && this.userAnswers[this.currentQuestionIndex] === null) {
            alert('Lütfen bu soruyu cevaplayın.');
            return;
        }

        const newIndex = this.currentQuestionIndex + direction;

        if (newIndex >= 0 && newIndex < this.totalQuestions) {
            this.currentQuestionIndex = newIndex;
            this.renderQuestion();
        }

        this.updateTestHeader();
        this.updateNavigationButtons();
    },

    // =================================================================
    // 4. TESTİ BİTİRME VE SONUÇLANDIRMA
    // =================================================================

    submitTest: function() {
        if (this.userAnswers[this.totalQuestions - 1] === null) {
            alert('Lütfen son soruyu cevaplayın!');
            return;
        }
        
        const userLevel = this.calculateLevel();
        
        // Sonuçları göster ve sistemi sıfırlamaya hazırla
        this.displayResults(userLevel); 
        
        if (typeof updateUserLevel === 'function') {
             updateUserLevel(userLevel);
        }
    },
    
    calculateLevel: function() {
        let correctCount = 0;

        this.allQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            if (userAnswer === question.correctAnswer) {
                correctCount++;
            }
        });

        if (correctCount >= 17) return 'C1';
        if (correctCount >= 14) return 'B2';
        if (correctCount >= 10) return 'B1';
        if (correctCount >= 6) return 'A2';
        return 'A1';
    },

    displayResults: function(level) {
        const resultsEl = document.getElementById('resultsSection');
        
        // Test bittiğinde sonuçları gösterirken, Giriş ekranını aktif etmiyoruz.
        this.showSection('resultsSection'); 

        resultsEl.innerHTML = `
            <div class="result-card">
                <h2>Seviye Tespit Sonucu</h2>
                <p>Tebrikler, testiniz başarıyla tamamlandı!</p>
                <p>Tespit edilen İngilizce seviyeniz:</p>
                <div class="level-badge level-${level.toLowerCase()}">${level}</div>
                <p class="mt-3">Bu seviyeye göre size özel hazırlanan öğrenme yolunu aşağıda görebilirsiniz.</p>
                <button class="btn btn-primary mt-3" onclick="LearningPath.displayLearningPath('${level}')">Öğrenme Yolunu Gör</button>
            </div>
        `;
    },

    displayLearningPath: async function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        
        pathEl.innerHTML = `
            <h2>${level} Seviyesi Öğrenme Yolu</h2>
            <p>Seviyeniz **${level}** olarak belirlendi. Size özel dersler yükleniyor...</p>
        `;

        try {
            // Modül verisini çekme
            const response = await fetch('data/learning_modules.json');
            if (!response.ok) throw new Error(`Modül verisi yüklenemedi: ${response.status}`);
            
            const modulesData = await response.json();
            const levelData = modulesData[level] || modulesData['A1']; 

            let modulesHtml = levelData.modules.map(module => `
                <div class="module-card module-status-${module.status.toLowerCase()}">
                    <h3>${module.name}</h3>
                    <p>Konu: ${module.topic}</p>
                    <span class="module-status-badge">${module.status}</span>
                    <button class="btn btn-primary btn-sm" onclick="LearningPath.startModule('${module.id}')">İncele</button>
                </div>
            `).join('');

            // İçeriği güncelle
            pathEl.innerHTML = `
                <div class="level-path-header">
                    <h2>${level} Seviyesi Öğrenme Yolu: ${levelData.title}</h2>
                    <p>${levelData.description}</p>
                </div>
                <div class="modules-list">
                    ${modulesHtml}
                </div>
                <button class="btn btn-secondary mt-4" onclick="LearningPath.resetTest()">Teste Geri Dön/Yeniden Başlat</button>
            `;

        } catch (error) {
            console.error('❌ Öğrenme Modülleri yüklenirken hata:', error);
            pathEl.innerHTML = `
                 <h2>Hata</h2>
                 <p>Öğrenme modülleri yüklenemedi. Lütfen konsol hatalarını kontrol edin.</p>
                 <button class="btn btn-secondary mt-4" onclick="LearningPath.resetTest()">Giriş Ekranına Dön</button>
            `;
        }
    },
    
    startModule: function(moduleId) {
        alert(`Modül ID: ${moduleId} ile ders içeriği yükleniyor...`);
    },


    // =================================================================
    // 5. ARAYÜZ GÜNCELLEMELERİ
    // =================================================================

    updateTestHeader: function() {
        const currentNumEl = document.getElementById('currentQuestionNumber');
        const totalCountEl = document.getElementById('totalQuestionCount');
        const progressBar = document.getElementById('testProgressBar');

        currentNumEl.textContent = this.currentQuestionIndex + 1;
        totalCountEl.textContent = this.totalQuestions;

        const progress = ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
        progressBar.style.width = `${progress}%`;
    },

    updateNavigationButtons: function() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');

        prevBtn.style.display = this.currentQuestionIndex > 0 ? 'inline-block' : 'none';

        if (this.currentQuestionIndex === this.totalQuestions - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    },

    showSection: function(sectionId) {
        document.querySelectorAll('.module-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor');
    LearningPath.init();
});
