// =========================================================================
// js/learning-path.js (V14.5 - Tam Versiyon)
// 1. Modüller Arası İçerik Farklılaştırma (MODULE_CATEGORY_MAP)
// 2. Dinamik Modül Sınavı Oluşturma (createModuleQuizQuestions)
// 3. Seviye Atlama Sınavı Yükleme Hatası Çözümü
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
    currentQuizQuestions: [],
    
    // Geçici Durum
    currentModuleKey: null,
    currentQuestionIndex: 0,
    currentQuizAnswers: [],
    
    // Seslendirme
    synth: window.speechSynthesis, 
    speechUtterance: null,

    // Her modül için sabit bölüm yapısı
    STANDARD_SECTIONS: [
        { id: 'word', name: '1. Kelime Bilgisi Alıştırması', type: 'word' },
        { id: 'sentence', name: '2. Cümle Yapısı Alıştırması', type: 'sentence' },
        { id: 'reading', name: '3. Okuma Anlama Alıştırması', type: 'reading' }, 
    ],

    // =========================================================================
    // YENİ EKLEME: Modül İçerik Haritası (Hangi Modül Hangi Kategorileri Kullanacak)
    // Bu harita, farklı modüllerde aynı kelimelerin görünmesini engeller.
    // JSON dosyalarınızdaki "category" ve "difficulty" değerleri ile eşleşmelidir.
    // =========================================================================
    MODULE_CATEGORY_MAP: {
        'A1-M1': { words: ['Animals', 'Greetings', 'Basic Nouns'], sentences: ['Greetings', 'Introduction', 'Daily Life'], readings: ['beginner'] },
        'A1-M2': { words: ['Numbers', 'Food', 'Colors', 'Time'], sentences: ['Family', 'Ordering Food', 'Simple Questions', 'Time'], readings: ['beginner'] },
        'A1-M3': { words: ['Family', 'Home', 'Jobs', 'Adjectives'], sentences: ['Directions', 'Past Events', 'Ability', 'Obligation'], readings: ['beginner'] },
        
        // A2 ve sonrası için kendi veri kategorilerinize göre bu haritayı genişletin:
        'A2-M1': { words: ['Health', 'Travel', 'Weather', 'Education'], sentences: ['Future Plans', 'Comparison', 'Modal Verbs'], readings: ['elementary'] },
        'A2-M2': { words: ['City', 'Shopping', 'Technology', 'Media'], sentences: ['Advice', 'Passive Voice', 'Reported Speech'], readings: ['elementary'] },
        'A2-M3': { words: ['Business', 'Abstract', 'Emotion', 'Politics'], sentences: ['Conditionals', 'Phrasal Verbs', 'Complex Sentence'], readings: ['elementary'] },
        
        'B1-M1': { words: ['Finance', 'Law', 'Science', 'Nature'], sentences: ['Inversion', 'Subjunctive', 'Advanced Tenses'], readings: ['intermediate'] },
        // ... (Diğer modüller buraya eklenecek)
    },
    
    // =========================================================================
    // TEMEL İŞLEMLER
    // =========================================================================
    
    init: function() {
        this.loadAllData().then(() => {
            console.log("Tüm veriler yüklendi.");
            
            const userLevel = localStorage.getItem('userLevel');
            
            // Eğer kullanıcı seviyesi yoksa testi başlat, varsa öğrenme yolunu göster
            if (userLevel) {
                this.displayLearningPath(userLevel);
            } 
            else {
                this.showSection('introSection');
            }
            
            document.getElementById('startTestButton')?.addEventListener('click', () => this.startLevelTest());
        }).catch(error => {
            console.error("Veri yüklenirken hata oluştu:", error);
            alert("Uygulama başlatılamadı. Veri dosyalarını kontrol edin.");
        });
    },

    // Güncel Seviye Bilgisi
    getCurrentUserLevel: function() {
        return localStorage.getItem('userLevel');
    },

    // Bölüm değiştirme (GİZLEME/GÖSTERME)
    showSection: function(sectionId) {
        document.querySelectorAll('.module-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; // CSS ile gizle
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
            activeSection.style.display = 'flex'; // CSS ile göster
        }
    },
    
    // Yardımcı fonksiyon: Array'i rastgele karıştırır
    shuffleArray: function(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    },

    // Veri Dosyalarını Yükleme
    loadAllData: async function() {
        const fetchJson = async (path) => {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Dosya yüklenemedi: ${path}`);
            }
            return response.json();
        };

        try {
            this.allLevelTestQuestions = await fetchJson(this.TEST_FILE_PATH);
            this.allExamQuestions = await fetchJson(this.LEVEL_UP_EXAM_FILE_PATH);
            const moduleData = await fetchJson(this.MODULE_CONTENT_FILE_PATH);
            
            // İçerik dosyalarını yükle
            this.allWords = await fetchJson('data/words.json'); 
            this.allSentences = await fetchJson('data/sentences.json');
            this.allReadings = await fetchJson('data/reading_stories.json');
            
            this.allModules = moduleData.modules;

        } catch (error) {
            console.error("Veri yükleme hatası:", error);
            throw error;
        }
    },

    // =========================================================================
    // İÇERİK FİLTRELEME VE YÜKLEME (GÜNCELLEME 1)
    // =========================================================================

    loadModuleContent: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        const level = moduleInfo.level;
        const map = this.MODULE_CATEGORY_MAP[moduleKey];

        // moduleInfo.content objesini oluştur/temizle
        moduleInfo.content = { words: [], sentences: [], readings: [] };

        if (!map) {
            console.warn(`[UYARI] Modül içerik haritası bulunamadı: ${moduleKey}. Varsayılan seviye bazlı filtreleme uygulanacak.`);
            // Varsayılan seviye bazlı filtreleme (içerik tekrarı yaşanabilir)
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
        if (!moduleInfo.content) {
            this.loadModuleContent(moduleKey);
        }
        
        const contentContainer = document.getElementById('moduleContentSection');
        contentContainer.innerHTML = '';
        contentContainer.style.textAlign = 'left';

        // Mevcut bölümün adını ve tipini bul
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
                // Okuma metinleri için ayrı bir görüntüleme veya quiz fonksiyonu çağrısı gerekebilir
                // Şimdilik sadece başlıklarını gösterelim:
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
    // MODÜL SINAV MANTIĞI (GÜNCELLEME 2)
    // =========================================================================
    
    // DİNAMİK SORU OLUŞTURMA
    createModuleQuizQuestions: function(moduleKey) {
        const moduleContent = this.allModuleContents[moduleKey];
        
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
    // GENEL SINAV MANTIĞI
    // =========================================================================

    showQuizQuestion: function(question) {
        const quizQuestionsContainer = document.getElementById('quizQuestions');
        quizQuestionsContainer.innerHTML = ''; // Önceki içeriği temizle

        const totalQuestions = this.currentQuizQuestions.length;
        const currentNumber = this.currentQuestionIndex + 1;
        
        let questionHtml = `
            <div class="mb-4">
                <p class="text-muted text-start">Soru ${currentNumber} / ${totalQuestions}</p>
                <h4 class="text-start">${question.question}</h4>
            </div>
            <div id="optionsContainer">
        `;

        question.options.forEach((optionText, index) => {
            const isSelected = this.currentQuizAnswers[this.currentQuestionIndex]?.answer === optionText;
            const selectedClass = isSelected ? 'selected-answer' : '';

            questionHtml += `
                <div class="question-option form-check ${selectedClass}" data-answer="${optionText}" 
                     onclick="LearningPath.processQuizAnswer('${optionText}')">
                    <input class="form-check-input" type="radio" name="quizOption" id="option${index}" value="${optionText}" ${isSelected ? 'checked' : ''}>
                    <label class="form-check-label" for="option${index}">${optionText}</label>
                </div>
            `;
        });
        
        questionHtml += `</div>
            <div class="d-flex justify-content-between mt-4">
                <button class="btn btn-outline-secondary" ${this.currentQuestionIndex === 0 ? 'disabled' : ''} 
                    onclick="LearningPath.showPreviousQuestion()">← Geri</button>
                <button id="nextQuestionButton" class="btn btn-primary" ${!this.currentQuizAnswers[this.currentQuestionIndex] ? 'disabled' : ''}
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
            answer: selectedAnswer
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

        // Modül sınavı mı yoksa seviye tespit sınavı mı olduğunu belirle
        const isModuleQuiz = this.currentModuleKey && this.allModules[this.currentModuleKey];

        if (isModuleQuiz) {
            // Modül Sınavı Sonuçları
            const moduleKey = this.currentModuleKey;
            const moduleInfo = this.allModules[moduleKey];
            const resultStatus = isPassed ? 'Başarılı' : 'Başarısız';
            
            if (isPassed) {
                this.markModuleCompleted(moduleKey);
                resultHtml += `<div class="alert alert-success text-center">Tebrikler! **${moduleInfo.name}** sınavını başarıyla (${score}%) geçtiniz.</div>`;
            } else {
                resultHtml += `<div class="alert alert-danger text-center">Tekrar Deneyin. **${moduleInfo.name}** sınavından yeterli puanı (${this.PASS_SCORE}%) alamadınız. Puanınız: ${score}%.</div>`;
            }
            
            resultHtml += `<p class="text-center">Doğru Sayısı: ${correctAnswers} / ${totalQuestions}</p>`;
            resultHtml += `<div class="d-flex justify-content-center mt-4">
                <button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">Öğrenme Yoluna Dön</button>
                <button class="btn btn-warning ms-3" onclick="LearningPath.displayModuleQuiz('${moduleKey}')">Tekrar Sınava Gir</button>
            </div>`;
            
        } else {
            // Seviye Tespit Sınavı Sonuçları veya Seviye Atlama Sınavı
            const determinedLevel = this.calculateLevel(this.currentQuizAnswers);
            const nextLevel = this.getNextLevel(this.getCurrentUserLevel());
            
            if (this.getCurrentUserLevel() && nextLevel) {
                 // Seviye Atlama Sınavı Sonuçları
                 const targetLevel = nextLevel;
                 
                 if (isPassed) {
                     this.markLevelUp(targetLevel);
                     resultHtml += `<div class="alert alert-success text-center">Tebrikler! ${this.getCurrentUserLevel()} seviyesini tamamladınız ve **${targetLevel}** seviyesine geçmeye hak kazandınız!</div>`;
                 } else {
                     resultHtml += `<div class="alert alert-warning text-center">Yeterli puanı (${this.PASS_SCORE}%) alamadınız. Mevcut seviyenizdeki modülleri tekrar gözden geçirin. Puanınız: ${score}%.</div>`;
                 }
                 resultHtml += `<div class="d-flex justify-content-center mt-4">
                     <button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel() || 'A1')">Öğrenme Yoluna Dön</button>
                 </div>`;
                 
            } else {
                 // Seviye Tespit Sınavı Sonuçları
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
    // SEVİYE ATLATMA VE İLERLEME MANTIĞI
    // =========================================================================
    
    // Seviye belirleme testi puanına göre seviye hesaplar
    calculateLevel: function(answers) {
        // Basit bir seviye hesaplama mantığı (Örn: level_test.json'daki soruların doğru cevap oranına göre)
        // Bu fonksiyon, gerçek bir seviye tespit algoritmasına göre güncellenmelidir.
        
        let correctCounts = {};
        this.allLevelTestQuestions.forEach(q => {
            const answer = answers.find(a => a.question.includes(q.questionText));
            if (answer && answer.answer === q.correctAnswer) {
                correctCounts[q.level] = (correctCounts[q.level] || 0) + 1;
            }
        });
        
        // Örnek: En çok doğru yapılan üst seviyeyi belirle
        let levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        let finalLevel = 'A1';

        for (let i = 0; i < levels.length; i++) {
            if (correctCounts[levels[i]] > 2) { // Her seviyeden 2'den fazla doğru varsa o seviyeye yükselt
                finalLevel = levels[i];
            } else {
                break;
            }
        }

        return finalLevel;
    },

    saveUserLevel: function(level) {
        localStorage.setItem('userLevel', level.toUpperCase());
    },
    
    // CEFR seviyelerini döndürür
    getNextLevel: function(currentLevel) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1']; // CEFR seviyeleri
        const currentIndex = levels.indexOf(currentLevel.toUpperCase());
        if (currentIndex !== -1 && currentIndex < levels.length - 1) {
            return levels[currentIndex + 1];
        }
        return null; // C1'den sonra seviye yok
    },

    markLevelUp: function(newLevel) {
        this.saveUserLevel(newLevel);
        // Yeni seviyeye geçince eski modül ilerlemelerini sil
        localStorage.removeItem('learningModules'); 
    },

    isModuleCompleted: function(moduleKey) {
        const modules = JSON.parse(localStorage.getItem('learningModules') || '{}');
        return modules[moduleKey]?.completed || false;
    },

    markModuleCompleted: function(moduleKey) {
        const modules = JSON.parse(localStorage.getItem('learningModules') || '{}');
        modules[moduleKey] = { completed: true, completionDate: new Date().toISOString() };
        localStorage.setItem('learningModules', JSON.stringify(modules));
    },

    checkAllModulesCompleted: function(level) {
        const levelModules = Object.keys(this.allModules).filter(key => this.allModules[key].level === level);
        return levelModules.length > 0 && levelModules.every(key => this.isModuleCompleted(key));
    },
    
    // Seviye Atlatma Sınavına Başla
    displayLevelUpExam: function(currentLevel) {
        const nextLevel = this.getNextLevel(currentLevel);
        const quizContainer = document.getElementById('quizQuestions');

        if (!nextLevel) {
            this.showQuizError("Tebrikler! Tüm seviyeleri tamamladınız ve C1 seviyesinin ötesindesiniz!");
            return;
        }

        // HATA DÜZELTME: exam.json'dan doğru seviyenin sorularını filtrele
        const levelExamQuestions = this.allExamQuestions.filter(q => q.difficulty.toUpperCase() === nextLevel.toUpperCase());

        if (levelExamQuestions.length === 0) {
            // Hata mesajı güncellendi
            this.showQuizError(`Sınav soruları yüklenemedi. **${nextLevel}** seviyesine ait seviye atlama soruları (**exam.json**) dosyasında bulunamadı. Lütfen veri dosyanızı kontrol edin.`);
            return;
        }

        // Quiz'i Hazırla
        this.currentQuizQuestions = this.shuffleArray(levelExamQuestions);
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `${currentLevel} Seviye Tamamlama Sınavı (${nextLevel} Seviyesine Geçiş)`;
        this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // ARAYÜZ VE NAVİGASYON
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

        const levelModules = Object.keys(this.allModules)
            .filter(key => this.allModules[key].level === levelName);
        
        if (levelModules.length === 0) {
             pathHtml += `<div class="alert alert-danger">Bu seviyeye ait tanımlanmış modül bulunmamaktadır. Lütfen module_content.json dosyasını kontrol edin.</div>`;
        } else {
            levelModules.forEach((key, index) => {
                const moduleInfo = this.allModules[key];
                const isCompleted = this.isModuleCompleted(key);
                const statusClass = isCompleted ? 'completed' : 'in-progress';
                const statusText = isCompleted ? 'Tamamlandı' : 'Başlanmadı/Devam Ediyor';
                
                // Modül içeriği yüklü değilse yükle
                if (!this.allModuleContents[key]) {
                    this.loadModuleContent(key);
                }

                pathHtml += `
                    <div class="col-md-4">
                        <div class="card module-card ${statusClass}">
                            <div class="card-body">
                                <i class="fas fa-book-open"></i>
                                <h5 class="card-title">${moduleInfo.name}</h5>
                                <p class="card-text">${moduleInfo.description}</p>
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
             pathHtml += `<div class="alert alert-info text-center mt-5">Tebrikler! ${levelName} seviyesindeki tüm modülleri tamamladınız.</div>`;
        } else {
             pathHtml += `<div class="alert alert-info text-center mt-5">Seviye atlama sınavına girmek için tüm modülleri tamamlamalısınız.</div>`;
        }
        
        pathHtml += `</div>`;

        pathContainer.innerHTML = pathHtml;
        this.showSection('learningPathSection');
        document.getElementById('navToPathButton')?.classList.remove('d-none');
    },

    // Seslendirme (Text-to-Speech)
    speakText: function(text) {
        if (this.speechUtterance) {
            this.synth.cancel(); // Önceki seslendirmeyi durdur
        }
        this.speechUtterance = new SpeechSynthesisUtterance(text);
        this.speechUtterance.lang = 'en-US'; // İngilizce seslendirme
        this.synth.speak(this.speechUtterance);
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

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; 
    LearningPath.init();
});
