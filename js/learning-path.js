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

    // --- Seslendirme Fonksiyonları (YENİ) ---
    speak: function(text) {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        
        this.speechUtterance = new SpeechSynthesisUtterance(text);
        
        // İngilizce bir ses seçmeye çalış
        const englishVoice = this.synth.getVoices().find(voice => voice.lang.startsWith('en'));
        if (englishVoice) {
            this.speechUtterance.voice = englishVoice;
        } else {
            // İngilizce ses bulunamazsa varsayılanı kullan
            this.speechUtterance.lang = 'en-US'; 
        }

        this.speechUtterance.rate = 0.9; // Konuşma hızını ayarla
        this.speechUtterance.pitch = 1.0; 

        this.synth.speak(this.speechUtterance);
    },

    stopSpeaking: function() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
    },
    // --- Seslendirme Fonksiyonları Bitişi ---

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

    // ... Diğer yardımcı fonksiyonlar (showSection, getBadgeClass, vs.) ...
    showSection: function(sectionId) {
        // Seslendirmeyi durdur
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
    
    getBadgeClass: function(status) {
        if (status === 'Tamamlandı') return 'bg-success';
        if (status === 'Başlanmadı') return 'bg-danger';
        if (status === 'Tekrar Gerekli') return 'bg-warning text-dark';
        if (status === 'Atlandı (Soru Yok)') return 'bg-info text-dark'; 
        return 'bg-secondary';
    },

    // ... displayModuleContent Fonksiyonu (GÜNCEL) ...
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
        
        const enrichedContent = this.getModuleContentHTML(moduleId, baseModule, userLevel);

        enrichedContent.forEach(item => {
            switch(item.type) {
                case 'heading':
                    contentHtml += `<h4 class="mt-4">${item.text}</h4>`;
                    break;
                case 'paragraph':
                    contentHtml += `<p>${item.text}</p>`;
                    break;
                // ... Diğer içerik türleri
                case 'words':
                    contentHtml += `<div class="word-list-section" style="columns: 2;">${item.html}</div>`;
                    contentHtml += this.renderInlineQuizSection('word', baseModule, currentModule);
                    break;
                case 'sentences':
                    contentHtml += `<div class="sentence-list-section">${item.html}</div>`;
                    contentHtml += this.renderInlineQuizSection('sentence', baseModule, currentModule);
                    break;
                case 'reading_text':
                    // Okuma içeriğini ve ses butonunu ekle (GÜNCEL)
                    contentHtml += `
                        <div class="mt-4">
                            <h4>3. Okuma: ${baseModule.reading_story_title || 'Hikaye Başlığı'}</h4>
                            <p class="mb-2"><small class="text-muted">**Seviye:** ${item.level} - **Konu:** ${item.category}. Parçayı okuyun ve aşağıdaki soruları cevaplayın.</small></p>
                            
                            <div class="d-flex justify-content-end mb-2">
                                <button id="speechButton" class="btn btn-sm btn-outline-info" 
                                    data-text="${item.text.replace(/"/g, '')}">
                                    <i class="fas fa-volume-up me-1"></i> Sesli Oku / Durdur
                                </button>
                            </div>

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
                                <strong>Okuma Hikayesi Bulunamadı:</strong> Mevcut seviyeniz (${userLevel}) ve modül konusu (${baseModule.topic}) ile eşleşen bir okuma hikayesi/metni <code>reading_stories.json</code> dosyanızda bulunamadı. Bu bölüm **otomatik olarak tamamlanmış sayılacaktır**.
                            </div>
                        </div>
                    `;
                    contentHtml += this.renderInlineQuizSection('reading', baseModule, currentModule);
                    break;
            }
        });
        
        // ... (Modül test butonu HTML kısmı) ...
        const totalSections = this.STANDARD_SECTIONS.length;
        const completedSections = currentModule.sectionProgress.filter(s => s.status === 'Tamamlandı' || s.status === 'Atlandı (Soru Yok)').length;
        const isSectionsCompleted = completedSections === totalSections;

        const testButtonClass = isSectionsCompleted ? 'btn-success' : 'btn-secondary';
        const testButtonText = isSectionsCompleted ? 'Genel Testi Başlat' : `Tüm bölümler tamamlanmalı (${completedSections}/${totalSections})`;

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
        
        // --- SES BUTONU DİNLEYİCİSİ (YENİ) ---
        const speechButton = document.getElementById('speechButton');
        if (speechButton) {
            speechButton.addEventListener('click', () => {
                const textToRead = speechButton.getAttribute('data-text');
                if (this.synth.speaking && this.speechUtterance && this.speechUtterance.text === textToRead) {
                    this.stopSpeaking();
                } else {
                    this.speak(textToRead);
                }
            });
        }
        // --- SES BUTONU DİNLEYİCİSİ BİTİŞİ ---
    },
    
    // ... enrichModuleContent Fonksiyonu (KRİTİK GÜNCELLEME) ...
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
        
        // ... (Kelime ve Cümle alıştırmaları önceki kodla aynı) ...
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

        // --- 3. Okuma Parçası (reading_stories.json) - KRİTİK GÜNCELLEME ---
        let readingQuizQuestions = [];
        const readingLevelCode = allowedDifficulties.map(d => d.toLowerCase()).find(d => ['beginner', 'intermediate', 'advanced'].includes(d)) || 'beginner';
        
        let moduleReading = null;
        
        // 1. Aşama: KONU + SEVİYE bazlı eşleşme ara
        moduleReading = this.allReadings.find(r => 
            r.level.toLowerCase().includes(readingLevelCode) && 
            (['okuma', 'reading'].includes(baseModuleTopic) || // Eğer modül konusu zaten 'okuma' ise, seviye yeterlidir
             !baseModuleTopic || // Modül konusu boşsa (genel modül)
             r.category.toLowerCase().includes(baseModuleTopic) || // Hikaye kategorisi modül konusunu içeriyorsa
             baseModuleTopic.includes(r.category.toLowerCase())) // Modül konusu hikaye kategorisini içeriyorsa
        );
        
        // 2. Aşama: Eğer Konu bazlı eşleşme bulunamazsa, SADECE SEVİYE bazlı GENEL bir hikaye ara
        if (!moduleReading) {
            const generalCategories = ['general', 'daily life', 'nature', 'food', 'travel', 'people', 'music']; // JSON dosyanızdaki kategoriler eklendi
            
            moduleReading = this.allReadings.find(r => 
                 r.level.toLowerCase().includes(readingLevelCode) &&
                 generalCategories.some(cat => r.category.toLowerCase().includes(cat))
            );
        }

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
            
            // --- KRİTİK SORU ALMA DÜZELTMESİ BURADA ---
            if (Array.isArray(moduleReading.questions)) {
                moduleReading.questions.forEach((q) => {
                     // Soru cevabını seçenek dizisinden alıyoruz (moduleReading.questions[i].correctAnswer bir indekstir)
                     const correctAnswerText = q.options[q.correctAnswer]; 

                     readingQuizQuestions.push({
                        type: 'quiz', 
                        question: `(Okuma Sorusu): ${q.question}`, 
                        options: q.options, 
                        // Önceki kodunuzda hata buradaydı: q.options[q.correctAnswer] yerine q.correctAnswer kullanıyorduk
                        answer: correctAnswerText, 
                        topic: `${moduleReading.title} - Okuma Anlama`
                    });
                });
            }
        } else {
             // Hala bulunamadıysa yer tutucu ekle (Genel hikaye bile yoksa)
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
    // ... (Geri kalan tüm fonksiyonlar önceki kodla aynı, özellikle `renderInlineQuizSection` içindeki otomatik atlama mantığı geçerli) ...
    // ...
    // ...
    
    // resetUserLevel ve resetProgress fonksiyonları (Önceki kodla aynı)
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
    
    // ... (Diğer tüm fonksiyonlar: calculateLevel, displayLearningPath, startQuiz, calculateModuleScore, showModuleResult)
};

document.addEventListener('DOMContentLoaded', () => LearningPath.init());
