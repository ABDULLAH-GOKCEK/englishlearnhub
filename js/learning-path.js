// =========================================================================
// js/learning-path.js (V12 FINAL - Kapsamlı Öğrenme Yolu, Hata Önceliklendirme ve SEVİYE ATLATMA + OKUMA HATASI DÜZELTİLDİ)
// =========================================================================

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
                    this.showSection('levelTestSection');
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
        this.stopSpeaking();
        
        document.querySelectorAll('.module-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; 
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
            activeSection.style.display = 'flex'; 
        }
    },
    
    // --- Yardımcı Fonksiyonlar (Aynı Bırakıldı) ---

    getIconForTopic: function(topic) {
        const iconMap = {
            'be fiili': 'fas fa-id-card',
            'sahiplik': 'fas fa-hand-holding-usd',
            'basit kelime': 'fas fa-spell-check',
            'şimdiki zaman': 'fas fa-clock',
            'geçmiş zaman': 'fas fa-history',
            'gelecek zaman': 'fas fa-forward',
            'dilbilgisi': 'fas fa-graduation-cap',
            'kelime': 'fas fa-language',
            'okuma': 'fas fa-book-reader',
            'dinleme': 'fas fa-volume-up',
            'konuşma': 'fas fa-microphone-alt',
            'quiz': 'fas fa-question-circle'
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
        if (status === 'Başlanmadı') return 'bg-danger';
        if (status === 'Tekrar Gerekli') return 'bg-warning text-dark';
        if (status === 'Atlandı (Soru Yok)') return 'bg-info text-dark'; 
        return 'bg-secondary';
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
    // 2. SEVİYE TESPİT TESTİ (Aynı Bırakıldı)
    // =========================================================================

    prepareAndDisplayLevelTest: function() {
        const MAX_QUESTIONS = 20;
        
        let rawQuestions = this.allLevelTestQuestions
            .map((q, index) => ({
                id: q.id || `q${index}`, 
                questionText: q.questionText || q.question, 
                options: q.options,
                correctAnswer: q.correctAnswer || q.answer, 
                topic: q.topic || 'Genel', 
                level: q.level || 'Test Sorusu' 
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
                currentQuestionIndex = answeredIds.length; 
                if (currentQuestionIndex >= questions.length) {
                    currentQuestionIndex = questions.length - 1; 
                }
            }
        }


        testEl.style.alignItems = 'flex-start'; 
        testEl.style.textAlign = 'left';

        const renderQuestion = () => {
            
            localStorage.setItem('levelTestAnswers', JSON.stringify(userAnswers));

            if (currentQuestionIndex >= questions.length) {
                testEl.style.alignItems = 'center'; 
                testEl.style.textAlign = 'center';
                
                localStorage.removeItem('levelTestAnswers');

                this.calculateLevel(questions, userAnswers);
                return;
            }

            const q = questions[currentQuestionIndex];
            const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

            let optionsHtml = '';
            const optionsToRender = q.shuffledOptions; 
            
            optionsToRender.forEach((option, index) => {
                const isSelected = userAnswers[q.id] === option;
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
                        <button class="btn btn-primary" id="nextButton">${userAnswers[q.id] ? (currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki') : 'Lütfen Seçim Yapın'}</button>
                    </div>
                </div>
            `;
            testEl.innerHTML = testContent;

            document.querySelectorAll('.question-option').forEach(optionEl => {
                optionEl.addEventListener('click', function() {
                    const qId = this.getAttribute('data-question-id');
                    const selectedValue = this.getAttribute('data-option-value');
                    
                    userAnswers[q.id] = selectedValue;
                    renderQuestion(); 
                });
            });

            document.getElementById('nextButton').onclick = () => {
                if (!userAnswers[q.id]) {
                    alert('Lütfen bir seçenek işaretleyin.');
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

        // Basitleştirilmiş seviye belirleme mantığı (20 soruluk teste göre)
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
    // 3. ÖĞRENME YOLU GÖRÜNTÜLEME (Aynı Bırakıldı)
    // =========================================================================

    displayLearningPath: function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        
        let modulesList = [];
        let levelTitle = `${level} Seviyesi Öğrenme Yolu`;

        const baseLevelCode = 'A1'; 
        const baseLevelData = this.allModules[baseLevelCode];

        if (baseLevelData && Array.isArray(baseLevelData.modules)) {
            modulesList = baseLevelData.modules;
            levelTitle = `${baseLevelData.title} (${level} Seviyesi için)`;
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
             const updatedModules = modules.map(m => {
                 let baseModuleData = modulesList.find(ml => ml.id === m.id) || m;
                 m.name = baseModuleData.name;
                 m.topic = baseModuleData.topic;

                 let updatedSections = [...(m.sectionProgress || [])];
                 this.STANDARD_SECTIONS.forEach(stdSec => {
                     if (!updatedSections.find(s => s.id === stdSec.id)) {
                         updatedSections.push({
                             id: stdSec.id,
                             status: 'Başlanmadı',
                             lastScore: 0
                         });
                     }
                 });
                 
                 const relevantSections = updatedSections.filter(s => s.id !== 'module_test');
                 const totalSections = relevantSections.length;
                 const completedSections = relevantSections.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
                 
                 m.progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
                 m.sectionProgress = updatedSections;
                 
                 const moduleTestSection = m.sectionProgress.find(s => s.id === 'module_test');
                 
                 if (moduleTestSection && moduleTestSection.status === 'Tamamlandı') {
                    m.status = 'Tamamlandı';
                    m.progress = 100;
                 } else if (m.progress === 100 && moduleTestSection && moduleTestSection.status !== 'Tamamlandı') {
                    m.status = 'Testi Bekliyor';
                 } else if (m.progress > 0 && m.progress < 100) {
                     m.status = 'Devam Ediyor';
                 } else {
                     m.status = 'Başlanmadı';
                 }
                 
                 return m;
             });
             modules = updatedModules;
             localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        
        const moduleCards = modules.map(module => {
            const badgeClass = this.getBadgeClass(module.status); 
            const levelForContent = level; 
            
            const relevantSections = module.sectionProgress.filter(s => s.id !== 'module_test');
            const totalSections = relevantSections.length;
            const completedSections = relevantSections.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
            
            const isSectionsCompleted = completedSections === totalSections;
            const moduleTestSection = module.sectionProgress.find(s => s.id === 'module_test') || {status: 'Başlanmadı'};
            
            const moduleTestDisabled = !isSectionsCompleted || moduleTestSection.status === 'Tamamlandı' ? 'disabled' : '';
            const testButtonClass = isSectionsCompleted && moduleTestSection.status !== 'Tamamlandı' ? 'btn-success' : 'btn-secondary';
            let testButtonText = '';
            
            if (moduleTestSection.status === 'Tamamlandı') {
                testButtonText = 'Modül Tamamlandı';
            } else if (isSectionsCompleted) {
                testButtonText = 'Modül Genel Testi';
            } else {
                testButtonText = `${completedSections}/${totalSections} Bölüm Tamamlanmalı`;
            }

            return `
                <div class="module-card ${module.status.toLowerCase().replace(/ /g, '-')}" 
                     data-module-id="${module.id}" 
                     data-module-level="${levelForContent}"> 
                    
                    <div class="module-card-content" onclick="LearningPath.displayModuleContent('${module.id}', '${levelForContent}')">
                        <i class="fas ${this.getIconForTopic(module.topic)}"></i>
                        <h5>${module.name}</h5>
                        <p class="module-topic">${module.topic} Konusu</p>
                        
                        <div class="module-status badge ${badgeClass}">${module.status}</div>
                        
                        <div class="progress mt-2">
                            <div class="progress-bar" style="width: ${module.progress}%;" role="progressbar">${module.progress}%</div>
                        </div>
                    </div>
                    
                    <div class="module-actions mt-3" onclick="event.stopPropagation()">
                         <button class="btn btn-sm btn-primary me-2" onclick="LearningPath.displayModuleContent('${module.id}', '${levelForContent}')">İçeriği Gör (${completedSections}/${totalSections})</button>
                        <button class="btn btn-sm ${testButtonClass}" ${moduleTestDisabled} onclick="LearningPath.startQuiz('${module.id}', 'module_test')">${testButtonText}</button>
                    </div>
                </div>
            `;
        }).join('');

        pathEl.innerHTML = `
            <div style="max-width: 900px; width: 100%;">
                ${this.getHomeButton(level)}
            </div>
            
            <div class="level-header" style="max-width: 900px; width: 100%; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>${levelTitle}</h2>
                    <p class="lead">Seviyeniz **${level}** olarak belirlendi. Modüller **${level}** seviyesine uygun çalışmalar içerecektir.</p>
                </div>
                <button id="navToStatsButton" class="btn btn-lg btn-outline-info" onclick="LearningPath.displayStats()">
                    <i class="fas fa-chart-bar me-2"></i> İstatistikler
                </button>
            </div>
            
            <h4 class="topic-header" style="max-width: 900px; width: 100%; text-align: left; margin-top: 30px;">Öğrenme Modülleri (${modules.length} Adet)</h4>
            <div class="module-grid" style="max-width: 900px; width: 100%;">
                ${moduleCards}
            </div>

             <button class="btn btn-sm btn-outline-warning mt-4" onclick="LearningPath.resetUserLevel()">Seviye Tespit Testini Yeniden Yap</button>
        `;
        
        localStorage.setItem('userLevel', level);
        
        this.checkIfLevelUpReady(level); 
    },

    // =========================================================================
    // 4. MODÜL İÇERİĞİ VE BÖLÜMLERİ
    // =========================================================================

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
        
        const enrichedContent = this.getModuleContentHTML(moduleId, baseModule, userLevel);
        
        let sectionCards = '';
        this.STANDARD_SECTIONS.forEach(section => {
            if (section.id === 'module_test') return; 
            
            sectionCards += this.renderInlineQuizSection(section.id, baseModule, currentModule);
        });
        
        contentEl.innerHTML = `
            <div style="max-width: 900px; width: 100%;">
                <button class="btn btn-secondary mb-3" onclick="LearningPath.displayLearningPath('${userLevel}')">
                    <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
                </button>
                <h3 class="mb-4">${baseModule.name} Modülü (Seviye: ${userLevel})</h3>
                
                <h4 class="mt-4">Modül Alıştırmaları</h4>
                <div id="moduleSections" class="row g-4 mb-4">
                    ${sectionCards}
                </div>
                
                <hr class="mt-4 mb-4">
                
                <div id="moduleContentDetail" class="p-4 bg-light rounded shadow-sm">
                    <h4>İçerik Anlatımı</h4>
                    <div id="speechControls" class="d-flex align-items-center mb-3">
                        <label for="speechRate" class="form-label mb-0 me-3">Ses Hızı:</label>
                        <input type="range" class="form-range" id="speechRate" min="0.5" max="2" step="0.1" value="${localStorage.getItem('speechRate') || '0.9'}" style="width: 150px;">
                        <span id="rateValue" class="ms-2">${localStorage.getItem('speechRate') || '0.9'}</span>
                    </div>
                    ${enrichedContent}
                </div>
            </div>
        `;
        
        this.attachSpeechListeners(baseModule.name);

        this.updateModuleSectionStatus(moduleId, 'content_view', true, 0); 
    },
    
    // --- İçerik Zenginleştirme (Dinamik Kelime, Cümle, Okuma Ekleme) ---
    getModuleContentHTML: function(moduleId, baseModule, userLevel) {
        const enrichedContent = this.enrichModuleContent(moduleId, baseModule, userLevel);
        let contentHtml = '';
        
        enrichedContent.forEach(item => {
            switch (item.type) {
                case 'heading':
                    contentHtml += `<h4 class="mt-4">${item.text}</h4>`;
                    break;
                case 'paragraph':
                    contentHtml += `<p class="lead">${item.text.replace(/\n/g, '<br>')}</p>`;
                    break;
                case 'code':
                    contentHtml += `<pre class="code-block" style="background: #eee; padding: 10px; border-radius: 5px;">${item.text}</pre>`;
                    break;
                case 'example':
                    contentHtml += `<div class="example-box" style="border-left: 3px solid #007bff; padding-left: 10px; margin: 15px 0; background: #f0f8ff;">${item.text.replace(/\n/g, '<br>')}</div>`;
                    break;
                case 'words':
                    contentHtml += `<h5 class="mt-4">Kelime Listesi</h5><div class="word-list-section" style="columns: 2;">${item.html}</div>`;
                    break;
                case 'sentences':
                    contentHtml += `<h5 class="mt-4">Örnek Cümleler</h5><div class="sentence-list-section">${item.html}</div>`;
                    break;
                case 'reading_text':
                    contentHtml += `
                         <h4 class="mt-4">Okuma Parçası: ${baseModule.reading_story_title || 'Hikaye Başlığı'}</h4>
                         <p class="mb-2"><small class="text-muted">**Seviye:** ${item.level} - **Konu:** ${item.category}.</small></p>
                         <div class="d-flex justify-content-between align-items-center mb-3"> 
                            <button id="speechButton_${baseModule.name.replace(/\s/g, '_')}" class="btn btn-sm btn-outline-info" data-text="${item.text.replace(/"/g, '')}"> 
                                <i class="fas fa-volume-up me-1"></i> Metni Seslendir
                            </button>
                         </div>
                         <p>${item.text.replace(/\n/g, '<br>')}</p>
                    `;
                    break;
                case 'reading_placeholder':
                    contentHtml += `<div class="alert alert-warning mt-4">${item.text}</div>`;
                    break;
            }
        });
        
        if (contentHtml === '') {
            contentHtml = `<p class="lead">Bu modül için özel bir anlatım içeriği bulunmamaktadır. Lütfen yukarıdaki bölümleri tamamlayın.</p>`;
        }
        
        return contentHtml;
    },
    
    enrichModuleContent: function(moduleId, baseModule, userLevel) {
        
        const moduleLevel = userLevel.toUpperCase();
        const baseModuleTopic = baseModule.topic ? baseModule.topic.toLowerCase() : '';
        const staticContent = Array.isArray(baseModule.content) ? baseModule.content : [];
        let enrichedContent = [...staticContent];

        const difficultyMapping = { 
            'A1': ['easy', 'beginner'],
            'A2': ['easy', 'medium', 'beginner', 'intermediate'],
            'B1': ['medium', 'intermediate'],
            'B2': ['medium', 'hard', 'intermediate', 'advanced'],
            'C1': ['hard', 'advanced'],
            'C2': ['hard', 'advanced']
        };
        const allowedDifficulties = difficultyMapping[moduleLevel] || ['easy'];
        
        const isModuleGrammar = baseModuleTopic && (['grammar', 'gramer', 'structure'].includes(baseModuleTopic) || baseModule.name.toLowerCase().includes('fiili') || baseModule.name.toLowerCase().includes('zamirler'));
        
        let wordQuizQuestions = [];
        let sentenceQuizQuestions = [];
        let readingQuizQuestions = [];
        
        // YENİ DÜZELTME: Türkçe Modül Konularını İngilizce Kategoriye Eşleştirme Sözlüğü
        // reading_stories.json dosyasının İngilizce kategoriler içerdiğini varsayarız.
        const turkishToEnglishCategoryMap = {
            'günlük hayat': 'daily life',
            'günlük rutin': 'daily life',
            'doğa': 'nature',
            'hayvanlar': 'animals',
            'müzik': 'music',
            'yiyecek': 'food',
            'beslenme': 'food',
            'alışveriş': 'shopping',
            'aile': 'family',
            'seyahat': 'travel',
            'geçmiş zaman': 'history', 
            'konuşma': 'daily life',
            'cümle yapısı': 'structure',
            'dilbilgisi': 'grammar',
            'be fiili': 'introduction',
            'sahiplik': 'possession'
        };
        
        // Modül konusunu eşleştirme için sadeleştirme
        const simplifiedTopic = baseModuleTopic.split(' ')[0];
        const mappedCategory = turkishToEnglishCategoryMap[baseModuleTopic] || simplifiedTopic;


        // --- 1. Kelime Alıştırmaları (words.json) ---
        const moduleWords = this.allWords.filter(w => {
            const isLevelMatch = w.difficulty && allowedDifficulties.includes(w.difficulty.toLowerCase());
            if (!isLevelMatch) return false;
            
            const wordCategory = w.category.toLowerCase();
            return wordCategory.includes(baseModuleTopic) || baseModuleTopic.includes(wordCategory);
        }).sort(() => 0.5 - Math.random()).slice(0, 20);

        if (moduleWords.length > 0) {
            const wordsHtml = moduleWords.map(w => `<div class="word-item"><strong>${w.word}</strong> (${w.turkish})</div>`).join('');
            enrichedContent.push({type: 'words', html: wordsHtml});
            
            moduleWords.slice(0, 10).forEach((w, index) => {
                 let options = [w.turkish];
                 const wrongOptions = this.allWords
                     .filter(ow => ow.turkish !== w.turkish)
                     .map(ow => ow.turkish)
                     .sort(() => 0.5 - Math.random())
                     .slice(0, 3);
                 
                 options = [...options, ...wrongOptions].sort(() => 0.5 - Math.random());
                 
                 wordQuizQuestions.push({
                     id: `word_q${moduleId}_${index}`,
                     type: 'quiz',
                     question: `"${w.word}" kelimesinin Türkçe karşılığı nedir?`,
                     options: options,
                     answer: w.turkish,
                     topic: 'Kelime Bilgisi'
                 });
            });
            
        }

        // --- 2. Cümle Alıştırmaları (sentences.json) ---
        const moduleSentences = this.allSentences.filter(s => {
            const isLevelMatch = s.difficulty && allowedDifficulties.includes(s.difficulty.toLowerCase());
            if (!isLevelMatch) return false;
            
            if (isModuleGrammar || ['konuşma', 'speaking', 'sentence', 'cümle'].includes(baseModuleTopic) || !baseModuleTopic) {
                return true;
            }
            
            const sentenceCategory = s.category.toLowerCase();
            return sentenceCategory.includes(baseModuleTopic) || baseModuleTopic.includes(sentenceCategory);
        }).sort(() => 0.5 - Math.random()).slice(0, 15);

        if (moduleSentences.length > 0) {
            const sentencesHtml = moduleSentences.map(s => `<div class="sentence-item"><strong>${s.english}</strong> (${s.turkish})</div>`).join('');
            enrichedContent.push({type: 'sentences', html: sentencesHtml});
            
            moduleSentences.slice(0, 10).forEach((s, index) => {
                 if (s.english.split(' ').length < 3) return;
                 const words = s.english.split(' ');
                 const missingWordIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
                 const missingWord = words[missingWordIndex].replace(/[.,?!]/g, '');
                 
                 const questionText = words.map((w, i) => i === missingWordIndex ? '___' : w).join(' ');
                 
                 let options = [missingWord];
                 const wrongOptions = this.allWords
                     .filter(w => w.word !== missingWord)
                     .map(w => w.word)
                     .sort(() => 0.5 - Math.random())
                     .slice(0, 3);
                 
                 options = [...options, ...wrongOptions].sort(() => 0.5 - Math.random());
                 
                 sentenceQuizQuestions.push({
                     id: `sentence_q${moduleId}_${index}`,
                     type: 'quiz',
                     question: questionText,
                     options: options,
                     answer: missingWord,
                     topic: 'Cümle Yapısı'
                 });
            });
        }
        
        // --- 3. Okuma Anlama (reading_stories.json) ---
        // Okuma parçası eşleştirme düzeltmesi
        const moduleReading = this.allReadings.find(r => 
            allowedDifficulties.includes(r.level.toLowerCase()) && 
            (
                r.category.toLowerCase() === mappedCategory || 
                r.category.toLowerCase() === baseModuleTopic || 
                r.category.toLowerCase().includes(mappedCategory) ||
                r.title.toLowerCase().includes(simplifiedTopic)
            )
        );

        if (moduleReading && moduleReading.content) {
            baseModule.reading_story_title = moduleReading.title;
            enrichedContent.push({
                type: 'reading_text', 
                text: moduleReading.content, 
                level: moduleReading.level, 
                category: moduleReading.category
            });
            
            moduleReading.questions.forEach((q, index) => {
                if (q.options && q.options.length > 2) {
                     const correctAnswerValue = q.correctAnswer;
                     let correctAnswerText = null;
                     
                     if (typeof correctAnswerValue === 'number') {
                         correctAnswerText = q.options[parseInt(correctAnswerValue, 10)];
                     } else if (typeof correctAnswerValue === 'string') {
                         correctAnswerText = q.options.find(opt => opt === correctAnswerValue);
                     }
                     
                     if (correctAnswerText) {
                         readingQuizQuestions.push({
                             id: `reading_q${moduleId}_${index}`,
                             type: 'quiz',
                             question: `(Okuma Sorusu): ${q.question}`,
                             options: q.options,
                             answer: correctAnswerText,
                             topic: `${moduleReading.title} - Okuma Anlama`
                         });
                     }
                }
            });

        } else {
            enrichedContent.push({type: 'reading_placeholder', text: 'Okuma hikayesi bulunamadı. Modül konusu ile okuma kategorileri eşleşmedi veya bu seviyeye uygun hikaye yok.'});
        }
        
        // --- Genel Quiz Soru Havuzunu Oluştur ---
        baseModule.word_quiz_questions = wordQuizQuestions;
        baseModule.sentence_quiz_questions = sentenceQuizQuestions;
        baseModule.reading_quiz_questions = readingQuizQuestions;
        baseModule.all_quiz_questions = [...wordQuizQuestions, ...sentenceQuizQuestions, ...readingQuizQuestions];
        
        return enrichedContent;
    },
    
    // --- Bölüm Kartı Oluşturma ve Durum Yönetimi (Aynı Bırakıldı) ---
    
    renderInlineQuizSection: function(sectionId, baseModule, currentModule) {
        const sectionInfo = this.STANDARD_SECTIONS.find(s => s.id === sectionId);
        
        let quizQuestions = [];
        if (sectionId === 'word') {
            quizQuestions = baseModule.word_quiz_questions;
        } else if (sectionId === 'sentence') {
            quizQuestions = baseModule.sentence_quiz_questions;
        } else if (sectionId === 'reading') {
            quizQuestions = baseModule.reading_quiz_questions;
        }
        
        const questionCount = quizQuestions ? quizQuestions.length : 0;
        const sectionData = currentModule.sectionProgress.find(s => s.id === sectionId) || {status: 'Başlanmadı', lastScore: 0};
        
        if (sectionData.status === 'Başlanmadı' && questionCount === 0 && sectionId !== 'content_view') {
             sectionData.status = 'Atlandı (Soru Yok)';
             this.updateModuleSectionStatus(currentModule.id, sectionId, true, 0); 
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
        
        if (sectionId === 'content_view') return '';
        
        return `
            <div class="col-12 col-md-4">
                <div class="card h-100 shadow-sm section-card ${isCompleted ? 'border-success' : 'border-primary'}">
                    <div class="card-body">
                        <h5 class="card-title">${sectionInfo.name}</h5>
                        <p class="mb-0"> 
                            <span class="badge ${badgeClass} me-2">${sectionData.status}</span> 
                            <small class="text-muted">Son Puan: ${sectionData.lastScore}%</small>
                            ${statusMessage}
                        </p>
                    </div>
                    <div class="card-footer d-flex justify-content-end">
                        ${buttonHtml}
                    </div>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // 5. QUIZ İŞLEVLERİ (Aynı Bırakıldı)
    // =========================================================================

    startQuiz: function(moduleId, quizType) {
        this.showSection('moduleQuizSection');
        
        const baseLevelCode = 'A1';
        const baseModule = this.allModules[baseLevelCode]?.modules?.find(m => m.id === moduleId);
        const userLevel = localStorage.getItem('userLevel') || 'A1';

        this.enrichModuleContent(moduleId, baseModule, userLevel); 
        
        let quizQuestions = [];
        let quizTitle = `${baseModule.name} - Genel Test`;
        
        if (quizType === 'word') {
            quizQuestions = baseModule.word_quiz_questions;
            quizTitle = `${baseModule.name} - Kelime Bilgisi Alıştırması`;
        } else if (quizType === 'sentence') {
            quizQuestions = baseModule.sentence_quiz_questions;
            quizTitle = `${baseModule.name} - Cümle Yapısı Alıştırması`;
        } else if (quizType === 'reading') {
            quizQuestions = baseModule.reading_quiz_questions;
            quizTitle = `${baseModule.name} - Okuma Anlama Alıştırması`;
        } else if (quizType === 'module_test') { 
             quizQuestions = baseModule.all_quiz_questions;
             quizTitle = `${baseModule.name} - Genel Modül Testi`;
        } else {
             quizQuestions = baseModule.all_quiz_questions;
        }

        if (!quizQuestions || quizQuestions.length === 0) {
            document.getElementById('moduleQuizSection').innerHTML = `
                <div class="alert alert-warning">
                    <p>Bu modül/bölüm için soru bulunamadı.</p>
                    <button class="btn btn-primary mt-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')"> Modül İçeriğine Geri Dön </button>
                </div>
            `;
            return;
        }
        
        // V11: Hatalı Soru Önceliklendirme Mantığı
        const wrongKey = `wrong_${moduleId}_${quizType}`;
        const savedWrongIds = JSON.parse(localStorage.getItem(wrongKey) || '[]');
        
        let wrongQuestions = quizQuestions.filter(q => savedWrongIds.includes(q.id));
        let otherQuestions = quizQuestions.filter(q => !savedWrongIds.includes(q.id));
        
        const shuffledOtherQuestions = otherQuestions.sort(() => 0.5 - Math.random());
        
        const finalQuizQuestions = [...wrongQuestions, ...shuffledOtherQuestions]; 

        this.currentQuiz = {
            moduleId: moduleId,
            quizType: quizType,
            questions: finalQuizQuestions,
            userAnswers: {},
            currentQuestionIndex: 0,
            quizTitle: quizTitle
        };

        this.displayQuizQuestion();
    },

    displayQuizQuestion: function() {
        const { moduleId, quizType, questions, userAnswers, currentQuestionIndex, quizTitle } = this.currentQuiz;
        const quizEl = document.getElementById('moduleQuizSection');
        const userLevel = localStorage.getItem('userLevel');

        if (currentQuestionIndex >= questions.length) {
             this.calculateModuleScore(moduleId, questions, userAnswers, quizType);
             return;
        }

        const q = questions[currentQuestionIndex];
        const progress = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

        let optionsHtml = '';
        const optionsToRender = [...q.options].sort(() => 0.5 - Math.random());
        
        optionsToRender.forEach((option, index) => {
            const isSelected = userAnswers[currentQuestionIndex] === option;
            const selectedClass = isSelected ? 'selected-answer' : '';

            optionsHtml += `
                <div 
                    class="form-check quiz-option-item ${selectedClass}" 
                    data-option="${option.replace(/"/g, '')}"
                >
                    <input class="form-check-input d-none" type="radio" name="quiz_question_${currentQuestionIndex}" id="quiz_radio_${currentQuestionIndex}_${index}" value="${option.replace(/"/g, '')}" ${isSelected ? 'checked' : ''}>
                    <label class="form-check-label w-100">${option}</label>
                </div>
            `;
        });

        const quizContent = `
            <div style="max-width: 800px; width: 100%;">
                ${this.getHomeButton(userLevel)}
                <h3 class="mb-4">${quizTitle} (${currentQuestionIndex + 1} / ${questions.length})</h3>
                <div class="progress-container">
                    <div class="progress" role="progressbar" style="height: 12px;">
                        <div class="progress-bar" style="width: ${progress}%; background-color: #28a745;"></div>
                    </div>
                </div>
                
                <div class="card p-4 my-4">
                    <h5>${q.question}</h5>
                    <p><small class="text-muted">Konu: ${q.topic || 'Genel'}</small></p>
                    <div class="question-options-group">
                        ${optionsHtml}
                    </div>
                </div>

                <div class="d-flex justify-content-between">
                    <button class="btn btn-secondary ${currentQuestionIndex === 0 ? 'd-none' : ''}" id="quizPrevButton">Geri</button>
                    <button class="btn btn-success" id="quizNextButton">${userAnswers.hasOwnProperty(currentQuestionIndex) ? (currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki') : 'Lütfen Seçim Yapın'}</button>
                </div>
            </div>
        `;
        quizEl.innerHTML = quizContent;

        document.querySelectorAll('.quiz-option-item').forEach(optionEl => {
            optionEl.addEventListener('click', function() {
                const selectedValue = this.getAttribute('data-option');
                userAnswers[currentQuestionIndex] = selectedValue;
                
                document.querySelectorAll('.quiz-option-item').forEach(el => el.classList.remove('selected-answer'));
                this.classList.add('selected-answer');
                
                document.getElementById('quizNextButton').textContent = currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki';
            });
        });

        document.getElementById('quizNextButton').onclick = () => {
            if (!userAnswers.hasOwnProperty(currentQuestionIndex)) {
                alert('Lütfen bir seçenek işaretleyin.');
                return;
            }
            if (currentQuestionIndex === questions.length - 1) {
                this.calculateModuleScore(moduleId, questions, userAnswers, quizType);
                return;
            }
            this.currentQuiz.currentQuestionIndex++;
            this.displayQuizQuestion();
        };

        const prevButton = document.getElementById('quizPrevButton');
            if (prevButton) {
                prevButton.onclick = () => {
                    this.currentQuiz.currentQuestionIndex--;
                    this.displayQuizQuestion();
                };
            }
    },

    calculateModuleScore: function(moduleId, questions, userAnswers, quizType) {
        // V12: Seviye Atlama Sınavı ise özel olarak ele al
        if (quizType === 'level_up') {
             const currentLevel = localStorage.getItem('userLevel') || 'A1';
             const correctCount = questions.filter((q, index) => userAnswers[index] === q.answer).length;
             const score = Math.round((correctCount / questions.length) * 100);
             
             this.processLevelUpExamResult(score, questions, userAnswers, currentLevel);
             return; 
        }
        
        let correctCount = 0;
        let wrongQuestionIds = new Set();
        let requiredTopics = new Set();
        
        questions.forEach((q, index) => {
            const isCorrect = userAnswers[index] === q.answer;
            if (isCorrect) {
                correctCount++;
            } else {
                wrongQuestionIds.add(q.id); 
                requiredTopics.add(q.topic || 'Genel Konu');
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        const isPassed = score >= this.PASS_SCORE;
        
        let modules = JSON.parse(localStorage.getItem('learningModules') || '[]');
        const currentModule = modules.find(m => m.id === moduleId);

        if (currentModule) {
            const sectionId = quizType; 
            let sectionData = currentModule.sectionProgress.find(s => s.id === sectionId);

            if (!sectionData) {
                 sectionData = {id: sectionId};
                 currentModule.sectionProgress.push(sectionData);
            }
            
            if (score >= (sectionData.lastScore || 0) || isPassed) {
                sectionData.lastScore = score;
                sectionData.status = isPassed ? 'Tamamlandı' : 'Tekrar Gerekli';
            }
            
            currentModule.lastScore = score;
            if (quizType === 'module_test' && isPassed) {
                 currentModule.status = 'Tamamlandı';
            } else if (quizType === 'module_test' && !isPassed) {
                 currentModule.status = 'Tekrar Gerekli';
            }

            const relevantSections = currentModule.sectionProgress.filter(s => s.id !== 'module_test');
            const totalSections = relevantSections.length;
            const completedSectionsAfterUpdate = relevantSections.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
            currentModule.progress = Math.round((completedSectionsAfterUpdate / totalSections) * 100);
            
            if(currentModule.status === 'Tamamlandı') {
                 currentModule.progress = 100;
            }
            
            // V11: Hatalı soruları kaydet
            const wrongKey = `wrong_${moduleId}_${quizType}`;
            localStorage.setItem(wrongKey, JSON.stringify(Array.from(wrongQuestionIds)));
            
            localStorage.setItem('learningModules', JSON.stringify(modules));

            this.updateGeneralProgress(moduleId, score, quizType);
        }

        this.showModuleResult(moduleId, score, questions.length, correctCount, isPassed, Array.from(requiredTopics), quizType);
        
        if (quizType === 'module_test') {
             this.checkIfLevelUpReady(localStorage.getItem('userLevel'));
        }
    },
    
    updateModuleSectionStatus: function(moduleId, sectionId, isCompleted, score) {
        let modules = JSON.parse(localStorage.getItem('learningModules') || '[]');
        const currentModule = modules.find(m => m.id === moduleId);
        
        if (currentModule) {
            let sectionData = currentModule.sectionProgress.find(s => s.id === sectionId);
            
            if (!sectionData) {
                 sectionData = {
                    id: sectionId,
                    status: 'Başlanmadı',
                    lastScore: 0
                 };
                 currentModule.sectionProgress.push(sectionData);
            }
            
            if (isCompleted) {
                 sectionData.status = sectionId === 'content_view' ? 'Tamamlandı' : sectionData.status;
            } else {
                 sectionData.status = score >= this.PASS_SCORE ? 'Tamamlandı' : (score > 0 ? 'Tekrar Gerekli' : 'Başlanmadı');
            }
            sectionData.lastScore = Math.max(sectionData.lastScore, score);
            
            const relevantSections = currentModule.sectionProgress.filter(s => s.id !== 'module_test');
            const totalSections = relevantSections.length;
            const completedSections = relevantSections.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
            currentModule.progress = Math.round((completedSections / totalSections) * 100);

            localStorage.setItem('learningModules', JSON.stringify(modules));
        }
    },
    
    // =========================================================================
    // 6. SONUÇ EKRANLARI VE İSTATİSTİKLER (Aynı Bırakıldı)
    // =========================================================================
    
    showModuleResult: function(moduleId, score, totalQuestions, correctCount, isPassed, feedback, quizType) {
        const quizEl = document.getElementById('moduleQuizSection');
        const userLevel = localStorage.getItem('userLevel');
        
        const baseLevelCode = 'A1';
        const moduleName = this.allModules[baseLevelCode]?.modules?.find(m => m.id === moduleId)?.name || 'Modül';
        
        let feedbackHtml = '';
        let actionButton = '';
        const isModuleFinalTest = quizType === 'module_test';
        const quizTitle = isModuleFinalTest ? `${moduleName} Genel Testi` : `${this.STANDARD_SECTIONS.find(s => s.id === quizType)?.name || 'Bölüm Alıştırması'}`;

        if (isPassed) {
            const message = isModuleFinalTest ? 'Mükemmel! Bu modülü başarıyla tamamladınız ve bir sonraki adıma geçmeye hazırsınız.' : 'Harika! Bu bölümü başarıyla tamamladınız.';
            feedbackHtml = `<p class="mt-4 lead text-success">${message}</p>`;
            actionButton = isModuleFinalTest ? 
                `<button class="btn btn-primary btn-lg" onclick="LearningPath.displayLearningPath('${userLevel}')">Öğrenme Yoluna Dön</button>` : 
                `<button class="btn btn-primary btn-lg" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">Modül İçeriğine Dön</button>`;
        } else {
            const topicsToReview = feedback.length > 0 ? `<p class="mt-3">Tekrar etmeniz gereken konular: <strong>${feedback.join(', ')}</strong></p>` : '';
            const message = isModuleFinalTest ? 'Bu modülü geçmek için tekrar denemelisiniz. Tekrar etmek isterseniz, önceki bölümlere dönerek pratik yapabilirsiniz.' : 'Başarı eşiğine ulaşamadınız. İyileştirmek için içeriğe geri dönün veya tekrar çözün.';
            feedbackHtml = `<p class="mt-4 lead text-danger">${message}</p>${topicsToReview}`;
            actionButton = `<button class="btn btn-warning btn-lg" onclick="LearningPath.startQuiz('${moduleId}', '${quizType}')">Tekrar Çöz</button>`;
        }
        
        const nextActionButton = `<button class="btn btn-info btn-lg ms-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">Modül İçeriğine Dön</button>`;
        
        quizEl.innerHTML = `
            <div class="result-card p-5 shadow-lg text-center">
                <h3 class="card-title mb-4">${quizTitle} Sonuçları</h3>
                <div class="${isPassed ? 'alert-success' : 'alert-danger'} p-3">
                    <p class="h5">Doğru Cevap: ${correctCount} / ${totalQuestions}</p>
                    <p class="h1 mb-4">Skorunuz: %${score}</p>
                    <p class="lead">Başarı Eşiği: %${this.PASS_SCORE}</p>
                </div>
                
                ${feedbackHtml}
                
                <div class="d-flex justify-content-center mt-4">
                    ${actionButton}
                    ${isPassed ? '' : nextActionButton}
                </div>
            </div>
        `;
    },
    
    updateGeneralProgress: function(moduleId, score, quizType) {
        if (quizType !== 'module_test') return; 
        
        let stats = JSON.parse(localStorage.getItem('userStats') || '{}');
        stats.totalQuizzes = (stats.totalQuizzes || 0) + 1;
        stats.totalScore = (stats.totalScore || 0) + score;
        stats.averageScore = Math.round(stats.totalScore / stats.totalQuizzes);

        const progressData = JSON.parse(localStorage.getItem('learningModules') || '[]');
        const completedCount = progressData.filter(m => m.status === 'Tamamlandı');
        stats.completedModules = completedCount.length;

        localStorage.setItem('userStats', JSON.stringify(stats));
    },

    displayStats: function() {
        this.showSection('statsSection');
        const statsEl = document.getElementById('statsSection');
        const stats = JSON.parse(localStorage.getItem('userStats') || '{}');
        const level = localStorage.getItem('userLevel') || 'A1';

        const modules = JSON.parse(localStorage.getItem('learningModules') || '[]');
        const completedModules = modules.filter(m => m.status === 'Tamamlandı');
        const totalCompleted = completedModules.length;
        const totalModules = modules.length;

        const progressPercent = totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0;
        
        const statsHtml = `
            <div style="max-width: 900px; width: 100%;">
                <button class="btn btn-secondary mb-3" onclick="LearningPath.displayLearningPath('${level}')">
                    <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
                </button>
                <h2 class="display-6 mb-4"><i class="fas fa-chart-line me-3"></i> Genel Öğrenme İstatistikleri</h2>

                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-5">
                    <div class="col">
                        <div class="card text-center bg-primary text-white h-100 shadow">
                            <div class="card-body">
                                <i class="fas fa-check-circle fa-3x mb-3"></i>
                                <h5 class="card-title">Tamamlanan Modül</h5>
                                <p class="display-4">${totalCompleted} / ${totalModules}</p>
                                <p class="card-text">${progressPercent}% Genel İlerleme</p>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="card text-center bg-info text-white h-100 shadow">
                            <div class="card-body">
                                <i class="fas fa-crosshairs fa-3x mb-3"></i>
                                <h5 class="card-title">Ortalama Başarı Puanı</h5>
                                <p class="display-4">%${stats.averageScore || 0}</p>
                                <p class="card-text">Toplam ${stats.totalQuizzes || 0} modül testindeki ortalama.</p>
                            </div>
                        </div>
                    </div>
                    <div class="col">
                        <div class="card text-center bg-success text-white h-100 shadow">
                            <div class="card-body">
                                <i class="fas fa-language fa-3x mb-3"></i>
                                <h5 class="card-title">Mevcut Seviye</h5>
                                <p class="display-4">${level}</p>
                                <p class="card-text">Seviye tespit testinden belirlenen seviye.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="text-center mt-5">
                    <button class="btn btn-outline-danger" onclick="LearningPath.resetProgress()">
                        <i class="fas fa-trash-alt me-2"></i> Tüm İlerlemeyi Sıfırla
                    </button>
                </p>
            </div>
        `;

        statsEl.innerHTML = statsHtml;
    },

    // =========================================================================
    // 7. SEVİYE ATLATMA MEKANİZMASI (Aynı Bırakıldı)
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
            if (pathEl) {
                 const levelUpButtonHtml = `
                     <div class="level-up-alert alert alert-success p-3 mt-4 text-center" style="max-width: 900px; width: 100%;">
                         <h4 class="alert-heading">Tebrikler! ${currentLevel} Seviyesini Tamamladınız!</h4>
                         <p>Bir üst seviyeye geçiş yapmak için **Seviye Atlama Sınavı**'nı çözmelisiniz.</p>
                         <button class="btn btn-lg btn-warning mt-2" onclick="LearningPath.startLevelUpExam('${currentLevel}')">
                            <i class="fas fa-arrow-up me-2"></i> Seviye Atlama Sınavını Başlat
                         </button>
                     </div>
                 `;
                 
                 if (!document.querySelector('.level-up-alert')) {
                    const levelHeader = pathEl.querySelector('.level-header');
                    if(levelHeader) {
                         levelHeader.insertAdjacentHTML('afterend', levelUpButtonHtml);
                    }
                 }
            }
        }
    },

    startLevelUpExam: function(currentLevel) {
        this.showSection('moduleQuizSection');
        
        const nextLevel = this.getNextLevel(currentLevel);
        
        const allQuestions = this.allExamQuestions.map(q => ({
             id: q.id || q.question.substring(0, 10),
             question: q.question,
             options: q.options,
             answer: q.answer,
             topic: q.category || 'Seviye Atlama',
             level: q.difficulty 
        }));
        
        const examQuestions = allQuestions
            .filter(q => q.level.toLowerCase().includes(currentLevel.toLowerCase()) || q.level.toLowerCase().includes(nextLevel.toLowerCase()))
            .sort(() => 0.5 - Math.random()) 
            .slice(0, 30); 

        if (examQuestions.length === 0) {
             document.getElementById('moduleQuizSection').innerHTML = `
                <div class="alert alert-danger">
                    <p>Seviye Atlama Sınavı için soru bulunamadı. Lütfen <code>exam.json</code> dosyasını kontrol edin ve seviyelere uygun sorular içerdiğinden emin olun.</p>
                    <button class="btn btn-primary mt-3" onclick="LearningPath.displayLearningPath('${currentLevel}')"> Geri Dön </button>
                </div>
            `;
            return;
        }

        this.currentQuiz = {
            moduleId: 'level_up_exam',
            quizType: 'level_up', 
            questions: examQuestions,
            userAnswers: {},
            currentQuestionIndex: 0,
            quizTitle: `${currentLevel} -> ${nextLevel} Seviye Atlama Sınavı`
        };

        this.displayQuizQuestion();
    },

    processLevelUpExamResult: function(score, questions, userAnswers, currentLevel) {
        const nextLevel = this.getNextLevel(currentLevel);
        const isPassed = score >= this.PASS_SCORE; 

        if (isPassed) {
             localStorage.setItem('userLevel', nextLevel);
             localStorage.removeItem('learningModules'); 
             
             document.getElementById('moduleQuizSection').innerHTML = `
                 <div class="result-card p-5 shadow-lg text-center">
                     <h3 class="card-title mb-4 text-success"><i class="fas fa-trophy me-2"></i> TEBRİKLER!</h3>
                     <p class="h5">Sınav Skoru: %${score}</p>
                     <p class="h1 mb-4 level-result">Yeni Seviyeniz: <span>${nextLevel}</span></p>
                     <p class="lead">Başarıyla ${currentLevel} seviyesini tamamladınız ve ${nextLevel} seviyesine geçtiniz. Yeni öğrenme yolunuzu görün.</p>
                     <button class="btn btn-primary btn-lg mt-3" onclick="LearningPath.displayLearningPath('${nextLevel}')">
                         <i class="fas fa-route me-2"></i> Yeni Öğrenme Yolunu Gör
                     </button>
                 </div>
             `;
        } else {
             document.getElementById('moduleQuizSection').innerHTML = `
                 <div class="result-card p-5 shadow-lg text-center">
                     <h3 class="card-title mb-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i> Tekrar Gerekli</h3>
                     <p class="h5">Sınav Skoru: %${score}</p>
                     <p class="h1 mb-4">Başarı Eşiği: %${this.PASS_SCORE}</p>
                     <p class="lead">Başarıyla atlamak için %${this.PASS_SCORE} skoruna ulaşmalısınız. Lütfen ${currentLevel} seviyesindeki modülleri tekrar gözden geçirin.</p>
                     <button class="btn btn-warning btn-lg mt-3" onclick="LearningPath.displayLearningPath('${currentLevel}')">
                         <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
                     </button>
                 </div>
             `;
        }
    },

    // =========================================================================
    // 8. SESLENDİRME İŞLEVLERİ (Aynı Bırakıldı)
    // =========================================================================

    speak: function(text, rate = 0.9) { 
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        
        this.speechUtterance = new SpeechSynthesisUtterance(text);
        
        const englishVoice = this.synth.getVoices().find(voice => voice.lang.startsWith('en'));
        if (englishVoice) {
            this.speechUtterance.voice = englishVoice;
        } else {
            this.speechUtterance.lang = 'en-US'; 
        }

        this.speechUtterance.rate = parseFloat(rate); 
        this.speechUtterance.pitch = 1.0; 

        this.synth.speak(this.speechUtterance);
    },

    stopSpeaking: function() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
    },
    
    attachSpeechListeners: function(baseModuleName) {
         const speechButton = document.getElementById(`speechButton_${baseModuleName.replace(/\s/g, '_')}`);
         const rateSlider = document.getElementById('speechRate');
         const rateValueSpan = document.getElementById('rateValue');
         
         if (speechButton) {
              speechButton.addEventListener('click', () => {
                   const textToRead = speechButton.getAttribute('data-text');
                   const rate = localStorage.getItem('speechRate') || '0.9';

                   if (this.synth.speaking && this.speechUtterance && this.speechUtterance.text === textToRead) {
                       this.stopSpeaking();
                   } else {
                       this.speak(textToRead, rate); 
                   }
              });
         }
         
         if (rateSlider) {
              rateSlider.addEventListener('input', (e) => {
                   const newRate = e.target.value;
                   localStorage.setItem('speechRate', newRate); 
                   rateValueSpan.textContent = newRate; 

                   if (this.synth.speaking && this.speechUtterance) {
                       this.speechUtterance.rate = parseFloat(newRate);
                   }
              });
         }
    },
    
    // =========================================================================
    // 9. TEMİZLEME VE SIFIRLAMA FONKSİYONLARI (Aynı Bırakıldı)
    // =========================================================================

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
            localStorage.removeItem('userStats');
            
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

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; 
    LearningPath.init();
});
