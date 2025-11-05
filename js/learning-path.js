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

    // Her modül için sabit bölüm yapısı (sıra ve tipi belirli)
    STANDARD_SECTIONS: [
        { id: 'word', name: '1. Kelime Bilgisi Alıştırması', type: 'word' },
        { id: 'sentence', name: '2. Cümle Yapısı Alıştırması', type: 'sentence' },
        { id: 'reading', name: '3. Okuma Anlama Alıştırması', type: 'reading' }, 
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
                // Düzgün bir şekilde boş nesne/dizi dönerek uygulamanın çökmesini engeller
                return path.includes('json') ? {} : []; 
            }
        };

        const [moduleData, moduleContentData, testData, wordsData, sentencesData, readingsData] = await Promise.all([
            fetchData('data/learning_modules.json'), 
            fetchData(this.MODULE_CONTENT_FILE_PATH), 
            fetchData('data/level_test.json'),
            fetchData('data/words.json'), 
            fetchData('data/sentences.json'), 
            fetchData('data/reading_stories.json')
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
    
    getBadgeClass: function(status) {
        if (status === 'Tamamlandı') return 'bg-success';
        if (status === 'Başlanmadı') return 'bg-danger';
        if (status === 'Tekrar Gerekli') return 'bg-warning text-dark';
        if (status === 'Atlandı (Soru Yok)') return 'bg-info text-dark'; 
        return 'bg-secondary';
    },
    
    // --- Diğer Test ve Seviye Fonksiyonları (Önceki Kodunuzla Aynı) ---

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
                <div class="alert alert-danger" role="alert" style="max-width: 800px; margin-top: 50px;">
                    <h4>Hata: Öğrenme Modülleri Yüklenemedi!</h4>
                    <p>Lütfen <code>data/learning_modules.json</code> dosyasının hem var olduğunu hem de **"${baseLevelCode}"** anahtarının altında bir **"modules"** dizisi bulunduğunu kontrol edin.</p>
                </div>
                <button class="btn btn-primary mt-3" onclick="LearningPath.resetProgress()">Seviyeyi Sıfırla ve Tekrar Dene</button>
            `;
            return;
        }
        
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        if (!modules || modules.length === 0) {
             // İlk kez yükleme veya sıfırlama
             modules = modulesList.map(m => ({
                 ...m,
                 progress: 0,
                 status: 'Başlanmadı',
                 lastScore: 0,
                 lastDuration: 0,
                 sectionProgress: this.STANDARD_SECTIONS.map(s => ({
                     id: s.id,
                     status: 'Başlanmadı', // Başlanmadı, Tekrar Gerekli, Tamamlandı, Atlandı (Soru Yok)
                     lastScore: 0
                 }))
             }));
             localStorage.setItem('learningModules', JSON.stringify(modules));
        } else {
             // Mevcut modülleri güncelle 
             const updatedModules = modules.map(m => {
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
                 // İlerleme çubuğunu yeniden hesapla
                 const totalSections = updatedSections.length;
                 const completedSections = updatedSections.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length; // Atlananlar da tamamlanmış sayılır
                 m.progress = Math.round((completedSections / totalSections) * 100);
                 
                 m.sectionProgress = updatedSections;
                 return m;
             });
             modules = updatedModules;
             localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        
        const moduleCards = modules.map(module => {
            const badgeClass = this.getBadgeClass(module.status); 
            
            // Bölüm tamamlama durumunu kontrol et
            const totalSections = module.sectionProgress.length;
            const completedSections = module.sectionProgress.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
            
            // Modül testi için kilit durumu: Tümü tamamlanmalı
            const isSectionsCompleted = completedSections === totalSections;
            
            // Modül test butonu sadece bölümler tamamlandıysa aktif
            const moduleTestDisabled = !isSectionsCompleted ? 'disabled' : '';
            const testButtonClass = isSectionsCompleted ? 'btn-success' : 'btn-secondary';
            const testButtonText = isSectionsCompleted ? 'Genel Testi Başlat' : `${completedSections}/${totalSections} Bölüm Tamamlanmalı`;

            return `
                <div class="module-card ${module.status.toLowerCase().replace(/ /g, '-')}" 
                     data-module-id="${module.id}" 
                     data-module-level="${level}"
                     onclick="LearningPath.displayModuleContent('${module.id}', '${level}')"> 
                    
                    <div class="module-card-content">
                        <i class="fas ${this.getIconForTopic(module.topic)}"></i>
                        <h5>${module.name}</h5>
                        <p class="module-topic">${module.topic} Konusu</p>
                        
                        <div class="module-status badge ${badgeClass}">${module.status}</div>
                        
                        <div class="progress mt-2">
                            <div class="progress-bar" style="width: ${module.progress}%;" role="progressbar">${module.progress}%</div>
                        </div>
                    </div>
                    
                    <div class="module-actions mt-3" onclick="event.stopPropagation()">
                         <button class="btn btn-sm btn-primary me-2" onclick="LearningPath.displayModuleContent('${module.id}', '${level}')">İçeriği Gör (${completedSections}/${totalSections})</button>
                        <button class="btn btn-sm ${testButtonClass}" ${moduleTestDisabled} onclick="LearningPath.startQuiz('${module.id}', 'all')">${testButtonText}</button>
                    </div>
                </div>
            `;
        }).join('');

        pathEl.innerHTML = `
            <div class="level-header" style="max-width: 900px; width: 100%;">
                <h2>${levelTitle}</h2>
                <p class="lead">Seviyeniz **${level}** olarak belirlendi. Modüller **${level}** seviyesine uygun çalışmalar içerecektir.</p>
            </div>
            
            <h4 class="topic-header" style="max-width: 900px; width: 100%; text-align: left; margin-top: 30px;">Öğrenme Modülleri (${modules.length} Adet)</h4>
            <div class="module-grid" style="max-width: 900px; width: 100%;">
                ${moduleCards}
            </div>

             <button class="btn btn-sm btn-outline-warning mt-4" onclick="LearningPath.resetUserLevel()">Seviye Tespit Testini Yeniden Yap</button>
             <button class="btn btn-sm btn-outline-danger mt-4" onclick="LearningPath.resetProgress()">Tüm İlerlemeyi Sıfırla</button>
        `;
        
        localStorage.setItem('userLevel', level);
    },
    
    getIconForTopic: function(topic) {
        const icons = {
            'Gramer': 'fa-graduation-cap',
            'Kelime': 'fa-spell-check',
            'Konuşma': 'fa-comments',
            'Okuma': 'fa-book-open',
            'Structure': 'fa-sitemap',
            'Nouns': 'fa-cube',
            'Prepositions': 'fa-location-arrow'
        };
        return icons[topic] || 'fa-cubes';
    },
    
    displayModuleContent: function(moduleId, userLevel) {
        this.showSection('moduleContentSection');
        const contentEl = document.getElementById('moduleContentSection');
        
        const modules = JSON.parse(localStorage.getItem('learningModules'));
        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        const currentModule = modules[moduleIndex];

        const baseLevelCode = 'A1';
        const moduleListSource = (this.allModules[baseLevelCode] && Array.isArray(this.allModules[baseLevelCode].modules)) 
            ? this.allModules[baseLevelCode].modules 
            : [];

        const baseModule = moduleListSource.find(m => m.id === moduleId);
        
        if (!baseModule) {
             contentEl.innerHTML = `<h2>Hata: Modül ${moduleId} temel bilgileri (A1 listesinde) bulunamadı.</h2>`;
             return;
        }
        
        const staticContentData = this.allModuleContents[moduleId];
        baseModule.content = (staticContentData && Array.isArray(staticContentData.content)) ? staticContentData.content : [];

        this.enrichModuleContent(moduleId, baseModule, userLevel);
        
        contentEl.style.alignItems = 'flex-start'; 
        contentEl.style.textAlign = 'left';

        let contentHtml = `<div style="max-width: 800px; width: 100%;">`;
        contentHtml += `<button class="btn btn-sm btn-outline-primary mb-4" onclick="LearningPath.displayLearningPath('${userLevel}')">← Modüllere Geri Dön</button>`;
        contentHtml += `<h3 class="mb-4">${baseModule.name}</h3>`;
        
        // --- 1. Statik ve Dinamik Modül İçeriği ---
        const enrichedContent = this.getModuleContentHTML(moduleId, baseModule, userLevel);

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
                    contentHtml += this.renderInlineQuizSection('word', baseModule, currentModule);
                    break;
                case 'sentences':
                    contentHtml += `<div class="sentence-list-section">${item.html}</div>`;
                    contentHtml += this.renderInlineQuizSection('sentence', baseModule, currentModule);
                    break;
                case 'reading_text':
                    // Reading içeriğini ve alıştırmasını burada birleştiriyoruz
                    contentHtml += `
                        <div class="mt-4">
                            <h4>3. Okuma: ${baseModule.reading_story_title || 'Hikaye Başlığı'}</h4>
                            <p class="mb-2"><small class="text-muted">**Seviye:** ${item.level} - **Konu:** ${item.category}. Parçayı okuyun ve aşağıdaki soruları cevaplayın.</small></p>
                            <div class="reading-text-box" style="border: 1px dashed #ccc; padding: 15px; margin: 15px 0;">${item.text.replace(/\n/g, '<p>')}</div>
                        </div>
                    `;
                    contentHtml += this.renderInlineQuizSection('reading', baseModule, currentModule);
                    break;
                case 'reading_placeholder':
                    // Okuma hikayesi bulunamadıysa gösterilecek yer tutucu
                    contentHtml += `
                        <div class="mt-4">
                            <h4>3. Okuma Anlama Alıştırması</h4>
                            <div class="alert alert-warning" role="alert">
                                <strong>Okuma Hikayesi Bulunamadı:</strong> Mevcut seviyeniz (${userLevel}) ve modül konusu (${baseModule.topic}) ile eşleşen bir okuma hikayesi/metni 'reading_stories.json' dosyanızda bulunamadı. Bu bölüm **otomatik olarak tamamlanmış sayılacaktır**.
                            </div>
                        </div>
                    `;
                    contentHtml += this.renderInlineQuizSection('reading', baseModule, currentModule);
                    break;
            }
        });
        
        const totalSections = this.STANDARD_SECTIONS.length;
        const completedSections = currentModule.sectionProgress.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
        const isSectionsCompleted = completedSections === totalSections;

        const testButtonClass = isSectionsCompleted ? 'btn-success' : 'btn-secondary';
        const testButtonText = isSectionsCompleted ? 'Genel Modül Testini Başlat' : `Tüm bölümler tamamlanmalı (${completedSections}/${totalSections})`;

        contentHtml += `
            <div class="mt-5 text-center">
                <hr>
                <h4>Modül Genel Değerlendirme Testi</h4>
                <p class="lead">Tüm bölümleri tamamladıktan sonra modül final testini yapabilirsiniz. **Son Puan: ${currentModule.lastScore}%**</p>
                <button class="btn ${testButtonClass} btn-lg" ${!isSectionsCompleted ? 'disabled' : ''} onclick="LearningPath.startQuiz('${moduleId}', 'all')">
                    ${!isSectionsCompleted ? '<i class="fas fa-lock me-2"></i>' : ''} ${testButtonText}
                </button>
            </div>
            </div>
        `;

        contentEl.innerHTML = contentHtml;
    },

    renderInlineQuizSection: function(sectionId, baseModule, currentModule) {
        const sectionInfo = this.STANDARD_SECTIONS.find(s => s.id === sectionId);
        
        let quizQuestions = [];
        let questionCount = 0;
        
        if (sectionId === 'word') {
            quizQuestions = baseModule.word_quiz_questions;
        } else if (sectionId === 'sentence') {
            quizQuestions = baseModule.sentence_quiz_questions;
        } else if (sectionId === 'reading') {
            quizQuestions = baseModule.reading_quiz_questions;
        }
        questionCount = quizQuestions ? quizQuestions.length : 0;

        const sectionData = currentModule.sectionProgress.find(s => s.id === sectionId) || {status: 'Başlanmadı', lastScore: 0};
        
        // KRİTİK GÜNCELLEME: Bölümün otomatik Atlanma Mantığı
        if (sectionData.status === 'Başlanmadı' && questionCount === 0) {
             const modules = JSON.parse(localStorage.getItem('learningModules'));
             const moduleIndex = modules.findIndex(m => m.id === currentModule.id);
             if (moduleIndex !== -1) {
                 const sectionIndex = modules[moduleIndex].sectionProgress.findIndex(s => s.id === sectionId);
                 if (sectionIndex !== -1) {
                     modules[moduleIndex].sectionProgress[sectionIndex].status = 'Atlandı (Soru Yok)';
                 }
                 // Modül ilerlemesini (progress bar) hemen güncelle
                 const totalSections = this.STANDARD_SECTIONS.length;
                 const completedSections = modules[moduleIndex].sectionProgress.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
                 modules[moduleIndex].progress = Math.round((completedSections / totalSections) * 100);

                 localStorage.setItem('learningModules', JSON.stringify(modules));
             }
             sectionData.status = 'Atlandı (Soru Yok)';
             // Eğer okuma parçası yoksa, sadece durum mesajı dönsün, butona gerek yok.
             if (sectionId === 'reading' && !baseModule.moduleReading) {
                 return ''; // Reading parçası yoksa placeholder zaten yukarıda gösterildi.
             }
        }

        const badgeClass = this.getBadgeClass(sectionData.status);
        const isAvailable = questionCount > 0;
        const buttonDisabled = !isAvailable ? 'disabled' : '';

        const buttonHtml = (sectionData.status === 'Atlandı (Soru Yok)') ? 
            '' :
            `<button class="btn btn-sm btn-info" ${buttonDisabled} onclick="LearningPath.startQuiz('${currentModule.id}', '${sectionId}')">
                <i class="fas fa-play me-2"></i> ${sectionId === 'reading' ? 'Okuma Testi' : 'Alıştırmayı'} Başlat (${questionCount} Soru)
            </button>`;

        const statusMessage = !isAvailable && sectionData.status !== 'Atlandı (Soru Yok)'
            ? '<span class="badge bg-warning text-dark ms-2">Yeterli Soru Yok</span>' 
            : '';

        return `
            <div class="card p-3 my-4 bg-light">
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        <h5 class="mb-1">${sectionInfo.name}</h5>
                        <p class="mb-0">
                            <span class="badge ${badgeClass} me-2">${sectionData.status}</span>
                            <small class="text-muted">Son Puan: ${sectionData.lastScore}%</small>
                            ${statusMessage}
                        </p>
                    </div>
                    ${buttonHtml}
                </div>
            </div>
        `;
    },
    
    getModuleContentHTML: function(moduleId, baseModule, userLevel) {
        const enrichedContent = this.enrichModuleContent(moduleId, baseModule, userLevel);
        return enrichedContent;
    },

    // Dinamik içerik oluşturucu
    enrichModuleContent: function(moduleId, baseModule, userLevel) {
        
        const moduleLevel = userLevel.toUpperCase(); 
        const baseModuleTopic = baseModule.topic ? baseModule.topic.toLowerCase() : ''; 
        
        const staticContent = Array.isArray(baseModule.content) ? baseModule.content : [];
        let enrichedContent = [...staticContent]; 
        
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
        let wordQuizQuestions = [];
        const moduleWords = this.allWords.filter(w => {
            const isLevelMatch = w.difficulty && allowedDifficulties.includes(w.difficulty.toUpperCase());
            
            if (!isLevelMatch) return false;

            if (['grammar', 'gramer', 'structure', 'kelime', 'word', 'vocabulary'].includes(baseModuleTopic) || !baseModuleTopic) {
                return true; 
            }
            
            const wordCategory = w.category.toLowerCase();
            return wordCategory.includes(baseModuleTopic) || baseModuleTopic.includes(wordCategory);

        }).sort(() => 0.5 - Math.random()).slice(0, 15); 

        if (moduleWords.length > 0) {
             const wordsHtml = moduleWords.map(w => 
                `<div class="word-item"><strong>${w.word}</strong> - ${w.turkish} (${w.category}) <small class="text-muted">| Seviye: ${w.difficulty}</small></div>`
            ).join('');
            
            enrichedContent.push({type: 'heading', text: '1. Konu Kelimeleri'});
            enrichedContent.push({type: 'paragraph', text: `Bu modül için **${moduleWords.length}** adet ${moduleLevel} seviyesine uygun kelime.`});
            enrichedContent.push({type: 'words', html: wordsHtml});

            for (let i = 0; i < Math.min(10, moduleWords.length); i++) {
                const correctWord = moduleWords[i];
                const options = [correctWord.turkish];
                
                const wrongOptions = this.allWords
                    .filter(w => w.turkish !== correctWord.turkish && w.difficulty && allowedDifficulties.includes(w.difficulty.toUpperCase()))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)
                    .map(w => w.turkish);
                    
                options.push(...wrongOptions);
                    
                wordQuizQuestions.push({
                    type: 'quiz', 
                    question: `(Kelime Sorusu): '${correctWord.word}' kelimesinin Türkçe karşılığı nedir?`, 
                    options: options.sort(() => 0.5 - Math.random()), 
                    answer: correctWord.turkish,
                    topic: `${baseModule.name} - Kelime Bilgisi`
                });
            }
        }
        
        // --- 2. Cümle Alıştırmaları (sentences.json) ---
        let sentenceQuizQuestions = [];
        const moduleSentences = this.allSentences.filter(s => {
            const isLevelMatch = s.difficulty && allowedDifficulties.includes(s.difficulty.toUpperCase());
            
            if (!isLevelMatch) return false;
            
            if (['grammar', 'gramer', 'structure', 'konuşma', 'speaking'].includes(baseModuleTopic) || !baseModuleTopic) {
                return true; 
            }
            
            const sentenceCategory = s.category.toLowerCase();
            return sentenceCategory.includes(baseModuleTopic) || baseModuleTopic.includes(sentenceCategory);
        }).sort(() => 0.5 - Math.random()).slice(0, 15); 

        if (moduleSentences.length > 0) {
            const sentencesHtml = moduleSentences.map(s =>
                `<div class="sentence-item"><strong>${s.english}</strong> (${s.turkish})</div>`
            ).join('');

            enrichedContent.push({type: 'heading', text: '2. Örnek Cümleler'});
            enrichedContent.push({type: 'paragraph', text: `Konuyla alakalı **${moduleSentences.length}** adet ${moduleLevel} seviyesine uygun örnek cümle.`});
            enrichedContent.push({type: 'sentences', html: sentencesHtml});

            for (let i = 0; i < Math.min(10, moduleSentences.length); i++) { 
                const sentence = moduleSentences[i];
                if (sentence.english.split(' ').length < 3) continue; 
                
                const words = sentence.english.split(' ');
                const missingWordIndex = Math.floor(Math.random() * (words.length - 2)) + 1; 
                const missingWord = words[missingWordIndex].replace(/[.,?!]/g, '');
                
                const questionText = words.map((w, index) => index === missingWordIndex ? '___' : w).join(' ');
                
                const options = [missingWord];
                const wrongOptions = this.allWords
                    .filter(w => !w.word.toLowerCase().includes(missingWord.toLowerCase()) && w.difficulty && allowedDifficulties.includes(w.difficulty.toUpperCase()))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)
                    .map(w => w.word);
                    
                options.push(...wrongOptions);

                sentenceQuizQuestions.push({
                    type: 'quiz', 
                    question: `(Cümle Sorusu): Cümledeki boşluğu doldurun: "${questionText}"`, 
                    options: options.sort(() => 0.5 - Math.random()), 
                    answer: missingWord,
                    topic: `${baseModule.name} - Cümle Yapısı`
                });
            }
        }

        // --- 3. Okuma Parçası (reading_stories.json) - KRİTİK BÖLÜM GÜNCELLEMESİ ---
        let readingQuizQuestions = [];
        const readingLevelCode = allowedDifficulties.map(d => d.toLowerCase()).find(d => ['beginner', 'intermediate', 'advanced'].includes(d)) || 'beginner';
        
        const moduleReading = this.allReadings.find(r => 
            r.level.toLowerCase().includes(readingLevelCode) && 
            (['okuma', 'reading'].includes(baseModuleTopic) || !baseModuleTopic || r.category.toLowerCase().includes(baseModuleTopic) || baseModuleTopic.includes(r.category.toLowerCase()))
        );

        if (moduleReading) {
            // Başarılı bir şekilde hikaye bulundu
            baseModule.moduleReading = moduleReading; // Modüle hikayeyi ekliyoruz

            enrichedContent.push({
                type: 'reading_text', 
                text: moduleReading.content,
                level: moduleReading.level,
                category: moduleReading.category
            });
            baseModule.reading_story_title = moduleReading.title;
            
            moduleReading.questions.forEach((q) => {
                 readingQuizQuestions.push({
                    type: 'quiz', 
                    question: `(Okuma Sorusu): ${q.question}`, 
                    options: q.options, 
                    answer: q.options[q.correctAnswer],
                    topic: `${moduleReading.title} - Okuma Anlama`
                });
            });
        } else {
             // Hikaye bulunamadıysa yer tutucu ekle
             enrichedContent.push({type: 'reading_placeholder', text: 'Okuma hikayesi bulunamadı.'});
             baseModule.moduleReading = null;
        }
        
        // Final quiz sorularına genel indeks ataması
        const allQuizQuestions = [
            ...wordQuizQuestions,
            ...sentenceQuizQuestions,
            ...readingQuizQuestions
        ];
        
        allQuizQuestions.forEach((q, index) => {
            q.id = `q${index}`;
        });
        
        // Bu fonksiyon, filtreleme için gerekli tüm bilgileri baseModule'a ekler
        baseModule.all_quiz_questions = allQuizQuestions;
        baseModule.word_quiz_questions = wordQuizQuestions;
        baseModule.sentence_quiz_questions = sentenceQuizQuestions;
        baseModule.reading_quiz_questions = readingQuizQuestions;
        
        return enrichedContent;
    },
    
    // --- Diğer Quiz ve Score Fonksiyonları (Önceki Kodunuzla Aynı) ---

    startQuiz: function(moduleId, quizType = 'all') { 
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

        if (quizType === 'all') {
             const modules = JSON.parse(localStorage.getItem('learningModules'));
             const currentModule = modules.find(m => m.id === moduleId);
             const totalSections = this.STANDARD_SECTIONS.length;
             const completedSections = currentModule.sectionProgress.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
             
             if (completedSections < totalSections) {
                 quizEl.style.alignItems = 'center'; 
                 quizEl.style.textAlign = 'center';
                 quizEl.innerHTML = `
                     <div class="result-card">
                         <h3 class="text-danger mb-4">Modül Testi Kilitli</h3>
                         <p class="h5">Modül final testini başlatmak için tüm (${totalSections} adet) çalışma bölümünü **(%${this.PASS_SCORE} ve üzeri puanla veya Atlanarak)** tamamlamalısınız.</p>
                         <p>Şu anda **${completedSections}** bölüm tamamlandı. Lütfen eksik bölümleri bitirin.</p>
                         <button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">
                             Modül İçeriğine Geri Dön
                         </button>
                     </div>
                 `;
                 return;
             }
        }
        
        const staticContentData = this.allModuleContents[moduleId];
        baseModule.content = (staticContentData && Array.isArray(staticContentData.content)) ? staticContentData.content : [];
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
        } else { // quizType === 'all'
            quizQuestions = baseModule.all_quiz_questions;
            quizTitle = `${baseModule.name} - Genel Test`;
        }
        
        if (quizQuestions.length === 0) {
            quizEl.style.alignItems = 'center'; 
            quizEl.style.textAlign = 'center';
            quizEl.innerHTML = `
                <div class="result-card">
                    <h3 class="text-warning mb-4">Uyarı</h3>
                    <p class="h5">${quizTitle} için, mevcut seviyeniz (**${userLevel}**) ve konusu (**${baseModule.topic}**) ile eşleşen **YETERLİ** alıştırma sorusu bulunamadı.</p>
                    <p>Lütfen veri dosyalarınızdaki seviye/konu etiketlerini kontrol edin.</p>
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
                
                this.calculateModuleScore(moduleId, quizQuestions, userAnswers, quizType);
                return;
            }
            
            const q = quizQuestions[currentQuestionIndex];
            const progress = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);

            let optionsHtml = '';
            q.options.forEach((option, index) => {
                const isSelected = userAnswers[currentQuestionIndex] === option;
                const selectedClass = isSelected ? 'selected-answer' : '';
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
                    <h3 class="mb-4">${quizTitle} (${currentQuestionIndex + 1} / ${quizQuestions.length})</h3>
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
                    
                    document.querySelectorAll('.quiz-option-item').forEach(el => el.classList.remove('selected-answer'));
                    this.classList.add('selected-answer');
                });
            });


            document.getElementById('quizNextButton').onclick = () => {
                if (!userAnswers.hasOwnProperty(currentQuestionIndex)) {
                    alert('Lütfen bir seçenek işaretleyin.');
                    return;
                }
                
                if (currentQuestionIndex === quizQuestions.length - 1) {
                     this.calculateModuleScore(moduleId, quizQuestions, userAnswers, quizType);
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

    calculateModuleScore: function(moduleId, questions, userAnswers, quizType) {
        let correctCount = 0;
        let requiredTopics = new Set();
        
        questions.forEach((q, index) => {
            const isCorrect = userAnswers[index] === q.answer;
            if (isCorrect) {
                correctCount++;
            } else {
                if (q.topic) {
                    requiredTopics.add(q.topic);
                } else {
                    requiredTopics.add('Genel Konu Tekrarı');
                }
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        const isPassed = (score >= this.PASS_SCORE);
        
        const userLevel = localStorage.getItem('userLevel');
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        
        if (moduleIndex !== -1) {
            
            const currentModule = modules[moduleIndex];
            const totalSections = this.STANDARD_SECTIONS.length;
            
            if (quizType === 'all') {
                currentModule.lastScore = score;
                
                const completedSections = currentModule.sectionProgress.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
                const allSectionsComplete = completedSections === totalSections;
                const passedModuleTest = isPassed; 
                
                if (allSectionsComplete && passedModuleTest) {
                    currentModule.status = 'Tamamlandı';
                    currentModule.progress = 100;
                } else {
                    currentModule.status = 'Tekrar Gerekli';
                    currentModule.progress = Math.round((completedSections / totalSections) * 100); 
                }
                
                currentModule.lastDuration = Math.floor(Math.random() * 15) + 5; 

            } else {
                const sectionIndex = currentModule.sectionProgress.findIndex(s => s.id === quizType);
                if (sectionIndex !== -1) {
                    currentModule.sectionProgress[sectionIndex].lastScore = score;
                    currentModule.sectionProgress[sectionIndex].status = isPassed ? 'Tamamlandı' : 'Tekrar Gerekli';
                }
                
                const completedSectionsAfterUpdate = currentModule.sectionProgress.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
                currentModule.progress = Math.round((completedSectionsAfterUpdate / totalSections) * 100);
                
                 if (currentModule.progress === 100) {
                     currentModule.status = 'Devam Ediyor'; 
                 }
                 if (currentModule.progress < 100 && currentModule.status === 'Tamamlandı') {
                     currentModule.status = 'Devam Ediyor';
                 }
            }

            localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        this.showModuleResult(moduleId, score, questions.length, correctCount, isPassed, Array.from(requiredTopics), quizType);
    },

    showModuleResult: function(moduleId, score, totalQuestions, correctCount, isPassed, feedback, quizType) {
        const quizEl = document.getElementById('moduleQuizSection');
        const userLevel = localStorage.getItem('userLevel');
        
        const baseLevelCode = 'A1';
        const moduleName = this.allModules[baseLevelCode]?.modules?.find(m => m.id === moduleId)?.name || 'Modül'; 

        let feedbackHtml = '';
        let actionButton = '';
        
        const isModuleFinalTest = quizType === 'all';
        const quizTitle = isModuleFinalTest 
            ? `${moduleName} Final Testi` 
            : `${this.STANDARD_SECTIONS.find(s => s.id === quizType)?.name || 'Bölüm Alıştırması'}`;
        
        if (isPassed) {
            const message = isModuleFinalTest 
                ? 'Mükemmel! Bu modülü başarıyla tamamladınız ve bir sonraki adıma geçmeye hazırsınız.'
                : 'Harika! Bu bölümü başarıyla tamamladınız. Artık diğer bölümlere geçebilirsiniz.';

            feedbackHtml = `<p class="mt-4 lead text-success">${message}</p>`;
            actionButton = isModuleFinalTest 
                ? `<button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayLearningPath('${userLevel}')">Öğrenme Yoluna Dön</button>`
                : `<button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">Modül İçeriğine Geri Dön</button>`;
        } else {
            const message = isModuleFinalTest
                ? `Tekrar Gerekli! Modülü tamamlamak için en az **${this.PASS_SCORE}%** puan almalısınız.`
                : `Tekrar Gerekli! Bu bölümü tamamlamak için en az **${this.PASS_SCORE}%** puan almalısınız.`;

            feedbackHtml = `<p class="mt-4 lead text-danger">${message}</p>`;
            
            if (feedback.length > 0) {
                feedbackHtml += '<p class="mt-3">Yanlış cevaplarınıza göre **tekrar çalışmanız gereken alanlar**:</p>';
                feedbackHtml += '<ul class="list-group mb-4" style="max-width: 400px; margin: 0 auto; text-align: left;">';
                feedback.forEach(topic => {
                    feedbackHtml += `<li class="list-group-item list-group-item-warning">${topic}</li>`;
                });
                feedbackHtml += '</ul>';
            } else {
                 feedbackHtml += '<p class="mt-3">Lütfen ilgili bölüm içeriğini tekrar gözden geçirin.</p>';
            }

            actionButton = `
                <button class="btn btn-lg btn-success mt-3" onclick="LearningPath.displayModuleContent('${moduleId}', '${userLevel}')">
                    <i class="fas fa-redo me-2"></i> Modül İçeriğini Gözden Geçir
                </button>
                <button class="btn btn-lg btn-outline-success mt-3" onclick="LearningPath.startQuiz('${moduleId}', '${quizType}')">
                    <i class="fas fa-play me-2"></i> Testi Yeniden Başlat
                </button>
            `;
        }

        const resultHtml = `
            <div class="result-card">
                <h3 class="mb-4 ${isPassed ? 'text-success' : 'text-danger'}">${isPassed ? 'Tebrikler!' : 'Daha Fazla Çalışma Gerekli!'}</h3>
                <p class="h5">${quizTitle} Sonucu</p>
                <p class="h5">Doğru cevap sayısı: ${correctCount} / ${totalQuestions}</p>
                <p class="h4 level-result">Başarı Puanı: <span style="color: ${isPassed ? '#28a745' : '#dc3545'};">${score}%</span></p>
                
                ${feedbackHtml}
                
                ${actionButton}
            </div>
        `;
        quizEl.innerHTML = resultHtml;
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
            alert("Tüm ilerleme sıfırlandı. Seviye tespit testi yeniden başlayacak.");
            window.location.reload(); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => LearningPath.init());

