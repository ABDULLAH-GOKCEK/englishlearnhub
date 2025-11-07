// =========================================================================
// js/learning-path.js (V14.5 - Hata Kontrollü Versiyon)
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
    // =========================================================================
    
    init: function() {
        this.loadAllData().then(() => {
            console.log("Tüm veriler yüklendi.");
            
            const userLevel = localStorage.getItem('userLevel');
            console.log(`Mevcut Kullanıcı Seviyesi: ${userLevel || 'Yok'}.`); // LOG 1
            
            // Eğer kullanıcı seviyesi varsa öğrenme yoluna başla, yoksa giriş ekranını göster.
            if (userLevel) {
                this.displayLearningPath(userLevel);
            } 
            else {
                this.showSection('introSection');
            }
            
            // Seviye Tespit Butonunun dinleyicisi ekleniyor (loadAllData sonrası)
            const startTestButton = document.getElementById('startTestButton');
            if (startTestButton) {
                 startTestButton.onclick = () => {
                    console.log("Seviye Tespit Butonuna Tıklandı. Test Başlatılıyor..."); // LOG 2
                    localStorage.removeItem('levelTestAnswers'); 
                    this.prepareAndDisplayLevelTest();
                 };
            } else {
                console.warn("HTML Uyarısı: 'startTestButton' ID'li buton DOM'da bulunamadı. Lütfen HTML dosyanızı kontrol edin."); // LOG 3
            }
        }).catch(error => {
            console.error("Kritik Hata: Veri yüklenirken hata oluştu:", error);
            alert("Uygulama başlatılamadı. Veri dosyalarını kontrol edin.");
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
        
        const [moduleContentData, testData, wordsData, sentencesData, readingsData, examData] = await Promise.all([
            fetchData(this.MODULE_CONTENT_FILE_PATH).catch(() => ({})), 
            fetchData(this.TEST_FILE_PATH).catch(() => ({})),
            fetchData('data/words.json').catch(() => []), 
            fetchData('data/sentences.json').catch(() => []), 
            fetchData('data/reading_stories.json').catch(() => []), 
            fetchData(this.LEVEL_UP_EXAM_FILE_PATH).catch(() => []) 
        ]);
        
        this.allModules = moduleContentData.modules || {}; 
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
    
    // ... (Diğer tüm fonksiyonlar aynı kalmıştır)

    // =========================================================================
    // 4. GENEL SINAV MANTIĞI (prepareAndDisplayLevelTest fonskiyonu)
    // =========================================================================

    // Seviye Testini Hazırla ve Göster (V14.5)
    prepareAndDisplayLevelTest: function() {
        const MAX_QUESTIONS = 20;
        
        // Sadece sorusu ve cevabı olanları al
        let rawQuestions = this.allLevelTestQuestions
            .filter(q => q.correctAnswer && (q.questionText || q.question))
            .map((q, index) => ({
                id: q.id || `lq${index}`, question: q.questionText || q.question, options: q.options,
                answer: q.correctAnswer || q.answer, topic: q.topic || 'Genel', level: q.level || 'A1' 
            }));
            
        if (rawQuestions.length === 0) {
            this.showQuizError("Seviye tespit testi başlatılamadı. Lütfen `level_test.json` dosyasında soru olduğundan emin olun.");
            return;
        }

        // Soruları karıştır ve MAX_QUESTIONS kadarını al
        this.currentQuizQuestions = this.shuffleArray(rawQuestions)
            .slice(0, MAX_QUESTIONS)
            .map(q => {
            // Seviye testinde şıkları karıştır
            return {
                ...q,
                options: this.shuffleArray([...q.options])
            };
        });

        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `Seviye Tespit Testi`;
        this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        this.showSection('quizSection'); 
    },
    
    // ... (Geri kalan tüm fonksiyonlar V14.5 ile aynıdır)
    // NOT: Tüm diğer fonksiyonları (showQuizQuestion, processQuizAnswer, displayQuizResults vb.) V14.5'ten aynen kopyalamayı unutmayın.

    // =========================================================================
    // SIFIRLAMA FONKSİYONLARI BİTİŞ
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
    // ... (Diğer tüm fonksiyonlar aynı kalmıştır)
};

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; 
    LearningPath.init();
});
