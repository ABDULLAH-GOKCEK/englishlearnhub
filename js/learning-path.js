const LearningPath = {
    // Statik veriyi tutmak için değişkenler
    testQuestions: [],
    userAnswers: {},
    userLevel: 'A1', 
    currentModuleId: null, 
    moduleQuizScore: { total: 0, correct: 0, answered: false },
    levelMapping: { 'A1': 'B1', 'B1': 'C1', 'C1': 'C1' },
    
    // 🆕 YENİ: Dinamik veriler için depolama
    allModuleContents: {}, 
    allWords: [],
    allSentences: [],
    allReadings: [],

    // Sayfa yüklendiğinde çalışacak başlangıç fonksiyonu
    init: function() {
        // 🚨 GEÇİCİ TEST TEMİZLİĞİ: Testin atlanmasını engeller. Test bitince bu iki satırı silin.
        // localStorage.removeItem('userLevel'); 
        // localStorage.removeItem('learningModules');
        
        console.log("🚀 LearningPath başlatılıyor...");
        // Veri yükleme ve entegrasyon sırası önemlidir
        this.loadAllData().then(() => {
            this.bindEvents();
            this.checkInitialState();
            console.log("✅ Tüm veriler yüklendi ve entegrasyon tamamlandı.");
        }).catch(error => {
            console.error("Kritik Hata: Veri yüklemede sorun oluştu.", error);
            alert("Uygulama başlatılamadı: Veri dosyaları yüklenemedi veya hatalı.");
        });
    },

    // 🆕 YENİ: Tüm veri dosyalarını eş zamanlı olarak yükler
    loadAllData: async function() {
        // Dosyaları yükler
        const [
            testData, 
            contentData, 
            wordsData, 
            sentencesData, 
            readingData
        ] = await Promise.all([
            fetch('data/level_test.json').then(res => res.json()),
            fetch('data/module_content.json').then(res => res.json()), // 'module_content.json.json' -> 'module_content.json' olarak düzeltildi
            fetch('data/words.json').then(res => res.json()),
            fetch('data/sentences.json').then(res => res.json()),
            fetch('data/reading_stories.json').then(res => res.json())
        ]);
        
        // Verileri sınıf değişkenlerine kaydet
        this.allModuleContents = contentData;
        this.allWords = wordsData;
        this.allSentences = sentencesData;
        this.allReadings = readingData;
        
        // Test sorularını formatlayıp kaydet (Önceki adımdan kalan test mantığı)
        let rawQuestions = testData.questions || testData;
        this.testQuestions = rawQuestions.map(q => ({
            question: q.questionText || q.question, 
            options: q.options,
            answer: q.correctAnswer || q.answer 
        }));
        
        document.getElementById('totalQuestionCount').textContent = this.testQuestions.length;
        console.log(`✅ Test, kelime, cümle ve okuma verileri yüklendi.`);
    },
    
    // 🆕 YENİ: Modül içeriğini dinamik olarak zenginleştirir (ÖNEMLİ FONKSİYON)
    // Bu fonsiyon, 'Veri Çalışıldı' mantığını da ekler.
    enrichModuleContent: function(moduleId, baseContent) {
        // Modül seviyesini ve konu etiketini (topic) tahmin et
        const moduleLevel = moduleId.split('_')[0].toUpperCase(); // Örn: a1_m1 -> A1
        const moduleTopic = baseContent.topic; // Örn: Grammar

        let enrichedContent = [...baseContent.content]; // Ana içeriği kopyala

        // --- 1. Kelime Alıştırmaları ---
        const moduleWords = this.allWords.filter(w => 
            w.difficulty.toUpperCase().includes(moduleLevel) && // Seviye uyumu (easy/medium/hard)
            w.category.toLowerCase().includes(moduleTopic.toLowerCase())
        ).slice(0, 10); // İlk 10 kelimeyi al

        if (moduleWords.length > 0) {
             const wordsHtml = moduleWords.map(w => 
                `<div class="word-item"><strong>${w.word}</strong> - ${w.turkish} (${w.category}) <small class="text-muted">| Seviye: ${w.difficulty}</small></div>`
            ).join('');
            
            enrichedContent.push({type: 'heading', text: 'Kelime Alıştırması'});
            enrichedContent.push({type: 'paragraph', text: `Bu modül için ${moduleWords.length} adet kelime seçildi. Lütfen seslerini dinleyip tekrar edin (Simülasyon).`});
            enrichedContent.push({type: 'words', html: wordsHtml});
        }
        
        // --- 2. Okuma Parçası (Varsa) ---
        // Modül seviyesine ve konusuna uyan ilk okuma parçasını bul
        const moduleReading = this.allReadings.find(r => 
            r.level.toLowerCase().includes(moduleLevel.toLowerCase()) && 
            r.category.toLowerCase().includes(moduleTopic.toLowerCase())
        );

        if (moduleReading) {
            enrichedContent.push({type: 'heading', text: `Okuma: ${moduleReading.title}`});
            enrichedContent.push({type: 'paragraph', text: `**Seviye:** ${moduleReading.level} - **Konu:** ${moduleReading.category}`});
            enrichedContent.push({type: 'reading_text', text: moduleReading.content});
            
            // Okuma quiz'lerini modülün ana quiz'ine ekle
            moduleReading.questions.forEach((q, idx) => {
                 enrichedContent.push({
                    type: 'quiz', 
                    question: `(Okuma Sorusu ${idx + 1}): ${q.question}`, 
                    options: q.options, 
                    answer: q.options[q.correctAnswer] // reading_stories'de correctAnswer index olduğu için seçenek metnine çevir.
                });
            });
        }
        
        return enrichedContent;
    },
    
    // Modül Başlatma Fonksiyonu (startModule) - Güncellendi
    startModule: async function(moduleId) {
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
            contentBodyEl.innerHTML = `<p class="text-danger"><strong>${moduleId}</strong> kimliğine sahip modül bulunamadı.</p>`;
            return;
        }

        // 🆕 YENİ: İçeriği zenginleştir
        const moduleContent = this.enrichModuleContent(moduleId, baseModule);
        
        titleEl.textContent = baseModule.title;
        let contentHtml = '';
        let quizIndex = 0;

        moduleContent.forEach(item => {
            if (item.type === 'heading') {
                contentHtml += `<h3>${item.text}</h3>`;
            } else if (item.type === 'paragraph') {
                contentHtml += `<p>${item.text}</p>`;
            } else if (item.type === 'code_block') {
                contentHtml += `<pre class="code-block">${item.text}</pre>`;
            } else if (item.type === 'example') {
                contentHtml += `<div class="example-box">${item.text.replace(/\n/g, '<br>')}</div>`;
            } else if (item.type === 'words') { // 🆕 YENİ Kelime Listesi
                contentHtml += `<div class="word-list-section">${item.html}</div>`;
            } else if (item.type === 'reading_text') { // 🆕 YENİ Okuma Metni
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
        
        // Dinleyicileri, sadece baseModule yerine zenginleştirilmiş içerikle bağla
        LearningPath.attachQuizListeners(moduleId, { content: moduleContent }); 
        
        this.updateModuleStatus(moduleId, 'Devam Ediyor', 1);
    },
    
    // completeModule ve diğer fonksiyonlar (loadTestData, bindEvents, checkInitialState, displayQuestion, saveAnswer, nextQuestion, prevQuestion, submitTest, determineLevel, displayResults, getLevelTitle, createModuleDataTemplate, displayLearningPath, attachQuizListeners, updateModuleStatus) önceki adımda paylaşıldığı gibi aynı kalmalıdır.

    // ... (Geri kalan tüm fonksiyonlar aynı kalacak)
    bindEvents: function() {
        // ... (aynı kalacak)
    },
    checkInitialState: function() {
        // ... (aynı kalacak)
    },
    resetTest: function() {
        // ... (aynı kalacak)
    },
    showSection: function(sectionId) {
        // ... (aynı kalacak)
    },
    startTest: function() {
        // ... (aynı kalacak)
    },
    displayQuestion: function(index) {
        // ... (aynı kalacak)
    },
    saveAnswer: function(index, answer) {
        // ... (aynı kalacak)
    },
    nextQuestion: function() {
        // ... (aynı kalacak)
    },
    prevQuestion: function() {
        // ... (aynı kalacak)
    },
    submitTest: function() {
        // ... (aynı kalacak)
    },
    determineLevel: function(score) {
        // ... (aynı kalacak)
    },
    displayResults: function(score, level) {
        // ... (aynı kalacak)
    },
    getLevelTitle: function(level) {
        // ... (aynı kalacak)
    },
    createModuleDataTemplate: async function() {
        // ... (aynı kalacak)
    },
    displayLearningPath: async function(level) {
        // ... (aynı kalacak)
    },
    attachQuizListeners: function(moduleId, moduleData) {
         const quizzes = moduleData.content.filter(item => item.type === 'quiz');
        this.moduleQuizScore.total = quizzes.length;
        
        // Quizler tamamlandığında geriye kalan %99'u paylaşır
        const progressPerQuiz = quizzes.length > 0 ? Math.floor(99 / quizzes.length) : 0; 

        const quizItems = document.querySelectorAll('.module-quiz-card');
        
        quizItems.forEach(quizCard => {
            const quizIndex = parseInt(quizCard.dataset.quizIndex); 
            const questionText = quizCard.querySelector('p strong').textContent.replace(/Soru \d+:/, '').trim();
            
            const quizItem = quizzes.find(item => {
                // Okuma quizleri için başlık da dahil edildiği için daha esnek bir arama yapılır
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

    completeModule: function() {
         // ... (aynı kalacak)
    },
    updateModuleStatus: function(moduleId, status, progress) {
         // ... (aynı kalacak)
    },
    
    // 🆕 YENİ: Mevcut modül ilerlemesini döndürür
    getCurrentModuleProgress: function(moduleId) {
        const currentLevel = localStorage.getItem('userLevel') || 'A1';
        let modulesData = JSON.parse(localStorage.getItem('learningModules'));
        if (!modulesData) return 0;
        const module = modulesData[currentLevel]?.modules.find(m => m.id === moduleId);
        return module ? module.progress : 0;
    }
};

// Sayfa yüklendiğinde init fonksiyonunu çağır
document.addEventListener('DOMContentLoaded', () => LearningPath.init());
