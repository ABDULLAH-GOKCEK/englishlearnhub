// learning-path.js - TAM GÜNCEL SÜRÜM
// Hata: Test butonuna tıklayınca test açılmıyor.
// Çözüm: startTest() fonksiyonunu, veri yükleme ve soru gösterme mantığıyla güçlendirdik.

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

    // --- Görünürlük Yönetimi ---
    showSection(id) {
        document.querySelectorAll('.module-section').forEach(section => {
            section.style.display = 'none';
        });
        const sectionToShow = document.getElementById(id);
        if (sectionToShow) {
            sectionToShow.style.display = 'block';
            window.scrollTo(0, 0); // Sayfanın başına git
        }
    }

    showCorrectSection() {
        // Basitçe: test yapılmadıysa Intro'yu göster
        this.showSection('levelTestIntroSection'); 
    }

    // learning-path.js dosyanızda sadece aşağıdaki kısmı değiştirin veya kontrol edin.

// ... (Diğer fonksiyonlar aynı kalır)

    // --- Test Başlatma ve Veri Yükleme ---
    async startTest() {
        this.currentQuestion = 0;
        this.score = 0;
        this.userAnswers = [];

        // ÖNEMLİ DÜZELTME: Dosya yolunu netleştirelim. 
        // learning-path.html aynı klasördeyse ve data klasörü bir üstte ise.
        const testDataUrl = '/data/level_test.json'; 
        
        // Eğer data klasörü learning-path.html ile AYNI klasördeyse:
        // const testDataUrl = './data/level_test.json'; 

        // En güvenlisi, tarayıcı kök dizinine göre aramak:
        // const testDataUrl = '/data/level_test.json'; // Eğer data klasörü projenin kök dizinindeyse

        console.log(`📡 Test verisi yükleniyor (URL: ${testDataUrl})...`);

        try {
            // Veri yükleme
            const response = await fetch(testDataUrl);
            if (!response.ok) {
                // Hata mesajını daha anlaşılır hale getir
                throw new Error(`Test verisi yüklenemedi: HTTP ${response.status}. Lütfen dosya yolu (${testDataUrl}) ve dosya adının doğru olduğundan emin olun.`);
            }
            // ... (Geri kalan kod aynı kalır: JSON parse etme, soru gösterme)
            this.testData = await response.json();
            
            if (!Array.isArray(this.testData) || this.testData.length === 0) {
                 // ... (hata yönetimi)
            }
            
            // ... (Devam eden kodlar)
            this.displayQuestion(); 
            this.updateNavigationButtons();
            
        } catch (error) {
            // ... (hata yönetimi)
        }
    }
    
// ... (Diğer fonksiyonlar aynı kalır)
    
    // --- Soru Gösterme ---
    displayQuestion() {
        const container = document.getElementById('questionContainer');
        if (!container || this.currentQuestion >= this.testData.length) return; 

        const question = this.testData[this.currentQuestion];
        
        let htmlContent = `
            <div class="question-box">
                <h4 class="question-number">${this.currentQuestion + 1}. Soru</h4>
                <p class="question-text">${question.questionText || question.question}</p>
                <div class="answer-options">
                    ${question.options.map((option, index) => {
                        const isSelected = this.userAnswers[this.currentQuestion] === option;
                        return `
                            <button class="answer-btn ${isSelected ? 'selected' : ''}" data-answer="${option}">
                                ${option}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = htmlContent;
        document.getElementById('currentQuestionNumber').textContent = this.currentQuestion + 1;
        this.updateProgressBar();
    }

    // --- Cevap Seçimi ---
    selectAnswer(button) {
        const selectedAnswer = button.dataset.answer;
        this.userAnswers[this.currentQuestion] = selectedAnswer;

        // Aynı sorudaki tüm butonların seçimini kaldır
        button.closest('.answer-options').querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        // Seçilen butonu vurgula
        button.classList.add('selected');
        
        // Cevap seçildikten sonra otomatik olarak bir sonraki soruya geç (isteğe bağlı)
        this.goToNextQuestion(); 
    }
    
    // --- Navigasyon ---
    goToNextQuestion() {
        if (this.currentQuestion < this.testData.length - 1) {
            this.currentQuestion++;
            this.displayQuestion();
        } else {
            // Son soruya gelindiyse sonuçları göster
            this.showResults();
        }
        this.updateNavigationButtons();
    }
    
    goToPrevQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.displayQuestion();
        }
        this.updateNavigationButtons();
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');

        // Önceki butonu
        prevBtn.style.display = this.currentQuestion > 0 ? 'inline-block' : 'none';

        // İlerle butonu
        if (this.currentQuestion < this.testData.length - 1) {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        } else {
            // Son soruda İlerle butonu gizlenir, Bitir butonu gösterilir
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        }
    }
    
    updateProgressBar() {
        const progress = ((this.currentQuestion + 1) / this.testData.length) * 100;
        document.getElementById('testProgressBar').style.width = `${progress}%`;
    }

    // --- Sonuçları Gösterme ---
    showResults() {
        this.calculateScore();
        this.showSection('resultsSection');
        
        const resultsContainer = document.getElementById('resultsSection');
        const level = this.determineLevel();
        
        resultsContainer.innerHTML = `
            <h2>Test Sonuçları</h2>
            <p>Tebrikler! Testi tamamladınız.</p>
            <div class="result-card">
                <h3>Seviyeniz: ${level}</h3>
                <p>Doğru Cevap Sayısı: ${this.score} / ${this.testData.length}</p>
                <p>Bu seviye ile ilgili öğrenme yolu içeriği artık size özel olarak hazırlanacaktır.</p>
                <button class="btn btn-primary large" onclick="window.location.reload()">Öğrenme Yoluna Başla</button>
            </div>
        `;
    }

    calculateScore() {
        this.score = 0;
        this.testData.forEach((question, index) => {
            if (this.userAnswers[index] === question.correctAnswer) {
                this.score++;
            }
        });
        // Skoru kaydetme veya seviye belirleme burada yapılabilir
    }
    
    determineLevel() {
        const percentage = (this.score / this.testData.length) * 100;
        if (percentage < 30) return 'A1 (Başlangıç)';
        if (percentage < 50) return 'A2 (Temel)';
        if (percentage < 70) return 'B1 (Orta)';
        if (percentage < 90) return 'B2 (İyi)';
        return 'C1 (İleri)';
    }

    // --- Event Bağlama ---
    bindEvents() {
        console.log('🔗 Eventler bağlanıyor...');

        // TEST BAŞLAT BUTONU
        const startTestBtn = document.getElementById('startTestBtn');
        if (startTestBtn) {
            startTestBtn.addEventListener('click', () => {
                console.log('🧪 Test başlat butonuna tıklandı');
                this.showSection('levelTestSection'); // Test bölümünü göster
                this.startTest(); // Testi başlat ve veriyi yükle
            });
        } else {
            console.log('❌ startTestBtn bulunamadı. HTML dosyasını kontrol edin.');
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

        if (prevBtn) prevBtn.addEventListener('click', () => this.goToPrevQuestion());
        // Next butonu artık soru seçimine dahil edildi (Otomatik geçiş)
        if (nextBtn) nextBtn.addEventListener('click', () => this.goToNextQuestion());
        
        if (submitBtn) submitBtn.addEventListener('click', () => this.showResults());
    }
    
    // Diğer foksiyonlar... (addRestartButton, startActivity vs.)
    
    // ...
}

// SAYFA YÜKLENDİĞİNDE
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor');
    window.learningPath = new LearningPath();
});


