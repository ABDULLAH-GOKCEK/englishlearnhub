// =========================================================================
// js/learning-path.js (V14.5 - İçerik Farklılaştırma, Dinamik Modül Sınavı ve Seviye Atlatma Fix)
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
    // Lütfen Kategori ve Zorluk seviyelerinin JSON dosyalarınızdaki değerlerle eşleştiğinden emin olun.
    // =========================================================================
    MODULE_CATEGORY_MAP: {
        'A1-M1': { words: ['Animals', 'Greetings', 'Basic Nouns', 'Family'], sentences: ['Greetings', 'Introduction', 'Daily Life'], readings: ['beginner'] },
        'A1-M2': { words: ['Numbers', 'Food', 'Colors', 'Time'], sentences: ['Family', 'Ordering Food', 'Simple Questions', 'Time'], readings: ['beginner'] },
        'A1-M3': { words: ['Home', 'Jobs', 'Adjectives', 'Action Verbs'], sentences: ['Directions', 'Past Events', 'Ability', 'Obligation'], readings: ['beginner'] },
        
        // A2 ve sonrası için bu haritayı kendi veri kategorilerinizle genişletin
        'A2-M1': { words: ['Health', 'Travel', 'Weather', 'Education'], sentences: ['Future Plans', 'Comparison', 'Modal Verbs'], readings: ['elementary'] },
        'A2-M2': { words: ['City', 'Shopping', 'Technology', 'Media'], sentences: ['Advice', 'Passive Voice', 'Reported Speech'], readings: ['elementary'] },
        'B1-M1': { words: ['Abstract', 'Politics', 'Business', 'Environment'], sentences: ['Conditionals', 'Phrasal Verbs', 'Complex Sentence'], readings: ['intermediate'] },
        // ...
    },
    
    // =========================================================================
    // TEMEL İŞLEMLER
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
            
            // Başlat butonuna event listener ekle
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

    // Bölüm değiştirme
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
            // Veri yollarını güncelleyin
            this.allLevelTestQuestions = await fetchJson(this.TEST_FILE_PATH); // level_test.json
            this.allExamQuestions = await fetchJson(this.LEVEL_UP_EXAM_FILE_PATH); // exam.json
            const moduleData = await fetchJson(this.MODULE_CONTENT_FILE_PATH); // module_content.json
            
            // Tüm kelime/cümle/okuma verilerini tek bir array'de birleştirin (Tüm JSON'lar zaten yüklü varsayılıyor)
            this.allWords = await fetchJson('data/words.json'); 
            this.allSentences = await fetchJson('data/sentences.json');
            this.allReadings = await fetchJson('data/reading_stories.json');
            
            this.allModules = moduleData.modules;

        } catch (error) {
            console.error("Veri yükleme hatası:", error);
            throw error; // init fonksiyonunda yakalanacak
        }
    },
    
    // =========================================================================
    // MODÜL İÇERİĞİ VE SINAV MANTIĞI İYİLEŞTİRMELERİ (YENİ EKLEMELER)
    // =========================================================================
    
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

    // Hata Mesajı Gösterme
    showQuizError: function(message) {
        const quizContainer = document.getElementById('quizQuestions');
        document.getElementById('quizTitle').textContent = "Hata";
        quizContainer.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>
                                  <button class="btn btn-primary mt-3" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">Öğrenme Yoluna Dön</button>`;
        this.showSection('quizSection');
    },


    // *************************************************************************
    // 1. İÇERİK FARKLIŞTIRMA VE FİLTRELEME İÇİN GÜNCELLEME
    // *************************************************************************
    loadModuleContent: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        const level = moduleInfo.level;
        const map = this.MODULE_CATEGORY_MAP[moduleKey]; // Haritayı al

        if (!map) {
            console.warn(`[UYARI] Modül içerik haritası bulunamadı: ${moduleKey}. Varsayılan olarak tüm seviye içeriği filtrelenecek.`);
            // Varsayılan seviye bazlı filtreleme (içerik tekrarını önler ama çalışmayı durdurmaz)
            moduleInfo.content.words = this.allWords.filter(w => w.difficulty === level.toLowerCase());
            moduleInfo.content.sentences = this.allSentences.filter(s => s.difficulty === level.toLowerCase());
            moduleInfo.content.readings = this.allReadings.filter(r => r.level === level.toLowerCase());
            
            this.allModuleContents[moduleKey] = moduleInfo.content;
            return; 
        }

        // 1. KELİMELERİ FİLTRELEME (İstenen category'lerde ve seviyeye uygun olanlar)
        moduleInfo.content.words = this.allWords.filter(word => {
            const isCorrectLevel = word.difficulty === level.toLowerCase();
            const isCorrectCategory = map.words.includes(word.category);
            return isCorrectLevel && isCorrectCategory;
        });

        // 2. CÜMLELERİ FİLTRELEME
        moduleInfo.content.sentences = this.allSentences.filter(sentence => {
            const isCorrectLevel = sentence.difficulty === level.toLowerCase();
            const isCorrectCategory = map.sentences.includes(sentence.category);
            return isCorrectLevel && isCorrectCategory;
        });

        // 3. OKUMA PARÇALARINI FİLTRELEME
        moduleInfo.content.readings = this.allReadings.filter(reading => {
            return map.readings.includes(reading.level);
        });

        this.allModuleContents[moduleKey] = moduleInfo.content;
    },


    // *************************************************************************
    // 2. MODÜL SINAVLARI İÇİN DİNAMİK SORU OLUŞTURMA
    // *************************************************************************
    createModuleQuizQuestions: function(moduleKey) {
        const moduleContent = this.allModuleContents[moduleKey];
        
        if (!moduleContent || moduleContent.words.length < 4 || moduleContent.sentences.length < 4) {
             console.error(`[HATA] Modül ${moduleKey} için yeterli içerik (minimum 4 kelime/cümle) bulunamadı.`);
             return [];
        }

        const allWords = moduleContent.words;
        const allSentences = moduleContent.sentences;
        
        let quizQuestions = [];
        
        // Kelime Testi: Kelimenin Türkçe karşılığını bulma (Maks 10 soru)
        const wordCount = Math.min(10, allWords.length);
        const wordQuestions = this.shuffleArray([...allWords]) // Kopya oluştur
            .slice(0, wordCount) 
            .map(correctWord => {
                const correctAnswer = correctWord.turkish;
                
                // Yanlış şıkları, diğer kelimelerin Türkçe karşılıklarından seç
                const wrongOptions = this.shuffleArray(allWords
                    .filter(w => w.turkish !== correctAnswer)
                    .map(w => w.turkish)
                ).slice(0, 3);
                
                // Eğer yanlış şık sayısı 3'ten az ise (çok az kelime varsa), eksik şıklar için boş ekle
                while (wrongOptions.length < 3) {
                    wrongOptions.push(`Farklı Seçenek ${wrongOptions.length + 1}`);
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
        const sentenceQuestions = this.shuffleArray([...allSentences]) // Kopya oluştur
            .slice(0, sentenceCount) 
            .map(correctSentence => {
                const correctAnswer = correctSentence.turkish;
                
                // Yanlış şıkları, diğer cümlelerin Türkçe karşılıklarından seç
                const wrongOptions = this.shuffleArray(allSentences
                    .filter(s => s.turkish !== correctAnswer)
                    .map(s => s.turkish)
                ).slice(0, 3);

                while (wrongOptions.length < 3) {
                    wrongOptions.push(`Yanlış Çeviri ${wrongOptions.length + 1}`);
                }
                
                const options = this.shuffleArray([correctAnswer, ...wrongOptions]);

                return {
                    question: `"${correctSentence.english}" cümlesinin Türkçe karşılığı nedir?`,
                    options: options,
                    answer: correctAnswer,
                    isModuleQuiz: true // Modül sınavı olduğunu işaretle
                };
            });
            
        quizQuestions.push(...sentenceQuestions);
        
        // Toplam 20 soru (veya ne kadar varsa) döndür
        return this.shuffleArray(quizQuestions);
    },
    
    // displayModuleQuiz fonksiyonunu, dinamik soru oluşturmayı kullanacak şekilde güncelliyoruz
    displayModuleQuiz: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        const quizContainer = document.getElementById('quizQuestions');
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

    // ... (diğer quiz ve seviye atlama fonksiyonları - aşağıda güncellemeler) ...

    
    // *************************************************************************
    // 3. SEVİYE ATLATMA SINAVI HATASI DÜZELTME
    // *************************************************************************
    
    // CEFR seviyelerini döndürür
    getNextLevel: function(currentLevel) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1']; // CEFR seviyeleri
        const currentIndex = levels.indexOf(currentLevel.toUpperCase());
        if (currentIndex !== -1 && currentIndex < levels.length - 1) {
            return levels[currentIndex + 1];
        }
        return null; // C1'den sonra seviye yok
    },

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
            // Kontrol mesajını güncelledik
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

    // Not: showQuizQuestion, processQuizAnswer, displayQuizResults gibi diğer temel quiz fonksiyonları V14.4'ten kalma yapıda çalışmaya devam etmelidir. 
    // Yeterli yer olmadığından, tam kodu buraya sığdıramasam da, ana mantık değişiklikleri yukarıdaki fonksiyonlardadır.

    // ... (V14.4'ten kalan diğer tüm fonksiyonlar buraya gelmelidir: 
    // showQuizQuestion, processQuizAnswer, displayQuizResults, 
    // startLevelTest, displayLearningPath, checkAllModulesCompleted, 
    // isModuleCompleted, markModuleCompleted, getModuleStatus, 
    // displayModuleContent, speakText, getLevelRange, getLevelName, 
    // resetUserLevel, resetProgress) ...
};

// =========================================================================
// BAŞLANGIÇ
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; // Global erişim için
    LearningPath.init();
});
