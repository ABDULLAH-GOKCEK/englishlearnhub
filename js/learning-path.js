// =========================================================================
// js/learning-path.js (V15.5.2 – ORİJİNAL V15.5 YAPISI + HATA DÜZELTME)
// =========================================================================

const LearningPath = {
    // Sabitler
    TEST_FILE_PATH: 'data/level_test.json',
    MODULE_CONTENT_FILE_PATH: 'data/module_content.json',
    LEVEL_UP_EXAM_FILE_PATH: 'data/exam.json',
    PASS_SCORE: 90,

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
    loadAllData: async function() {
        const fetchData = async (path) => {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP hatası! Durum: ${res.status} (${path})`);
                return await res.json();
            } catch (error) {
                console.error(`JSON Yükleme Hatası: ${path}`, error);
                alert(`Dosya yüklenemedi: ${path}. Lütfen yolu kontrol edin veya yerel server kullanın.`);
                return {};
            }
        };

        const moduleContentData = await fetchData(this.MODULE_CONTENT_FILE_PATH);
        const testData = await fetchData(this.TEST_FILE_PATH);
        const wordsData = await fetchData('data/words.json');
        const sentencesData = await fetchData('data/sentences.json');
        const readingsData = await fetchData('data/reading_stories.json');
        const examData = await fetchData(this.LEVEL_UP_EXAM_FILE_PATH);

        this.allModuleContents = moduleContentData;
        this.allModules = moduleContentData;  // Senin JSON'a göre doğrudan nesne

        this.allLevelTestQuestions = testData.questions || [];

        this.allExamQuestions = examData || [];
        this.allWords = wordsData || [];
        this.allSentences = sentencesData || [];
        this.allReadings = readingsData || [];
    },

    // =========================================================================
    // 2. MODÜL İÇERİK YÜKLEME (V15.5 KORUNDU + DÜZELTME)
    // =========================================================================
    loadModuleContent: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return;

        moduleInfo.content = { words: [], sentences: [], readings: [] };

        // words.json'dan çek
        moduleInfo.content.words = this.allWords.filter(w => w.category === moduleInfo.topic && w.difficulty === moduleInfo.level.toLowerCase() || 'easy');

        // sentences.json'dan çek
        moduleInfo.content.sentences = this.allSentences.filter(s => s.category === moduleInfo.topic && s.difficulty === moduleInfo.level.toLowerCase() || 'easy');

        // reading_stories.json'dan çek
        moduleInfo.content.readings = this.allReadings.filter(r => r.category === moduleInfo.topic && r.level === moduleInfo.level.toLowerCase() || 'beginner');
    },

    // =========================================================================
    // 3. SEVİYE TESTİ (V15.5 KORUNDU + DÜZELTME)
    // =========================================================================
    startLevelTest: function() {
        if (this.allLevelTestQuestions.length === 0) {
            alert('Seviye testi soruları yüklenemedi. Lütfen data/level_test.json dosyasını kontrol edin veya yerel server kullanın.');
            return;
        }
        this.shuffledTestQuestions = this.shuffleArray(this.allLevelTestQuestions);
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = new Array(this.allLevelTestQuestions.length);
        this.displayTestQuestion(this.currentQuestionIndex);
        this.showSection('levelTestSection');
        document.getElementById('navToPathButton').classList.add('d-none');
    },

    displayTestQuestion: function(index) {
        const question = this.shuffledTestQuestions[index];
        const container = document.getElementById('levelTestSection');
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5>${index + 1}. ${question.question}</h5>
                    <div class="question-options-group">
                        ${question.options.map((opt, i) => `
                            <div class="question-option ${this.currentQuizAnswers[index] === i ? 'selected-answer' : ''}" onclick="LearningPath.selectTestAnswer(${index}, ${i})">
                                <input type="radio" class="form-check-input" name="q${index}" ${this.currentQuizAnswers[index] === i ? 'checked' : ''}>
                                <label class="form-check-label">${opt}</label>
                            </div>
                        `).join('')}
                    </div>
                    <div class="mt-3 d-flex justify-content-between">
                        <button class="btn btn-secondary" onclick="LearningPath.previousQuestion(${index})" ${index === 0 ? 'disabled' : ''}>Önceki</button>
                        <button class="btn btn-primary" onclick="LearningPath.nextQuestion(${index})">${index === this.shuffledTestQuestions.length - 1 ? 'Bitir' : 'Sonraki'}</button>
                    </div>
                </div>
            </div>
        `;
    },

    selectTestAnswer: function(questionIndex, answerIndex) {
        this.currentQuizAnswers[questionIndex] = answerIndex;
        this.displayTestQuestion(questionIndex);
    },

    previousQuestion: function(index) {
        if (index > 0) this.displayTestQuestion(index - 1);
    },

    nextQuestion: function(index) {
        if (this.currentQuizAnswers[index] === undefined) return alert('Lütfen bir şık seçin.');

        if (index < this.shuffledTestQuestions.length - 1) {
            this.displayTestQuestion(index + 1);
        } else {
            this.calculateLevel(this.currentQuizAnswers);
            this.displayQuizResults();
        }
    },

    // =========================================================================
    // SIFIRLAMA (V15.5 KORUNDU)
    // =========================================================================
    resetProgress: function() {
        if (confirm("Tüm ilerlemenizi sıfırlamak istiyor musunuz?")) {
            localStorage.clear();
            alert('Sıfırlandı.');
            location.reload();
        }
    },

    // Diğer fonksiyonlar (V15.5 korundu): calculateLevel, displayQuizResults, vb. ...
    // Tam kod için önceki versiyonu kullan, sadece yukarıdakileri ekle.
};

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; 
    LearningPath.init();
});
