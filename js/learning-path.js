/**
 * learning-path.js
 * Seviye Testi ve Öğrenme Yolu Modülünün Ana Logic'i
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
        document.getElementById('startTestBtn').addEventListener('click', this.startTest.bind(this));
        document.getElementById('nextQuestionBtn').addEventListener('click', this.navigateTest.bind(this, 1));
        document.getElementById('prevQuestionBtn').addEventListener('click', this.navigateTest.bind(this, -1));
        document.getElementById('submitTestBtn').addEventListener('click', this.submitTest.bind(this));
    },

    // =================================================================
    // 2. TESTİ BAŞLATMA VE VERİ YÜKLEME (KRİTİK BÖLÜM)
    // =================================================================

    startTest: async function() {
        if (this.testStarted) return;
        this.testStarted = true;

        this.showSection('levelTestSection');
        
        // Soru sayısını göstermek için hazırlık
        const totalCountEl = document.getElementById('totalQuestionCount');
        totalCountEl.textContent = '20'; // JSON'da 20 soru var

        try {
            // 🔴 KRİTİK DÜZELTME: Dosya yolu artık 'data/level_test.json'
            const response = await fetch('data/level_test.json'); 
            if (!response.ok) {
                throw new Error(`HTTP hata kodu: ${response.status}`);
            }
            this.allQuestions = await response.json();
            this.totalQuestions = this.allQuestions.length;
            
            // Tüm sorular için boş cevapları ve ilerleme durumunu hazırla
            this.userAnswers = new Array(this.totalQuestions).fill(null);
            
            console.log(`✅ ${this.totalQuestions} soru yüklendi.`);

            // İlk soruyu göster
            this.currentQuestionIndex = 0;
            this.renderQuestion();
            this.updateTestHeader();

        } catch (error) {
            console.error('❌ Sorular yüklenirken hata oluştu:', error);
            document.getElementById('questionContainer').innerHTML = 
                `<p class="text-danger">Sorular yüklenemedi. Lütfen konsol hatalarını kontrol edin. (${error.message})</p>`;
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

        // Soru yapısını oluştur
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

        // Seçenek butonlarına tıklama eventlerini bağla
        document.querySelectorAll('.answer-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleAnswerSelection(e.target));
        });

        this.updateNavigationButtons();
    },

    handleAnswerSelection: function(selectedButton) {
        const answer = selectedButton.dataset.answer;
        
        // Görsel güncellemeler
        document.querySelectorAll('.answer-btn').forEach(btn => btn.classList.remove('selected'));
        selectedButton.classList.add('selected');

        // Cevabı kaydet
        this.userAnswers[this.currentQuestionIndex] = answer;
        console.log(`📝 Soru ${this.currentQuestionIndex + 1} için cevap kaydedildi: ${answer}`);
    },

    navigateTest: function(direction) {
        // Geçerli bir cevap seçilmemişse ileri gitmeyi engelle
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
    // 4. ARAYÜZ GÜNCELLEMELERİ
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
    },

    // =================================================================
    // 5. TESTİ BİTİRME VE SONUÇLANDIRMA
    // =================================================================

    submitTest: function() {
        if (this.userAnswers[this.totalQuestions - 1] === null) {
            alert('Lütfen son soruyu cevaplayın!');
            return;
        }
        
        this.showSection('resultsSection');
        const userLevel = this.calculateLevel();
        this.displayResults(userLevel);
        
        // Kullanıcı profilini güncelle (user-profile.js'den gelen fonksiyon varsayılır)
        if (typeof updateUserLevel === 'function') {
             updateUserLevel(userLevel);
        }
    },
    
    calculateLevel: function() {
        let correctCount = 0;
        let incorrectQuestions = [];

        this.allQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            if (userAnswer === question.correctAnswer) {
                correctCount++;
            } else {
                incorrectQuestions.push(question);
            }
        });

        // Skorlama mantığı
        if (correctCount >= 17) return 'C1';
        if (correctCount >= 14) return 'B2';
        if (correctCount >= 10) return 'B1';
        if (correctCount >= 6) return 'A2';
        return 'A1';
    },

    displayResults: function(level) {
        const resultsEl = document.getElementById('resultsSection');
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

    displayLearningPath: function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        pathEl.innerHTML = `
            <h2>${level} Seviyesi Öğrenme Yolu</h2>
            <p>Seviyeniz **${level}** olarak belirlendi. Size özel dersler ve alıştırmalar hazırlanıyor...</p>
        `;
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor');
    LearningPath.init();
});
