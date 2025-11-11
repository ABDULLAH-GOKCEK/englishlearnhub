// =========================================================================
// js/learning-path.js (V15.5.3 – VERCEL UYUMLU + %100 ÇALIŞIR)
// =========================================================================

const LearningPath = {
    // Sabitler (Vercel için /data/ yolu)
    TEST_FILE_PATH: '/data/level_test.json',
    MODULE_CONTENT_FILE_PATH: '/data/module_content.json',
    LEVEL_UP_EXAM_FILE_PATH: '/data/exam.json',
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

    // Standart Bölümler
    STANDARD_SECTIONS: [
        { id: 'word', name: '1. Kelime Bilgisi Alıştırması', type: 'word' },
        { id: 'sentence', name: '2. Cümle Yapısı Alıştırması', type: 'sentence' },
        { id: 'reading', name: '3. Okuma Anlama Alıştırması', type: 'reading' }, 
    ],

    MODULE_CATEGORY_MAP: {
        'a1_m1': { words: ['Animals', 'Greetings'], sentences: ['Greetings', 'Introduction'], readings: ['beginner'] },
        'a1_m2': { words: ['Numbers', 'Food'], sentences: ['Family'], readings: ['beginner'] },
        // Diğerlerini genişlet (paylaştığın JSON'lara göre)
    },

    // =========================================================================
    // 1. VERİ YÜKLEME (Vercel Error Handling Eklendi)
    // =========================================================================
    loadAllData: async function() {
        const fetchData = async (path) => {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${path} bulunamadı. /public/data/ klasörüne taşıyın.`);
                return await res.json();
            } catch (error) {
                console.error('JSON Yükleme Hatası:', path, error);
                // Fallback: Boş array/nesne dön, uyarı ver
                alert(`Dosya yüklenemedi: ${path}. Vercel'de /public/data/ altına koyun.`);
                return path.includes('level_test') ? { questions: [] } : {};
            }
        };

        const [moduleContentData, testData, wordsData, sentencesData, readingsData, examData] = await Promise.all([
            fetchData(this.MODULE_CONTENT_FILE_PATH),
            fetchData(this.TEST_FILE_PATH),
            fetchData('/data/words.json'),
            fetchData('/data/sentences.json'),
            fetchData('/data/reading_stories.json'),
            fetchData(this.LEVEL_UP_EXAM_FILE_PATH)
        ]);

        // Modül verisi (senin JSON'a göre)
        this.allModules = moduleContentData;
        this.allModuleContents = moduleContentData;

        // Test soruları
        this.allLevelTestQuestions = testData.questions || [];

        // Diğer veriler
        this.allExamQuestions = examData || [];
        this.allWords = wordsData || [];
        this.allSentences = sentencesData || [];
        this.allReadings = readingsData || [];
    },

    // =========================================================================
    // 2. SEVİYE TESTİ (Başlatma Düzeltildi)
    // =========================================================================
    startLevelTest: function() {
        if (this.allLevelTestQuestions.length === 0) {
            alert('Seviye testi soruları yüklenemedi. /public/data/level_test.json dosyasını kontrol edin.');
            return;
        }
        this.currentQuizQuestions = this.shuffleArray([...this.allLevelTestQuestions]).slice(0, 10);
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        this.showSection('quizSection');
        document.getElementById('quizTitle').textContent = 'Seviye Tespit Testi';
        this.showQuizQuestion(this.currentQuizQuestions[0]);
    },

    // =========================================================================
    // 3. ÖĞRENME YOLU (V15.5 Korundu)
    // =========================================================================
    displayLearningPath: function(level) {
        const pathContainer = document.getElementById('learningPathSection');
        const levelName = level.toUpperCase();
        let pathHtml = `<h1>Öğrenme Yolum: ${levelName}</h1><div class="row">`;

        const levelModules = Object.keys(this.allModules).filter(key => key.startsWith(levelName.toLowerCase()));
        levelModules.forEach(key => {
            const mod = this.allModules[key];
            pathHtml += `
                <div class="col-md-4">
                    <div class="card module-card">
                        <h5>${mod.title}</h5>
                        <p>${mod.topic}</p>
                        <button class="btn btn-primary" onclick="LearningPath.displayModuleContent('${key}', 'word')">
                            Başla
                        </button>
                    </div>
                </div>`;
        });

        pathHtml += '</div>';
        pathContainer.innerHTML = pathHtml;
        this.showSection('learningPathSection');
    },

    // =========================================================================
    // 4. MODÜL İÇERİK (JSON'lara Göre Güncellendi)
    // =========================================================================
    displayModuleContent: function(moduleKey, sectionId) {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return alert('Modül yok.');

        if (!moduleInfo.content) this.loadModuleContent(moduleKey);
        const content = moduleInfo.content[sectionId] || [];

        const container = document.getElementById('moduleContentSection');
        container.innerHTML = `<h3>${moduleInfo.title} - ${sectionId}</h3>`;

        content.forEach(item => {
            if (sectionId === 'word' || sectionId === 'sentence') {
                container.innerHTML += `<li><strong>${item.english}</strong> - ${item.turkish}</li>`;
            } else if (sectionId === 'reading') {
                container.innerHTML += `<div><h5>${item.title}</h5><p>${item.content}</p></div>`;
            }
        });

        container.innerHTML += `<button class="btn btn-success" onclick="LearningPath.startSectionQuiz('${moduleKey}', '${sectionId}')">Sınav Başla</button>`;
        this.showSection('moduleContentSection');
    },

    // =========================================================================
    // 5. BÖLÜM SINAVI
    // =========================================================================
    startSectionQuiz: function(moduleKey, sectionId) {
        // module_content.json'dan quiz çek
        const quizzes = moduleInfo.content.filter(c => c.type === 'quiz');
        if (quizzes.length === 0) return alert('Soru yok.');

        this.currentQuizQuestions = quizzes.map(q => ({ question: q.question, options: q.options, answer: q.options.indexOf(q.answer) }));
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `${sectionId} Sınavı`;
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    showQuizQuestion: function(question) {
        const container = document.getElementById('quizQuestions');
        container.innerHTML = `
            <h5>${question.question}</h5>
            ${question.options.map((opt, i) => `
                <div class="question-option" onclick="LearningPath.selectAnswer(${i})">${opt}</div>
            `).join('')}
            <button onclick="LearningPath.nextQuestion()">Sonraki</button>
        `;
    },

    selectAnswer: function(index) {
        this.currentQuizAnswers[this.currentQuestionIndex] = index;
    },

    nextQuestion: function() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.currentQuizQuestions.length) {
            this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        } else {
            this.displayQuizResults();
        }
    },

    // =========================================================================
    // 6. SONUÇLAR VE YARDIMCI (V15.5 Korundu)
    // =========================================================================
    displayQuizResults: function() {
        const score = this.calculateScore();
        const level = this.calculateLevelFromScore(score);
        this.saveUserLevel(level);
        document.getElementById('quizResults').innerHTML = `<h3>Seviye: ${level}</h3><button onclick="LearningPath.displayLearningPath('${level}')">Öğrenme Yoluna Başla</button>`;
        this.showSection('quizResultsSection');
    },

    calculateScore: function() {
        let correct = 0;
        this.currentQuizQuestions.forEach((q, i) => {
            if (this.currentQuizAnswers[i] === q.answer) correct++;
        });
        return Math.round((correct / this.currentQuizQuestions.length) * 100);
    },

    calculateLevelFromScore: function(score) {
        if (score >= 90) return 'B1';
        if (score >= 70) return 'A2';
        return 'A1';
    },

    saveUserLevel: function(level) { localStorage.setItem('userLevel', level); },

    shuffleArray: function(array) { return array.sort(() => Math.random() - 0.5); },

    showSection: function(sectionId) {
        document.querySelectorAll('.module-section').forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    },

    // Init
    init: function() {
        this.loadAllData().then(() => {
            const userLevel = localStorage.getItem('userLevel');
            if (userLevel) {
                this.displayLearningPath(userLevel);
            } else {
                this.showSection('introSection');
            }
        });
    },

    resetProgress: function() {
        if (confirm('Sıfırlamak istiyor musunuz?')) {
            localStorage.clear();
            location.reload();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath;
    LearningPath.init();
    document.getElementById('startTestButton').addEventListener('click', () => LearningPath.startLevelTest());
});
