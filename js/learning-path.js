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
        // Modül Genel Testi kartı ana sayfada gösterilmelidir, burada sadece mantık için tutulabilir
        { id: 'module_test', name: '4. Modül Genel Testi', type: 'all' }, 
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
                // Bazı dosyaların eksik olması kritik olmayabilir, bu yüzden hata fırlatmıyoruz.
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
            window.scrollTo(0, 0); // Sayfa değiştiğinde üste kaydır
        }
    },
    
    // =========================================================================
    // MODÜL İÇERİK YÜKLEME VE ZENGİNLEŞTİRME
    // =========================================================================

    // Verilen modülün içeriğini alıştırmalarla zenginleştirir (Soru havuzunu hazırlar)
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
        
        // Türkçe Modül Konularını İngilizce Kategoriye Eşleştirme Sözlüğü
        const turkishToEnglishCategoryMap = {
            'günlük hayat': 'daily life', 'günlük rutin': 'daily life',
            'doğa': 'nature', 'hayvanlar': 'animals', 'müzik': 'music',
            'yiyecek': 'food', 'beslenme': 'food', 'alışveriş': 'shopping',
            'aile': 'family', 'seyahat': 'travel', 'geçmiş zaman': 'history', 
            'konuşma': 'daily life', 'cümle yapısı': 'structure',
            'dilbilgisi': 'grammar', 'be fiili': 'introduction', 'sahiplik': 'possession'
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
        let moduleReading = this.allReadings.find(r => 
            (r.level && allowedDifficulties.includes(r.level.toLowerCase())) && 
            (
                r.category.toLowerCase() === mappedCategory || 
                r.category.toLowerCase().includes(mappedCategory) ||
                r.title.toLowerCase().includes(simplifiedTopic) || 
                baseModuleTopic.includes(r.category.toLowerCase())
            )
        );

        // KRİTİK YEDEK: Eğer spesifik kategori eşleşmezse, rastgele birini seç
        if (!moduleReading && this.allReadings.length > 0) {
             const suitableReadings = this.allReadings.filter(r => 
                 (r.level && allowedDifficulties.includes(r.level.toLowerCase()))
             );
             if (suitableReadings.length > 0) {
                 moduleReading = suitableReadings[Math.floor(Math.random() * suitableReadings.length)];
             }
        }

        if (moduleReading && moduleReading.content) {
            baseModule.reading_story_title = moduleReading.title;
            enrichedContent.push({
                type: 'reading_text', 
                text: moduleReading.content, 
                level: moduleReading.level, 
                category: moduleReading.category
            });
            
            // Okuma sorularını işleme kısmı - KRİTİK DÜZELTME
            if (Array.isArray(moduleReading.questions)) {
                 moduleReading.questions.forEach((q, index) => {
                     // Soru ve en az 3 seçenek olmalı
                     if (q.options && q.options.length > 2) {
                          let correctAnswerText = null;
                          
                          // Doğru cevabı bulma mantığı:
                          if (typeof q.correctAnswer === 'number') {
                              if (q.options[q.correctAnswer] !== undefined) {
                                  correctAnswerText = q.options[q.correctAnswer];
                              }
                          } else if (typeof q.correctAnswer === 'string') {
                              // Cevap direkt metin ise
                              correctAnswerText = q.correctAnswer; 
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
                          } else {
                              console.warn(`Okuma sorusu ${index} için doğru cevap metni bulunamadı: ${q.question}`);
                          }
                     }
                 });
            } else {
                console.warn(`Okuma parçası ${moduleReading.title} için questions dizisi boş veya tanımsız.`);
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

    // =========================================================================
    // MODÜL İÇERİĞİ KART YERLEŞİMİ VE HTML OLUŞTURMA
    // =========================================================================

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
                         <div class="d-flex flex-wrap">${item.html}</div>
                     </div>`;
        } else if (item.type === 'sentences') {
             html = `<div class="sentence-list p-3 mb-4 bg-light rounded">
                         <h6>Örnek Cümleler:</h6>
                         <div class="d-flex flex-column">${item.html}</div>
                     </div>`;
        }
        return html;
    },


    // Yeni: İçeriği ve Alıştırma Kartlarını Gömülü Olarak Hazırlar (Kart Konumu Çözümü)
    renderModuleContentDetail: function(moduleId, baseModule, currentModule) {
        const userLevel = localStorage.getItem('userLevel') || 'A1';
        
        const enrichedContentList = this.enrichModuleContent(moduleId, baseModule, userLevel); 
        
        let contentHtml = '';
        let hasGrammarCardsBeenAdded = false; 

        enrichedContentList.forEach(item => {
            
            // Kelime ve Cümle kartlarını modül içeriğinin başına yerleştir
            if (!hasGrammarCardsBeenAdded && (item.type === 'grammar_text' || item.type === 'words' || item.type === 'sentences')) {
                 // **KRİTİK DÜZELTME:** Kartları tam genişlikte bir div içine alıyoruz
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
                // **KRİTİK DÜZELTME:** Okuma kartını da tam genişlikte bir div içine alıyoruz
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

    // displayModuleContent fonksiyonu (Gövde temizlendi ve yeni fonksiyonu çağırıyor)
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
    
    // renderInlineQuizSection fonksiyonu (Kart yapısı düzeltildi)
    renderInlineQuizSection: function(sectionId, baseModule, currentModule) {
        // ... (fonksiyonun başı) ...
        const sectionInfo = this.STANDARD_SECTIONS.find(s => s.id === sectionId);
        
        let quizQuestions = [];
        // ... (quizQuestions atamaları) ...
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
        
        // **KRİTİK DÜZELTME:** Kartın tam genişlikte görünmesi için col-12 kullanıldı.
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
    
    // ... (Diğer fonksiyonlar) ...

    // HATA: getModuleContentHTML kullanımdan kaldırıldı.

    // ... (Diğer fonksiyonlar: displayLearningPath, startQuiz, submitQuiz, startLevelTest, submitLevelTest, updateModuleSectionStatus, getBadgeClass, attachSpeechListeners, addTTSListeners, stopSpeech, resetUserLevel, resetProgress) ...

    // =========================================================================
    // DİĞER FONKSİYONLAR BİTİŞ
    // =========================================================================
};

document.addEventListener('DOMContentLoaded', () => LearningPath.init());
