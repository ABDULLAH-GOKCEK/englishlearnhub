const LearningPath = {
    // Sabitler
    TEST_FILE_PATH: 'data/level_test.json',
    MODULE_CONTENT_FILE_PATH: 'data/module_content.json',
    LEVEL_UP_EXAM_FILE_PATH: 'data/exam.json', 
    PASS_SCORE: 90, // Başarı eşiği: %90

    // Veri Depoları
    allModules: {},
    allModuleContents: {},
    allWords: [],
    allSentences: [],
    allReadings: [],
    allLevelTestQuestions: [],
    allExamQuestions: [], 
    shuffledTestQuestions: [],
    
    // Seslendirme
    synth: window.speechSynthesis, 
    speechUtterance: null,

    // Her modül için sabit bölüm yapısı
    STANDARD_SECTIONS: [
        { id: 'word', name: '1. Kelime Bilgisi Alıştırması', type: 'word' },
        { id: 'sentence', name: '2. Cümle Yapısı Alıştırması', type: 'sentence' },
        { id: 'reading', name: '3. Okuma Anlama Alıştırması', type: 'reading' },
        { id: 'module_test', name: '4. Modül Genel Testi', type: 'all' }, 
    ],

    // =========================================================================
    // 1. BAŞLATMA VE VERİ YÜKLEME
    // =========================================================================

    init: function() {
        this.loadAllData().then(() => {
            console.log("Tüm veriler yüklendi.");
            
            const userLevel = localStorage.getItem('userLevel');
            
            if (userLevel) {
                this.displayLearningPath(userLevel);
            } 
            else {
                this.showSection('introSection');
            }
            
            const startTestButton = document.getElementById('startTestButton');
            if (startTestButton) {
                 startTestButton.onclick = () => {
                    localStorage.removeItem('levelTestAnswers'); 
                    this.prepareAndDisplayLevelTest();
                 };
            }
            
            const statsButton = document.getElementById('navToStatsButton');
            if (statsButton) {
                statsButton.onclick = () => this.displayStats();
            }

        }).catch(error => {
            console.error("Veri yüklenirken kritik hata oluştu:", error);
            document.getElementById('introSection').innerHTML = `<div class="alert alert-danger">Uygulama başlatılamadı: Kritik veri dosyaları yüklenemedi. Konsolu kontrol edin.</div>`;
            this.showSection('introSection'); 
        });
    },

    loadAllData: async function() {
        const fetchData = async (path) => {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP hatası! Durum: ${res.status} (${path})`);
                return res.json();
            } catch (error) {
                console.error(`Kritik JSON Yükleme Hatası: ${path}`, error);
                // Hata durumunda boş obje/dizi döndürerek uygulamanın çökmesini engelle
                return path.includes('json') ? {} : []; 
            }
        };

        const [moduleData, moduleContentData, testData, wordsData, sentencesData, readingsData, examData] = await Promise.all([
            fetchData('data/learning_modules.json'), 
            fetchData(this.MODULE_CONTENT_FILE_PATH), 
            fetchData(this.TEST_FILE_PATH),
            fetchData('data/words.json'), 
            fetchData('data/sentences.json'), 
            fetchData('data/reading_stories.json'), 
            fetchData(this.LEVEL_UP_EXAM_FILE_PATH) 
        ]);

        this.allModules = moduleData || {};
        this.allModuleContents = (typeof moduleContentData === 'object' && moduleContentData !== null) ? moduleContentData : {}; 
        
        let questionsArray = [];
        if (Array.isArray(testData)) {
            questionsArray = testData;
        } else if (typeof testData === 'object' && testData !== null && Array.isArray(testData.questions)) {
            questionsArray = testData.questions;
        }
        this.allLevelTestQuestions = questionsArray; 
        
        this.allExamQuestions = Array.isArray(examData) ? examData : (examData && Array.isArray(examData.questions) ? examData.questions : []);

        this.allWords = Array.isArray(wordsData) ? wordsData : []; 
        this.allSentences = Array.isArray(sentencesData) ? sentencesData : []; 
        this.allReadings = Array.isArray(readingsData) ? readingsData : []; 
    },

    showSection: function(sectionId) {
        // V12'deki showSection mantığı (display: flex/none ile)
        this.stopSpeech();
        
        document.querySelectorAll('.module-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; 
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
            activeSection.style.display = 'flex'; 
            window.scrollTo(0, 0); 
        }
    },
    
    // --- Yardımcı Fonksiyonlar ---

    getIconForTopic: function(topic) {
        const iconMap = {
            'be fiili': 'fas fa-id-card', 'sahiplik': 'fas fa-hand-holding-usd', 'basit kelime': 'fas fa-spell-check',
            'şimdiki zaman': 'fas fa-clock', 'geçmiş zaman': 'fas fa-history', 'gelecek zaman': 'fas fa-forward',
            'dilbilgisi': 'fas fa-graduation-cap', 'kelime': 'fas fa-language', 'okuma': 'fas fa-book-reader',
            'dinleme': 'fas fa-volume-up', 'konuşma': 'fas fa-microphone-alt', 'quiz': 'fas fa-question-circle'
        };
        const normalizedTopic = topic.toLowerCase();
        let icon = iconMap[normalizedTopic] || 'fas fa-chalkboard';
        if (icon === 'fas fa-chalkboard') {
            if (normalizedTopic.includes('zaman')) icon = 'fas fa-clock';
            else if (normalizedTopic.includes('kelime')) icon = 'fas fa-book-open';
            else if (normalizedTopic.includes('fiil')) icon = 'fas fa-running';
            else if (normalizedTopic.includes('cümle')) icon = 'fas fa-stream';
        }
        return icon;
    },

    getBadgeClass: function(status) {
        if (status === 'Tamamlandı') return 'bg-success';
        if (status === 'Başlanmadı') return 'bg-secondary';
        if (status === 'Tekrar Gerekli' || status === 'Kaldı') return 'bg-warning text-dark';
        if (status === 'Atlandı (Soru Yok)') return 'bg-info text-dark'; 
        return 'bg-primary';
    },

    getHomeButton: function(userLevel) {
        const homeHref = 'index.html'; 
        return `
            <div style="position: sticky; top: 0; z-index: 10;">
                 <button class="btn btn-sm btn-outline-primary mb-3 mt-1" onclick="window.location.href = '${homeHref}'">
                    <i class="fas fa-home me-2"></i> Ana Sayfa
                </button>
            </div>
        `;
    },
    
    // =========================================================================
    // 2. SEVİYE TESPİT TESTİ
    // =========================================================================

    prepareAndDisplayLevelTest: function() {
        const MAX_QUESTIONS = 20;
        
        let rawQuestions = this.allLevelTestQuestions
            .map((q, index) => ({
                id: q.id || `q${index}`, questionText: q.questionText || q.question, options: q.options,
                correctAnswer: q.correctAnswer || q.answer, topic: q.topic || 'Genel', level: q.level || 'Test Sorusu' 
            }))
            .filter(q => q.correctAnswer && q.questionText) 
            .sort(() => 0.5 - Math.random())
            .slice(0, MAX_QUESTIONS);

        this.shuffledTestQuestions = rawQuestions.map(q => {
            return {
                ...q,
                shuffledOptions: [...q.options].sort(() => 0.5 - Math.random())
            };
        });

        this.displayLevelTest();
        this.showSection('levelTestSection');
    },

    displayLevelTest: function() {
        const testEl = document.getElementById('levelTestSection');
        if (!testEl) return;

        const questions = this.shuffledTestQuestions;
        
        if (questions.length === 0) {
            testEl.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4>Hata: Seviye Testi Soruları Yüklenemedi!</h4>
                    <p>Lütfen <code>level_test.json</code> dosyasını kontrol edin.</p>
                </div>
            `;
            return;
        }

        let currentQuestionIndex = 0;
        let userAnswers = {}; 
        const savedAnswers = localStorage.getItem('levelTestAnswers');
        if (savedAnswers) {
            userAnswers = JSON.parse(savedAnswers);
            const answeredIds = Object.keys(userAnswers);
            if (answeredIds.length > 0) {
                currentQuestionIndex = questions.findIndex(q => !userAnswers.hasOwnProperty(q.id));
                if (currentQuestionIndex === -1) { 
                    currentQuestionIndex = questions.length - 1; 
                }
            }
        }
        
        testEl.style.alignItems = 'flex-start'; 
        testEl.style.textAlign = 'left';

        const renderQuestion = () => {
            
            localStorage.setItem('levelTestAnswers', JSON.stringify(userAnswers));

            if (Object.keys(userAnswers).length === questions.length) {
                testEl.style.alignItems = 'center'; 
                testEl.style.textAlign = 'center';
                
                // Test bitince cevapları kaydetme
                this.calculateLevel(questions, userAnswers);
                return;
            }
            
            // Eğer currentQuestionIndex, answeredId sayısından az ise (geri gelme durumu)
            if (!userAnswers.hasOwnProperty(questions[currentQuestionIndex]?.id) && currentQuestionIndex > 0) {
                 const firstUnansweredIndex = questions.findIndex(q => !userAnswers.hasOwnProperty(q.id));
                 if (firstUnansweredIndex !== -1) { currentQuestionIndex = firstUnansweredIndex; }
            }


            const q = questions[currentQuestionIndex];
            const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
            const answeredCount = Object.keys(userAnswers).length;
            const isLastQuestion = answeredCount === questions.length - 1 && userAnswers.hasOwnProperty(q.id);

            let optionsHtml = '';
            const optionsToRender = q.shuffledOptions; 
            
            optionsToRender.forEach((option, index) => {
                const isSelected = userAnswers[q.id] === option.replace(/"/g, '');
                const selectedClass = isSelected ? 'selected-answer' : '';

                optionsHtml += `
                    <div 
                        class="form-check question-option ${selectedClass}" 
                        data-question-id="${q.id}"
                        data-option-value="${option.replace(/"/g, '')}"
                    >
                        <input class="form-check-input d-none" type="radio" name="question_${q.id}" id="radio_${q.id}_${index}" value="${option.replace(/"/g, '')}" ${isSelected ? 'checked' : ''}>
                        <label class="form-check-label w-100">${option}</label>
                    </div>
                `;
            });

            const nextButtonText = userAnswers[q.id] 
                ? (isLastQuestion ? 'Testi Bitir' : 'Sonraki') 
                : 'Lütfen Seçim Yapın';

            const testContent = `
                <div style="max-width: 800px; width: 100%;">
                    <h3 class="mb-4">Seviye Tespit Testi (${currentQuestionIndex + 1} / ${questions.length})</h3>
                    <div class="progress-container">
                        <div class="progress" role="progressbar" style="height: 12px;">
                            <div class="progress-bar" style="width: ${progress}%; background-color: #4361ee;"></div>
                        </div>
                    </div>
                    
                    <div class="card p-4 my-4">
                        <h5 class="question-text">${q.questionText || 'Soru Metni Yüklenemedi'}</h5> 
                        <p><small class="text-muted">Konu: ${q.topic} (Seviye: ${q.level})</small></p>
                        <div class="question-options-group">
                            ${optionsHtml}
                        </div>
                    </div>

                    <div class="d-flex justify-content-between">
                        <button class="btn btn-secondary ${currentQuestionIndex === 0 ? 'd-none' : ''}" id="prevButton">Geri</button>
                        <button class="btn btn-primary" id="nextButton" ${!userAnswers[q.id] ? 'disabled' : ''}>${nextButtonText}</button>
                    </div>
                </div>
            `;
            testEl.innerHTML = testContent;

            document.querySelectorAll('.question-option').forEach(optionEl => {
                optionEl.addEventListener('click', function() {
                    const qId = this.getAttribute('data-question-id');
                    const selectedValue = this.getAttribute('data-option-value');
                    
                    userAnswers[qId] = selectedValue;
                    renderQuestion(); // Cevap seçilince arayüzü yenile
                });
            });

            document.getElementById('nextButton').onclick = () => {
                const isLast = Object.keys(userAnswers).length === questions.length;
                
                if (isLast) {
                    this.calculateLevel(questions, userAnswers);
                    return;
                }
                
                currentQuestionIndex++;
                renderQuestion();
            };

            const prevButton = document.getElementById('prevButton');
            if (prevButton) {
                prevButton.onclick = () => {
                    currentQuestionIndex--;
                    renderQuestion();
                };
            }
        };

        renderQuestion();
    },

    calculateLevel: function(questions, userAnswers) {
        let score = 0;
        
        questions.forEach(q => {
            const isCorrect = userAnswers[q.id] === q.correctAnswer;
            if (isCorrect) {
                score++;
            }
        });

        const levelMapping = [
            { threshold: 17, level: 'C1' }, 
            { threshold: 14, level: 'B2' }, 
            { threshold: 10, level: 'B1' }, 
            { threshold: 5, level: 'A2' }, 
            { threshold: 0, level: 'A1' }
        ];

        let resultLevel = 'A1';
        for (const map of levelMapping) {
            if (score >= map.threshold) {
                resultLevel = map.level;
                break;
            }
        }

        localStorage.setItem('userLevel', resultLevel);
        localStorage.removeItem('levelTestAnswers');
        
        this.showLevelResult(resultLevel, score, questions.length);
    },
    
    showLevelResult: function(level, score, maxScore) {
        const testEl = document.getElementById('levelTestSection');
        
        const isPassedInitialTest = (score / maxScore) * 100 >= this.PASS_SCORE;
        
        let resultMessage = '';
        if (isPassedInitialTest) {
            resultMessage = `Tebrikler! **${level}** seviyesindeki öğrenme yolunuz belirlendi.`;
        } else {
            resultMessage = `Seviyeniz **${level}** olarak belirlendi. Modüllere başlayabilirsiniz. Her modülü tamamlayıp ilerleme kaydedeceksiniz.`;
        }
        
        testEl.innerHTML = `
            <div class="result-card p-5 shadow-lg text-center">
                <h3 class="text-success mb-4"><i class="fas fa-graduation-cap me-2"></i> Test Tamamlandı!</h3>
                <p class="h5">Doğru Sayısı: ${score} / ${maxScore}</p>
                <p class="h1 level-result mt-3 mb-4 text-primary">Seviyeniz: <span>${level}</span></p>
                
                <p class="lead mt-4">${resultMessage}</p>
                
                <button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayLearningPath('${level}')">
                    <i class="fas fa-route me-2"></i> Öğrenme Yolunu Gör
                </button>
            </div>
        `;
    },

    // =========================================================================
    // 3. ÖĞRENME YOLU GÖRÜNTÜLEME
    // =========================================================================

    displayLearningPath: function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        
        let modulesList = [];
        const baseLevelCode = 'A1'; 
        const baseLevelData = this.allModules[baseLevelCode];

        if (baseLevelData && Array.isArray(baseLevelData.modules)) {
            modulesList = baseLevelData.modules;
        } else {
             pathEl.innerHTML = `
                ${this.getHomeButton(level)}
                <div class="alert alert-danger" role="alert" style="max-width: 800px; margin-top: 50px;">
                    <h4>Hata: Öğrenme Modülleri Yüklenemedi!</h4>
                    <p>Lütfen <code>data/learning_modules.json</code> dosyasını kontrol edin.</p>
                </div>
            `;
            return;
        }
        
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        
        // Modül verilerini başlatma veya güncelleme
        if (!modules || modules.length === 0 || modules.length !== modulesList.length) {
             modules = modulesList.map(m => ({
                 ...m,
                 progress: 0,
                 status: 'Başlanmadı',
                 lastScore: 0,
                 sectionProgress: this.STANDARD_SECTIONS
                     .map(s => ({ 
                         id: s.id,
                         status: 'Başlanmadı',
                         lastScore: 0
                     }))
             }));
             localStorage.setItem('learningModules', JSON.stringify(modules));
        } else {
             // Modül listesi güncellendiğinde sectionProgress'i de güncel tut
             modules = modules.map(m => {
                 let updatedSections = [...m.sectionProgress];
                 this.STANDARD_SECTIONS.forEach(s => {
                     if (!updatedSections.find(us => us.id === s.id)) {
                          updatedSections.push({ id: s.id, status: 'Başlanmadı', lastScore: 0 });
                     }
                 });
                 m.sectionProgress = updatedSections;
                 return m;
             });
             localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        // HTML Oluşturma
        const moduleCards = modules.map(module => {
            const levelForContent = level;
            const relevantSections = module.sectionProgress.filter(s => s.id !== 'module_test');
            const totalSections = relevantSections.length;
            const completedSections = relevantSections.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
            const isSectionsCompleted = completedSections === totalSections;
            
            const moduleTestSection = module.sectionProgress.find(s => s.id === 'module_test') || {status: 'Başlanmadı', lastScore: 0};
            
            const badgeClass = this.getBadgeClass(module.status);

            const testButtonClass = (isSectionsCompleted && moduleTestSection.status !== 'Tamamlandı') ? 'btn-success' : 'btn-secondary';
            const testButtonDisabled = (!isSectionsCompleted || moduleTestSection.status === 'Tamamlandı') ? 'disabled' : '';
            
            let testButtonText = '';
            if (moduleTestSection.status === 'Tamamlandı') {
                testButtonText = `Tamamlandı (${moduleTestSection.lastScore}%)`;
            } else if (isSectionsCompleted) {
                testButtonText = 'Modül Genel Testi';
            } else {
                testButtonText = `${completedSections}/${totalSections} Bölüm Tamamlanmalı`;
            }

            return `
                 <div class="col-12 col-md-6 col-lg-4 mb-4">
                     <div class="card module-card h-100 shadow-sm ${module.status === 'Tamamlandı' ? 'border-success' : 'border-primary'}">
                         <div class="card-body" onclick="LearningPath.displayModuleContent('${module.id}', '${levelForContent}')" style="cursor: pointer;">
                             <h5 class="card-title">${module.name}</h5>
                             <p class="card-text text-muted">${module.topic} / Seviye: ${module.level}</p>
                             <p class="mb-1">
                                <span class="badge ${badgeClass} me-2">${module.status}</span>
                             </p>
                             <div class="progress mt-2" style="height: 8px;">
                                <div class="progress-bar" role="progressbar" style="width: ${module.progress || 0}%;" aria-valuenow="${module.progress || 0}" aria-valuemin="0" aria-valuemax="100"></div>
                             </div>
                             <small class="text-muted d-block mt-1">İlerleme: ${module.progress || 0}%</small>
                         </div>
                         <div class="card-footer d-flex justify-content-end">
                             <button 
                                 class="btn btn-sm ${testButtonClass}" 
                                 onclick="LearningPath.startQuiz('${module.id}', 'module_test')"
                                 ${testButtonDisabled}>
                                 ${testButtonText}
                             </button>
                         </div>
                     </div>
                 </div>
            `;
        }).join('');
        
        pathEl.innerHTML = `
            ${this.getHomeButton(level)}
            <div style="max-width: 1200px; width: 100%;">
                 <h2 class="display-6 mb-4">${baseLevelData.title} (${level} Seviyesi için)</h2>
                 <div class="row" id="modulesContainer">
                    ${moduleCards}
                 </div>
                 ${this.checkIfLevelUpReady(level)}
            </div>
        `;
    },
    
    // =========================================================================
    // 4. MODÜL İÇERİK YÜKLEME VE ZENGİNLEŞTİRME (KRİTİK GÜNCELLEME - V14.1)
    // =========================================================================
    
    // Modül içeriğini zenginleştirir (Soru havuzunu hazırlar)
    enrichModuleContent: function(moduleId, baseModule, userLevel) {
        const moduleLevel = userLevel.toUpperCase();
        const baseModuleTopic = baseModule.topic ? baseModule.topic.toLowerCase() : '';
        const staticContent = Array.isArray(baseModule.content) ? baseModule.content : [];
        let enrichedContent = [...staticContent];

        const difficultyMapping = { 
            'A1': ['easy', 'beginner'], 'A2': ['easy', 'medium', 'beginner', 'intermediate'],
            'B1': ['medium', 'intermediate'], 'B2': ['medium', 'hard', 'intermediate', 'advanced'],
            'C1': ['hard', 'advanced'], 'C2': ['hard', 'advanced']
        };
        const allowedDifficulties = difficultyMapping[moduleLevel] || ['easy'];
        
        const isModuleGrammar = baseModuleTopic && (['grammar', 'gramer', 'structure'].includes(baseModuleTopic) || baseModule.name.toLowerCase().includes('fiili') || baseModule.name.toLowerCase().includes('zamirler'));
        
        let wordQuizQuestions = [];
        let sentenceQuizQuestions = [];
        let readingQuizQuestions = [];
        
        // V14.1 GÜNCELLEMESİ: Grammar modülleri için daha güvenilir konu tanımı
        let effectiveTopic = baseModuleTopic;
        if (baseModule.name.toLowerCase().includes('fiili') || baseModule.name.toLowerCase().includes('zamirler')) {
             effectiveTopic = 'be fiili'; // Daha kısa ve veritabanı ile eşleşme ihtimali yüksek bir konu
        } else if (baseModuleTopic.includes('be fiili') || baseModuleTopic.includes('sahiplik')) { 
             effectiveTopic = baseModuleTopic.includes('be fiili') ? 'be fiili' : 'sahiplik';
        }

        // --- 1. Kelime Alıştırmaları (words.json) ---
        // Önce modül konusuna ve seviyeye tam uyanları filtrele
        let moduleWords = this.allWords.filter(w => {
            const isLevelMatch = w.difficulty && allowedDifficulties.includes(w.difficulty.toLowerCase());
            if (!isLevelMatch) return false;
            const wordCategory = w.category ? w.category.toLowerCase() : '';
            // Konu eşleşmesi için effectiveTopic kullanılıyor (Fix 2)
            return wordCategory.includes(effectiveTopic) || effectiveTopic.includes(wordCategory); 
        }).sort(() => 0.5 - Math.random());
        
        // V.14 GÜNCELLEMESİ: Yeterli kelime bulunamazsa (5'ten az), sadece seviyeye uyanlardan rastgele seç (Yedekleme Mantığı)
        if (moduleWords.length < 5) { 
             moduleWords = this.allWords.filter(w => {
                 return w.difficulty && allowedDifficulties.includes(w.difficulty.toLowerCase());
             }).sort(() => 0.5 - Math.random());
        }
        
        moduleWords = moduleWords.slice(0, 20); // Maksimum 20 kelime göster
        
        if (moduleWords.length > 0) {
            const wordsHtml = moduleWords.map(w => `<div class="word-item col-md-4 col-sm-6"><strong>${w.word}</strong> (${w.turkish})</div>`).join('');
            // Kelime listesini içerik olarak ekle
            enrichedContent.push({type: 'words', html: wordsHtml});
            
            moduleWords.slice(0, 10).forEach((w, index) => {
                 let options = [w.turkish];
                 const wrongOptions = this.allWords
                      .filter(ow => ow.turkish !== w.turkish)
                      .map(ow => ow.turkish)
                      .sort(() => 0.5 - Math.random()).slice(0, 3);
                 
                 options = [...options, ...wrongOptions].sort(() => 0.5 - Math.random());
                 
                 wordQuizQuestions.push({
                      id: `word_q${moduleId}_${index}`, type: 'quiz', question: `"${w.word}" kelimesinin Türkçe karşılığı nedir?`,
                      options: options, answer: w.turkish, topic: 'Kelime Bilgisi'
                 });
            });
        }

        // --- 2. Cümle Alıştırmaları (sentences.json) ---
        // Önce modül konusuna ve seviyeye tam uyanları filtrele
        let moduleSentences = this.allSentences.filter(s => {
            const isLevelMatch = s.difficulty && allowedDifficulties.includes(s.difficulty.toLowerCase());
            if (!isLevelMatch) return false;
            
            // Dilbilgisi modülleri için seviyeye uygun tüm cümlelere izin ver (isModuleGrammar sayesinde)
            if (isModuleGrammar || ['konuşma', 'speaking', 'sentence', 'cümle'].includes(baseModuleTopic) || !baseModuleTopic) { return true; }
            
            const sentenceCategory = s.category ? s.category.toLowerCase() : '';
            return sentenceCategory.includes(effectiveTopic) || effectiveTopic.includes(sentenceCategory);
        }).sort(() => 0.5 - Math.random());
        
        // V.14 GÜNCELLEMESİ: Yeterli cümle bulunamazsa (5'ten az), sadece seviyeye uyanlardan rastgele seç (Yedekleme Mantığı)
        if (moduleSentences.length < 5) { 
             moduleSentences = this.allSentences.filter(s => {
                 return s.difficulty && allowedDifficulties.includes(s.difficulty.toLowerCase());
             }).sort(() => 0.5 - Math.random());
        }

        moduleSentences = moduleSentences.slice(0, 15); // Maksimum 15 cümle göster
        
        if (moduleSentences.length > 0) {
            const sentencesHtml = moduleSentences.map(s => `<div class="sentence-item py-1"><strong>${s.english}</strong> (${s.turkish})</div>`).join('');
            // Cümle listesini içerik olarak ekle
            enrichedContent.push({type: 'sentences', html: sentencesHtml});
            
            moduleSentences.slice(0, 10).forEach((s, index) => {
                 const words = s.english.split(' ');
                 if (words.length < 3) return; // En az 3 kelimelik cümlede eksik kelime testi yap
                 
                 const missingWordIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
                 const missingWord = words[missingWordIndex].replace(/[.,?!]/g, '');
                 
                 const questionText = words.map((w, i) => i === missingWordIndex ? '___' : w).join(' ');
                 
                 let options = [missingWord];
                 const wrongOptions = this.allWords
                      .filter(w => w.word !== missingWord).map(w => w.word).sort(() => 0.5 - Math.random()).slice(0, 3);
                 
                 options = [...options, ...wrongOptions].sort(() => 0.5 - Math.random());
                 
                 sentenceQuizQuestions.push({
                      id: `sentence_q${moduleId}_${index}`, type: 'quiz', question: questionText,
                      options: options, answer: missingWord, topic: 'Cümle Yapısı'
                 });
            });
        }
        
        // --- 3. Okuma Anlama (reading_stories.json) ---
        
        // Okuma için konu eşleşmesi genellikle İngilizce kategorilere göre yapılır
        const turkishToEnglishCategoryMap = {
            'günlük hayat': 'daily life', 'günlük rutin': 'daily life', 'doğa': 'nature', 'hayvanlar': 'animals', 'müzik': 'music',
            'yiyecek': 'food', 'beslenme': 'food', 'alışveriş': 'shopping', 'aile': 'family', 'seyahat': 'travel', 'geçmiş zaman': 'history', 
            'konuşma': 'daily life', 'cümle yapısı': 'structure', 'dilbilgisi': 'grammar', 'be fiili': 'introduction', 'sahiplik': 'possession'
        };
        const mappedCategory = turkishToEnglishCategoryMap[effectiveTopic] || 'general';

        let moduleReading = this.allReadings.find(r => 
            (r.level && allowedDifficulties.includes(r.level.toLowerCase())) && 
            (r.category ? r.category.toLowerCase() : '').includes(mappedCategory)
        );

        if (!moduleReading && this.allReadings.length > 0) {
             const suitableReadings = this.allReadings.filter(r => (r.level && allowedDifficulties.includes(r.level.toLowerCase())));
             if (suitableReadings.length > 0) {
                 moduleReading = suitableReadings[Math.floor(Math.random() * suitableReadings.length)];
             }
        }

        if (moduleReading && moduleReading.content) {
            baseModule.reading_story_title = moduleReading.title;
            enrichedContent.push({
                type: 'reading_text', text: moduleReading.content, level: moduleReading.level, category: moduleReading.category, title: moduleReading.title
            });
            
            // Okuma sorularını işleme kısmı 
            if (Array.isArray(moduleReading.questions)) {
                 moduleReading.questions.forEach((q, index) => {
                     if (q.options && q.options.length > 2) {
                          let correctAnswerText = null;
                          // Doğru cevabı seçenek metni olarak alma mantığı
                          if (typeof q.correctAnswer === 'number' && q.options[q.correctAnswer] !== undefined) {
                              correctAnswerText = q.options[q.correctAnswer];
                          } else if (typeof q.correctAnswer === 'string') {
                              correctAnswerText = q.correctAnswer; 
                          } 
                          
                          if (correctAnswerText) {
                              readingQuizQuestions.push({
                                  id: `reading_q${moduleId}_${index}`, type: 'quiz', 
                                  question: `(Okuma Sorusu): ${q.question}`,
                                  options: q.options, answer: correctAnswerText,
                                  topic: `${moduleReading.title} - Okuma Anlama`
                              });
                          }
                     }
                 });
            }

        } else {
            enrichedContent.push({type: 'reading_placeholder', text: 'Okuma hikayesi bulunamadı. Modül konusu ile okuma kategorileri eşleşmedi veya bu seviyeye uygun hikaye yok.'});
        }
        
        // Quiz Soru Havuzlarını baseModule objesine atar (geçici olarak)
        baseModule.word_quiz_questions = wordQuizQuestions;
        baseModule.sentence_quiz_questions = sentenceQuizQuestions;
        baseModule.reading_quiz_questions = readingQuizQuestions;
        baseModule.all_quiz_questions = [...wordQuizQuestions, ...sentenceQuizQuestions, ...readingQuizQuestions];
        
        return enrichedContent;
    },

    // İçerik elemanlarını HTML'e çevirme
    renderContentItem: function(item) {
        let html = '';
        if (item.type === 'grammar_text') {
            html = `<div class="content-text p-3 mb-4 border-start border-4 border-primary bg-white shadow-sm rounded">
                        <h4 class="text-primary">${item.title || 'Dilbilgisi Anlatımı'}</h4>
                        <p>${item.text}</p>
                        <button class="btn btn-outline-primary btn-sm tts-button mt-2" data-text-to-speak="${item.text}">
                            <i class="fas fa-volume-up"></i> Dinle
                        </button>
                    </div>`;
        } else if (item.type === 'reading_text') {
            
            // V14.2 GÜNCELLEMESİ: Ses hızı kontrolü hikayenin dinle butonu yanına eklendi.
            const initialRate = localStorage.getItem('speechRate') || '0.9';
            const uniqueId = `speechRate_${item.title.hashCode()}`;
            
            html = `<div class="reading-section p-4 mb-4 bg-white shadow-lg rounded">
                        <h5 class="text-primary mb-3">${item.title || 'Okuma Hikayesi'} (Seviye: ${item.level})</h5>
                        <p class="reading-content">${item.text}</p>
                        
                        <div class="d-flex align-items-center mt-3 p-2 bg-light rounded border border-secondary" style="gap: 10px; max-width: 350px;">
                            <button class="btn btn-success btn-sm tts-button" data-text-to-speak="${item.text}">
                                <i class="fas fa-volume-up me-1"></i> Dinle
                            </button>
                            <label for="${uniqueId}" class="form-label mb-0" style="white-space: nowrap;">Hız:</label>
                            <input type="range" class="form-range speech-rate-slider" id="${uniqueId}" min="0.5" max="2" step="0.1" value="${initialRate}" style="width: 100px;">
                            <span class="rate-value-span ms-auto" style="min-width: 25px;">${initialRate}</span>
                        </div>
                    </div>`;
        } else if (item.type === 'reading_placeholder') {
             html = `<div class="alert alert-warning mb-4">
                        <i class="fas fa-exclamation-triangle"></i> ${item.text}
                    </div>`;
        } else if (item.type === 'words') {
             html = `<div class="vocabulary-list p-3 mb-4 bg-light rounded shadow-sm">
                         <h6>Kelime Listesi:</h6>
                         <div class="row word-list-container">${item.html}</div>
                     </div>`;
        } else if (item.type === 'sentences') {
             html = `<div class="sentence-list p-3 mb-4 bg-light rounded shadow-sm">
                         <h6>Örnek Cümleler:</h6>
                         <div class="d-flex flex-column">${item.html}</div>
                     </div>`;
        }
        return html;
    },


    // KRİTİK GÜNCELLEME (V14.0): Akış Düzeltildi - Alıştırma kartları ilgili içeriğin hemen altında gösterilir.
    renderModuleContentDetail: function(moduleId, baseModule, currentModule) {
        const userLevel = localStorage.getItem('userLevel') || 'A1';
        
        // Bu adım, quiz sorularını baseModule objesine ekler ve enrichedContentList'i oluşturur.
        const enrichedContentList = this.enrichModuleContent(moduleId, baseModule, userLevel); 
        
        let contentHtml = '';
        
        // Quiz kartlarını önceden oluştur, ancak henüz render etme
        const quizCards = {
            word: this.renderInlineQuizSection('word', baseModule, currentModule),
            sentence: this.renderInlineQuizSection('sentence', baseModule, currentModule),
            reading: this.renderInlineQuizSection('reading', baseModule, currentModule)
        };

        // Modül içeriklerini sırayla render et ve ilgili alıştırma kartını hemen altına ekle
        enrichedContentList.forEach(item => {
            contentHtml += this.renderContentItem(item); 
            
            let cardToAppend = '';
            let appendSectionId = null;

            if (item.type === 'words') {
                appendSectionId = 'word';
            } else if (item.type === 'sentences') {
                appendSectionId = 'sentence';
            } else if (item.type === 'reading_text' || item.type === 'reading_placeholder') {
                appendSectionId = 'reading';
            }
            
            if (appendSectionId && quizCards[appendSectionId]) {
                // Alıştırma kartını, içeriğin hemen altına row yapısı içinde ekle
                cardToAppend = `<div class="row g-4 mb-4">${quizCards[appendSectionId]}</div>`;
                contentHtml += cardToAppend;
                // Kartı kullandıktan sonra null yap ki tekrar render edilmesin
                quizCards[appendSectionId] = null; 
            }
        });

        // Eğer modül içeriğinde hiç kelime/cümle/okuma listesi yoksa ve kartlar hala render edilmemişse (örneğin sadece grammar_text varsa), bunları en sona ekle
        if (quizCards.word || quizCards.sentence || quizCards.reading) {
             let remainingCardsHtml = `<div class="row g-4 mb-4 mt-4">`;
             if (quizCards.word) remainingCardsHtml += quizCards.word;
             if (quizCards.sentence) remainingCardsHtml += quizCards.sentence;
             if (quizCards.reading) remainingCardsHtml += quizCards.reading;
             remainingCardsHtml += `</div>`;
             contentHtml += remainingCardsHtml;
        }

        return contentHtml;
    },
    
    // Modül içeriği ve kartları gösterme
    displayModuleContent: function(moduleId, userLevel) {
        this.showSection('moduleContentSection');
        const contentEl = document.getElementById('moduleContentSection');
        
        const baseLevelCode = 'A1';
        const baseModule = this.allModules[baseLevelCode]?.modules?.find(m => m.id === moduleId);
        if (!baseModule) {
             contentEl.innerHTML = `<div class="alert alert-danger">Modül içeriği yüklenemedi. Modül ID: ${moduleId} bulunamadı.</div>`;
             return;
        }

        let modules = JSON.parse(localStorage.getItem('learningModules'));
        const currentModule = modules.find(m => m.id === moduleId);
        
        const staticContentData = this.allModuleContents[moduleId];
        baseModule.content = (staticContentData && Array.isArray(staticContentData.content)) ? staticContentData.content : [];
        
        // Render etmeden önce enrichModuleContent çağrısı, quiz sorularını baseModule'e ekler.
        const contentDetailHTML = this.renderModuleContentDetail(moduleId, baseModule, currentModule);
        
        // V14.2 GÜNCELLEMESİ: speechControls div'i buradan kaldırıldı, içeriğe taşındı.
        contentEl.innerHTML = `
            <div style="max-width: 900px; width: 100%;">
                <button class="btn btn-secondary mb-3" onclick="LearningPath.displayLearningPath('${userLevel}')">
                    <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
                </button>
                <h3 class="mb-3">${baseModule.name} Modülü (Seviye: ${userLevel})</h3>
                
                <hr class="mt-4 mb-4">
                
                <div id="moduleContentDetail" class="p-4 bg-light rounded shadow-sm">
                    <h4>İçerik Anlatımı ve Alıştırmalar</h4>
                    ${contentDetailHTML} 
                </div>
            </div>
        `;
        
        this.attachSpeechListeners(baseModule.name);

        this.updateModuleSectionStatus(moduleId, 'content_view', true, 0); 
    },
    
    // =========================================================================
    // 5. QUIZ VE ALISTIRMA YÖNETİMİ
    // =========================================================================

    renderInlineQuizSection: function(sectionId, baseModule, currentModule) {
        const sectionInfo = this.STANDARD_SECTIONS.find(s => s.id === sectionId);
        
        let quizQuestions = [];
        if (sectionId === 'word') { quizQuestions = baseModule.word_quiz_questions; }
        else if (sectionId === 'sentence') { quizQuestions = baseModule.sentence_quiz_questions; }
        else if (sectionId === 'reading') { quizQuestions = baseModule.reading_quiz_questions; }
        
        const questionCount = quizQuestions ? quizQuestions.length : 0;
        const sectionData = currentModule.sectionProgress.find(s => s.id === sectionId) || {status: 'Başlanmadı', lastScore: 0};
        
        // Eğer hiç soru yoksa, otomatik olarak atlandı (Atlandı (Soru Yok)) durumuna getir.
        if (sectionData.status === 'Başlanmadı' && questionCount === 0) {
             sectionData.status = 'Atlandı (Soru Yok)';
             this.updateModuleSectionStatus(currentModule.id, sectionId, true, 0, 'Atlandı (Soru Yok)'); 
        }
        
        const badgeClass = this.getBadgeClass(sectionData.status);
        const isCompleted = (sectionData.status === 'Tamamlandı' || sectionData.status === 'Atlandı (Soru Yok)');
        
        const statusMessage = isCompleted ? 'Bölüm tamamlandı.' : `${questionCount} Soru Hazır.`;
        
        let buttonHtml = '';
        if (sectionData.status === 'Atlandı (Soru Yok)') {
             buttonHtml = `<button class="btn btn-sm btn-info" disabled>Atlandı</button>`;
        } else if (isCompleted) {
             buttonHtml = `<button class="btn btn-sm btn-warning" onclick="LearningPath.startQuiz('${currentModule.id}', '${sectionId}')">Tekrar Çöz</button>`;
        } else if (questionCount > 0) {
             buttonHtml = `<button class="btn btn-sm btn-success" onclick="LearningPath.startQuiz('${currentModule.id}', '${sectionId}')">Başla (${questionCount})</button>`;
        } else {
             buttonHtml = `<button class="btn btn-sm btn-secondary" disabled>Soru Yok</button>`;
        }
        
        
        return `
            <div class="col-12 col-md-6 col-lg-6">
                <div class="card h-100 shadow-sm section-card ${isCompleted ? 'border-success' : 'border-primary'}">
                    <div class="card-body">
                        <h5 class="card-title">${sectionInfo.name}</h5>
                        <p class="mb-0"> 
                            <span class="badge ${badgeClass} me-2">${sectionData.status}</span> 
                            <small class="text-muted">Son Puan: ${sectionData.lastScore}%</small>
                            <span class="text-muted">${statusMessage}</span>
                        </p>
                    </div>
                    <div class="card-footer d-flex justify-content-end">
                        ${buttonHtml}
                    </div>
                </div>
            </div>
        `;
    },

    startQuiz: function(moduleId, sectionId) {
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        const moduleData = modules[moduleIndex];
        const userLevel = localStorage.getItem('userLevel') || 'A1';
        
        // 1. Gerekirse Quiz Sorularını Oluştur ve Kaydet (KRİTİK)
        // Modül verisinde quiz soruları yoksa veya boşsa, yeniden oluştur
        if (!moduleData.all_quiz_questions || (moduleData.all_quiz_questions.length || 0) === 0 || 
            (sectionId === 'word' && (!moduleData.word_quiz_questions || (moduleData.word_quiz_questions.length || 0) === 0)) ||
            (sectionId === 'sentence' && (!moduleData.sentence_quiz_questions || (moduleData.sentence_quiz_questions.length || 0) === 0)) ||
            (sectionId === 'reading' && (!moduleData.reading_quiz_questions || (moduleData.reading_quiz_questions.length || 0) === 0)) ||
            (sectionId === 'module_test' && (!moduleData.all_quiz_questions || (moduleData.all_quiz_questions.length || 0) < 5)) // length check added to all, using || 0 for safety
        ) {
            const baseLevelCode = 'A1';
            const baseModule = this.allModules[baseLevelCode]?.modules?.find(m => m.id === moduleId);
            if (!baseModule) { alert("Modül veri yapısı bulunamadı."); return; }
            const staticContentData = this.allModuleContents[moduleId];
            baseModule.content = (staticContentData && Array.isArray(staticContentData.content)) ? staticContentData.content : [];
            
            // Soruları oluşturur ve baseModule'e ekler
            this.enrichModuleContent(moduleId, baseModule, userLevel);
            
            // Oluşturulan soruları modül verisine kalıcı olarak ata ve kaydet
            moduleData.all_quiz_questions = baseModule.all_quiz_questions; 
            moduleData.word_quiz_questions = baseModule.word_quiz_questions;
            moduleData.sentence_quiz_questions = baseModule.sentence_quiz_questions;
            moduleData.reading_quiz_questions = baseModule.reading_quiz_questions;
            localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        // 2. Quiz sorularını filtrele ve **UNDEFİNED HATASINI DÜZELTME**
        let quizQuestions = [];
        if (sectionId === 'word') { quizQuestions = moduleData.word_quiz_questions || []; } // || [] eklemesi ile çökme engellendi.
        else if (sectionId === 'sentence') { quizQuestions = moduleData.sentence_quiz_questions || []; } // || [] eklemesi ile çökme engellendi.
        else if (sectionId === 'reading') { quizQuestions = moduleData.reading_quiz_questions || []; } // || [] eklemesi ile çökme engellendi.
        else if (sectionId === 'module_test') { 
            // Genel test için rastgele 15 soru seç
            const allQuestions = moduleData.all_quiz_questions || [];
            quizQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 15); 
        }
        
        if (quizQuestions.length === 0) {
            alert("Bu bölüm için henüz soru bulunmamaktadır veya sorular yüklenemedi. Modül içeriğini kontrol edin.");
            return;
        }

        // 3. Quizi başlat
        localStorage.setItem('currentQuiz', JSON.stringify({
            moduleId: moduleId, sectionId: sectionId, questions: quizQuestions,
            currentQuestionIndex: 0, answers: [] // answers artık objenin içinde
        }));

        this.showSection('quizSection');
        this.renderQuizQuestion(quizQuestions[0]);
    },

    renderQuizQuestion: function(question) {
        const quizContainer = document.getElementById('quizQuestions');
        const quizTitle = document.getElementById('quizTitle');
        const currentQuizState = JSON.parse(localStorage.getItem('currentQuiz'));
        
        // V14.3 Sağlamlaştırma: HTML elementlerinin varlığını kontrol et
        if (!quizContainer || !quizTitle) {
             console.error("Kritik Hata: Quiz arayüz elementleri (quizQuestions/quizTitle) HTML'de bulunamadı. Lütfen index.html dosyanızdaki quizSection elementini kontrol edin.");
             document.getElementById('quizSection').innerHTML = `<div class="alert alert-danger" style="max-width: 800px;">Kritik Hata: Quiz arayüzü elementleri eksik. Lütfen HTML yapınızı kontrol edin.</div>`;
             return;
        }
        
        if (!question) {
            alert("Hata: Gösterilecek soru bulunamadı. QuizState'i kontrol edin.");
            this.showSection('learningPathSection'); 
            return;
        }

        const questionIndex = currentQuizState.currentQuestionIndex;
        const totalQuestions = currentQuizState.questions.length;

        const sectionName = this.STANDARD_SECTIONS.find(s => s.id === currentQuizState.sectionId)?.name || 'Quiz';
        quizTitle.textContent = `${sectionName} - Soru ${questionIndex + 1} / ${totalQuestions}`;

        // HashCode kullanarak dinamik ID oluşturma
        const optionsHtml = question.options.map((option, index) => {
            const isSelected = currentQuizState.answers[questionIndex] && currentQuizState.answers[questionIndex].selected === option;
            const selectedClass = isSelected ? 'selected-answer' : '';
            return `
                <div class="form-check mb-2 question-option ${selectedClass}">
                    <input class="form-check-input d-none" type="radio" name="quiz_question" id="quiz_opt_${option.hashCode()}_${index}" value="${option}" ${isSelected ? 'checked' : ''}>
                    <label class="form-check-label w-100" for="quiz_opt_${option.hashCode()}_${index}">${option}</label>
                </div>
            `;
        }).join('');

        quizContainer.innerHTML = `
            <div class="card shadow-lg mb-4">
                <div class="card-body">
                    <h5 class="card-title">${question.question}</h5>
                    <p class="card-subtitle mb-3 text-muted">${question.topic}</p>
                    <div class="question-options-group">
                       ${optionsHtml}
                    </div>
                </div>
            </div>
            <div class="d-flex justify-content-between">
                <button class="btn btn-secondary" id="quizPrevButton" ${questionIndex === 0 ? 'disabled' : ''} onclick="LearningPath.goToPreviousQuestion()">
                    Önceki Soru
                </button>
                <button class="btn btn-primary" id="quizNextButton" onclick="LearningPath.submitQuiz()">
                    ${questionIndex < totalQuestions - 1 ? 'Sonraki Soru' : 'Quizi Bitir'}
                </button>
            </div>
        `;
        
        // Seçim olay dinleyicisi
        document.querySelectorAll('.question-options-group .question-option').forEach(optionEl => {
            optionEl.addEventListener('click', function() {
                const selectedValue = this.querySelector('input').value;
                // Cevabı state'e kaydet
                currentQuizState.answers[questionIndex] = {
                    questionId: question.id,
                    selected: selectedValue,
                    correct: question.answer,
                    isCorrect: selectedValue === question.answer
                };
                localStorage.setItem('currentQuiz', JSON.stringify(currentQuizState));
                // Seçilen seçeneği görsel olarak işaretle
                document.querySelectorAll('.question-option').forEach(el => el.classList.remove('selected-answer'));
                this.classList.add('selected-answer');
            });
        });
    },

    goToPreviousQuestion: function() {
        let currentQuizState = JSON.parse(localStorage.getItem('currentQuiz'));
        if (currentQuizState.currentQuestionIndex > 0) {
            currentQuizState.currentQuestionIndex--;
            localStorage.setItem('currentQuiz', JSON.stringify(currentQuizState));
            this.renderQuizQuestion(currentQuizState.questions[currentQuizState.currentQuestionIndex]);
        }
    },

    submitQuiz: function() {
        let currentQuizState = JSON.parse(localStorage.getItem('currentQuiz'));
        const currentQuestion = currentQuizState.questions[currentQuizState.currentQuestionIndex];
        const questionIndex = currentQuizState.currentQuestionIndex;
        
        // V14.4: Hata Düzeltme 1 - DOM'dan seçilen cevabı al
        const selectedOption = document.querySelector('input[name="quiz_question"]:checked')?.value;
        
        // DOM'dan alınan cevabı state'e kaydet (Eğer click event'i kaçırıldıysa)
        if (selectedOption) {
            currentQuizState.answers[questionIndex] = {
                questionId: currentQuestion.id,
                selected: selectedOption,
                correct: currentQuestion.answer,
                isCorrect: selectedOption === currentQuestion.answer
            };
            localStorage.setItem('currentQuiz', JSON.stringify(currentQuizState));
        }

        // Cevap zaten kaydedilmiş olmalı (click listener veya yukarıdaki DOM kontrolü ile)
        const currentAnswer = currentQuizState.answers[questionIndex];

        if (!currentAnswer) {
            alert("Lütfen bir seçenek işaretleyiniz.");
            return;
        }

        currentQuizState.currentQuestionIndex++;
        localStorage.setItem('currentQuiz', JSON.stringify(currentQuizState));

        if (currentQuizState.currentQuestionIndex < currentQuizState.questions.length) {
            this.renderQuizQuestion(currentQuizState.questions[currentQuizState.currentQuestionIndex]);
        } else {
            this.showQuizResults(currentQuizState);
        }
    },

    showQuizResults: function(quizState) {
        const totalQuestions = quizState.questions.length;
        const correctCount = quizState.answers.filter(a => a.isCorrect).length;
        const score = Math.round((correctCount / totalQuestions) * 100);
        const sectionId = quizState.sectionId;
        const moduleId = quizState.moduleId;
        
        let status = score >= this.PASS_SCORE ? 'Tamamlandı' : 'Kaldı';
        if (score === 0 && totalQuestions === 0) status = 'Atlandı (Soru Yok)';

        this.updateModuleSectionStatus(moduleId, sectionId, true, score, status);

        // V14.4: Hata Düzeltme 2 - İki olası sonuç konteynerini kontrol et (HTML çökmesini önler)
        let resultsContainer = document.getElementById('quizResults');
        if (!resultsContainer) {
             resultsContainer = document.getElementById('quizResultsSection'); // Fallback to the section container
        }
        
        const userLevel = localStorage.getItem('userLevel');
        
        // Eğer hala null ise, hata mesajı gösterip çık.
        if (!resultsContainer) {
             console.error("Kritik Hata: Quiz sonuçları için HTML konteyneri bulunamadı (quizResults veya quizResultsSection). Lütfen index.html dosyanızı kontrol edin.");
             // quizResultsSection'ı da bulamadıysa, quizSection'ı kullan
             let emergencyContainer = document.getElementById('quizSection');
             if(emergencyContainer) {
                 emergencyContainer.innerHTML = `<div class="alert alert-danger" style="max-width: 800px;">Kritik Hata: Sonuçlar gösterilemedi. Lütfen HTML yapınızı kontrol edin.</div>`;
                 this.showSection('quizSection');
             } else {
                 alert("Kritik Hata: Sonuçlar gösterilemedi.");
             }
             return; 
        }

        resultsContainer.innerHTML = `
            <h3 class="text-center mb-4">Quiz Sonuçları</h3>
            <div class="alert ${score >= this.PASS_SCORE ? 'alert-success' : 'alert-danger'} text-center">
                <h4>Puanınız: ${score}%</h4>
                <p>Doğru: ${correctCount} / Toplam: ${totalQuestions}</p>
                <p>Durum: <strong>${status}</strong></p>
            </div>
            <div class="d-flex justify-content-center mt-4">
                <button class="btn btn-primary me-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">
                    <i class="fas fa-book-open me-2"></i> Modüle Geri Dön
                </button>
                <button class="btn btn-warning" onclick="LearningPath.startQuiz('${moduleId}', '${sectionId}')">
                    <i class="fas fa-redo me-2"></i> Tekrar Çöz
                </button>
            </div>
        `;

        this.showSection('quizResultsSection');
    },
    
    // =========================================================================
    // 6. DURUM VE İLERLEME YÖNETİMİ
    // =========================================================================

    updateModuleSectionStatus: function(moduleId, sectionId, isAttempted, score, status = null) {
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        const moduleIndex = modules.findIndex(m => m.id === moduleId);

        if (moduleIndex !== -1) {
            let currentModule = modules[moduleIndex];
            let sectionProgress = currentModule.sectionProgress.find(s => s.id === sectionId);
            
            if (!sectionProgress) {
                sectionProgress = { id: sectionId, status: 'Başlanmadı', lastScore: 0 };
                currentModule.sectionProgress.push(sectionProgress);
            }

            if (isAttempted) {
                sectionProgress.lastScore = score;
                
                if (status) {
                    sectionProgress.status = status;
                } else if (sectionId === 'content_view') {
                    sectionProgress.status = 'Tamamlandı';
                } else if (score >= this.PASS_SCORE) {
                    sectionProgress.status = 'Tamamlandı';
                } else if (sectionProgress.status === 'Başlanmadı' || sectionProgress.status === 'Kaldı') {
                    sectionProgress.status = 'Tekrar Gerekli';
                }
            }
            
            // Modül tamamlama durumunu güncelle
            const relevantSections = currentModule.sectionProgress.filter(s => s.id !== 'module_test');
            const totalSections = relevantSections.length;
            const completedSections = relevantSections.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;

            currentModule.progress = Math.round((completedSections / totalSections) * 100);
            
            const allSectionsCompleted = relevantSections.every(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)');
            const moduleTestCompleted = currentModule.sectionProgress.find(s => s.id === 'module_test')?.status === 'Tamamlandı';

            if (allSectionsCompleted && moduleTestCompleted) {
                 currentModule.status = 'Tamamlandı';
            } else if (allSectionsCompleted) {
                 currentModule.status = 'Genel Test Hazır';
            } else {
                 currentModule.status = 'Devam Ediyor';
            }

            localStorage.setItem('learningModules', JSON.stringify(modules));
        }
    },
    
    // =========================================================================
    // 7. SEVİYE ATLATMA MEKANİZMASI
    // =========================================================================
    
    getNextLevel: function(currentLevel) { 
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']; 
        const currentIndex = levels.indexOf(currentLevel.toUpperCase()); 
        return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'C2'; 
    },

    checkIfLevelUpReady: function(currentLevel) {
        const modules = JSON.parse(localStorage.getItem('learningModules') || '[]');
        const totalModules = modules.length;
        const completedModules = modules.filter(m => m.status === 'Tamamlandı').length;
        
        if (completedModules === totalModules && totalModules > 0 && currentLevel.toUpperCase() !== 'C2') {
            const pathEl = document.getElementById('learningPathSection');
            const nextLevel = this.getNextLevel(currentLevel);
            
            // Seviye Atlama Sınavı Kartı
            const examCard = `
                <div class="row mt-5">
                    <div class="col-12">
                        <div class="card bg-success text-white shadow-lg">
                            <div class="card-body text-center">
                                <h4 class="card-title"><i class="fas fa-medal me-2"></i> Seviye Atlamaya Hazırsın!</h4>
                                <p class="card-text">Tüm modülleri başarıyla tamamladın. ${nextLevel} seviyesine geçmek için final sınavına başla.</p>
                                <button class="btn btn-light btn-lg mt-3" onclick="LearningPath.startLevelUpExam('${currentLevel}')">
                                    <i class="fas fa-clipboard-check me-2"></i> ${nextLevel} Seviye Sınavına Başla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // Öğrenme Yolu sayfasına sınav kartını ekler
            const container = pathEl.querySelector('#modulesContainer');
            if (container) {
                container.insertAdjacentHTML('afterend', examCard);
            }
            return examCard;
        }
        return '';
    },
    
    startLevelUpExam: function(currentLevel) {
        const nextLevel = this.getNextLevel(currentLevel);
        const examQuestions = this.allExamQuestions
            .filter(q => q.difficulty.toLowerCase() === currentLevel.toLowerCase() || q.difficulty.toLowerCase() === nextLevel.toLowerCase())
            .sort(() => 0.5 - Math.random())
            .slice(0, 20); 

        if (examQuestions.length === 0) {
            alert("Sınav soruları yüklenemedi. Lütfen exam.json dosyasını kontrol edin.");
            return;
        }
        
        localStorage.setItem('currentQuiz', JSON.stringify({
            moduleId: 'level_up_exam', sectionId: 'level_up', questions: examQuestions,
            currentQuestionIndex: 0, answers: []
        }));

        this.showSection('quizSection');
        this.renderQuizQuestion(examQuestions[0]);
    },
    
    // =========================================================================
    // 8. KONUŞMA (TTS) FONKSİYONLARI
    // =========================================================================
    
    attachSpeechListeners: function() {
        // Dinamik olarak oluşturulan tüm hız ayar kaydırıcıları için dinleyici ekle
        document.querySelectorAll('.speech-rate-slider').forEach(slider => {
            // İlgili hız değeri gösterimini bul (aynı reading-section içinde)
            const rateValueSpan = slider.closest('.reading-section')?.querySelector('.rate-value-span');

            const updateRate = (rate) => {
                // Tüm kaydırıcıları senkronize et ve localStorage'ı güncelle
                document.querySelectorAll('.speech-rate-slider').forEach(s => s.value = rate);
                document.querySelectorAll('.rate-value-span').forEach(s => s.textContent = rate);
                
                localStorage.setItem('speechRate', rate); 
                this.stopSpeech(); 
            };
            
            // Başlangıç değerini ayarla ve göster
            const initialRate = localStorage.getItem('speechRate') || '0.9';
            slider.value = initialRate;
            if (rateValueSpan) rateValueSpan.textContent = initialRate;

            slider.oninput = (e) => updateRate(e.target.value);
        });
        
        this.addTTSListeners();
    },

    addTTSListeners: function() {
        document.querySelectorAll('.tts-button').forEach(button => {
            button.onclick = (e) => {
                const text = e.target.closest('.tts-button').dataset.textToSpeak;
                // Speak fonksiyonu localStorage'dan değeri okuyacağı için rate parametresine gerek yok.
                this.speak(text); 
            };
        });
    },
    
    speak: function(text) {
        if (this.synth.speaking) {
            this.stopSpeech(); 
            if (this.speechUtterance && this.speechUtterance.text === text) {
                return;
            }
        }

        this.speechUtterance = new SpeechSynthesisUtterance(text);
        // Her zaman localStorage'daki güncel rate'i kullan
        this.speechUtterance.rate = parseFloat(localStorage.getItem('speechRate') || '0.9');
        this.speechUtterance.lang = 'en-US'; 
        
        this.synth.speak(this.speechUtterance);
    },

    stopSpeech: function() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
    },

    // =========================================================================
    // 9. SIFIRLAMA VE YARDIMCI FONKSİYONLARI
    // =========================================================================
    
    // Stats fonksiyonu eklendi (placeholder)
    displayStats: function() {
        this.showSection('statsSection');
        document.getElementById('statsSection').innerHTML = `
             <div style="max-width: 800px; width: 100%; text-align: center;">
                 <button class="btn btn-secondary mb-3" onclick="LearningPath.displayLearningPath(localStorage.getItem('userLevel'))">
                    <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
                 </button>
                 <h3 class="mb-4">İstatistikler ve İlerleme Takibi (Geliştirme Aşamasında)</h3>
                 <div class="alert alert-info">
                     Bu bölüm yakında tamamlanan modüller, quiz sonuçları ve öğrenilen kelime istatistiklerini gösterecektir.
                 </div>
                 <button class="btn btn-outline-danger mt-3 me-2" onclick="LearningPath.resetUserLevel()">
                    <i class="fas fa-redo"></i> Seviyeyi Sıfırla (Testi Tekrar Çöz)
                 </button>
                 <button class="btn btn-danger mt-3" onclick="LearningPath.resetProgress()">
                    <i class="fas fa-exclamation-triangle"></i> Tüm İlerlemeyi Sıfırla
                 </button>
             </div>
        `;
    },

    resetUserLevel: function() {
        if (confirm("Seviye belirleme testini yeniden yaparak mevcut seviyenizi güncelleyebilirsiniz. Bu işlem modüllerdeki ilerlemenizi (tamamlama durumunuzu) silmez, sadece yeni seviyenize göre içerik filtrelemeyi sağlar. Emin misiniz?")) {
            localStorage.removeItem('userLevel');
            localStorage.removeItem('levelTestAnswers');
            alert("Seviye sıfırlandı. Seviye tespit testi yeniden başlıyor.");
            window.location.reload();
        }
    },

    resetProgress: function() {
        if (confirm("Tüm ilerlemeniz, modül tamamlama durumunuz ve seviyeniz sıfırlanacaktır. Emin misiniz?")) {
            localStorage.removeItem('userLevel');
            localStorage.removeItem('learningModules');
            localStorage.removeItem('levelTestAnswers');
            
            // Tüm yanlış cevap kayıtlarını da sil
            for (let i = 0; i < localStorage.length; i++) {
                 const key = localStorage.key(i);
                 if (key.startsWith('wrong_')) {
                     localStorage.removeItem(key);
                 }
            }
            
            alert("Tüm ilerleme sıfırlandı. Seviye tespit testi yeniden başlayacak.");
            window.location.reload(); 
        }
    }
};

// String için genel bir hashCode yardımcı fonksiyonu (Quiz ID'leri için gereklidir)
if (!String.prototype.hashCode) {
    String.prototype.hashCode = function() {
      let hash = 0, i, chr;
      if (this.length === 0) return hash;
      for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    };
}


document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; 
    LearningPath.init();
});
