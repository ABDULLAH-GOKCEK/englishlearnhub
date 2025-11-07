// =========================================================================
// js/learning-path.js (V14.5 - Tam Versiyon)
// 1. Modüller Arası İçerik Farklılaştırma (MODULE_CATEGORY_MAP)
// 2. Dinamik Modül Sınavı Oluşturma (createModuleQuizQuestions)
// 3. Seviye Atlama Sınavı Yükleme Hatası Çözümü (exam.json kontrolü)
// =========================================================================

const LearningPath = {
    // Sabitler
    TEST_FILE_PATH: 'data/level_test.json',
    MODULE_CONTENT_FILE_PATH: 'data/module_content.json', 
    LEVEL_UP_EXAM_FILE_PATH: 'data/exam.json', // Seviye atlama sınavı soruları (ör: A1 -> A2)
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
    
    // Geçici Durum
    currentModuleKey: null,
    currentQuestionIndex: 0,
    currentQuizAnswers: [],
    
    // Seslendirme
    synth: window.speechSynthesis, 
    speechUtterance: null,

    // Her modül için sabit bölüm yapısı
    // V14.4'teki 'module_test' kısmı, V14.5'te dinamik olarak 'displayModuleQuiz' ile çağrılacaktır.
    STANDARD_SECTIONS: [
        { id: 'word', name: '1. Kelime Bilgisi Alıştırması', type: 'word' },
        { id: 'sentence', name: '2. Cümle Yapısı Alıştırması', type: 'sentence' },
        { id: 'reading', name: '3. Okuma Anlama Alıştırması', type: 'reading' }, 
    ],

    // =========================================================================
    // YENİ EKLEME: Modül İçerik Haritası
    // =========================================================================
    MODULE_CATEGORY_MAP: {
        'A1-M1': { words: ['Animals', 'Greetings', 'Basic Nouns'], sentences: ['Greetings', 'Introduction', 'Daily Life'], readings: ['beginner'] },
        'A1-M2': { words: ['Numbers', 'Food', 'Colors', 'Time'], sentences: ['Family', 'Ordering Food', 'Simple Questions', 'Time'], readings: ['beginner'] },
        'A1-M3': { words: ['Family', 'Home', 'Jobs', 'Adjectives'], sentences: ['Directions', 'Past Events', 'Ability', 'Obligation'], readings: ['beginner'] },
        
        'A2-M1': { words: ['Health', 'Travel', 'Weather', 'Education'], sentences: ['Future Plans', 'Comparison', 'Modal Verbs'], readings: ['elementary'] },
        'A2-M2': { words: ['City', 'Shopping', 'Technology', 'Media'], sentences: ['Advice', 'Passive Voice', 'Reported Speech'], readings: ['elementary'] },
        'A2-M3': { words: ['Business', 'Abstract', 'Emotion', 'Politics'], sentences: ['Conditionals', 'Phrasal Verbs', 'Complex Sentence'], readings: ['elementary'] },
        
        'B1-M1': { words: ['Finance', 'Law', 'Science', 'Nature'], sentences: ['Inversion', 'Subjunctive', 'Advanced Tenses'], readings: ['intermediate'] },
        // Lütfen diğer modüller için bu haritayı kendi veri kategorilerinize göre genişletin.
    },
    
    // =========================================================================
    // 1. TEMEL İŞLEMLER VE VERİ YÜKLEME
    // (loadAllData - V15.1) - Dizi Olarak Yüklenen Modül Desteği
    // =========================================================================

    loadAllData: async function() {
        const fetchData = async (path) => {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP hatası! Durum: ${res.status} (${path})`);
                return res.json();
            } catch (error) {
                console.error(`Kritik JSON Yükleme Hatası: ${path}`, error);
                // Hata durumunda, yüklenen dosya türüne göre boş nesne veya boş dizi döndür
                return path.includes('json') ? {} : []; 
            }
        };

        // Veri çekme işlemleri
        const [moduleContentData, testData, wordsData, sentencesData, readingsData, examData] = await Promise.all([
            fetchData(this.MODULE_CONTENT_FILE_PATH).catch(() => ({})), // module_content.json 
            fetchData(this.TEST_FILE_PATH).catch(() => ({})),
            fetchData('data/words.json').catch(() => []), 
            fetchData('data/sentences.json').catch(() => []), 
            fetchData('data/reading_stories.json').catch(() => []), 
            fetchData(this.LEVEL_UP_EXAM_FILE_PATH).catch(() => []) 
        ]);

        // V15.1 Düzeltmesi: Modül verisi, 'modules' anahtarı, kök nesne VEYA kök dizi olabilir.
        let rawModules = moduleContentData;
        if (moduleContentData && moduleContentData.modules) {
             // Eğer "modules" anahtarı varsa, onu al
             rawModules = moduleContentData.modules;
             this.allModuleContents = moduleContentData;
        } else {
             this.allModuleContents = moduleContentData;
        }

        // Eğer rawModules bir dizi ise, onu anahtarlı bir nesneye dönüştür
        if (Array.isArray(rawModules)) {
            this.allModules = rawModules.reduce((acc, module) => {
                // Modül anahtarını 'id' veya 'level-M#' formatından alırız
                const key = module.id || `${module.level || 'Unknown'}-${module.name || 'M1'}`.replace(/\s/g, '');
                acc[key] = module;
                return acc;
            }, {});
        } else {
            // Zaten anahtarlı bir nesneyse direkt kullan
            this.allModules = rawModules;
        }
        
        // Geri kalan test verilerinin yüklenmesi
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
    // =========================================================================
    // 2. İÇERİK FİLTRELEME VE GÖSTERİMİ (GÜNCELLEME 1)
    // =========================================================================

    // İçeriği kategori haritasına göre filtreler ve allModuleContents'e kaydeder.
    loadModuleContent: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return;

        const level = moduleInfo.level;
        const map = this.MODULE_CATEGORY_MAP[moduleKey];

        // moduleInfo.content objesini oluştur/temizle
        moduleInfo.content = { words: [], sentences: [], readings: [] };

        if (!map) {
            console.warn(`[UYARI] Modül içerik haritası bulunamadı: ${moduleKey}. Varsayılan seviye bazlı filtreleme uygulanacak.`);
            moduleInfo.content.words = this.allWords.filter(w => w.difficulty === level.toLowerCase());
            moduleInfo.content.sentences = this.allSentences.filter(s => s.difficulty === level.toLowerCase());
            moduleInfo.content.readings = this.allReadings.filter(r => r.level === level.toLowerCase());
            
            this.allModuleContents[moduleKey] = moduleInfo.content;
            return; 
        }

        // KELİMELERİ FİLTRELEME: Doğru seviye VE doğru kategori olmalı
        moduleInfo.content.words = this.allWords.filter(word => {
            const isCorrectLevel = word.difficulty === level.toLowerCase();
            const isCorrectCategory = map.words.includes(word.category);
            return isCorrectLevel && isCorrectCategory;
        });

        // CÜMLELERİ FİLTRELEME: Doğru seviye VE doğru kategori olmalı
        moduleInfo.content.sentences = this.allSentences.filter(sentence => {
            const isCorrectLevel = sentence.difficulty === level.toLowerCase();
            const isCorrectCategory = map.sentences.includes(sentence.category);
            return isCorrectLevel && isCorrectCategory;
        });

        // OKUMA PARÇALARINI FİLTRELEME: Haritada belirtilen zorluk seviyeleri olmalı
        moduleInfo.content.readings = this.allReadings.filter(reading => {
            return map.readings.includes(reading.level);
        });

        this.allModuleContents[moduleKey] = moduleInfo.content;
    },

    displayModuleContent: function(moduleKey, sectionId) {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return;

        // İçerik yüklü değilse yükle
        if (!this.allModuleContents[moduleKey] || !moduleInfo.content) {
            this.loadModuleContent(moduleKey);
        }
        
        const contentContainer = document.getElementById('moduleContentSection');
        contentContainer.innerHTML = '';
        contentContainer.style.textAlign = 'left';

        const currentSection = this.STANDARD_SECTIONS.find(s => s.id === sectionId);
        if (!currentSection) return;

        let contentHtml = `
            <div class="container" style="max-width: 800px;">
                <h2 class="text-center mb-4">${moduleInfo.name} - ${currentSection.name}</h2>
        `;

        const sectionContent = moduleInfo.content[`${currentSection.type}s`];
        
        if (!sectionContent || sectionContent.length === 0) {
            contentHtml += `<div class="alert alert-warning">Bu bölümde görüntülenecek içerik bulunamadı. Lütfen JSON dosyalarınızdaki verileri ve **MODULE_CATEGORY_MAP** haritasını kontrol edin.</div>`;
        } else {
            // İçerik tipine göre gösterim
            if (currentSection.type === 'word') {
                contentHtml += `<div class="row row-cols-1 row-cols-md-2 g-4">`;
                sectionContent.forEach(item => {
                    contentHtml += `
                        <div class="col">
                            <div class="card h-100 word-card" onclick="LearningPath.speakText('${item.word}')">
                                <div class="card-body">
                                    <h5 class="card-title">${item.word}</h5>
                                    <p class="card-text">${item.turkish}</p>
                                    <small class="text-muted">${item.category} (${item.difficulty})</small>
                                </div>
                            </div>
                        </div>
                    `;
                });
                contentHtml += `</div>`;
            } else if (currentSection.type === 'sentence') {
                sectionContent.forEach(item => {
                    contentHtml += `
                        <div class="card mb-3 sentence-card" onclick="LearningPath.speakText('${item.english}')">
                            <div class="card-body">
                                <p class="mb-1"><strong>İngilizce:</strong> ${item.english}</p>
                                <p class="mb-0 text-muted"><strong>Türkçe:</strong> ${item.turkish}</p>
                            </div>
                        </div>
                    `;
                });
            } else if (currentSection.type === 'reading') {
                 sectionContent.forEach((item, index) => {
                    contentHtml += `
                        <div class="card mb-3 reading-card">
                            <div class="card-body">
                                <h5 class="card-title">${item.title}</h5>
                                <p class="card-text">${item.content.substring(0, 150)}...</p>
                                <button class="btn btn-sm btn-primary" onclick="alert('Okuma modülü başlatılacak: ${item.title}')">Okumayı Başlat</button>
                            </div>
                        </div>
                    `;
                });
            }
        }

        // Navigasyon butonları
        contentHtml += `
            <div class="d-flex justify-content-between mt-4">
                <button class="btn btn-outline-secondary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">← Öğrenme Yoluna Dön</button>
                <button class="btn btn-success" onclick="LearningPath.displayModuleQuiz('${moduleKey}')">Bölüm Sınavına Başla →</button>
            </div>
        </div>`;
        
        contentContainer.innerHTML = contentHtml;
        this.showSection('moduleContentSection');
    },

    // =========================================================================
    // 3. MODÜL SINAV MANTIĞI (GÜNCELLEME 2)
    // =========================================================================
    
    // DİNAMİK SORU OLUŞTURMA
    createModuleQuizQuestions: function(moduleKey) {
        // İçerik yüklenmemişse yükle
        if (!this.allModuleContents[moduleKey] || !this.allModules[moduleKey]?.content) {
            this.loadModuleContent(moduleKey);
        }
        const moduleContent = this.allModules[moduleKey].content;
        
        // Yeterli içeriğin varlığını kontrol et
        if (!moduleContent || moduleContent.words.length < 4 || moduleContent.sentences.length < 4) {
             console.error(`[HATA] Modül ${moduleKey} için yeterli içerik (minimum 4 kelime/cümle) bulunamadı.`);
             return [];
        }

        const allWords = moduleContent.words;
        const allSentences = moduleContent.sentences;
        
        let quizQuestions = [];
        
        // Kelime Testi: Kelimenin Türkçe karşılığını bulma (Maks 10 soru)
        const wordCount = Math.min(10, allWords.length);
        const wordQuestions = this.shuffleArray([...allWords])
            .slice(0, wordCount) 
            .map(correctWord => {
                const correctAnswer = correctWord.turkish;
                
                // Yanlış şıkları, diğer kelimelerin Türkçe karşılıklarından seç
                const wrongOptions = this.shuffleArray(allWords
                    .filter(w => w.turkish !== correctAnswer)
                    .map(w => w.turkish)
                ).slice(0, 3);
                
                // Eğer yanlış şık sayısı 3'ten az ise, rastgele metin ekleyerek 3 şıkkı tamamla
                while (wrongOptions.length < 3) {
                    wrongOptions.push(`Seçenek ${Math.floor(Math.random() * 1000)}`);
                }
                
                const options = this.shuffleArray([correctAnswer, ...wrongOptions]);
                
                return {
                    question: `**${correctWord.word}** kelimesinin Türkçe karşılığı nedir?`,
                    options: options,
                    answer: correctAnswer,
                    isModuleQuiz: true // Modül sınavı olduğunu işaretle
                };
            });
        
        quizQuestions.push(...wordQuestions);
        
        // Cümle Testi: Cümlenin Türkçe karşılığını bulma (Maks 10 soru)
        const sentenceCount = Math.min(10, allSentences.length);
        const sentenceQuestions = this.shuffleArray([...allSentences])
            .slice(0, sentenceCount) 
            .map(correctSentence => {
                const correctAnswer = correctSentence.turkish;
                
                // Yanlış şıkları, diğer cümlelerin Türkçe karşılıklarından seç
                const wrongOptions = this.shuffleArray(allSentences
                    .filter(s => s.turkish !== correctAnswer)
                    .map(s => s.turkish)
                ).slice(0, 3);

                while (wrongOptions.length < 3) {
                    wrongOptions.push(`Yanlış Çeviri ${Math.floor(Math.random() * 1000)}`);
                }
                
                const options = this.shuffleArray([correctAnswer, ...wrongOptions]);

                return {
                    question: `"${correctSentence.english}" cümlesinin Türkçe karşılığı nedir?`,
                    options: options,
                    answer: correctAnswer,
                    isModuleQuiz: true
                };
            });
            
        quizQuestions.push(...sentenceQuestions);
        
        return this.shuffleArray(quizQuestions);
    },
    
    // Modül Sınavını Başlat
    displayModuleQuiz: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        const quizTitle = document.getElementById('quizTitle');
        
        this.currentModuleKey = moduleKey;

        // DİNAMİK SORU OLUŞTURMA KULLANILDI
        this.currentQuizQuestions = this.createModuleQuizQuestions(moduleKey);

        if (this.currentQuizQuestions.length === 0) {
             this.showQuizError(`Sınav soruları oluşturulamadı. Lütfen **${moduleKey}** için yeterli içerik (minimum 4 kelime ve cümle) haritada tanımlı olduğundan emin olun.`);
             return;
        }

        // Quiz'i Hazırla ve Göster
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        quizTitle.textContent = `${moduleInfo.name} - Bölüm Sınavı`;
        this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        this.showSection('quizSection');
    },

    // Hata Mesajı Gösterme
    showQuizError: function(message) {
        const quizContainer = document.getElementById('quizQuestions');
        document.getElementById('quizTitle').textContent = "Hata";
        quizContainer.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>
                                  <button class="btn btn-primary mt-3" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">Öğrenme Yoluna Dön</button>`;
        this.showSection('quizSection');
    },

    // =========================================================================
    // 4. GENEL SINAV MANTIĞI (prepareAndDisplayLevelTest - V14.9)
    // Hata Çözümü: JSON formatındaki 'answer' anahtarını desteklemek için güncelleme
    // =========================================================================

    prepareAndDisplayLevelTest: function() {
        const MAX_QUESTIONS = 20;
        
        // 1. Soruların genel olarak yüklenip yüklenmediğini kontrol et
        if (!this.allLevelTestQuestions || this.allLevelTestQuestions.length === 0) {
            this.showQuizError("Seviye tespit testi başlatılamadı. **data/level_test.json** dosyası sunucuda bulunamadı veya boş yüklendi. Lütfen dosya yolunu ve içeriğini kontrol edin.");
            return;
        }

        // 2. Filtreleme ve Formatlama: Geçerli şıkkı, cevabı (correctAnswer VEYA answer) ve sorusu olanları al
        let validQuestions = this.allLevelTestQuestions
            .filter(q => 
                q.options && Array.isArray(q.options) && q.options.length > 1 && // Şıklar array olmalı ve en az 2 şık olmalı
                (q.correctAnswer || q.answer) && // KRİTİK DÜZELTME: Doğru cevap 'correctAnswer' VEYA 'answer' olmalı
                (q.questionText || q.question) // Soru metni 'questionText' VEYA 'question' olmalı
            )
            .map((q, index) => ({
                id: q.id || `lq${index}`, 
                question: q.questionText || q.question, 
                options: q.options,
                answer: q.correctAnswer || q.answer, // Doğru cevabı 'answer' anahtarına atar
                topic: q.topic || 'Genel', 
                level: q.level || 'A1' 
            }));
            
        if (validQuestions.length === 0) {
            this.showQuizError("Yüklenen tüm sorular hatalı formatta olduğu için test başlatılamadı. Lütfen `level_test.json` dosyasındaki tüm soruların `options`, `questionText` ve **`answer`** (veya `correctAnswer`) alanlarının dolu olduğundan emin olun.");
            return;
        }

        // 3. Soruları karıştır ve maksimum soru sayısını al
        this.currentQuizQuestions = this.shuffleArray(validQuestions)
            .slice(0, MAX_QUESTIONS)
            .map(q => {
            // Şıkları da karıştır
            return {
                ...q,
                options: this.shuffleArray([...q.options])
            };
        });

        // Testi Başlatma
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `Seviye Tespit Testi`;
        this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        this.showSection('quizSection');
    },
    showQuizQuestion: function(question) {
        const quizQuestionsContainer = document.getElementById('quizQuestions');
        quizQuestionsContainer.innerHTML = ''; 

        const totalQuestions = this.currentQuizQuestions.length;
        const currentNumber = this.currentQuestionIndex + 1;
        
        let questionHtml = `
            <div class="mb-4">
                <p class="text-muted text-start">Soru ${currentNumber} / ${totalQuestions}</p>
                <h4 class="text-start">${question.question}</h4>
            </div>
            <div id="optionsContainer">
        `;

        // Cevapları localStorage'dan kontrol et (Geri gelme durumunda işaretli kalsın)
        const savedAnswer = this.currentQuizAnswers[this.currentQuestionIndex]?.answer;

        question.options.forEach((optionText, index) => {
            const isSelected = savedAnswer === optionText;
            const selectedClass = isSelected ? 'selected-answer' : '';

            questionHtml += `
                <div class="question-option form-check ${selectedClass}" data-answer="${optionText}" 
                     onclick="LearningPath.processQuizAnswer('${optionText.replace(/'/g, "\\'")}')">
                    <input class="form-check-input" type="radio" name="quizOption" id="option${index}" value="${optionText}" ${isSelected ? 'checked' : ''}>
                    <label class="form-check-label" for="option${index}">${optionText}</label>
                </div>
            `;
        });
        
        questionHtml += `</div>
            <div class="d-flex justify-content-between mt-4">
                <button class="btn btn-outline-secondary" ${this.currentQuestionIndex === 0 ? 'disabled' : ''} 
                    onclick="LearningPath.showPreviousQuestion()">← Geri</button>
                <button id="nextQuestionButton" class="btn btn-primary" ${!savedAnswer ? 'disabled' : ''}
                    onclick="LearningPath.showNextQuestion()">
                    ${currentNumber === totalQuestions ? 'Testi Bitir' : 'İleri →'}
                </button>
            </div>
        `;
        
        quizQuestionsContainer.innerHTML = questionHtml;
    },

    processQuizAnswer: function(selectedAnswer) {
        // Cevabı kaydet
        this.currentQuizAnswers[this.currentQuestionIndex] = {
            question: this.currentQuizQuestions[this.currentQuestionIndex].question,
            correctAnswer: this.currentQuizQuestions[this.currentQuestionIndex].answer,
            answer: selectedAnswer,
            level: this.currentQuizQuestions[this.currentQuestionIndex].level || 'A1' // Seviye testi için seviyeyi kaydet
        };

        // UI'da seçimi güncelle
        document.querySelectorAll('.question-option').forEach(option => {
            option.classList.remove('selected-answer');
            if (option.getAttribute('data-answer') === selectedAnswer) {
                option.classList.add('selected-answer');
                option.querySelector('input').checked = true;
            }
        });
        
        // İleri butonunu etkinleştir
        document.getElementById('nextQuestionButton').disabled = false;
        // Eğer son soruysa metni güncelle
        if (this.currentQuestionIndex === this.currentQuizQuestions.length - 1) {
             document.getElementById('nextQuestionButton').textContent = 'Testi Bitir';
        }
    },

    showNextQuestion: function() {
        if (!this.currentQuizAnswers[this.currentQuestionIndex]) return; // Cevap yoksa ilerleme

        if (this.currentQuestionIndex < this.currentQuizQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        } else {
            // Test Bitti
            this.displayQuizResults(this.currentQuizQuestions.length);
        }
    },
    
    showPreviousQuestion: function() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        }
    },
    
    displayQuizResults: function(totalQuestions) {
        const quizResultsContainer = document.getElementById('quizResults');
        let correctAnswers = 0;
        
        this.currentQuizAnswers.forEach(item => {
            if (item.answer === item.correctAnswer) {
                correctAnswers++;
            }
        });

        const score = Math.round((correctAnswers / totalQuestions) * 100);
        const isPassed = score >= this.PASS_SCORE;
        
        let resultHtml = `<h2 class="text-center mb-4">Sınav Sonuçları</h2>`;

        // Modül sınavı mı yoksa seviye tespit/atlama sınavı mı olduğunu belirle
        const isModuleQuiz = this.currentModuleKey && this.allModules[this.currentModuleKey];

        if (isModuleQuiz) {
            // MODÜL SINAVI SONUÇLARI
            const moduleKey = this.currentModuleKey;
            const moduleInfo = this.allModules[moduleKey];
            
            if (isPassed) {
                this.markModuleCompleted(moduleKey);
                resultHtml += `<div class="alert alert-success text-center">Tebrikler! **${moduleInfo.name}** sınavını başarıyla (%${score}) geçtiniz.</div>`;
            } else {
                resultHtml += `<div class="alert alert-danger text-center">Tekrar Deneyin. **${moduleInfo.name}** sınavından yeterli puanı (%${this.PASS_SCORE}) alamadınız. Puanınız: %${score}.</div>`;
            }
            
            resultHtml += `<p class="text-center">Doğru Sayısı: ${correctAnswers} / ${totalQuestions}</p>`;
            resultHtml += `<div class="d-flex justify-content-center mt-4">
                <button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">Öğrenme Yoluna Dön</button>
                <button class="btn btn-warning ms-3" onclick="LearningPath.displayModuleQuiz('${moduleKey}')">Tekrar Sınava Gir</button>
            </div>`;
            
        } else {
             // SEVİYE TESPİT VEYA SEVİYE ATLATMA SINAVI
            const determinedLevel = this.calculateLevel(this.currentQuizAnswers);
            const userLevelBeforeTest = localStorage.getItem('userLevel');
            const nextLevel = this.getNextLevel(userLevelBeforeTest);

            // Testin türünü belirle:
            if (userLevelBeforeTest && this.currentQuizQuestions.every(q => q.level.toUpperCase() === nextLevel.toUpperCase())) {
                 // SEVİYE ATLATMA SINAVI
                 const targetLevel = nextLevel;
                 
                 if (isPassed) {
                     this.markLevelUp(targetLevel);
                     resultHtml += `<div class="alert alert-success text-center">Tebrikler! ${userLevelBeforeTest} seviyesini tamamladınız ve **${targetLevel}** seviyesine geçmeye hak kazandınız!</div>`;
                 } else {
                     resultHtml += `<div class="alert alert-warning text-center">Yeterli puanı (%${this.PASS_SCORE}) alamadınız. Mevcut seviyenizdeki modülleri tekrar gözden geçirin. Puanınız: %${score}.</div>`;
                 }
                 resultHtml += `<div class="d-flex justify-content-center mt-4">
                     <button class="btn btn-primary" onclick="LearningPath.displayLearningPath(this.getCurrentUserLevel() || 'A1')">Öğrenme Yoluna Dön</button>
                 </div>`;
                 
            } else {
                 // SEVİYE TESPİT SINAVI
                this.saveUserLevel(determinedLevel);
                resultHtml += `<div class="alert alert-info text-center">Seviye Tespitiniz Yapıldı: **${determinedLevel}**</div>
                               <p class="text-center">Artık öğrenme yolunuza başlayabilirsiniz.</p>`;
                resultHtml += `<div class="d-flex justify-content-center mt-4">
                    <button class="btn btn-primary" onclick="LearningPath.displayLearningPath('${determinedLevel}')">Öğrenme Yoluna Başla</button>
                </div>`;
            }
        }

        quizResultsContainer.innerHTML = resultHtml;
        this.currentModuleKey = null; // Quiz durumunu sıfırla
        this.showSection('quizResultsSection');
    },

    // =========================================================================
    // 5. SEVİYE ATLATMA VE İLERLEME MANTIĞI
    // =========================================================================
    
    // Seviye belirleme testini toplam puana göre hesaplar (V15.0)
    calculateLevel: function(answers, score) {
        // Toplam puan aralıklarına göre seviye atama
        if (score >= 90) return 'C1';
        if (score >= 80) return 'B2';
        if (score >= 60) return 'B1';
        if (score >= 40) return 'A2';
        return 'A1';
    },

    saveUserLevel: function(level) {
        localStorage.setItem('userLevel', level.toUpperCase());
    },
    
    // ... (getNextLevel, markLevelUp, isModuleCompleted, markModuleCompleted, checkAllModulesCompleted fonksiyonları aynı kalır)

    // Modül ve Seviye Testi Sonuçlarını Göster (V15.0)
    displayQuizResults: function(totalQuestions) {
        const quizResultsContainer = document.getElementById('quizResults');
        let correctAnswers = 0;
        
        this.currentQuizAnswers.forEach(item => {
            if (item.answer === item.correctAnswer) {
                correctAnswers++;
            }
        });

        const score = Math.round((correctAnswers / totalQuestions) * 100);
        const isPassed = score >= this.PASS_SCORE;
        
        let resultHtml = `<h2 class="text-center mb-4">Sınav Sonuçları</h2>`;
        
        // GENEL SONUÇ BİLGİSİ EKLENDİ
        resultHtml += `<p class="text-center h4 text-success">Puanınız: **%${score}**</p>`;
        resultHtml += `<p class="text-center h5">Doğru: ${correctAnswers} / Toplam: ${totalQuestions}</p><hr>`;


        // Modül sınavı mı yoksa seviye tespit/atlama sınavı mı olduğunu belirle
        const isModuleQuiz = this.currentModuleKey && this.allModules[this.currentModuleKey];

        if (isModuleQuiz) {
            // MODÜL SINAVI SONUÇLARI
            const moduleKey = this.currentModuleKey;
            const moduleInfo = this.allModules[moduleKey];
            
            if (isPassed) {
                this.markModuleCompleted(moduleKey);
                resultHtml += `<div class="alert alert-success text-center">Tebrikler! **${moduleInfo.name}** sınavını başarıyla geçtiniz.</div>`;
            } else {
                resultHtml += `<div class="alert alert-danger text-center">Tekrar Deneyin. **${moduleInfo.name}** sınavından yeterli puanı (%${this.PASS_SCORE}) alamadınız.</div>`;
            }
            
            resultHtml += `<div class="d-flex justify-content-center mt-4">
                <button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">Öğrenme Yoluna Dön</button>
                <button class="btn btn-warning ms-3" onclick="LearningPath.displayModuleQuiz('${moduleKey}')">Tekrar Sınava Gir</button>
            </div>`;
            
        } else {
             // SEVİYE TESPİT VEYA SEVİYE ATLATMA SINAVI
            const userLevelBeforeTest = localStorage.getItem('userLevel');
            const nextLevel = this.getNextLevel(userLevelBeforeTest);

            // Testin türünü belirle:
            // Sınav sadece bir sonraki seviyenin sorularını içeriyorsa (level up exam)
            if (userLevelBeforeTest && this.currentQuizQuestions.every(q => q.level.toUpperCase() === nextLevel?.toUpperCase())) {
                 // SEVİYE ATLATMA SINAVI
                 const targetLevel = nextLevel;
                 
                 if (isPassed) {
                     this.markLevelUp(targetLevel);
                     resultHtml += `<div class="alert alert-success text-center">Tebrikler! ${userLevelBeforeTest} seviyesini tamamladınız ve **${targetLevel}** seviyesine geçmeye hak kazandınız!</div>`;
                 } else {
                     resultHtml += `<div class="alert alert-warning text-center">Yeterli puanı (%${this.PASS_SCORE}) alamadınız. Mevcut seviyenizdeki modülleri tekrar gözden geçirin.</div>`;
                 }
                 resultHtml += `<div class="d-flex justify-content-center mt-4">
                     <button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel() || 'A1')">Öğrenme Yoluna Dön</button>
                 </div>`;
                 
            } else {
                 // SEVİYE TESPİT SINAVI
                const determinedLevel = this.calculateLevel(this.currentQuizAnswers, score); // YENİ PUAN BAZLI HESAPLAMA
                this.saveUserLevel(determinedLevel);
                resultHtml += `<div class="alert alert-info text-center">Seviye Tespitiniz Yapıldı: **${determinedLevel}**</div>
                               <p class="text-center">Artık öğrenme yolunuza başlayabilirsiniz.</p>`;
                resultHtml += `<div class="d-flex justify-content-center mt-4">
                    <button class="btn btn-primary" onclick="LearningPath.displayLearningPath('${determinedLevel}')">Öğrenme Yoluna Başla</button>
                </div>`;
            }
        }

        quizResultsContainer.innerHTML = resultHtml;
        this.currentModuleKey = null; // Quiz durumunu sıfırla
        this.showSection('quizResultsSection');
    },

    // =========================================================================
    // 6. ARAYÜZ VE NAVİGASYON
    // =========================================================================

    displayLearningPath: function(level) {
        const pathContainer = document.getElementById('learningPathSection');
        pathContainer.innerHTML = '';
        const levelName = level.toUpperCase();
        
        let pathHtml = `
            <div class="container" style="max-width: 900px;">
                <h1 class="text-center mb-5">Öğrenme Yolum: ${levelName} Seviyesi</h1>
                <div class="row g-4">
        `;

        // Modülleri seviyeye göre filtrele ve sırala
        const levelModules = Object.keys(this.allModules).filter(key => 
            this.allModules[key].level.toUpperCase() === levelName
        
        if (levelModules.length === 0) {
             pathHtml += `<div class="alert alert-danger">Bu seviyeye ait tanımlanmış modül bulunmamaktadır. Lütfen module_content.json dosyasını kontrol edin.</div>`;
        } else {
            levelModules.forEach((key, index) => {
                const moduleInfo = this.allModules[key];
                const isCompleted = this.isModuleCompleted(key);
                const statusClass = isCompleted ? 'completed' : 'in-progress';
                const statusText = isCompleted ? 'Tamamlandı' : 'Başlanmadı/Devam Ediyor';
                
                // Modül içeriği yüklü değilse yükle (Modül içeriğinin filtrelenmesini sağlar)
                if (!this.allModuleContents[key]) {
                    this.loadModuleContent(key);
                }

                pathHtml += `
                    <div class="col-md-4">
                        <div class="card module-card ${statusClass}">
                            <div class="card-body">
                                <i class="fas fa-book-open"></i>
                                <h5 class="card-title">${moduleInfo.name}</h5>
                                <p class="card-text">${moduleInfo.description || 'Açıklama mevcut değil.'}</p>
                                <span class="badge bg-${isCompleted ? 'success' : 'warning'}">${statusText}</span>
                                <button class="btn btn-sm btn-primary mt-3 w-100" 
                                    onclick="LearningPath.displayModuleContent('${key}', 'word')">
                                    Öğrenmeye Başla
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        pathHtml += `</div>`;
        
        // Seviye Atlama Sınavı Butonu
        const isLevelCompleted = this.checkAllModulesCompleted(levelName);
        const nextLevel = this.getNextLevel(levelName);
        
        if (isLevelCompleted && nextLevel) {
            pathHtml += `
                <div class="text-center mt-5">
                    <button class="btn btn-lg btn-success" 
                        onclick="LearningPath.displayLevelUpExam('${levelName}')">
                        ${levelName} Seviyesini Bitir: ${nextLevel} Seviye Sınavına Başla
                    </button>
                </div>
            `;
        } else if (isLevelCompleted) {
             pathHtml += `<div class="alert alert-info text-center mt-5">Tebrikler! ${levelName} seviyesindeki tüm modülleri tamamladınız. Bir üst seviye için sınav bulunmamaktadır.</div>`;
        } else {
             pathHtml += `<div class="alert alert-info text-center mt-5">Seviye atlama sınavına girmek için tüm modülleri tamamlamalısınız.</div>`;
        }
        
        pathHtml += `</div>`;

        pathContainer.innerHTML = pathHtml;
        this.showSection('learningPathSection');
    },
    
    // =========================================================================
    // 7. SIFIRLAMA FONKSİYONLARI (V14.4'ten Alındı)
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
    },
    // EKSİK FONKSİYONLAR (V15.2 Düzeltmesi)

// init: Sayfa yüklendiğinde veri yükle ve seviye kontrol et
init: function() {
    this.loadAllData().then(() => {
        const userLevel = this.getCurrentUserLevel();
        if (userLevel) {
            this.displayLearningPath(userLevel);
            document.getElementById('navToPathButton').classList.remove('d-none');
        } else {
            this.showSection('introSection'); // Başlangıç ekranı
        }
    }).catch(error => {
        console.error('Init Hatası:', error);
        alert('Veri yüklenemedi. Lütfen internetinizi kontrol edin.');
    });
},

// getCurrentUserLevel: localStorage'dan al
getCurrentUserLevel: function() {
    return localStorage.getItem('userLevel') || 'A1';
},

// getNextLevel: Seviye ilerletme (A1 → A2 → B1 vb.)
getNextLevel: function(currentLevel) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const index = levels.indexOf(currentLevel.toUpperCase());
    return index >= 0 && index < levels.length - 1 ? levels[index + 1] : null;
},

// markLevelUp: Seviye yükselt
markLevelUp: function(newLevel) {
    this.saveUserLevel(newLevel);
    localStorage.removeItem('learningModules'); // Eski modülleri sıfırla
},

// isModuleCompleted: Tamamlandı mı?
isModuleCompleted: function(moduleKey) {
    const completedModules = JSON.parse(localStorage.getItem('learningModules') || '{}');
    return !!completedModules[moduleKey];
},

// markModuleCompleted: Tamamla işaretle
markModuleCompleted: function(moduleKey) {
    const completedModules = JSON.parse(localStorage.getItem('learningModules') || '{}');
    completedModules[moduleKey] = true;
    localStorage.setItem('learningModules', JSON.stringify(completedModules));
},

// checkAllModulesCompleted: Seviye tamamlandı mı?
checkAllModulesCompleted: function(level) {
    const levelModules = Object.keys(this.allModules).filter(key => this.allModules[key].level.toUpperCase() === level.toUpperCase());
    return levelModules.every(key => this.isModuleCompleted(key));
},

// shuffleArray: Rastgele karıştır
shuffleArray: function(array) {
    return array.sort(() => Math.random() - 0.5);
},

// showSection: Bölüm göster/gizle
showSection: function(sectionId) {
    document.querySelectorAll('.module-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'flex';
        targetSection.classList.add('active');
    }
},

// speakText: Sesli okuma (Text-to-Speech)
speakText: function(text) {
    if (this.synth.speaking) this.synth.cancel();
    this.speechUtterance = new SpeechSynthesisUtterance(text);
    this.speechUtterance.lang = 'en-US';
    this.synth.speak(this.speechUtterance);
}
};

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; 
    LearningPath.init();
});









