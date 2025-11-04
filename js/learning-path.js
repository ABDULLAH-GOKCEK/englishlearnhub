const LearningPath = {
    // Statik veriyi tutmak için değişkenler
    testQuestions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    userLevel: 'A1', 
    currentModuleId: null, 
    moduleQuizScore: { total: 0, correct: 0, answered: false },
    levelMapping: { 'A1': 'B1', 'B1': 'C1', 'C1': 'C1' },
    
    // Dinamik veriler için depolama
    allModuleContents: {}, 
    allWords: [],
    allSentences: [],
    allReadings: [],

    // Sayfa yüklendiğinde çalışacak başlangıç fonksiyonu
    init: function() {
        // 🚨 KRİTİK DÜZELTME 1: Test atlanma sorununu çözmek için ZORUNLU TEMİZLİK!
        // Uygulamanın her zaman test giriş ekranından başlamasını sağlar.
        localStorage.removeItem('userLevel'); 
        localStorage.removeItem('learningModules');
        // ---------------------------------------------------------------------

        console.log("🚀 LearningPath başlatılıyor...");
        this.loadAllData().then(() => {
            this.bindEvents();
            this.checkInitialState();
            console.log("✅ Tüm veriler yüklendi ve entegrasyon tamamlandı.");
        }).catch(error => {
            console.error("Kritik Hata: Veri yüklemede sorun oluştu.", error);
            this.showSection('levelTestIntroSection'); 
            alert("Uygulama başlatılamadı: Veri dosyaları yüklenemedi veya hatalı. Dosya adlarını kontrol edin.");
        });
    },

    // 🌟 ANA SAYFAYA DÖNÜŞ: Uygulamayı sıfırlayıp ilk ekrana döner
    goToAppStart: function() {
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        
        // Bu fonksiyon her çağrıldığında temizliği tekrar yap
        localStorage.removeItem('userLevel'); 
        localStorage.removeItem('learningModules');
        
        this.checkInitialState(); // Bu, sistemi test giriş ekranına yönlendirir.
    },

    // Tüm veri dosyalarını eş zamanlı olarak yükler
    loadAllData: async function() {
        const [
            testData, 
            contentData, 
            wordsData, 
            sentencesData, 
            readingData
        ] = await Promise.all([
            fetch('data/level_test.json').then(res => res.json()),
            // Modül içeriği dosya adını tek 'json' uzantısı olarak varsayıyoruz
            fetch('data/module_content.json').then(res => res.json()), 
            fetch('data/words.json').then(res => res.json()),
            fetch('data/sentences.json').then(res => res.json()),
            fetch('data/reading_stories.json').then(res => res.json())
        ]);
        
        this.allModuleContents = contentData;
        this.allWords = wordsData;
        this.allSentences = sentencesData;
        this.allReadings = readingData;
        
        let rawQuestions = testData.questions || testData;
        this.testQuestions = rawQuestions.map(q => ({
            question: q.questionText || q.question, 
            options: q.options,
            answer: q.correctAnswer || q.answer 
        }));
        
        const totalCountEl = document.getElementById('totalQuestionCount');
        if(totalCountEl) totalCountEl.textContent = this.testQuestions.length;
    },

    // 🔗 Event dinleyicilerini bağlar (Dinamik olarak yüklenen butonlar için tekrar çağrılmalıdır)
    bindEvents: function() {
        document.getElementById('startTestBtn')?.addEventListener('click', () => this.startTest());
        document.getElementById('nextQuestionBtn')?.addEventListener('click', () => this.nextQuestion());
        document.getElementById('prevQuestionBtn')?.addEventListener('click', () => this.prevQuestion());
        document.getElementById('submitTestBtn')?.addEventListener('click', () => this.submitTest());
        
        document.querySelector('#moduleContentSection .btn-success')?.addEventListener('click', () => this.completeModule());
        
        document.querySelectorAll('.return-to-app-start').forEach(button => {
            // Önceki listener'ı temizle ve tekrar bağla (tekrar eden çağrılar için)
            button.removeEventListener('click', this.goToAppStart); 
            button.addEventListener('click', () => this.goToAppStart());
        });
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
            this.showSection('levelTestIntroSection'); // Test giriş ekranını göster
        }
    },

    // Testi sıfırlar
    resetTest: function() {
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
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
        
        const progress = ((index + 1) / this.testQuestions.length) * 100;
        document.getElementById('testProgressBar').style.width = `${progress}%`;
        
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
        
        if (this.userAnswers[index] !== undefined) {
            const selectedOption = document.querySelector(`input[value="${this.userAnswers[index]}"]`);
            if (selectedOption) {
                selectedOption.checked = true;
            }
        }
        
        document.querySelectorAll('input[name="answer"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.saveAnswer(index, e.target.value));
        });

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
            <button class="btn btn-dark mt-3 return-to-app-start">
                <i class="fas fa-arrow-left"></i> Testi Sıfırla ve Başlangıca Dön
            </button>
        `;
        this.bindEvents(); 
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

    // Modül verisi şablonu oluşturur (learning_modules.json'dan okur)
    createModuleDataTemplate: async function() {
        try {
            const response = await fetch('data/learning_modules.json'); 
            if (!response.ok) throw new Error("Modül tanımları yüklenemedi.");
            
            const modulesData = await response.json();
            
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

    // Öğrenme yolunu ekranda gösterir (DİNAMİK MODÜL KARTLARI)
    displayLearningPath: async function(level) {
        const pathSection = document.getElementById('learningPathSection');
        pathSection.innerHTML = ''; 
        this.showSection('learningPathSection');
        
        let modulesData = JSON.parse(localStorage.getItem('learningModules'));
        
        if (!modulesData) {
            modulesData = await this.createModuleDataTemplate();
        }
        
        const levelData = modulesData[level];
        if (!levelData) {
            pathSection.innerHTML = `<button class="btn btn-dark mb-4 return-to-app-start"><i class="fas fa-arrow-left"></i> Uygulama Başlangıcına Dön</button><div class="alert alert-warning">Seviyenize ait modül bulunamadı.</div>`;
            this.bindEvents();
            return;
        }

        // Seviye Atlama Kontrolü
        let allModulesCompleted = levelData.modules.every(m => m.progress === 100);
        let currentLevel = level;
        
        if (allModulesCompleted && this.levelMapping[level] && this.levelMapping[level] !== level) {
            const nextLevel = this.levelMapping[level];
            alert(`Tebrikler! ${level} seviyesindeki tüm modülleri tamamladınız. Artık ${nextLevel} seviyesine geçiyorsunuz.`);
            localStorage.setItem('userLevel', nextLevel);
            currentLevel = nextLevel;
            return this.displayLearningPath(currentLevel); 
        }

        // HTML oluşturma
        let pathHtml = `
            <button class="btn btn-dark mb-4 return-to-app-start"><i class="fas fa-arrow-left"></i> Uygulama Başlangıcına Dön</button>
            <div class="level-header">
                <h2>${currentLevel} Seviyesi Öğrenme Yolu: ${levelData.title}</h2>
                <p class="lead">${levelData.description}</p>
                ${allModulesCompleted ? `<div class="alert alert-success mt-3">Bu seviyedeki tüm modüller tamamlandı!</div>` : ''}
            </div>
        `;
        
        const modulesByTopic = levelData.modules.reduce((acc, module) => {
            if (!acc[module.topic]) { acc[module.topic] = []; }
            acc[module.topic].push(module);
            return acc;
        }, {});

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
        this.bindEvents(); // Yeni butonların eventlerini tekrar bağla
    },

    // Modül içeriğini dinamik olarak zenginleştirir (Çalışmaları oluşturan kısım)
    enrichModuleContent: function(moduleId, baseContent) {
        const moduleLevel = moduleId.split('_')[0].toUpperCase(); 
        const moduleTopic = baseContent.topic; 
        let enrichedContent = [...baseContent.content]; 

        // --- 1. Kelime Alıştırmaları ---
        const moduleWords = this.allWords.filter(w => 
            w.difficulty.toUpperCase().includes(moduleLevel) && 
            w.category.toLowerCase().includes(moduleTopic.toLowerCase())
        ).slice(0, 10); 

        if (moduleWords.length > 0) {
             const wordsHtml = moduleWords.map(w => 
                `<div class="word-item"><strong>${w.word}</strong> - ${w.turkish} (${w.category}) <small class="text-muted">| Seviye: ${w.difficulty}</small></div>`
            ).join('');
            
            enrichedContent.push({type: 'heading', text: 'Kelime Alıştırması'});
            enrichedContent.push({type: 'paragraph', text: `Bu modül için ${moduleWords.length} adet kelime seçildi. Lütfen seslerini dinleyip tekrar edin (Simülasyon).`});
            enrichedContent.push({type: 'words', html: wordsHtml});
        }
        
        // --- 2. Okuma Parçası (Varsa) ---
        const levelCode = (moduleLevel === 'A1' ? 'beginner' : moduleLevel === 'B1' ? 'intermediate' : 'advanced');
        
        const moduleReading = this.allReadings.find(r => 
            r.level.toLowerCase().includes(levelCode) && 
            r.category.toLowerCase().includes(moduleTopic.toLowerCase())
        );

        if (moduleReading) {
            enrichedContent.push({type: 'heading', text: `Okuma: ${moduleReading.title}`});
            enrichedContent.push({type: 'paragraph', text: `**Seviye:** ${moduleReading.level} - **Konu:** ${moduleReading.category}`});
            enrichedContent.push({type: 'reading_text', text: moduleReading.content});
            
            moduleReading.questions.forEach((q, idx) => {
                 enrichedContent.push({
                    type: 'quiz', 
                    question: `(Okuma Sorusu ${idx + 1}): ${q.question}`, 
                    options: q.options, 
                    answer: q.options[q.correctAnswer] 
                });
            });
        }
        
        return enrichedContent;
    },

    // Modül Başlatma Fonksiyonu
    startModule: function(moduleId) {
        LearningPath.currentModuleId = moduleId; 
        this.moduleQuizScore = { total: 0, correct: 0, answered: false }; 

        this.showSection('moduleContentSection');
        
        const titleEl = document.getElementById('moduleTitle');
        const contentBodyEl = document.getElementById('moduleContentBody');
        
        titleEl.textContent = 'İçerik Yükleniyor...';
        contentBodyEl.innerHTML = '<div class="text-center mt-5"><i class="fas fa-spinner fa-spin fa-3x"></i></div>';

        const baseModule = this.allModuleContents[moduleId];

        if (!baseModule) {
            titleEl.textContent = 'Hata: İçerik Eksik';
            contentBodyEl.innerHTML = `<p class="text-danger"><strong>${moduleId}</strong> kimliğine sahip modül, modül içeriği dosyasında (Örn: <strong>module_content.json</strong>) bulunamadı.</p>
            <p><strong>Lütfen verilerinizin yüklendiğinden ve dosya ismini kontrol edin.</strong></p>`;
            return;
        }

        try {
            const moduleContent = this.enrichModuleContent(moduleId, baseModule);
            
            titleEl.textContent = baseModule.title;
            let contentHtml = '';
            let quizIndex = 0;

            // HTML oluşturma kısmı
            moduleContent.forEach(item => {
                if (item.type === 'heading') {
                    contentHtml += `<h3>${item.text}</h3>`;
                } else if (item.type === 'paragraph') {
                    contentHtml += `<p>${item.text}</p>`;
                } else if (item.type === 'code_block') {
                    contentHtml += `<pre class="code-block">${item.text}</pre>`;
                } else if (item.type === 'example') {
                    contentHtml += `<div class="example-box">${item.text.replace(/\n/g, '<br>')}</div>`;
                } else if (item.type === 'words') { 
                    contentHtml += `<div class="word-list-section">${item.html}</div>`;
                } else if (item.type === 'reading_text') { 
                    contentHtml += `<div class="reading-text-box">${item.text}</div>`;
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
            
            LearningPath.attachQuizListeners(moduleId, { content: moduleContent }); 
            this.updateModuleStatus(moduleId, 'Devam Ediyor', 1);

        } catch (error) {
            console.error('❌ Modül içeriği hazırlanırken kritik hata:', error);
            titleEl.textContent = 'Yükleme Hatası';
            contentBodyEl.innerHTML = `<p class="text-danger"><strong>Ders içeriği hazırlanırken kritik bir hata oluştu.</strong> Hata Mesajı: <code>${error.message}</code></p>`;
        }
        
        this.bindEvents(); 
    },

    // Quiz Dinleyicilerini Bağlama 
    attachQuizListeners: function(moduleId, moduleData) {
        const quizzes = moduleData.content.filter(item => item.type === 'quiz');
        this.moduleQuizScore.total = quizzes.length;
        
        const progressPerQuiz = quizzes.length > 0 ? Math.floor(99 / quizzes.length) : 0; 

        const quizItems = document.querySelectorAll('.module-quiz-card');
        
        quizItems.forEach(quizCard => {
            const quizIndex = parseInt(quizCard.dataset.quizIndex); 
            const questionText = quizCard.querySelector('p strong').textContent.replace(/Soru \d+:/, '').trim();
            
            const quizItem = quizzes.find(item => {
                return item.question && item.question.includes(questionText.replace(/\(Okuma Sorusu \d+\):/, '').trim());
            });

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
                    
                    if (progressPerQuiz > 0) {
                        const currentProgress = LearningPath.getCurrentModuleProgress(moduleId);
                        const newProgress = currentProgress + progressPerQuiz;
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
                    modules[i].progress = 100; 
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
    },
    
    // Mevcut modül ilerlemesini döndürür 
    getCurrentModuleProgress: function(moduleId) {
        const currentLevel = localStorage.getItem('userLevel') || 'A1';
        let modulesData = JSON.parse(localStorage.getItem('learningModules'));
        if (!modulesData) return 0;
        const module = modulesData[currentLevel]?.modules.find(m => m.id === moduleId);
        return module ? module.progress : 0;
    }
};

document.addEventListener('DOMContentLoaded', () => LearningPath.init());
