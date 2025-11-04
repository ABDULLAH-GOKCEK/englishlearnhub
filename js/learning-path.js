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
        // Testin atlanmasını engellemek için geçici temizlik, test bitince bu satırları silmeyi unutmayın!
        // localStorage.removeItem('userLevel'); 
        // localStorage.removeItem('learningModules');
        
        console.log("🚀 LearningPath başlatılıyor...");
        this.loadAllData().then(() => {
            this.bindEvents();
            this.checkInitialState();
            console.log("✅ Tüm veriler yüklendi ve entegrasyon tamamlandı.");
        }).catch(error => {
            console.error("Kritik Hata: Veri yüklemede sorun oluştu.", error);
            // Hata durumunda bile test giriş ekranını göstermeye çalış.
            this.showSection('levelTestIntroSection'); 
            alert("Uygulama başlatılamadı: Veri dosyaları yüklenemedi veya hatalı. Konsolu kontrol edin.");
        });
    },

    // 🆕 YENİ: Ana sayfaya (öğrenme yoluna) dönüş fonksiyonu
    goToHome: function() {
        this.displayLearningPath(this.userLevel);
    },

    // Tüm veri dosyalarını eş zamanlı olarak yükler
    loadAllData: async function() {
        // Dosyaları yükler (Bu kısım aynı kaldı)
        const [
            testData, 
            contentData, 
            wordsData, 
            sentencesData, 
            readingData
        ] = await Promise.all([
            fetch('data/level_test.json').then(res => res.json()),
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
        
        document.getElementById('totalQuestionCount').textContent = this.testQuestions.length;
    },
    
    // Buton ve olay dinleyicilerini bağlar (goToHome butonu bağlandı)
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
        
        // 🆕 YENİ: Ana Sayfaya Dönüş butonu dinleyicisi
        const returnToHomeButton = document.getElementById('returnToHomeBtn');
        if (returnToHomeButton) {
             returnToHomeButton.addEventListener('click', () => this.goToHome());
        }
    },
    
    // ... (checkInitialState, resetTest, showSection, startTest, displayQuestion, saveAnswer, nextQuestion, prevQuestion, submitTest, determineLevel, displayResults, getLevelTitle, createModuleDataTemplate, displayLearningPath fonksiyonları önceki versiyonlarla aynı kaldı) ...
    
    // Modül içeriğini dinamik olarak zenginleştirir (Önceki versiyonla aynı kaldı)
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
        const levelCode = (moduleLevel === 'A1' ? 'beginner' : moduleLevel === 'B1' ? 'intermediate' : 'advanced'); // Seviye kodunu belirle
        
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
    
    // Modül Başlatma Fonksiyonu (Boş sayfa sorunu için güçlendirildi)
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
            contentBodyEl.innerHTML = `<p class="text-danger"><strong>${moduleId}</strong> kimliğine sahip modül, <strong>module_content.json</strong> dosyasında bulunamadı.</p>`;
            return;
        }

        try {
            // İçeriği zenginleştirme burada yapılıyor
            const moduleContent = this.enrichModuleContent(moduleId, baseModule);
            
            titleEl.textContent = baseModule.title;
            let contentHtml = '';
            let quizIndex = 0;

            moduleContent.forEach(item => {
                // ... (HTML oluşturma mantığı aynı, sadece item.type'a göre contentHtml'e ekleme yapılıyor)
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

            // Burası boş sayfa sorununu çözer: Hata oluşmazsa içeriği yerleştirir.
            contentBodyEl.innerHTML = contentHtml;
            
            // Dinleyicileri zenginleştirilmiş içerikle bağla
            LearningPath.attachQuizListeners(moduleId, { content: moduleContent }); 
            
            this.updateModuleStatus(moduleId, 'Devam Ediyor', 1);

        } catch (error) {
            console.error('❌ Modül içeriği oluşturulurken kritik hata:', error);
            titleEl.textContent = 'Yükleme Hatası';
            contentBodyEl.innerHTML = `<p class="text-danger"><strong>Ders içeriği hazırlanırken kritik bir hata oluştu.</strong> Lütfen modül verilerinizi (JSON dosyalarınızı) kontrol edin. Hata Mesajı: <code>${error.message}</code></p>`;
        }
    },

    // ... (attachQuizListeners, completeModule, updateModuleStatus, getCurrentModuleProgress fonksiyonları önceki versiyonlarla aynı kaldı) ...
    checkInitialState: function() {
        const storedLevel = localStorage.getItem('userLevel');
        
        // Eğer test yapılmadıysa ve modül verisi yoksa (veya testQuestions yüklenemedi ise), başlangıç ekranına git
        if (!storedLevel || !localStorage.getItem('learningModules') || this.testQuestions.length === 0) {
            this.resetTest();
            this.showSection('levelTestIntroSection');
        } else {
            // Eğer veriler varsa, öğrenme yoluna geç
            this.userLevel = storedLevel;
            this.displayLearningPath(storedLevel);
            this.showSection('learningPathSection');
        }
    },
    // ... (diğer fonksiyonlar aynı)
    // ...
};

document.addEventListener('DOMContentLoaded', () => LearningPath.init());
