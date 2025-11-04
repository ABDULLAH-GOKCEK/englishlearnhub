const LearningPath = {
    // Statik veriyi tutmak için değişkenler
    testQuestions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    userLevel: 'A1', // Varsayılan seviye
    currentModuleId: null, // Hangi modülün açık olduğunu tutar
    moduleQuizScore: { total: 0, correct: 0, answered: false },
    levelMapping: { 'A1': 'B1', 'B1': 'C1', 'C1': 'C1' }, 

    // Sayfa yüklendiğinde çalışacak başlangıç fonksiyonu
    init: function() {
        // 🚨 GEÇİCİ TEST TEMİZLİĞİ: Testin atlanmasını engeller. Test bitince bu iki satırı silin.
        localStorage.removeItem('userLevel');
        localStorage.removeItem('learningModules');
        
        console.log("🚀 LearningPath başlatılıyor...");
        this.loadTestData();
        this.bindEvents();
        this.checkInitialState();
        console.log("📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor");
    },

    // Test sorularını JSON dosyasından yükler ve yeni JSON formatına uyarlar
    loadTestData: async function() {
        try {
            const response = await fetch('data/level_test.json');
            if (!response.ok) {
                throw new Error(`Test verisi yüklenemedi. HTTP Durumu: ${response.status}`);
            }
            const data = await response.json();
            
            // Yeni ve eski format uyumluluğu için eşleştirme yapıyoruz.
            let rawQuestions = data.questions || data; // Eğer doğrudan dizi ise 'data'yı kullan

            if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
                 throw new Error("Test verisi yüklenemedi veya formatı hatalı.");
            }
            
            // Yüklediğiniz JSON (Source 3) anahtarlarına (questionText, correctAnswer) uyum sağlama
            this.testQuestions = rawQuestions.map(q => ({
                question: q.questionText || q.question, 
                options: q.options,
                answer: q.correctAnswer || q.answer 
            }));

            const totalCount = this.testQuestions.length;
            document.getElementById('totalQuestionCount').textContent = totalCount;
            console.log(`✅ ${totalCount} soru yüklendi.`);
            
        } catch (error) {
            console.error("Test verisi yüklenirken kritik hata:", error);
            this.testQuestions = []; 
            alert("Hata: Seviye testi verileri yüklenemedi veya hatalı formatta. Konsolu kontrol edin.");
        }
    },

    // Buton ve olay dinleyicilerini bağlar (Diğer fonksiyonlar aynı kaldı)
    bindEvents: function() {
        console.log("🔗 Eventler bağlanıyor...");
        document.getElementById('startTestBtn').addEventListener('click', () => this.startTest());
        document.getElementById('nextQuestionBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('prevQuestionBtn').addEventListener('click', () => this.prevQuestion());
        document.getElementById('submitTestBtn').addEventListener('click', () => this.submitTest());
        
        const completeModuleButton = document.querySelector('#moduleContentSection .btn-success');
        if (completeModuleButton) {
            completeModuleButton.addEventListener('click', () => this.completeModule());
        }
    },

    // Başlangıç durumunu kontrol eder
    checkInitialState: function() {
        const storedLevel = localStorage.getItem('userLevel');
        
        if (storedLevel && localStorage.getItem('learningModules')) {
            this.userLevel = storedLevel;
            this.displayLearningPath(storedLevel);
            this.showSection('learningPathSection');
        } else {
            this.resetTest();
            this.showSection('levelTestIntroSection');
        }
    },

    // Testi sıfırlar
    resetTest: function() {
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.showSection('levelTestIntroSection');
        console.log("🔄 Test başarıyla sıfırlandı. Giriş ekranı gösteriliyor.");
    },

    // Belirli bir bölümü görünür yapar
    showSection: function(sectionId) {
        document.querySelectorAll('.module-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
            activeSection.style.display = 'block';
        }
        const titleMap = {
            'levelTestIntroSection': 'Seviye Tespit Testi',
            'levelTestSection': 'Seviye Testi Devam Ediyor',
            'resultsSection': 'Test Sonuçları',
            'learningPathSection': 'Öğrenme Yolum',
            'moduleContentSection': 'Modül İçeriği'
        };
        document.title = titleMap[sectionId] || 'Öğrenme Yolu Modülü';
    },

    // Testi başlatır ve ilk soruyu gösterir
    startTest: function() {
        if (this.testQuestions.length === 0) {
            alert("Sorular yüklenmedi. Lütfen sayfayı yenileyin.");
            return;
        }
        this.resetTest();
        this.showSection('levelTestSection');
        this.displayQuestion(this.currentQuestionIndex);
    },

    // Belirli bir soruyu ekranda gösterir
    displayQuestion: function(index) {
        const question = this.testQuestions[index];
        const container = document.getElementById('questionContainer');
        
        if (!question) {
            container.innerHTML = 'Sorular bitti!';
            return;
        }

        document.getElementById('currentQuestionNumber').textContent = index + 1;
        
        // İlerleme çubuğunu güncelle
        const progress = ((index + 1) / this.testQuestions.length) * 100;
        document.getElementById('testProgressBar').style.width = `${progress}%`;
        
        // Soru ve seçenekleri oluştur
        let optionsHtml = question.options.map(option => `
            <div class="form-check question-option">
                <input class="form-check-input" type="radio" name="answer" id="option-${index}-${option.replace(/\s/g, '-')}" value="${option}">
                <label class="form-check-label" for="option-${index}-${option.replace(/\s/g, '-')}" >
                    ${option}
                </label>
            </div>
        `).join('');

        container.innerHTML = `
            <h4>${question.question}</h4>
            <div class="question-options-group">${optionsHtml}</div>
        `;
        
        // Daha önce cevaplanmışsa seçimi işaretle
        if (this.userAnswers[index] !== undefined) {
            const selectedOption = document.querySelector(`input[value="${this.userAnswers[index]}"]`);
            if (selectedOption) {
                selectedOption.checked = true;
            }
        }
        
        // Cevap seçimi değiştiğinde kaydet
        document.querySelectorAll('input[name="answer"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.saveAnswer(index, e.target.value));
        });

        // Navigasyon butonlarını güncelle
        document.getElementById('prevQuestionBtn').disabled = index === 0;
        document.getElementById('nextQuestionBtn').style.display = index < this.testQuestions.length - 1 ? 'inline-block' : 'none';
        document.getElementById('submitTestBtn').style.display = index === this.testQuestions.length - 1 ? 'inline-block' : 'none';
    },

    // Kullanıcının cevabını kaydeder
    saveAnswer: function(index, answer) {
        this.userAnswers[index] = answer;
    },

    // Sonraki soruya geçer
    nextQuestion: function() {
        if (this.currentQuestionIndex < this.testQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion(this.currentQuestionIndex);
        }
    },

    // Önceki soruya geçer
    prevQuestion: function() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion(this.currentQuestionIndex);
        }
    },

    // Testi bitirir, puanlar ve sonucu gösterir
    submitTest: function() {
        const totalQuestions = this.testQuestions.length;
        let correctAnswers = 0;

        for (let i = 0; i < totalQuestions; i++) {
            const question = this.testQuestions[i];
            const userAnswer = this.userAnswers[i];
            
            if (userAnswer && userAnswer === question.answer) {
                correctAnswers++;
            }
        }

        const score = (correctAnswers / totalQuestions) * 100;
        const level = this.determineLevel(score);
        this.userLevel = level;
        
        localStorage.setItem('userLevel', level);
        
        this.displayResults(score, level);
    },

    // Puana göre seviyeyi belirler
    determineLevel: function(score) {
        if (score >= 80) return 'C1';
        if (score >= 50) return 'B1';
        return 'A1';
    },

    // Sonuçları ekranda gösterir
    displayResults: function(score, level) {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.innerHTML = `
            <div class="result-card">
                <h2>Tebrikler, Testi Bitirdiniz!</h2>
                <p class="lead">Puanınız: <strong>${score.toFixed(0)} / 100</strong></p>
                <h3 class="level-result">Seviyeniz: <span>${level}</span> - ${this.getLevelTitle(level)}</h3>
                <p>Sizin için kişiselleştirilmiş öğrenme yolunuzu hazırladık.</p>
                <button class="btn btn-primary btn-lg mt-3" onclick="LearningPath.displayLearningPath('${level}')">Öğrenme Yolunu Gör</button>
            </div>
        `;
        this.showSection('resultsSection');
    },
    
    // Seviye başlığını döndürür
    getLevelTitle: function(level) {
        const titles = {
            'A1': 'Başlangıç Seviyesi',
            'B1': 'Orta Seviye',
            'C1': 'İleri Seviye'
        };
        return titles[level] || 'Bilinmiyor';
    },

    // 🆕 YENİ: Başlangıç modül verisini %0 ile oluşturur
    createModuleDataTemplate: async function() {
        try {
            const response = await fetch('data/learning_modules.json'); 
            if (!response.ok) throw new Error("Modül tanımları yüklenemedi.");
            
            const modulesData = await response.json();
            
            // Tüm modülleri %0 ve 'Başlanmadı' olarak ayarla
            Object.keys(modulesData).forEach(lvl => {
                modulesData[lvl].modules.forEach(module => {
                    module.progress = 0;
                    module.status = 'Başlanmadı';
                    module.lastScore = 0;
                    module.lastDuration = 0;
                });
            });

            localStorage.setItem('learningModules', JSON.stringify(modulesData));
            return modulesData;

        } catch (error) {
            console.error("Öğrenme modülleri yüklenemedi:", error);
            throw new Error("Kritik Hata: Modül verileri yüklenemedi.");
        }
    },

    // Öğrenme yolunu ekranda gösterir
    displayLearningPath: async function(level) {
        const pathSection = document.getElementById('learningPathSection');
        pathSection.innerHTML = '';
        this.showSection('learningPathSection');
        
        let modulesData = JSON.parse(localStorage.getItem('learningModules'));
        
        if (!modulesData) {
            // Eğer Local Storage'da yoksa, şablon oluşturup kaydet
            modulesData = await this.createModuleDataTemplate();
        }
        
        const levelData = modulesData[level];
        if (!levelData) {
            pathSection.innerHTML = `<div class="alert alert-warning">Seviyenize ait modül bulunamadı.</div>`;
            return;
        }

        // Seviye Tamamlama Kontrolü ve Atlama
        let allModulesCompleted = levelData.modules.every(m => m.progress === 100);
        let currentLevel = level;
        
        if (allModulesCompleted && this.levelMapping[level] && this.levelMapping[level] !== level) {
            const nextLevel = this.levelMapping[level];
            alert(`Tebrikler! ${level} seviyesindeki tüm modülleri tamamladınız. Artık ${nextLevel} seviyesine geçiyorsunuz.`);
            localStorage.setItem('userLevel', nextLevel);
            currentLevel = nextLevel;
            
            // Yeni seviyeyi tekrar çiz
            return this.displayLearningPath(currentLevel); 
        }

        // Genel seviye bilgisi
        let pathHtml = `
            <div class="level-header">
                <h2>${currentLevel} Seviyesi Öğrenme Yolu: ${levelData.title}</h2>
                <p class="lead">${levelData.description}</p>
                ${allModulesCompleted ? `<div class="alert alert-success mt-3">Bu seviyedeki tüm modüller tamamlandı!</div>` : ''}
            </div>
        `;
        
        // Modül gruplarını ayırmak
        const modulesByTopic = levelData.modules.reduce((acc, module) => {
            if (!acc[module.topic]) {
                acc[module.topic] = [];
            }
            acc[module.topic].push(module);
            return acc;
        }, {});

        // Modül gruplarını HTML'e ekle
        for (const topic in modulesByTopic) {
            pathHtml += `
                <h4 class="topic-header">${topic} Modülleri (${modulesByTopic[topic].length})</h4>
                <div class="module-grid">
            `;
            
            pathHtml += modulesByTopic[topic].map(module => `
                <div class="module-card ${module.progress === 100 ? 'completed' : ''}" onclick="LearningPath.startModule('${module.id}')">
                    <span class="module-status badge bg-${module.progress === 100 ? 'success' : 'primary'}">${module.status}</span>
                    <h5>${module.name}</h5>
                    <p class="module-topic">Konu: ${module.topic}</p>
                    <div class="module-stats">
                        <small><i class="fas fa-clock"></i> ${module.lastDuration} dk.</small>
                        <small><i class="fas fa-medal"></i> %${module.lastScore} Skor</small>
                    </div>
                    <div class="progress mt-2">
                        <div class="progress-bar" style="width: ${module.progress}%"></div>
                    </div>
                </div>
            `).join('');
            
            pathHtml += `</div>`;
        }

        pathSection.innerHTML = pathHtml;
    },

    // Modül Başlatma Fonksiyonu 
    startModule: async function(moduleId) {
        LearningPath.currentModuleId = moduleId; 
        
        this.moduleQuizScore = { total: 0, correct: 0, answered: false }; 

        this.showSection('moduleContentSection');
        
        const titleEl = document.getElementById('moduleTitle');
        const contentBodyEl = document.getElementById('moduleContentBody');
        
        titleEl.textContent = 'İçerik Yükleniyor...';
        contentBodyEl.innerHTML = '<div class="text-center mt-5"><i class="fas fa-spinner fa-spin fa-3x"></i></div>';

        let module = null;
        try {
            const response = await fetch('data/module_content.json'); 
            
            if (!response.ok) throw new Error(`Dosya yüklenirken hata oluştu. HTTP Status: ${response.status}`);
            
            const contentData = await response.json(); // Yüklediğiniz module_content.json.json'a uyumlu
            module = contentData[moduleId];

            if (!module) {
                titleEl.textContent = 'Hata: İçerik Eksik';
                contentBodyEl.innerHTML = `<p class="text-danger"><strong>${moduleId}</strong> kimliğine sahip modül bulunamadı.</p>`;
                return;
            }

            titleEl.textContent = module.title;
            let contentHtml = '';
            let quizIndex = 0;

            module.content.forEach(item => {
                if (item.type === 'heading') {
                    contentHtml += `<h3>${item.text}</h3>`;
                } else if (item.type === 'paragraph') {
                    contentHtml += `<p>${item.text}</p>`;
                } else if (item.type === 'code_block') {
                    contentHtml += `<pre class="code-block">${item.text}</pre>`;
                } else if (item.type === 'example') {
                    contentHtml += `<div class="example-box">${item.text.replace(/\n/g, '<br>')}</div>`;
                } else if (item.type === 'quiz_intro') {
                    contentHtml += `<p class="quiz-intro">${item.text}</p>`;
                } else if (item.type === 'quiz') {
                    quizIndex++;
                    contentHtml += `
                        <div class="module-quiz-card" data-quiz-index="${quizIndex}" data-module-id="${moduleId}">
                            <p><strong>Soru ${quizIndex}:</strong> ${item.question}</p>
                            <div class="quiz-options-simulated">
                                ${item.options.map(opt => `<span class="quiz-option-item">${opt}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
            });

            contentBodyEl.innerHTML = contentHtml;
            
            LearningPath.attachQuizListeners(moduleId, module); 
            
            // Modüle girildiğinde durumu 'Devam Ediyor' olarak güncelle (%1 ilerleme)
            this.updateModuleStatus(moduleId, 'Devam Ediyor', 1);

        } catch (error) {
            console.error('❌ Modül içeriği yüklenirken hata:', error);
            titleEl.textContent = 'Yükleme Hatası';
            contentBodyEl.innerHTML = `<p class="text-danger"><strong>Ders içeriği yüklenirken kritik bir hata oluştu.</strong> Hata Mesajı: <code>${error.message}</code></p>`;
        }
    },
    
    // Quiz Dinleyicilerini Bağlama (Puanlama ve İlerleme Mantığı)
    attachQuizListeners: function(moduleId, moduleData) {
        const quizzes = moduleData.content.filter(item => item.type === 'quiz');
        this.moduleQuizScore.total = quizzes.length;
        
        // Quizler tamamlandığında geriye kalan %99'u paylaşır
        const progressPerQuiz = quizzes.length > 0 ? Math.floor(99 / quizzes.length) : 0; 

        const quizItems = document.querySelectorAll('.module-quiz-card');
        
        quizItems.forEach(quizCard => {
            const quizIndex = parseInt(quizCard.dataset.quizIndex); 
            const questionText = quizCard.querySelector('p strong').textContent.replace(/Soru \d+:/, '').trim();
            
            const quizItem = quizzes.find(item => item.question.trim() === questionText);

            if (!quizItem) return;

            const options = quizCard.querySelectorAll('.quiz-option-item');
            
            options.forEach(option => {
                option.addEventListener('click', function() {
                    if (quizCard.dataset.answered) return; 

                    const selectedAnswer = this.textContent.trim();
                    const correctAnswer = quizItem.answer.trim();
                    
                    quizCard.dataset.answered = 'true'; 
                    
                    options.forEach(opt => opt.classList.remove('selected-answer'));
                    this.classList.add('selected-answer');

                    if (selectedAnswer === correctAnswer) {
                        this.classList.add('correct-answer');
                        LearningPath.moduleQuizScore.correct++; 
                    } else {
                        this.classList.add('wrong-answer');
                        options.forEach(opt => {
                            if (opt.textContent.trim() === correctAnswer) {
                                opt.classList.add('correct-answer');
                            }
                        });
                    }
                    
                    LearningPath.moduleQuizScore.answered = true; 
                    
                    // İlerlemeyi güncelle
                    if (progressPerQuiz > 0) {
                        const newProgress = 1 + (LearningPath.moduleQuizScore.correct * progressPerQuiz);
                        LearningPath.updateModuleStatus(moduleId, 'Devam Ediyor', newProgress);
                    }
                });
            });
        });
    },

    // Modülü Tamamla Fonksiyonu
    completeModule: function() {
        const currentModuleId = LearningPath.currentModuleId;
        if (!currentModuleId) {
            alert("Hata: Tamamlanacak modül bulunamadı.");
            return;
        }

        const currentLevel = localStorage.getItem('userLevel') || 'A1';
        let modulesData = JSON.parse(localStorage.getItem('learningModules')) || {};
        
        let finalScore = 100;
        if (this.moduleQuizScore.total > 0) {
            finalScore = Math.round((this.moduleQuizScore.correct / this.moduleQuizScore.total) * 100);
        }
        
        let moduleFound = false;
        if (modulesData[currentLevel] && modulesData[currentLevel].modules) {
            const modules = modulesData[currentLevel].modules;
            for (let i = 0; i < modules.length; i++) {
                if (modules[i].id === currentModuleId) {
                    modules[i].status = "Tamamlandı";
                    modules[i].progress = 100; // Tamamlandıysa %100 yap
                    modules[i].lastScore = finalScore; 
                    modules[i].lastDuration = Math.ceil(Math.random() * 15) + 5; 
                    moduleFound = true;
                    break;
                }
            }
        }

        if (moduleFound) {
            localStorage.setItem('learningModules', JSON.stringify(modulesData));

            alert(`${currentModuleId} modülü başarıyla tamamlandı ve puanınız kaydedildi: %${finalScore}`);
            
            this.displayLearningPath(currentLevel); 

        } else {
            alert("Hata: Modül verisi bulunamadı veya kaydedilemedi.");
        }
    },

    // Modül ilerlemesini güncelleyen yardımcı fonksiyon
    updateModuleStatus: function(moduleId, status, progress) {
        const currentLevel = localStorage.getItem('userLevel') || 'A1';
        let modulesData = JSON.parse(localStorage.getItem('learningModules'));
        
        if (!modulesData) return;

        const modules = modulesData[currentLevel]?.modules;
        if (!modules) return;
        
        const module = modules.find(m => m.id === moduleId);
        if (module) {
            module.status = status;
            module.progress = Math.min(100, progress); 
            
            localStorage.setItem('learningModules', JSON.stringify(modulesData));
            
            console.log(`Progress Güncellendi: ${moduleId}, Durum: ${status}, İlerleme: ${module.progress}%`);
        }
    }
};

// Sayfa yüklendiğinde init fonksiyonunu çağır
document.addEventListener('DOMContentLoaded', () => LearningPath.init());
