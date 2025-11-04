const LearningPath = {
    // Tüm JSON verilerini tutacak değişkenler
    allModules: {},
    allWords: [],
    allSentences: [],
    allReadings: [],
    allLevelTestQuestions: [],
    
    // Uygulama başlangıcında tüm verileri yükler
    init: function() {
        this.loadAllData().then(() => {
            console.log("Tüm veriler yüklendi.");
            // Kullanıcının seviyesini kontrol et
            const userLevel = localStorage.getItem('userLevel');
            if (userLevel) {
                this.displayLearningPath(userLevel);
            } else {
                this.showSection('levelTestSection');
                this.displayLevelTest();
            }
        }).catch(error => {
            console.error("Veri yüklenirken kritik hata oluştu:", error);
            // Hata durumunda, kullanıcıya bilgi vererek test sayfasını göster
            this.showSection('levelTestSection');
            const testEl = document.getElementById('levelTestSection');
            testEl.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4>Veri Yükleme Hatası!</h4>
                    <p>Uygulama temel verileri yükleyemedi. Sunucu bağlantınızı ve dosya yollarınızı kontrol edin (Örn: data/words.json).</p>
                </div>
            `;
        });

        // Test Başlat butonuna event listener ekle
        const startTestButton = document.getElementById('startTestButton');
        if (startTestButton) {
             startTestButton.onclick = () => {
                this.showSection('levelTestSection');
                this.displayLevelTest();
             };
        }
    },

    // Tüm JSON dosyalarını yükleyen asenkron fonksiyon
    loadAllData: async function() {
        // Module ve Level Test verisi
        const moduleRes = fetch('data/learning_modules.json');
        const levelTestRes = fetch('data/level_test.json');
        
        // Zenginleştirme verileri
        const wordsRes = fetch('data/words.json');
        const sentencesRes = fetch('data/sentences.json');
        const readingsRes = fetch('data/reading_stories.json');

        const [moduleData, testData, wordsData, sentencesData, readingsData] = await Promise.all([
            moduleRes, levelTestRes, wordsRes, sentencesRes, readingsRes
        ].map(res => res.then(r => r.json()).catch(() => ({})))); // Hata yakalama eklendi

        this.allModules = moduleData || {};
        // KRİTİK DÜZELTME: Verinin bir dizi olduğundan emin ol
        this.allLevelTestQuestions = Array.isArray(testData) ? testData : []; 
        this.allWords = Array.isArray(wordsData) ? wordsData : []; 
        this.allSentences = Array.isArray(sentencesData) ? sentencesData : []; 
        this.allReadings = Array.isArray(readingsData) ? readingsData : []; 
    },

    // Hangi bölümün gösterileceğini ayarlar
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
    },

    // Seviye Testini görüntüler
    displayLevelTest: function() {
        const testEl = document.getElementById('levelTestSection');
        if (!testEl) return;

        // Test sorularını rastgele seçip karıştır (max 10 soru)
        const questions = this.allLevelTestQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        
        // KRİTİK DÜZELTME: Hata Kontrolü
        if (questions.length === 0) {
            testEl.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4>Hata: Seviye Testi Soruları Yüklenemedi!</h4>
                    <p>Lütfen <code>data/level_test.json</code> dosyasının hem var olduğunu hem de içinde geçerli JSON formatında soruların bulunduğunu kontrol edin.</p>
                </div>
                <button class="btn btn-primary mt-3" onclick="window.location.reload()">Tekrar Dene</button>
            `;
            return;
        }

        let currentQuestionIndex = 0;
        let userAnswers = {}; // {questionId: selectedOption}

        const renderQuestion = () => {
            if (currentQuestionIndex >= questions.length) {
                this.calculateLevel(questions, userAnswers);
                return;
            }

            const q = questions[currentQuestionIndex];
            const progress = Math.round((currentQuestionIndex / questions.length) * 100);

            let optionsHtml = '';
            const shuffledOptions = q.options.sort(() => 0.5 - Math.random()); 
            shuffledOptions.forEach((option, index) => {
                const checked = userAnswers[q.id] === option ? 'checked' : '';
                optionsHtml += `
                    <div class="form-check question-option">
                        <input class="form-check-input" type="radio" name="question_${q.id}" id="option_${q.id}_${index}" value="${option}" ${checked}>
                        <label class="form-check-label w-100" for="option_${q.id}_${index}">${option}</label>
                    </div>
                `;
            });

            const testContent = `
                <h3 class="mb-4">Seviye Tespit Testi (${currentQuestionIndex + 1} / ${questions.length})</h3>
                <div class="progress-container">
                    <div class="progress" role="progressbar" style="height: 12px;">
                        <div class="progress-bar" style="width: ${progress}%; background-color: #4361ee;">${progress}%</div>
                    </div>
                </div>
                
                <div class="card p-4 my-4">
                    <h5>${q.questionText}</h5>
                    <p><small class="text-muted">Konu: ${q.topic} (Seviye: ${q.level})</small></p>
                    <div class="question-options-group">
                        ${optionsHtml}
                    </div>
                </div>

                <div class="d-flex justify-content-between">
                    <button class="btn btn-secondary ${currentQuestionIndex === 0 ? 'd-none' : ''}" id="prevButton">Geri</button>
                    <button class="btn btn-primary" id="nextButton">${currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sonraki'}</button>
                </div>
            `;
            testEl.innerHTML = testContent;

            // Event Listener'lar
            document.querySelectorAll(`input[name="question_${q.id}"]`).forEach(input => {
                input.addEventListener('change', (e) => {
                    userAnswers[q.id] = e.target.value;
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

    // Seviyeyi hesaplar ve sonucu gösterir
    calculateLevel: function(questions, userAnswers) {
        let score = 0;
        let maxScore = questions.length;
        let a1Count = 0;
        let b1Count = 0;
        let c1Count = 0;
        
        questions.forEach(q => {
            const isCorrect = userAnswers[q.id] === q.correctAnswer;
            if (isCorrect) {
                score++;
                if (q.level.includes('A1')) a1Count++;
                if (q.level.includes('B1')) b1Count++;
                if (q.level.includes('C1')) c1Count++;
            }
        });

        let resultLevel = 'A1';
        if (b1Count >= 2) { 
            resultLevel = 'B1';
        }
        if (c1Count >= 2) { 
            resultLevel = 'C1';
        }

        localStorage.setItem('userLevel', resultLevel);
        
        this.showLevelResult(resultLevel, score, maxScore);
    },
    
    // Seviye hesaplama sonucunu gösterir
    showLevelResult: function(level, score, maxScore) {
        const testEl = document.getElementById('levelTestSection');
        testEl.innerHTML = `
            <div class="result-card">
                <h3 class="text-success mb-4">Test Tamamlandı!</h3>
                <p class="h5">Toplam doğru sayısı: ${score} / ${maxScore}</p>
                <p class="h4 level-result">Seviyeniz: <span>${level}</span></p>
                
                <p class="mt-4">Öğrenme yolunuz ${level} seviyesine göre ayarlandı. Hemen derslere başlayabilirsiniz!</p>
                
                <button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayLearningPath('${level}')">Öğrenme Yolunu Gör</button>
            </div>
        `;
    },

    // Modül kartlarını görüntüler
    displayLearningPath: function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        const levelData = this.allModules[level];
        
        if (!levelData) {
            pathEl.innerHTML = `<h2>Hata: ${level} seviyesi için modül verisi bulunamadı.</h2>`;
            return;
        }
        
        // Modülleri Local Storage'dan yükle veya varsayılan veriyi kullan
        let modules = JSON.parse(localStorage.getItem('learningModules')) || levelData.modules;
        // Eğer modules boşsa veya level uyuşmuyorsa, JSON'dan tekrar yükle
        if (!modules || modules.length === 0 || !modules[0].id.startsWith(level.toLowerCase())) {
             modules = levelData.modules;
             localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        // Modül kartlarını oluştur
        const moduleCards = modules.map(module => `
            <div class="module-card ${module.status.toLowerCase().replace(/ /g, '-')}" onclick="LearningPath.displayModuleContent('${module.id}')">
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
            <div class="level-header">
                <h2>${levelData.title}</h2>
                <p class="lead">${levelData.description}</p>
            </div>
            
            <h4 class="topic-header">Öğrenme Modülleri (${modules.length} Adet)</h4>
            <div class="module-grid">
                ${moduleCards}
            </div>

             <button class="btn btn-sm btn-outline-secondary mt-4" onclick="LearningPath.resetProgress()">Seviyeyi Sıfırla</button>
        `;
        
        // Local Storage'a en son seviyeyi ve modülleri kaydet
        localStorage.setItem('userLevel', level);
        localStorage.setItem('learningModules', JSON.stringify(modules));
    },
    
    getIconForTopic: function(topic) {
        const icons = {
            'Gramer': 'fa-graduation-cap',
            'Kelime': 'fa-spell-check',
            'Konuşma': 'fa-comments',
            'Okuma': 'fa-book-open',
            'Structure': 'fa-sitemap' // Yeni eklenen
        };
        return icons[topic] || 'fa-cubes';
    },
    
    // Modül içeriğini görüntüler
    displayModuleContent: function(moduleId) {
        this.showSection('moduleContentSection');
        const contentEl = document.getElementById('moduleContentSection');
        
        const levelData = Object.values(this.allModules).find(l => l.modules.some(m => m.id === moduleId));
        const baseModule = levelData ? levelData.modules.find(m => m.id === moduleId) : null;

        if (!baseModule) {
             contentEl.innerHTML = `<h2>Hata: Modül ${moduleId} içeriği bulunamadı.</h2>`;
             return;
        }

        const enrichedContent = this.enrichModuleContent(moduleId, baseModule);
        
        let contentHtml = `<button class="btn btn-sm btn-outline-primary mb-4" onclick="LearningPath.displayLearningPath(localStorage.getItem('userLevel'))">← Modüllere Geri Dön</button>`;
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
                    contentHtml += `<pre class="code-block">${item.text}</pre>`;
                    break;
                case 'example':
                    contentHtml += `<div class="example-box">${item.text.replace(/\n/g, '<br>')}</div>`;
                    break;
                case 'words':
                    contentHtml += `<div class="word-list-section">${item.html}</div>`;
                    break;
                case 'sentences':
                    contentHtml += `<div class="sentence-list-section">${item.html}</div>`;
                    break;
                case 'reading_text':
                    contentHtml += `<div class="reading-text-box">${item.text.replace(/\n/g, '<p>')}</div>`;
                    break;
                // Quizler burada gösterilmez
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
        `;

        contentEl.innerHTML = contentHtml;
    },

    // Modül içeriğini dinamik olarak zenginleştirir (Çalışmaları oluşturan kısım)
    enrichModuleContent: function(moduleId, baseModule) {
        const moduleLevel = moduleId.split('_')[0].toUpperCase(); 
        const moduleTopic = baseModule.topic.toLowerCase(); 
        let enrichedContent = [...baseModule.content]; 
        let quizIndexStart = enrichedContent.filter(item => item.type === 'quiz').length;

        // --- 1. Kelime Alıştırmaları (words.json) ---
        const moduleWords = this.allWords.filter(w => 
            w.difficulty.toUpperCase().includes(moduleLevel) && 
            (w.category.toLowerCase().includes(moduleTopic) || moduleTopic.includes(w.category.toLowerCase()))
        ).sort(() => 0.5 - Math.random()).slice(0, 15); // 15 kelime

        if (moduleWords.length > 0) {
             const wordsHtml = moduleWords.map(w => 
                `<div class="word-item"><strong>${w.word}</strong> - ${w.turkish} (${w.category}) <small class="text-muted">| Seviye: ${w.difficulty}</small></div>`
            ).join('');
            
            enrichedContent.push({type: 'heading', text: '1. Kelime Alıştırması'});
            enrichedContent.push({type: 'paragraph', text: `Bu modül için **${moduleWords.length}** adet temel kelime seçildi.`});
            enrichedContent.push({type: 'words', html: wordsHtml});

            // Kelimelerden 5 adet soru (Quiz) oluşturulur
            for (let i = 0; i < Math.min(5, moduleWords.length); i++) {
                const correctWord = moduleWords[i];
                const options = [correctWord.turkish];
                
                const wrongOptions = this.allWords
                    .filter(w => w.turkish !== correctWord.turkish && w.difficulty.toUpperCase().includes(moduleLevel))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)
                    .map(w => w.turkish);
                    
                options.push(...wrongOptions);
                options.sort(() => 0.5 - Math.random());
                
                quizIndexStart++;
                enrichedContent.push({
                    type: 'quiz', 
                    question: `(Kelime Sorusu ${quizIndexStart}): '${correctWord.word}' kelimesinin Türkçe karşılığı nedir?`, 
                    options: options, 
                    answer: correctWord.turkish 
                });
            }
        }
        
        // --- 2. Cümle Alıştırmaları (sentences.json) ---
        const moduleSentences = this.allSentences.filter(s =>
            s.difficulty && s.difficulty.toUpperCase().includes(moduleLevel) &&
            (s.category.toLowerCase().includes(moduleTopic) || moduleTopic.includes(s.category.toLowerCase()))
        ).sort(() => 0.5 - Math.random()).slice(0, 10); // 10 adet cümle çekilir

        if (moduleSentences.length > 0) {
            const sentencesHtml = moduleSentences.map(s =>
                `<div class="sentence-item"><strong>${s.english}</strong> (${s.turkish})</div>`
            ).join('');

            enrichedContent.push({type: 'heading', text: '2. Cümle Yapısı Alıştırması'});
            enrichedContent.push({type: 'paragraph', text: `Konuyla alakalı **${moduleSentences.length}** adet örnek cümle.`});
            enrichedContent.push({type: 'sentences', html: sentencesHtml});

             // Cümlelerden 3 adet soru (Quiz) oluşturulur (boşluk doldurma simülasyonu)
            for (let i = 0; i < Math.min(3, moduleSentences.length); i++) {
                const sentence = moduleSentences[i];
                // Boşluk doldurmak için en az 3 kelimeli olması lazım
                if (sentence.english.split(' ').length < 3) continue; 
                
                const words = sentence.english.split(' ');
                const missingWordIndex = Math.floor(Math.random() * (words.length - 2)) + 1; 
                const missingWord = words[missingWordIndex].replace(/[.,?!]/g, '');
                
                const questionText = words.map((w, index) => index === missingWordIndex ? '___' : w).join(' ');
                
                const options = [missingWord];
                const wrongOptions = this.allWords
                    .filter(w => !w.word.toLowerCase().includes(missingWord.toLowerCase()) && w.difficulty.toUpperCase().includes(moduleLevel))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)
                    .map(w => w.word);
                    
                options.push(...wrongOptions);
                options.sort(() => 0.5 - Math.random());

                quizIndexStart++;
                enrichedContent.push({
                    type: 'quiz', 
                    question: `(Cümle Sorusu ${quizIndexStart}): Cümledeki boşluğu doldurun: "${questionText}"`, 
                    options: options, 
                    answer: missingWord 
                });
            }
        }

        // --- 3. Okuma Parçası (reading_stories.json) ---
        const levelCode = (moduleLevel === 'A1' ? 'beginner' : moduleLevel === 'B1' ? 'intermediate' : 'advanced');
        
        const moduleReading = this.allReadings.find(r => 
            r.level.toLowerCase().includes(levelCode) && 
            (r.category.toLowerCase().includes(moduleTopic) || moduleTopic.includes(r.category.toLowerCase()))
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
                    answer: q.options[q.correctAnswer] 
                });
            });
        }
        
        return enrichedContent;
    },

    // Quiz başlatma fonksiyonu (Çoktan seçmeli soruları gösterir)
    startQuiz: function(moduleId) {
        this.showSection('moduleQuizSection');
        const quizEl = document.getElementById('moduleQuizSection');
        
        const levelData = Object.values(this.allModules).find(l => l.modules.some(m => m.id === moduleId));
        const baseModule = levelData ? levelData.modules.find(m => m.id === moduleId) : null;
        
        const enrichedContent = this.enrichModuleContent(moduleId, baseModule);
        const quizQuestions = enrichedContent.filter(item => item.type === 'quiz');

        let currentQuestionIndex = 0;
        let userAnswers = {}; // {questionIndex: selectedOption}

        const renderQuizQuestion = () => {
            if (currentQuestionIndex >= quizQuestions.length) {
                this.calculateModuleScore(moduleId, quizQuestions, userAnswers);
                return;
            }

            const q = quizQuestions[currentQuestionIndex];
            const progress = Math.round((currentQuestionIndex / quizQuestions.length) * 100);

            let optionsHtml = '';
            q.options.forEach((option, index) => {
                const selectedClass = userAnswers[currentQuestionIndex] === option ? 'selected-answer' : '';
                optionsHtml += `
                    <div class="quiz-option-item ${selectedClass}" data-option="${option}" onclick="LearningPath.selectOption('${currentQuestionIndex}', '${option}')">
                        ${option}
                    </div>
                `;
            });

            const quizContent = `
                <h3 class="mb-4">${baseModule.name} - Test (${currentQuestionIndex + 1} / ${quizQuestions.length})</h3>
                <div class="progress-container">
                    <div class="progress" role="progressbar" style="height: 12px;">
                        <div class="progress-bar" style="width: ${progress}%; background-color: #28a745;">${progress}%</div>
                    </div>
                </div>
                
                <div class="card p-4 my-4">
                    <h5>${q.question}</h5>
                    <div>
                        ${optionsHtml}
                    </div>
                </div>

                <div class="d-flex justify-content-between">
                    <button class="btn btn-secondary ${currentQuestionIndex === 0 ? 'd-none' : ''}" id="quizPrevButton">Geri</button>
                    <button class="btn btn-success" id="quizNextButton">${currentQuestionIndex === quizQuestions.length - 1 ? 'Testi Bitir' : 'Sonraki'}</button>
                </div>
            `;
            quizEl.innerHTML = quizContent;

            // Event Listeners
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

        this.selectOption = (qIndex, selectedOption) => {
            userAnswers[qIndex] = selectedOption;
            // Tüm seçeneklerin seçili sınıfını kaldır
            document.querySelectorAll('.quiz-option-item').forEach(item => item.classList.remove('selected-answer'));
            // Yeni seçilen seçeneğe sınıfı ekle
            document.querySelector(`.quiz-option-item[data-option="${selectedOption}"]`).classList.add('selected-answer');
        };

        renderQuizQuestion();
    },

    // Modül puanını hesaplar ve kaydeder
    calculateModuleScore: function(moduleId, questions, userAnswers) {
        let correctCount = 0;
        
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.answer) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        
        // Modül verilerini güncelle (Local Storage ve JS objesi)
        const userLevel = localStorage.getItem('userLevel');
        let modules = JSON.parse(localStorage.getItem('learningModules'));
        
        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        if (moduleIndex !== -1) {
            modules[moduleIndex].lastScore = score;
            modules[moduleIndex].progress = 100; 
            modules[moduleIndex].status = (score >= 70) ? 'Tamamlandı' : 'Tekrar Gerekli';
            modules[moduleIndex].lastDuration = Math.floor(Math.random() * 15) + 5; 

            localStorage.setItem('learningModules', JSON.stringify(modules));
        }

        this.showModuleResult(moduleId, score, questions.length, correctCount);
    },

    // Modül sonucunu gösterir
    showModuleResult: function(moduleId, score, totalQuestions, correctCount) {
        const quizEl = document.getElementById('moduleQuizSection');
        const userLevel = localStorage.getItem('userLevel');
        
        const resultHtml = `
            <div class="result-card">
                <h3 class="mb-4 ${score >= 70 ? 'text-success' : 'text-danger'}">${score >= 70 ? 'Tebrikler!' : 'Tekrar Gerekli'}</h3>
                <p class="h5">Toplam soru: ${totalQuestions}</p>
                <p class="h5">Doğru cevap sayısı: ${correctCount}</p>
                <p class="h4 level-result">Başarı Puanı: <span style="color: ${score >= 70 ? '#28a745' : '#dc3545'};">${score}%</span></p>
                
                ${score >= 70 ? '<p class="mt-4">Bu modülü başarıyla tamamladınız. Bir sonraki modüle geçebilirsiniz.</p>' : '<p class="mt-4">Modülü tekrar gözden geçirerek test için hazırlanabilirsiniz.</p>'}
                
                <button class="btn btn-lg btn-primary mt-3" onclick="LearningPath.displayLearningPath('${userLevel}')">Öğrenme Yoluna Dön</button>
            </div>
        `;
        quizEl.innerHTML = resultHtml;
    },

    // İlerleme verilerini sıfırlar
    resetProgress: function() {
        if (confirm("Tüm ilerlemeniz ve seviyeniz sıfırlanacaktır. Emin misiniz?")) {
            localStorage.removeItem('userLevel');
            localStorage.removeItem('learningModules');
            alert("İlerleme sıfırlandı. Seviye tespit testi yeniden başlayacak.");
            window.location.reload(); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => LearningPath.init());
