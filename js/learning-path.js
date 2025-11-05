const LearningPath = {
    TEST_FILE_PATH: 'data/level_test.json', 
    MODULE_CONTENT_FILE_PATH: 'data/module_content.json.json', 
    PASS_SCORE: 90, // Başarı eşiği: %90

    allModules: {}, 
    allModuleContents: {}, 
    allWords: [],
    allSentences: [],
    allReadings: [],
    allLevelTestQuestions: [],
    shuffledTestQuestions: [],
    
    init: function() {
        this.loadAllData().then(() => {
            console.log("Tüm veriler yüklendi.");
            
            const userLevel = localStorage.getItem('userLevel');
            
            // Eğer kaydedilmiş bir seviye varsa, doğrudan öğrenme yolunu göster
            if (userLevel) {
                this.displayLearningPath(userLevel);
            } 
            else {
                this.showSection('introSection');
            }
            
            const navButton = document.getElementById('navToPathButton');
            if (navButton) {
                if (userLevel) {
                    navButton.classList.remove('d-none');
                } else {
                    navButton.classList.add('d-none');
                }
            }

        }).catch(error => {
            console.error("Veri yüklenirken kritik hata oluştu:", error);
            this.showSection('introSection');
        });

        const startTestButton = document.getElementById('startTestButton');
        if (startTestButton) {
             startTestButton.onclick = () => {
                localStorage.removeItem('levelTestAnswers'); 
                this.showSection('levelTestSection');
                this.prepareAndDisplayLevelTest();
             };
        }
    },

    loadAllData: async function() {
        
        const fetchData = async (path) => {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP hatası! Durum: ${res.status} (${path})`);
                return res.json();
            } catch (error) {
                console.error(`Kritik JSON Yükleme Hatası: ${path}`, error);
                // Hata durumunda boş bir nesne/dizi döndür, uygulamanın çökmesini engelle
                if (path.includes('json.json')) return {}; 
                return []; 
            }
        };

        // Bu kısımda tüm veri dosyaları Promise.all ile bekleniyor
        const [moduleData, moduleContentData, testData, wordsData, sentencesData, readingsData] = await Promise.all([
            fetchData('data/learning_modules.json'), 
            fetchData(this.MODULE_CONTENT_FILE_PATH), 
            fetchData('data/level_test.json'), // path düzeltildi, TEST_FILE_PATH kullanıldı
            fetchData('data/words.json'), 
            fetchData('data/sentences.json'), 
            fetchData('data/reading_stories.json')
        ]);

        this.allModules = moduleData || {};
        this.allModuleContents = moduleContentData || {}; 
        
        let questionsArray = [];
        if (Array.isArray(testData)) {
            questionsArray = testData;
        } else if (typeof testData === 'object' && testData !== null && Array.isArray(testData.questions)) {
            questionsArray = testData.questions;
        }
        
        this.allLevelTestQuestions = questionsArray; 

        this.allWords = Array.isArray(wordsData) ? wordsData : []; 
        this.allSentences = Array.isArray(sentencesData) ? sentencesData : []; 
        this.allReadings = Array.isArray(readingsData) ? readingsData : []; 
    },

    showSection: function(sectionId) {
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
    
    // Test fonksiyonları aynı kaldı...

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
                    <p>Lütfen <code>level_test.json</code> dosyasının hem var olduğunu hem de içinde geçerli bir soru dizisi bulunduğunu kontrol edin.</p>
                </div>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">Tekrar Dene</button>
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
                        <button class="btn btn-primary" id="nextButton">${currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki'}</button>
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

        const levelMapping = [
            { threshold: 15, level: 'C1' }, 
            { threshold: 10, level: 'B1' }, 
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
        
        // Yeni Kural: Seviye Testi Başarı Eşiği %90 (20 soruda 18)
        const isPassedInitialTest = (score / maxScore) * 100 >= this.PASS_SCORE;
        
        let resultMessage = '';
        if (isPassedInitialTest) {
            resultMessage = `Tebrikler! ${level} seviyesindeki öğrenme yolunuz ${this.PASS_SCORE}% başarı ile belirlendi.`;
        } else {
            resultMessage = `Seviyeniz **${level}** olarak belirlendi. Modüllere başlayabilirsiniz. Modülleri tamamlayıp ${this.PASS_SCORE}% başarı ile seviye sonu sınavını geçmeniz gerekecek.`;
        }
        
        testEl.innerHTML = `
            <div class="result-card">
                <h3 class="text-success mb-4">Test Tamamlandı!</h3>
                <p class="h5">Toplam doğru sayısı: ${score} / ${maxScore}</p>
                <p class="h4 level-result">Seviyeniz: <span>${level}</span></p>
                
                <p class="mt-4">${resultMessage}</p>
                
                <button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayLearningPath('${level}')">Öğrenme Yolunu Gör</button>
            </div>
        `;
        const navButton = document.getElementById('navToPathButton');
        if (navButton) navButton.classList.remove('d-none');
    },

    // Modül kartlarını görüntüler
    displayLearningPath: function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        
        let modulesList = [];
        let levelTitle = `${level} Seviyesi Öğrenme Yolu`;

        // Modül listesini HER ZAMAN "A1" seviyesinden al.
        const baseLevelCode = 'A1'; 
        const baseLevelData = this.allModules[baseLevelCode];

        if (baseLevelData && Array.isArray(baseLevelData.modules)) {
            modulesList = baseLevelData.modules;
            levelTitle = `${baseLevelData.title} (${level} Seviyesi için)`;
        } else {
             pathEl.innerHTML = `
                <h2>Hata: Öğrenme modülleri yüklenemedi.</h2>
                <p>Lütfen <code>learning_modules.json</code> dosyasında **"${baseLevelCode}"** anahtarının altında bir **"modules"** dizisi olduğundan emin olun.</p>
                <button class="btn btn-primary mt-3" onclick="LearningPath.resetProgress()">Sıfırla ve Tekrar Dene</button>
            `;
            return;
        }
        
        // Modülleri Local Storage'dan yükle veya başlangıç durumunu ayarla
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        if (!modules || modules.length === 0) {
             modules = modulesList.map(m => ({
                 ...m,
                 progress: 0,
                 status: 'Başlanmadı',
                 lastScore: 0,
                 lastDuration: 0
             }));
             localStorage.setItem('learningModules', JSON.stringify(modules));
        }
        
        // Modülleri görüntüle
        const moduleCards = modules.map(module => `
            <div class="module-card ${module.status.toLowerCase().replace(/ /g, '-')}" onclick="LearningPath.displayModuleContent('${module.id}', '${level}')">
                <i class="fas ${this.getIconForTopic(module.topic)}"></i>
                <h5>${module.name}</h5>
                <p class="module-topic">${module.topic} Konusu</p>
                
                <div class="module-status badge bg-secondary">${module.status}</div>
                
                <div class="progress">
                    <div class="progress-bar" style="width: ${module.progress}%;" role="progressbar">${module.progress}%</div>
                </div>
                <div class="module-stats mt-2">
                    <small>Skor: ${module.lastScore}%</small>
                    <small>Süre: ${module.lastDuration} dk</small>
                </div>
            </div>
        `).join('');

        pathEl.innerHTML = `
            <div class="level-header" style="max-width: 900px; width: 100%;">
                <h2>${levelTitle}</h2>
                <p class="lead">Seviyeniz **${level}** olarak belirlendi. Modüller **${level}** seviyesine uygun çalışmalar içerecektir.</p>
            </div>
            
            <h4 class="topic-header" style="max-width: 900px; width: 100%; text-align: left; margin-top: 30px;">Öğrenme Modülleri (${modules.length} Adet)</h4>
            <div class="module-grid" style="max-width: 900px; width: 100%;">
                ${moduleCards}
            </div>

             <button class="btn btn-sm btn-outline-danger mt-4" onclick="LearningPath.resetProgress()">Seviyeyi Sıfırla</button>
        `;
        
        localStorage.setItem('userLevel', level);
    },
    
    getIconForTopic: function(topic) {
        const icons = {
            'Gramer': 'fa-graduation-cap',
            'Kelime': 'fa-spell-check',
            'Konuşma': 'fa-comments',
            'Okuma': 'fa-book-open',
            'Structure': 'fa-sitemap' 
        };
        return icons[topic] || 'fa-cubes';
    },
    
    // Modül içeriğini görüntüler
    displayModuleContent: function(moduleId, userLevel) {
        this.showSection('moduleContentSection');
        const contentEl = document.getElementById('moduleContentSection');
        
        // 1. Modülün temel bilgilerini A1 listesinden bul
        const baseLevelCode = 'A1';
        const moduleListSource = (this.allModules[baseLevelCode] && Array.isArray(this.allModules[baseLevelCode].modules)) 
            ? this.allModules[baseLevelCode].modules 
            : [];

        const baseModule = moduleListSource.find(m => m.id === moduleId);
        
        if (!baseModule) {
             contentEl.innerHTML = `<h2>Hata: Modül ${moduleId} temel bilgileri (A1 listesinde) bulunamadı.</h2>`;
             return;
        }
        
        // 2. Modülün statik içeriğini (ders notlarını) 'module_content.json.json' dosyasından al
        const staticContentData = this.allModuleContents[moduleId];
        
        if (!staticContentData || !Array.isArray(staticContentData.content)) {
            contentEl.innerHTML = `<h2>Hata: Modül ${moduleId} statik içeriği (ders notları) <code>${this.MODULE_CONTENT_FILE_PATH}</code> dosyasında bulunamadı veya formatı bozuk.</h2>`;
            baseModule.content = []; 
        } else {
             // Statik içeriği baseModule'a ekleyelim
             baseModule.content = staticContentData.content;
        }

        // Kullanıcının gerçek seviyesini (B1, C1 vb.) kullanarak içeriği zenginleştir
        const enrichedContent = this.enrichModuleContent(moduleId, baseModule, userLevel);
        
        contentEl.style.alignItems = 'flex-start'; 
        contentEl.style.textAlign = 'left';

        let contentHtml = `<div style="max-width: 800px; width: 100%;">`;
        contentHtml += `<button class="btn btn-sm btn-outline-primary mb-4" onclick="LearningPath.displayLearningPath('${userLevel}')">← Modüllere Geri Dön</button>`;
        contentHtml += `<h3 class="mb-4">${baseModule.name}</h3>`;
        
        enrichedContent.forEach(item => {
            switch(item.type) {
                case 'heading':
                    contentHtml += `<h4 class="mt-4">${item.text}</h4>`;
                    break;
                case 'paragraph':
                    contentHtml += `<p>${item.text}</p>`;
                    break;
                case 'code_block':
                    contentHtml += `<pre class="code-block" style="background: #eee; padding: 10px; border-radius: 5px;">${item.text}</pre>`;
                    break;
                case 'example':
                    contentHtml += `<div class="example-box" style="border-left: 3px solid #007bff; padding-left: 10px; margin: 15px 0; background: #f0f8ff;">${item.text.replace(/\n/g, '<br>')}</div>`;
                    break;
                case 'words':
                    contentHtml += `<div class="word-list-section" style="columns: 2;">${item.html}</div>`;
                    break;
                case 'sentences':
                    contentHtml += `<div class="sentence-list-section">${item.html}</div>`;
                    break;
                case 'reading_text':
                    contentHtml += `<div class="reading-text-box" style="border: 1px dashed #ccc; padding: 15px; margin: 15px 0;">${item.text.replace(/\n/g, '<p>')}</div>`;
                    break;
            }
        });
        
        const quizQuestions = enrichedContent.filter(item => item.type === 'quiz');
        
        contentHtml += `
            <div class="mt-5 text-center">
                <hr>
                <p class="lead">${quizQuestions.length} adet alıştırma sorusu seni bekliyor.</p>
                <button class="btn btn-success btn-lg" onclick="LearningPath.startQuiz('${moduleId}')">
                    <i class="fas fa-play me-2"></i> ${baseModule.name} Testini Başlat (${quizQuestions.length} Soru)
                </button>
            </div>
            </div>
        `;

        contentEl.innerHTML = contentHtml;
    },

    // DÜZELTİLDİ: Dinamik içerik oluşturucu
    enrichModuleContent: function(moduleId, baseModule, userLevel) {
        
        const moduleLevel = userLevel.toUpperCase(); 
        const baseModuleTopic = baseModule.topic ? baseModule.topic.toLowerCase() : ''; 
        
        const staticContent = Array.isArray(baseModule.content) ? baseModule.content : [];
        let enrichedContent = [...staticContent]; 
        let quizIndexStart = enrichedContent.filter(item => item.type === 'quiz').length;
        
        // YENİ/DÜZELTİLMİŞ: Seviye-Zorluk Eşleşmesi
        const difficultyMapping = {
            'A1': ['EASY', 'BEGINNER'],
            'A2': ['EASY', 'MEDIUM', 'BEGINNER', 'INTERMEDIATE'],
            'B1': ['MEDIUM', 'INTERMEDIATE'],
            'B2': ['MEDIUM', 'HARD', 'INTERMEDIATE', 'ADVANCED'],
            'C1': ['HARD', 'ADVANCED'],
            'C2': ['HARD', 'ADVANCED']
        };
        const allowedDifficulties = difficultyMapping[moduleLevel] || ['EASY'];


        // --- 1. Kelime Alıştırmaları (words.json) ---
        const moduleWords = this.allWords.filter(w => {
            const isLevelMatch = allowedDifficulties.includes(w.difficulty.toUpperCase());
            
            if (!isLevelMatch) return false;

            // KRİTİK DÜZELTME: Hem Türkçe "gramer" hem de İngilizce "grammar" kontrolü eklendi.
            if (baseModuleTopic === 'grammar' || baseModuleTopic === 'gramer' || baseModuleTopic === 'structure' || !baseModuleTopic) {
                return true; 
            }
            
            const wordCategory = w.category.toLowerCase();
            return wordCategory.includes(baseModuleTopic) || baseModuleTopic.includes(wordCategory);

        }).sort(() => 0.5 - Math.random()).slice(0, 15); 

        if (moduleWords.length > 0) {
             const wordsHtml = moduleWords.map(w => 
                `<div class="word-item"><strong>${w.word}</strong> - ${w.turkish} (${w.category}) <small class="text-muted">| Seviye: ${w.difficulty}</small></div>`
            ).join('');
            
            enrichedContent.push({type: 'heading', text: '1. Kelime Alıştırması'});
            enrichedContent.push({type: 'paragraph', text: `Bu modül için **${moduleWords.length}** adet ${moduleLevel} seviyesine uygun kelime seçildi.`});
            enrichedContent.push({type: 'words', html: wordsHtml});

            for (let i = 0; i < Math.min(5, moduleWords.length); i++) {
                const correctWord = moduleWords[i];
                const options = [correctWord.turkish];
                
                // Aynı seviye ve farklı kelime karşılıklarını seçenek olarak kullan
                const wrongOptions = this.allWords
                    .filter(w => w.turkish !== correctWord.turkish && allowedDifficulties.includes(w.difficulty.toUpperCase()))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)
                    .map(w => w.turkish);
                    
                options.push(...wrongOptions);
                    
                quizIndexStart++;
                enrichedContent.push({
                    type: 'quiz', 
                    question: `(Kelime Sorusu ${quizIndexStart}): '${correctWord.word}' kelimesinin Türkçe karşılığı nedir?`, 
                    options: options.sort(() => 0.5 - Math.random()), 
                    answer: correctWord.turkish,
                    topic: `${baseModule.name} - Kelime Bilgisi`
                });
            }
        }
        
        // --- 2. Cümle Alıştırmaları (sentences.json) ---
        const moduleSentences = this.allSentences.filter(s => {
            const isLevelMatch = s.difficulty && allowedDifficulties.includes(s.difficulty.toUpperCase());
            
            if (!isLevelMatch) return false;
            
            // KRİTİK DÜZELTME: Hem Türkçe "gramer" hem de İngilizce "grammar" kontrolü eklendi.
            if (baseModuleTopic === 'grammar' || baseModuleTopic === 'gramer' || baseModuleTopic === 'structure' || !baseModuleTopic) {
                return true; 
            }
            
            const sentenceCategory = s.category.toLowerCase();
            return sentenceCategory.includes(baseModuleTopic) || baseModuleTopic.includes(sentenceCategory);
        }).sort(() => 0.5 - Math.random()).slice(0, 10); 

        if (moduleSentences.length > 0) {
            const sentencesHtml = moduleSentences.map(s =>
                `<div class="sentence-item"><strong>${s.english}</strong> (${s.turkish})</div>`
            ).join('');

            enrichedContent.push({type: 'heading', text: '2. Cümle Yapısı Alıştırması'});
            enrichedContent.push({type: 'paragraph', text: `Konuyla alakalı **${moduleSentences.length}** adet ${moduleLevel} seviyesine uygun örnek cümle.`});
            enrichedContent.push({type: 'sentences', html: sentencesHtml});

            for (let i = 0; i < Math.min(3, moduleSentences.length); i++) {
                const sentence = moduleSentences[i];
                if (sentence.english.split(' ').length < 3) continue; 
                
                const words = sentence.english.split(' ');
                // Cümlenin ortasından bir kelime seç
                const missingWordIndex = Math.floor(Math.random() * (words.length - 2)) + 1; 
                const missingWord = words[missingWordIndex].replace(/[.,?!]/g, '');
                
                const questionText = words.map((w, index) => index === missingWordIndex ? '___' : w).join(' ');
                
                const options = [missingWord];
                const wrongOptions = this.allWords
                    .filter(w => !w.word.toLowerCase().includes(missingWord.toLowerCase()) && allowedDifficulties.includes(w.difficulty.toUpperCase()))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)
                    .map(w => w.word);
                    
                options.push(...wrongOptions);

                quizIndexStart++;
                enrichedContent.push({
                    type: 'quiz', 
                    question: `(Cümle Sorusu ${quizIndexStart}): Cümledeki boşluğu doldurun: "${questionText}"`, 
                    options: options.sort(() => 0.5 - Math.random()), 
                    answer: missingWord,
                    topic: `${baseModule.name} - Cümle Yapısı`
                });
            }
        }

        // --- 3. Okuma Parçası (reading_stories.json) ---
        // Okuma seviyesi için 'beginner', 'intermediate', 'advanced' eşleşmesi
        const readingLevelCode = allowedDifficulties.map(d => d.toLowerCase()).find(d => ['beginner', 'intermediate', 'advanced'].includes(d)) || 'beginner';
        
        // Okuma parçasını bulurken hem seviyeyi hem de konuyu eşleştir
        const moduleReading = this.allReadings.find(r => 
            r.level.toLowerCase().includes(readingLevelCode) && 
            (baseModuleTopic === 'grammar' || baseModuleTopic === 'gramer' || baseModuleTopic === 'structure' || !baseModuleTopic || r.category.toLowerCase().includes(baseModuleTopic) || baseModuleTopic.includes(r.category.toLowerCase()))
        );

        if (moduleReading) {
            enrichedContent.push({type: 'heading', text: `3. Okuma: ${moduleReading.title}`});
            enrichedContent.push({type: 'paragraph', text: `**Seviye:** ${moduleReading.level} - **Konu:** ${moduleReading.category}. Parçayı okuyun ve aşağıdaki ${moduleReading.questions.length} soruyu cevaplayın.`});
            enrichedContent.push({type: 'reading_text', text: moduleReading.content});
            
            moduleReading.questions.forEach((q) => {
                quizIndexStart++;
                 enrichedContent.push({
                    type: 'quiz', 
                    question: `(Okuma Sorusu ${quizIndexStart}): ${q.question}`, 
                    options: q.options, 
                    // reading_stories.json'da correctanswer index olarak verildiği için stringe çeviriyoruz
                    answer: q.options[q.correctAnswer],
                    topic: `${moduleReading.title} - Okuma Anlama`
                });
            });
        }
        
        return enrichedContent;
    },
    
    // Modül Quizini Başlatır
    startQuiz: function(moduleId) {
        this.showSection('moduleQuizSection');
        const quizEl = document.getElementById('moduleQuizSection');
        
        const userLevel = localStorage.getItem('userLevel'); 

        const baseLevelCode = 'A1';
        const moduleListSource = (this.allModules[baseLevelCode] && Array.isArray(this.allModules[baseLevelCode].modules)) 
            ? this.allModules[baseLevelCode].modules 
            : [];

        let baseModule = moduleListSource.find(m => m.id === moduleId);
        
        if (!baseModule) {
             quizEl.innerHTML = `<h2>Hata: Modül ${moduleId} temel bilgileri (A1 listesinde) bulunamadı.</h2>`;
             return;
        }

        const staticContentData = this.allModuleContents[moduleId];
        if (staticContentData && Array.isArray(staticContentData.content)) {
             baseModule.content = staticContentData.content;
        } else {
             baseModule.content = [];
        }

        const enrichedContent = this.enrichModuleContent(moduleId, baseModule, userLevel);
        const quizQuestions = enrichedContent.filter(item => item.type === 'quiz');
        
        // Eğer dinamik içerik yüklenmesine rağmen soru sayısı hala 0 ise
        if (quizQuestions.length === 0) {
            quizEl.style.alignItems = 'center'; 
            quizEl.style.textAlign = 'center';
            quizEl.innerHTML = `
                <div class="result-card">
                    <h3 class="text-warning mb-4">Uyarı</h3>
                    <p class="h5">${baseModule.name} modülü için, mevcut seviyeniz (**${userLevel}**) ve konusu (**${baseModule.topic}**) ile eşleşen **Kelime, Cümle veya Okuma** alıştırması bulunamadı.</p>
                    <p>Lütfen modül içeriğini tekrar gözden geçirin veya veri dosyalarınızdaki seviye/konu etiketlerini kontrol edin.</p>
                    <button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">
                        Modül İçeriğine Geri Dön
                    </button>
                    <button class="btn btn-lg btn-outline-primary mt-3" onclick="LearningPath.displayLearningPath('${userLevel}')">
                        Öğrenme Yoluna Dön
                    </button>
                </div>
            `;
            return;
        }


        let currentQuestionIndex = 0;
        let userAnswers = {}; 

        quizEl.style.alignItems = 'flex-start'; 
        quizEl.style.textAlign = 'left';

        const renderQuizQuestion = () => {
            if (currentQuestionIndex >= quizQuestions.length) {
                quizEl.style.alignItems = 'center'; 
                quizEl.style.textAlign = 'center';

                this.calculateModuleScore(moduleId, quizQuestions, userAnswers);
                return;
            }

            const q = quizQuestions[currentQuestionIndex];
            const progress = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);

            let optionsHtml = '';
            q.options.forEach((option, index) => {
                const selectedClass = userAnswers[currentQuestionIndex] === option ? 'selected-answer' : '';
                optionsHtml += `
                    <div class="quiz-option-item ${selectedClass}" 
                         data-option="${option}" 
                         data-q-index="${currentQuestionIndex}">
                        ${option}
                    </div>
                `;
            });

            const quizContent = `
                <div style="max-width: 800px; width: 100%;">
                    <h3 class="mb-4">${baseModule.name} - Test (${currentQuestionIndex + 1} / ${quizQuestions.length})</h3>
                    <div class="progress-container">
                        <div class="progress" role="progressbar" style="height: 12px;">
                            <div class="progress-bar" style="width: ${progress}%; background-color: #28a745;"></div>
                        </div>
                    </div>
                    
                    <div class="card p-4 my-4">
                        <h5>${q.question}</h5>
                        <p><small class="text-muted">Konu: ${q.topic || 'Genel'}</small></p>
                        <div>
                            ${optionsHtml}
                        </div>
                    </div>

                    <div class="d-flex justify-content-between">
                        <button class="btn btn-secondary ${currentQuestionIndex === 0 ? 'd-none' : ''}" id="quizPrevButton">Geri</button>
                        <button class="btn btn-success" id="quizNextButton">${currentQuestionIndex === quizQuestions.length - 1 ? 'Testi Bitir' : 'Sonraki'}</button>
                    </div>
                </div>
            `;
            quizEl.innerHTML = quizContent;
            
            document.querySelectorAll('.quiz-option-item').forEach(optionEl => {
                optionEl.addEventListener('click', function() {
                    const selectedValue = this.getAttribute('data-option');
                    userAnswers[currentQuestionIndex] = selectedValue; 
                    renderQuizQuestion();
                });
            });


            document.getElementById('quizNextButton').onclick = () => {
                if (!userAnswers.hasOwnProperty(currentQuestionIndex)) {
                    alert('Lütfen bir seçenek işaretleyin.');
                    return;
                }
                currentQuestionIndex++;
                renderQuizQuestion();
            };

            const prevButton = document.getElementById('quizPrevButton');
            if (prevButton) {
                prevButton.onclick = () => {
                    currentQuestionIndex--;
                    renderQuizQuestion();
                };
            }
        };

        renderQuizQuestion();
    },

    // Modül Skorunu Hesaplar ve Geri Bildirim Toplar
    calculateModuleScore: function(moduleId, questions, userAnswers) {
        let correctCount = 0;
        let requiredTopics = new Set();
        
        questions.forEach((q, index) => {
            const isCorrect = userAnswers[index] === q.answer;
            if (isCorrect) {
                correctCount++;
            } else {
                // Yanlış cevaplanan soruların konularını (varsa) topla
                if (q.topic) {
                    requiredTopics.add(q.topic);
                } else {
                    requiredTopics.add('Genel Konu Tekrarı');
                }
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        
        let isPassed = false;
        let feedback = Array.from(requiredTopics);
        
        const userLevel = localStorage.getItem('userLevel');
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        
        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        
        if (moduleIndex !== -1) {
            // Kural: Skor 90 ve üzeri ise başarılı
            isPassed = (score >= this.PASS_SCORE);

            modules[moduleIndex].lastScore = score;
            modules[moduleIndex].progress = isPassed ? 100 : modules[moduleIndex].progress; 
            modules[moduleIndex].status = isPassed ? 'Tamamlandı' : 'Tekrar Gerekli';
            modules[moduleIndex].lastDuration = Math.floor(Math.random() * 15) + 5; 

            localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        // Sonuç ekranını, geçip geçmediği ve geri bildirim listesi ile çağır
        this.showModuleResult(moduleId, score, questions.length, correctCount, isPassed, feedback);
    },

    // Modül Sonucunu ve Geri Bildirimi Gösterir
    showModuleResult: function(moduleId, score, totalQuestions, correctCount, isPassed, feedback) {
        const quizEl = document.getElementById('moduleQuizSection');
        const userLevel = localStorage.getItem('userLevel');
        
        const baseLevelCode = 'A1';
        const moduleName = this.allModules[baseLevelCode]?.modules?.find(m => m.id === moduleId)?.name || 'Modül'; 

        let feedbackHtml = '';
        let actionButton = '';
        
        if (isPassed) {
            feedbackHtml = '<p class="mt-4 lead text-success">Mükemmel! Bu modülü başarıyla tamamladınız ve bir sonraki adıma geçmeye hazırsınız.</p>';
            actionButton = `<button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayLearningPath('${userLevel}')">Öğrenme Yoluna Dön</button>`;
        } else {
            feedbackHtml = `<p class="mt-4 lead text-danger">Tekrar Gerekli! Modülü tamamlamak için en az **${this.PASS_SCORE}%** puan almalısınız.</p>`;
            
            if (feedback.length > 0) {
                feedbackHtml += '<p class="mt-3">Yanlış cevaplarınıza göre **tekrar çalışmanız gereken alanlar**:</p>';
                feedbackHtml += '<ul class="list-group mb-4" style="max-width: 400px; margin: 0 auto; text-align: left;">';
                feedback.forEach(topic => {
                    feedbackHtml += `<li class="list-group-item list-group-item-warning">${topic}</li>`;
                });
                feedbackHtml += '</ul>';
            } else {
                 feedbackHtml += '<p class="mt-3">Lütfen modül içeriğini tekrar gözden geçirin.</p>';
            }

            actionButton = `
                <button class="btn btn-lg btn-success mt-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">
                    <i class="fas fa-redo me-2"></i> ${moduleName} İçeriğini Tekrar Gözden Geçir
                </button>
                <button class="btn btn-lg btn-outline-success mt-3" onclick="LearningPath.startQuiz('${moduleId}')">
                    <i class="fas fa-play me-2"></i> Testi Yeniden Başlat
                </button>
            `;
        }

        const resultHtml = `
            <div class="result-card">
                <h3 class="mb-4 ${isPassed ? 'text-success' : 'text-danger'}">${isPassed ? 'Tebrikler!' : 'Daha Fazla Çalışma Gerekli!'}</h3>
                <p class="h5">${moduleName} Sonucu</p>
                <p class="h5">Doğru cevap sayısı: ${correctCount} / ${totalQuestions}</p>
                <p class="h4 level-result">Başarı Puanı: <span style="color: ${isPassed ? '#28a745' : '#dc3545'};">${score}%</span></p>
                
                ${feedbackHtml}
                
                ${actionButton}
            </div>
        `;
        quizEl.innerHTML = resultHtml;
    },

    resetProgress: function() {
        if (confirm("Tüm ilerlemeniz ve seviyeniz sıfırlanacaktır. Emin misiniz?")) {
            localStorage.removeItem('userLevel');
            localStorage.removeItem('learningModules');
            localStorage.removeItem('levelTestAnswers');
            alert("İlerleme sıfırlandı. Seviye tespit testi yeniden başlayacak.");
            window.location.reload(); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => LearningPath.init());
