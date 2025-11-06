const LearningPath = {
    TEST_FILE_PATH: 'data/level_test.json',
    MODULE_CONTENT_FILE_PATH: 'data/module_content.json', 
    PASS_SCORE: 90, // Başarı eşiği: %90

    allModules: {},
    allModuleContents: {},
    allWords: [],
    allSentences: [],
    allReadings: [],
    allLevelTestQuestions: [],
    shuffledTestQuestions: [],
    
    synth: window.speechSynthesis, // Text-to-Speech API
    speechUtterance: null,

    // Her modül için sabit bölüm yapısı (sıra ve tipi belirli)
    STANDARD_SECTIONS: [
        { id: 'word', name: '1. Kelime Bilgisi Alıştırması', type: 'word' },
        { id: 'sentence', name: '2. Cümle Yapısı Alıştırması', type: 'sentence' },
        { id: 'reading', name: '3. Okuma Anlama Alıştırması', type: 'reading' }, 
        { id: 'module_test', name: '4. Modül Genel Testi', type: 'all' }, 
        { id: 'content_view', name: 'İçerik Görüntüleme', type: 'content' }, // İzleme için eklendi
    ],

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
        }).catch(error => {
            console.error("Veri yüklenirken hata oluştu:", error);
            document.body.innerHTML = `<div class="alert alert-danger">Veriler yüklenemedi: ${error.message}</div>`;
        });
    },

    // =========================================================================
    // VERİ YÜKLEME
    // =========================================================================

    loadAllData: async function() {
        const fetchJson = async (path, key) => {
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP Hata! Durum: ${response.status} (${path})`);
                this[key] = await response.json();
            } catch (error) {
                console.error(`Dosya yüklenemedi: ${path}`, error);
            }
        };

        const promises = [
            fetchJson('data/modules.json', 'allModules'),
            fetchJson(this.MODULE_CONTENT_FILE_PATH, 'allModuleContents'),
            fetchJson('data/words.json', 'allWords'),
            fetchJson('data/sentences.json', 'allSentences'),
            fetchJson('data/reading_stories.json', 'allReadings'),
            fetchJson(this.TEST_FILE_PATH, 'allLevelTestQuestions')
        ];

        await Promise.all(promises);
        this.allWords = Array.isArray(this.allWords) ? this.allWords : [];
        this.allSentences = Array.isArray(this.allSentences) ? this.allSentences : [];
        this.allReadings = Array.isArray(this.allReadings) ? this.allReadings : [];
    },

    // =========================================================================
    // GÖRÜNÜM VE YÖNLENDİRME
    // =========================================================================

    showSection: function(sectionId) {
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
            window.scrollTo(0, 0); 
        }
    },
    
    // =========================================================================
    // SEVİYE TESPİT TESTİ
    // =========================================================================
    
    startLevelTest: function() {
        this.shuffledTestQuestions = this.allLevelTestQuestions.sort(() => 0.5 - Math.random());
        const testContainer = document.getElementById('levelTestQuestions');
        let html = '';
        
        this.shuffledTestQuestions.forEach((q, index) => {
             const optionsHtml = q.options.map(option => `
                 <div class="form-check">
                     <input class="form-check-input" type="radio" name="question_${q.id}" id="q${q.id}_opt${option.hashCode()}" value="${option}">
                     <label class="form-check-label" for="q${q.id}_opt${option.hashCode()}">${option}</label>
                 </div>
             `).join('');

             html += `
                 <div class="card mb-3 shadow-sm">
                     <div class="card-body">
                         <h6 class="card-subtitle mb-2 text-muted">Soru ${index + 1} (Seviye: ${q.level})</h6>
                         <p class="card-text"><strong>${q.questionText}</strong></p>
                         ${optionsHtml}
                     </div>
                 </div>
             `;
        });
        
        testContainer.innerHTML = html;
        this.showSection('levelTestSection');
    },

    submitLevelTest: function() {
        let correctAnswers = 0;
        let lastLevel = 'A1';
        let levelScores = { 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0 }; // Sadece A1-B2 baz alınmıştır

        this.shuffledTestQuestions.forEach(q => {
            const selectedOption = document.querySelector(`input[name="question_${q.id}"]:checked`);
            if (selectedOption && selectedOption.value === q.correctAnswer) {
                correctAnswers++;
                // Seviye puanlarını hesapla
                if (q.level === 'A1') levelScores.A1++;
                else if (q.level === 'A2') levelScores.A2++;
                else if (q.level === 'B1') levelScores.B1++;
                else if (q.level === 'B2') levelScores.B2++;
            }
        });

        // Testi tamamlayan kullanıcıya seviye atama mantığı
        if (levelScores.B2 >= 2) lastLevel = 'B2';
        else if (levelScores.B1 >= 2) lastLevel = 'B1';
        else if (levelScores.A2 >= 3) lastLevel = 'A2';
        else lastLevel = 'A1';

        localStorage.setItem('userLevel', lastLevel);
        localStorage.setItem('levelTestAnswers', JSON.stringify(levelScores));

        this.displayLearningPath(lastLevel);
        alert(`Tebrikler! Seviye tespit testi tamamlandı. Başlangıç seviyeniz: ${lastLevel}`);
    },
    
    // =========================================================================
    // ÖĞRENİM YOLU VE MODÜLLER
    // =========================================================================

    displayLearningPath: function(userLevel) {
        this.showSection('learningPathSection');
        const modulesContainer = document.getElementById('modulesContainer');
        const levelDisplay = document.getElementById('currentLevelDisplay');
        levelDisplay.textContent = `Mevcut Seviyeniz: ${userLevel}`;

        let modules = JSON.parse(localStorage.getItem('learningModules'));
        if (!modules) {
            // İlk çalıştırma: A1 seviyesini temel al
            modules = this.allModules['A1'].modules.map(m => ({
                id: m.id,
                name: m.name,
                topic: m.topic,
                level: m.level, 
                isCompleted: false,
                // Başlangıçta tüm bölümler Başlanmadı olarak ayarlanır
                sectionProgress: this.STANDARD_SECTIONS.map(s => ({
                    id: s.id,
                    status: 'Başlanmadı',
                    lastScore: 0
                }))
            }));
            localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        let modulesHtml = '';
        modules.forEach(m => {
            // Modülün seviyesini kontrol et (Şimdilik sadece A1'den alınmıştır)
            const moduleStatus = m.isCompleted ? 'Tamamlandı' : 'Devam Ediyor';
            const badgeClass = m.isCompleted ? 'bg-success' : 'bg-primary';

            // Genel Test Puanını Bulma
            const moduleTestStatus = m.sectionProgress.find(s => s.id === 'module_test');
            const testScore = moduleTestStatus ? moduleTestStatus.lastScore : 0;
            const testBadgeClass = this.getBadgeClass(moduleTestStatus ? moduleTestStatus.status : 'Başlanmadı');

            modulesHtml += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card module-card h-100 shadow-sm ${m.isCompleted ? 'border-success' : 'border-primary'}">
                        <div class="card-body">
                            <h5 class="card-title">${m.name}</h5>
                            <p class="card-text text-muted">${m.topic} / Seviye: ${m.level}</p>
                            <p class="mb-1">
                                <span class="badge ${badgeClass} me-2">${moduleStatus}</span>
                            </p>
                             <hr>
                             <p class="mb-1">
                                Genel Test Durumu: <span class="badge ${testBadgeClass}">${moduleTestStatus ? moduleTestStatus.status : 'Başlanmadı'}</span>
                                ${testScore > 0 ? `<small class="text-muted"> (Son Puan: ${testScore}%)</small>` : ''}
                            </p>
                        </div>
                        <div class="card-footer d-flex justify-content-between align-items-center">
                            <button class="btn btn-primary btn-sm" onclick="LearningPath.displayModuleContent('${m.id}', '${userLevel}')">
                                İncele ve Başla
                            </button>
                            <button class="btn btn-info btn-sm" onclick="LearningPath.startQuiz('${m.id}', 'module_test')">
                                Genel Testi Çöz (${this.getModuleQuestions(m.id).length})
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        modulesContainer.innerHTML = modulesHtml;
    },
    
    getModuleQuestions: function(moduleId) {
        const baseModule = this.allModules['A1']?.modules?.find(m => m.id === moduleId);
        if (!baseModule) return [];
        // İçeriği zenginleştirerek tüm quiz sorularını al
        const userLevel = localStorage.getItem('userLevel') || 'A1';
        this.enrichModuleContent(moduleId, baseModule, userLevel);
        return baseModule.all_quiz_questions || [];
    },

    // =========================================================================
    // MODÜL İÇERİK YÜKLEME VE GÖSTERİM (DÜZELTİLDİ)
    // =========================================================================

    // Verilen modülün içeriğini alıştırmalarla zenginleştirir (Soru havuzunu hazırlar)
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
        
        // Türkçe Modül Konularını İngilizce Kategoriye Eşleştirme Sözlüğü
        const turkishToEnglishCategoryMap = {
            'günlük hayat': 'daily life', 'günlük rutin': 'daily life', 'doğa': 'nature', 'hayvanlar': 'animals', 'müzik': 'music',
            'yiyecek': 'food', 'beslenme': 'food', 'alışveriş': 'shopping', 'aile': 'family', 'seyahat': 'travel', 'geçmiş zaman': 'history', 
            'konuşma': 'daily life', 'cümle yapısı': 'structure', 'dilbilgisi': 'grammar', 'be fiili': 'introduction', 'sahiplik': 'possession'
        };
        
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
                      .sort(() => 0.5 - Math.random()).slice(0, 3);
                 
                 options = [...options, ...wrongOptions].sort(() => 0.5 - Math.random());
                 
                 wordQuizQuestions.push({
                      id: `word_q${moduleId}_${index}`, type: 'quiz', question: `"${w.word}" kelimesinin Türkçe karşılığı nedir?`,
                      options: options, answer: w.turkish, topic: 'Kelime Bilgisi'
                 });
            });
        }

        // --- 2. Cümle Alıştırmaları (sentences.json) ---
        const moduleSentences = this.allSentences.filter(s => {
            const isLevelMatch = s.difficulty && allowedDifficulties.includes(s.difficulty.toLowerCase());
            if (!isLevelMatch) return false;
            
            if (isModuleGrammar || ['konuşma', 'speaking', 'sentence', 'cümle'].includes(baseModuleTopic) || !baseModuleTopic) { return true; }
            
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
                      .filter(w => w.word !== missingWord).map(w => w.word).sort(() => 0.5 - Math.random()).slice(0, 3);
                 
                 options = [...options, ...wrongOptions].sort(() => 0.5 - Math.random());
                 
                 sentenceQuizQuestions.push({
                      id: `sentence_q${moduleId}_${index}`, type: 'quiz', question: questionText,
                      options: options, answer: missingWord, topic: 'Cümle Yapısı'
                 });
            });
        }
        
        // --- 3. Okuma Anlama (reading_stories.json) ---
        let moduleReading = this.allReadings.find(r => 
            (r.level && allowedDifficulties.includes(r.level.toLowerCase())) && 
            (
                r.category.toLowerCase() === mappedCategory || r.category.toLowerCase().includes(mappedCategory) ||
                r.title.toLowerCase().includes(simplifiedTopic) || baseModuleTopic.includes(r.category.toLowerCase())
            )
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
                type: 'reading_text', text: moduleReading.content, level: moduleReading.level, category: moduleReading.category
            });
            
            // Okuma sorularını işleme kısmı (Düzeltilmiş ve stabil)
            if (Array.isArray(moduleReading.questions)) {
                 moduleReading.questions.forEach((q, index) => {
                     if (q.options && q.options.length > 2) {
                          let correctAnswerText = null;
                          
                          if (typeof q.correctAnswer === 'number') {
                              if (q.options[q.correctAnswer] !== undefined) { correctAnswerText = q.options[q.correctAnswer]; }
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
        
        // --- Genel Quiz Soru Havuzunu Oluştur ---
        baseModule.word_quiz_questions = wordQuizQuestions;
        baseModule.sentence_quiz_questions = sentenceQuizQuestions;
        baseModule.reading_quiz_questions = readingQuizQuestions;
        baseModule.all_quiz_questions = [...wordQuizQuestions, ...sentenceQuizQuestions, ...readingQuizQuestions];
        
        return enrichedContent;
    },

    // Yeni: Modül içeriğindeki tek bir öğeyi HTML'e çevirir. (Boş sayfa hatası çözümü)
    renderContentItem: function(item) {
        let html = '';
        if (item.type === 'grammar_text') {
            html = `<div class="content-text p-3 mb-4 border-start border-4 border-primary bg-white shadow-sm rounded">
                        <p>${item.text}</p>
                        <button class="btn btn-outline-primary btn-sm tts-button mt-2" data-text-to-speak="${item.text}">
                            <i class="fas fa-volume-up"></i> Dinle
                        </button>
                    </div>`;
        } else if (item.type === 'reading_text') {
            html = `<div class="reading-section p-4 mb-4 bg-white shadow-lg rounded">
                        <h5 class="text-primary mb-3">${item.title || 'Okuma Hikayesi'} (Seviye: ${item.level})</h5>
                        <p class="reading-content">${item.text}</p>
                        <button class="btn btn-outline-success btn-sm tts-button mt-3" data-text-to-speak="${item.text}">
                            <i class="fas fa-volume-up"></i> Hikayeyi Dinle
                        </button>
                    </div>`;
        } else if (item.type === 'reading_placeholder') {
             html = `<div class="alert alert-warning mb-4">
                        <i class="fas fa-exclamation-triangle"></i> ${item.text}
                    </div>`;
        } else if (item.type === 'words') {
             html = `<div class="vocabulary-list p-3 mb-4 bg-light rounded">
                         <h6>Kelime Listesi:</h6>
                         <div class="d-flex flex-wrap word-list-container">${item.html}</div>
                     </div>`;
        } else if (item.type === 'sentences') {
             html = `<div class="sentence-list p-3 mb-4 bg-light rounded">
                         <h6>Örnek Cümleler:</h6>
                         <div class="d-flex flex-column">${item.html}</div>
                     </div>`;
        }
        return html;
    },


    // Yeni: İçeriği ve Alıştırma Kartlarını Gömülü Olarak Hazırlar (Kart Konumu ve Görünüm Düzeltmesi)
    renderModuleContentDetail: function(moduleId, baseModule, currentModule) {
        const userLevel = localStorage.getItem('userLevel') || 'A1';
        
        const enrichedContentList = this.enrichModuleContent(moduleId, baseModule, userLevel); 
        
        let contentHtml = '';
        let hasGrammarCardsBeenAdded = false; 

        enrichedContentList.forEach(item => {
            
            // Kelime ve Cümle kartlarını modül içeriğinin başına yerleştir
            if (!hasGrammarCardsBeenAdded && (item.type === 'grammar_text' || item.type === 'words' || item.type === 'sentences')) {
                 let cardGroup = `<div class="row g-4 mb-4">`;
                 cardGroup += this.renderInlineQuizSection('word', baseModule, currentModule);
                 cardGroup += this.renderInlineQuizSection('sentence', baseModule, currentModule);
                 cardGroup += `</div>`;
                 contentHtml += cardGroup;
                 
                 hasGrammarCardsBeenAdded = true;
            }
            
            contentHtml += this.renderContentItem(item); 
            
            // Okuma Alıştırması: Okuma içeriğinin hemen arkasına kartı ekle
            if (item.type === 'reading_text' || item.type === 'reading_placeholder') {
                 let cardGroup = `<div class="row g-4 mb-4">`;
                 cardGroup += this.renderInlineQuizSection('reading', baseModule, currentModule);
                 cardGroup += `</div>`;
                 contentHtml += cardGroup;
            }
        });
        
        // Eğer içerikte hiç Dilbilgisi/Anlatım içeriği yoksa, kartları yine de en üste koy
        if (!hasGrammarCardsBeenAdded) {
            let defaultCards = `<div class="row g-4 mb-4">`;
            defaultCards += this.renderInlineQuizSection('word', baseModule, currentModule);
            defaultCards += this.renderInlineQuizSection('sentence', baseModule, currentModule);
            defaultCards += `</div>`;
            contentHtml = defaultCards + contentHtml;
        }

        return contentHtml;
    },

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
        
        const contentDetailHTML = this.renderModuleContentDetail(moduleId, baseModule, currentModule);
        
        contentEl.innerHTML = `
            <div style="max-width: 900px; width: 100%;">
                <button class="btn btn-secondary mb-3" onclick="LearningPath.displayLearningPath('${userLevel}')">
                    <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
                </button>
                <h3 class="mb-4">${baseModule.name} Modülü (Seviye: ${userLevel})</h3>
                
                <hr class="mt-4 mb-4">
                
                <div id="moduleContentDetail" class="p-4 bg-light rounded shadow-sm">
                    <h4>İçerik Anlatımı</h4>
                    <div id="speechControls" class="d-flex align-items-center mb-3">
                        <label for="speechRate" class="form-label mb-0 me-3">Ses Hızı:</label>
                        <input type="range" class="form-range" id="speechRate" min="0.5" max="2" step="0.1" value="${localStorage.getItem('speechRate') || '0.9'}" style="width: 150px;">
                        <span id="rateValue" class="ms-2">${localStorage.getItem('speechRate') || '0.9'}</span>
                    </div>
                    ${contentDetailHTML} 
                </div>
            </div>
        `;
        
        this.attachSpeechListeners(baseModule.name);

        this.updateModuleSectionStatus(moduleId, 'content_view', true, 0); 
    },
    
    // =========================================================================
    // QUIZ VE ALISTIRMA YÖNETİMİ
    // =========================================================================

    renderInlineQuizSection: function(sectionId, baseModule, currentModule) {
        const sectionInfo = this.STANDARD_SECTIONS.find(s => s.id === sectionId);
        
        let quizQuestions = [];
        if (sectionId === 'word') {
            quizQuestions = baseModule.word_quiz_questions;
        } else if (sectionId === 'sentence') {
            quizQuestions = baseModule.sentence_quiz_questions;
        } else if (sectionId === 'reading') {
            quizQuestions = baseModule.reading_quiz_questions;
        } else if (sectionId === 'module_test') {
            quizQuestions = baseModule.all_quiz_questions;
        }
        
        const questionCount = quizQuestions ? quizQuestions.length : 0;
        const sectionData = currentModule.sectionProgress.find(s => s.id === sectionId) || {status: 'Başlanmadı', lastScore: 0};
        
        if (sectionData.status === 'Başlanmadı' && questionCount === 0 && sectionId !== 'content_view' && sectionId !== 'module_test') {
             sectionData.status = 'Atlandı (Soru Yok)';
             this.updateModuleSectionStatus(currentModule.id, sectionId, true, 0); 
        }
        
        const badgeClass = this.getBadgeClass(sectionData.status);
        const isCompleted = (sectionData.status === 'Tamamlandı' || sectionData.status === 'Atlandı (Soru Yok)');
        
        const statusMessage = isCompleted ? 'Bölüm tamamlandı.' : `${questionCount} Soru Hazır.`;
        
        let buttonHtml = '';
        if (sectionData.status === 'Atlandı (Soru Yok)') {
             buttonHtml = `<button class="btn btn-sm btn-info" disabled>Atlandı</button>`;
        } else if (isCompleted && sectionId !== 'module_test') {
             buttonHtml = `<button class="btn btn-sm btn-warning" onclick="LearningPath.startQuiz('${currentModule.id}', '${sectionId}')">Tekrar Çöz</button>`;
        } else if (sectionId === 'module_test' && isCompleted) {
            buttonHtml = `<button class="btn btn-sm btn-warning" onclick="LearningPath.startQuiz('${currentModule.id}', '${sectionId}')">Genel Testi Tekrar Çöz</button>`;
        } else if (questionCount > 0) {
             buttonHtml = `<button class="btn btn-sm btn-success" onclick="LearningPath.startQuiz('${currentModule.id}', '${sectionId}')">Başla (${questionCount})</button>`;
        } else {
             buttonHtml = `<button class="btn btn-sm btn-secondary" disabled>Soru Yok</button>`;
        }
        
        if (sectionId === 'content_view') return '';
        
        // Kartın tam genişlikte görünmesi için col-12 kullanıldı.
        return `
            <div class="col-12">
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

    startQuiz: function(moduleId, sectionId) {
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        const moduleData = modules.find(m => m.id === moduleId);
        
        if (!moduleData.all_quiz_questions) {
            // Modül içeriği zenginleştirilmemişse hemen zenginleştir
            const baseLevelCode = 'A1';
            const baseModule = this.allModules[baseLevelCode]?.modules?.find(m => m.id === moduleId);
            const staticContentData = this.allModuleContents[moduleId];
            baseModule.content = (staticContentData && Array.isArray(staticContentData.content)) ? staticContentData.content : [];
            this.enrichModuleContent(moduleId, baseModule, localStorage.getItem('userLevel') || 'A1');
            moduleData.all_quiz_questions = baseModule.all_quiz_questions; 
            moduleData.word_quiz_questions = baseModule.word_quiz_questions;
            moduleData.sentence_quiz_questions = baseModule.sentence_quiz_questions;
            moduleData.reading_quiz_questions = baseModule.reading_quiz_questions;
        }

        let quizQuestions = [];
        if (sectionId === 'word') { quizQuestions = moduleData.word_quiz_questions; }
        else if (sectionId === 'sentence') { quizQuestions = moduleData.sentence_quiz_questions; }
        else if (sectionId === 'reading') { quizQuestions = moduleData.reading_quiz_questions; }
        else if (sectionId === 'module_test') { quizQuestions = moduleData.all_quiz_questions.sort(() => 0.5 - Math.random()).slice(0, 15); }
        
        if (quizQuestions.length === 0) {
            alert("Bu bölüm için henüz soru bulunmamaktadır veya sorular yüklenemedi.");
            return;
        }

        // Quiz sorularını localStorage'a kaydet ve quiz sayfasını yükle
        localStorage.setItem('currentQuiz', JSON.stringify({
            moduleId: moduleId,
            sectionId: sectionId,
            questions: quizQuestions,
            currentQuestionIndex: 0,
            answers: []
        }));

        this.showSection('quizSection');
        this.renderQuizQuestion(quizQuestions[0]);
    },

    renderQuizQuestion: function(question) {
        const quizContainer = document.getElementById('quizQuestions');
        const quizTitle = document.getElementById('quizTitle');
        const currentQuizState = JSON.parse(localStorage.getItem('currentQuiz'));
        
        const questionIndex = currentQuizState.currentQuestionIndex;
        const totalQuestions = currentQuizState.questions.length;

        quizTitle.textContent = `${this.STANDARD_SECTIONS.find(s => s.id === currentQuizState.sectionId).name} - Soru ${questionIndex + 1} / ${totalQuestions}`;

        const optionsHtml = question.options.map((option, index) => `
            <div class="form-check mb-2">
                <input class="form-check-input" type="radio" name="quiz_question" id="quiz_opt_${index}" value="${option}">
                <label class="form-check-label" for="quiz_opt_${index}">${option}</label>
            </div>
        `).join('');

        quizContainer.innerHTML = `
            <div class="card shadow-lg mb-4">
                <div class="card-body">
                    <h5 class="card-title">${question.question}</h5>
                    <p class="card-subtitle mb-3 text-muted">${question.topic}</p>
                    ${optionsHtml}
                </div>
            </div>
            <div class="d-flex justify-content-between">
                <button class="btn btn-secondary" onclick="LearningPath.goToPreviousQuestion()" ${questionIndex === 0 ? 'disabled' : ''}>
                    Önceki Soru
                </button>
                <button class="btn btn-primary" onclick="LearningPath.submitQuiz()">
                    ${questionIndex < totalQuestions - 1 ? 'Sonraki Soru' : 'Quizi Bitir'}
                </button>
            </div>
        `;
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
        const selectedOption = document.querySelector('input[name="quiz_question"]:checked');

        if (!selectedOption) {
            alert("Lütfen bir seçenek işaretleyiniz.");
            return;
        }

        const isCorrect = selectedOption.value === currentQuestion.answer;
        currentQuizState.answers[currentQuizState.currentQuestionIndex] = {
            questionId: currentQuestion.id,
            selected: selectedOption.value,
            correct: currentQuestion.answer,
            isCorrect: isCorrect
        };

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

        const resultsContainer = document.getElementById('quizResults');
        const userLevel = localStorage.getItem('userLevel');
        
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
    // DURUM VE İLERLEME YÖNETİMİ
    // =========================================================================

    updateModuleSectionStatus: function(moduleId, sectionId, isAttempted, score, status = null) {
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        const moduleIndex = modules.findIndex(m => m.id === moduleId);

        if (moduleIndex !== -1) {
            let sectionProgress = modules[moduleIndex].sectionProgress.find(s => s.id === sectionId);
            
            if (!sectionProgress) {
                sectionProgress = { id: sectionId, status: 'Başlanmadı', lastScore: 0 };
                modules[moduleIndex].sectionProgress.push(sectionProgress);
            }

            if (isAttempted) {
                sectionProgress.lastScore = score;
                if (status) {
                    sectionProgress.status = status;
                } else if (score >= this.PASS_SCORE) {
                    sectionProgress.status = 'Tamamlandı';
                } else if (sectionProgress.status === 'Başlanmadı') {
                    sectionProgress.status = 'Devam Ediyor';
                }
            }
            
            // Tüm gerekli bölümler tamamlandı mı kontrolü (Sadece 'word', 'sentence', 'reading' ve 'module_test')
            const requiredSections = ['word', 'sentence', 'reading', 'module_test'];
            const allCompleted = requiredSections.every(id => {
                 const s = modules[moduleIndex].sectionProgress.find(sp => sp.id === id);
                 return s && (s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)');
            });

            modules[moduleIndex].isCompleted = allCompleted;

            localStorage.setItem('learningModules', JSON.stringify(modules));
        }
    },

    getBadgeClass: function(status) {
        switch (status) {
            case 'Tamamlandı':
                return 'bg-success';
            case 'Başlanmadı':
                return 'bg-secondary';
            case 'Devam Ediyor':
            case 'Kaldı':
                return 'bg-warning text-dark';
            case 'Atlandı (Soru Yok)':
                return 'bg-info text-dark';
            default:
                return 'bg-primary';
        }
    },
    
    // =========================================================================
    // SESLENDİRME (Text-to-Speech)
    // =========================================================================

    attachSpeechListeners: function(moduleName) {
        const speechRateRange = document.getElementById('speechRate');
        const rateValueSpan = document.getElementById('rateValue');
        
        const updateRate = (rate) => {
            rateValueSpan.textContent = rate;
            localStorage.setItem('speechRate', rate);
            this.stopSpeech(); // Hızı değiştirdiğimizde konuşmayı durdur
        };

        // Başlangıç değerini ayarla
        const initialRate = localStorage.getItem('speechRate') || '0.9';
        speechRateRange.value = initialRate;
        updateRate(initialRate);

        speechRateRange.oninput = (e) => updateRate(e.target.value);
        
        this.addTTSListeners();
    },

    addTTSListeners: function() {
        document.querySelectorAll('.tts-button').forEach(button => {
            button.onclick = (e) => {
                const text = e.target.closest('.tts-button').dataset.textToSpeak;
                this.speak(text);
            };
        });
    },
    
    speak: function(text) {
        if (this.synth.speaking) {
            this.stopSpeech(); 
            // Aynı butona tekrar basılırsa durdurup yeniden başlasın
            if (this.speechUtterance && this.speechUtterance.text === text) {
                return;
            }
        }

        this.speechUtterance = new SpeechSynthesisUtterance(text);
        this.speechUtterance.rate = parseFloat(localStorage.getItem('speechRate') || '0.9');
        this.speechUtterance.lang = 'en-US'; // İngilizce konuşma varsayımı
        
        this.synth.speak(this.speechUtterance);
    },

    stopSpeech: function() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
    },

    // =========================================================================
    // SIFIRLAMA FONKSİYONLARI
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

// Basit bir hashCode fonksiyonu (Quiz'de input ID'leri için gerekli olabilir)
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


document.addEventListener('DOMContentLoaded', () => LearningPath.init());
