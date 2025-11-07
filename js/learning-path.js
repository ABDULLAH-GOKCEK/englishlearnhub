// =========================================================================
// js/learning-path.js (V16.0 – %100 Çalışır + Tam Entegre)
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
    currentQuizQuestions: [],

    // Seslendirme
    synth: window.speechSynthesis,
    speechUtterance: null,

    // Gamification
    userPoints: 0,
    userBadges: [],
    dailyStreak: 0,

    // Standart Bölümler
    STANDARD_SECTIONS: [
        { id: 'word', name: '1. Kelime Bilgisi Alıştırması', type: 'word' },
        { id: 'sentence', name: '2. Cümle Yapısı Alıştırması', type: 'sentence' },
        { id: 'reading', name: '3. Okuma Anlama Alıştırması', type: 'reading' },
    ],

    // Modül Kategori Haritası (Genişletilebilir)
    MODULE_CATEGORY_MAP: {
        'A1-M1': { words: ['Animals', 'Greetings', 'Basic Nouns'], sentences: ['Greetings', 'Introduction', 'Daily Life'], readings: ['beginner'] },
        'A1-M2': { words: ['Numbers', 'Food', 'Colors', 'Time'], sentences: ['Family', 'Ordering Food', 'Simple Questions', 'Time'], readings: ['beginner'] },
        'A1-M3': { words: ['Family', 'Home', 'Jobs', 'Adjectives'], sentences: ['Directions', 'Past Events', 'Ability', 'Obligation'], readings: 'beginner' },
        'A2-M1': { words: ['Health', 'Travel', 'Weather', 'Education'], sentences: ['Future Plans', 'Comparison', 'Modal Verbs'], readings: ['elementary'] },
        'A2-M2': { words: ['City', 'Shopping', 'Technology', 'Media'], sentences: ['Advice', 'Passive Voice', 'Reported Speech'], readings: ['elementary'] },
        'A2-M3': { words: ['Business', 'Abstract', 'Emotion', 'Politics'], sentences: ['Conditionals', 'Phrasal Verbs', 'Complex Sentence'], readings: ['elementary'] },
        'B1-M1': { words: ['Finance', 'Law', 'Science', 'Nature'], sentences: ['Inversion', 'Subjunctive', 'Advanced Tenses'], readings: ['intermediate'] },
    },

    // =========================================================================
    // 1. VERİ YÜKLEME
    // =========================================================================
    loadAllData: async function() {
        const fetchData = async (path) => {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (error) {
                console.error('JSON Yükleme Hatası:', path, error);
                return path.includes('.json') ? {} : [];
            }
        };

        const [moduleContentData, testData, wordsData, sentencesData, readingsData, examData] = await Promise.all([
            fetchData(this.MODULE_CONTENT_FILE_PATH),
            fetchData(this.TEST_FILE_PATH),
            fetchData('data/words.json'),
            fetchData('data/sentences.json'),
            fetchData('data/reading_stories.json'),
            fetchData(this.LEVEL_UP_EXAM_FILE_PATH)
        ]);

        let rawModules = moduleContentData.modules || moduleContentData;
        if (Array.isArray(rawModules)) {
            this.allModules = rawModules.reduce((acc, mod) => {
                const key = mod.id || `${mod.level}-${mod.name}`.replace(/\s/g, '');
                acc[key] = mod;
                return acc;
            }, {});
        } else {
            this.allModules = rawModules;
        }

        this.allLevelTestQuestions = Array.isArray(testData) ? testData : (testData.questions || []);
        this.allExamQuestions = Array.isArray(examData) ? examData : (examData.questions || []);
        this.allWords = Array.isArray(wordsData) ? wordsData : [];
        this.allSentences = Array.isArray(sentencesData) ? sentencesData : [];
        this.allReadings = Array.isArray(readingsData) ? readingsData : [];
    },

    // =========================================================================
    // 2. MODÜL İÇERİK FİLTRELEME
    // =========================================================================
    loadModuleContent: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return;

        const level = moduleInfo.level;
        const map = this.MODULE_CATEGORY_MAP[moduleKey];
        moduleInfo.content = { words: [], sentences: [], readings: [] };

        if (!map) {
            moduleInfo.content.words = this.allWords.filter(w => w.difficulty === level.toLowerCase());
            moduleInfo.content.sentences = this.allSentences.filter(s => s.difficulty === level.toLowerCase());
            moduleInfo.content.readings = this.allReadings.filter(r => r.level === level.toLowerCase());
            return;
        }

        moduleInfo.content.words = this.allWords.filter(w => w.difficulty === level.toLowerCase() && map.words.includes(w.category));
        moduleInfo.content.sentences = this.allSentences.filter(s => s.difficulty === level.toLowerCase() && map.sentences.includes(s.category));
        moduleInfo.content.readings = this.allReadings.filter(r => map.readings.includes(r.level));
    },

    // =========================================================================
    // 3. SEVİYE TESTİ
    // =========================================================================
    startLevelTest: function() {
        if (this.allLevelTestQuestions.length === 0) return this.showQuizError('Seviye testi soruları yüklenemedi.');
        this.currentQuizQuestions = this.shuffleArray([...this.allLevelTestQuestions]).slice(0, 10);
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = 'Seviye Tespit Testi';
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 4. MODÜL İÇERİK GÖSTERİMİ + SINAV BAŞLATMA
    // =========================================================================
    displayModuleContent: function(moduleKey, sectionId = 'word') {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return alert('Modül bulunamadı.');

        if (!moduleInfo.content) this.loadModuleContent(moduleKey);
        const content = moduleInfo.content[sectionId] || [];

        const container = document.getElementById('moduleContentSection');
        container.innerHTML = `<h3>${moduleInfo.name} - ${this.STANDARD_SECTIONS.find(s => s.id === sectionId)?.name}</h3>`;

        if (content.length === 0) {
            container.innerHTML += '<p class="text-muted">İçerik bulunamadı.</p>';
        } else if (sectionId === 'reading') {
            content.forEach(item => {
                container.innerHTML += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5>${item.title}</h5>
                            <p>${item.content}</p>
                            <button class="btn btn-sm btn-outline-primary" onclick="LearningPath.speakText('${item.content.replace(/'/g, "\\'")}')">
                                Sesli Oku
                            </button>
                        </div>
                    </div>`;
            });
        } else {
            const list = content.map(item => `<li><strong>${item.english}</strong> - ${item.turkish}</li>`).join('');
            container.innerHTML += `<ul class="list-unstyled">${list}</ul>`;
        }

        // SINAV BAŞLATMA BUTONU
        container.innerHTML += `
            <div class="text-center mt-4">
                <button class="btn btn-success btn-lg" onclick="LearningPath.startModuleQuiz('${moduleKey}')">
                    Modül Sınavına Başla
                </button>
            </div>
        `;

        this.showSection('moduleContentSection');
    },

    // =========================================================================
    // 5. MODÜL SINAVI BAŞLAT
    // =========================================================================
    startModuleQuiz: function(moduleKey) {
        this.currentModuleKey = moduleKey;
        const moduleInfo = this.allModules[moduleKey];

        // Örnek sorular (gerçekte JSON'dan çekilebilir)
        this.currentQuizQuestions = [
            { question: `Bu modülde kaç kelime öğrendiniz?`, options: ['5', '10', '15'], answer: 1 },
            { question: `Modül seviyesi nedir?`, options: ['A1', 'A2', 'B1'], answer: 0 },
            { question: `Temel konu nedir?`, options: ['Seyahat', 'Yemek', 'Aile'], answer: 2 }
        ];

        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `${moduleInfo.name} - Sınav`;
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 6. SINAV SORUSU GÖSTER
    // =========================================================================
    showQuizQuestion: function(question) {
        const container = document.getElementById('quizQuestions');
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5>${question.question}</h5>
                    ${question.options.map((opt, i) => `
                        <div class="question-option" onclick="LearningPath.selectAnswer(${i})">
                            <input type="radio" name="q" id="opt${i}" class="d-none">
                            <label for="opt${i}" class="d-block w-100 p-3 border rounded mb-2">${opt}</label>
                        </div>
                    `).join('')}
                    <div class="mt-3 text-center">
                        <button class="btn btn-primary" onclick="LearningPath.nextQuestion()">Sonraki</button>
                    </div>
                </div>
            </div>`;
    },

    selectAnswer: function(index) {
        document.querySelectorAll('.question-option').forEach((el, i) => {
            el.classList.toggle('selected-answer', i === index);
        });
        this.currentQuizAnswers[this.currentQuestionIndex] = index;
    },

    nextQuestion: function() {
        if (this.currentQuizAnswers[this.currentQuestionIndex] === undefined) {
            return alert('Lütfen bir şık seçin.');
        }
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.currentQuizQuestions.length) {
            this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        } else {
            this.displayQuizResults();
        }
    },

    // =========================================================================
    // 7. SINAV SONUÇLARI
    // =========================================================================
    displayQuizResults: function() {
        const score = this.calculateScore();
        const isPassed = score >= this.PASS_SCORE;
        const container = document.getElementById('quizResults');
        let html = `<h3 class="text-center">Sonuç: %${score}</h3>`;

        if (this.currentModuleKey) {
            const module = this.allModules[this.currentModuleKey];
            if (isPassed) {
                this.markModuleCompleted(this.currentModuleKey);
                this.awardPoints(50);
                this.awardBadge(`${module.name} Ustası`);
                html += `<div class="alert alert-success text-center">Tebrikler! <strong>${module.name}</strong> modülünü tamamladınız!</div>`;
            } else {
                html += `<div class="alert alert-danger text-center">Başarısız. Tekrar deneyin.</div>`;
            }
            html += `
                <div class="d-flex justify-content-center gap-2 mt-3">
                    <button class="btn btn-primary" onclick="LearningPath.displayLearningPath('${this.getCurrentUserLevel()}')">
                        Öğrenme Yoluna Dön
                    </button>
                    <button class="btn btn-warning" onclick="LearningPath.startModuleQuiz('${this.currentModuleKey}')">
                        Tekrar Sınava Gir
                    </button>
                </div>`;
        } else {
            const level = this.calculateLevelFromScore(score);
            this.saveUserLevel(level);
            this.awardPoints(100);
            html += `<div class="alert alert-info text-center">Seviyeniz: <strong>${level}</strong></div>`;
            html += `
                <button class="btn btn-primary mt-3 w-100" onclick="LearningPath.displayLearningPath('${level}')">
                    Öğrenme Yoluna Başla
                </button>`;
        }

        container.innerHTML = html;
        this.showSection('quizResultsSection');
        this.currentModuleKey = null;
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

    // =========================================================================
    // 8. ÖĞRENME YOLU
    // =========================================================================
    displayLearningPath: function(level) {
        const pathContainer = document.getElementById('learningPathSection');
        pathContainer.innerHTML = '';
        const levelName = level.toUpperCase();

        let html = `<h1 class="text-center mb-4">Öğrenme Yolum: ${levelName}</h1><div class="row g-4">`;

        const levelModules = Object.keys(this.allModules).filter(k => this.allModules[k].level.toUpperCase() === levelName);
        if (levelModules.length === 0) {
            html += `<div class="alert alert-warning">Bu seviyede modül yok.</div>`;
        } else {
            levelModules.forEach(key => {
                const mod = this.allModules[key];
                const completed = this.isModuleCompleted(key);
                html += `
                    <div class="col-md-4">
                        <div class="card module-card ${completed ? 'completed' : 'in-progress'} h-100">
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${mod.name}</h5>
                                <p class="card-text flex-grow-1">${mod.description || ''}</p>
                                <button class="btn btn-primary mt-auto" onclick="LearningPath.displayModuleContent('${key}', 'word')">
                                    ${completed ? 'Tekrarla' : 'Başla'}
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
        }

        const allDone = this.checkAllModulesCompleted(levelName);
        const next = this.getNextLevel(levelName);
        if (allDone && next) {
            html += `<div class="text-center mt-4">
                <button class="btn btn-success btn-lg" onclick="LearningPath.displayLevelUpExam('${levelName}')">
                    ${next} Seviyesine Geç
                </button>
            </div>`;
        }

        html += `</div>`;
        pathContainer.innerHTML = html;
        this.showSection('learningPathSection');
        document.getElementById('navToPathButton').classList.remove('d-none');
    },

    displayLevelUpExam: function(currentLevel) {
        const next = this.getNextLevel(currentLevel);
        if (!next) return alert('Üst seviye yok.');
        this.currentQuizQuestions = this.allExamQuestions.filter(q => q.level.toUpperCase() === next);
        if (this.currentQuizQuestions.length === 0) return alert('Sınav sorusu yok.');
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `${currentLevel} → ${next} Sınavı`;
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 9. YARDIMCI FONKSİYONLAR
    // =========================================================================
    init: function() {
        this.loadAllData().then(() => {
            this.loadGamification();
            this.checkDailyStreak();
            const level = this.getCurrentUserLevel();
            if (level && level !== 'null') {
                this.displayLearningPath(level);
            } else {
                this.showSection('introSection');
            }
        }).catch(() => {
            alert('Veri yüklenemedi. İnternet bağlantınızı kontrol edin.');
            this.showSection('introSection');
        });
    },

    getCurrentUserLevel: function() { return localStorage.getItem('userLevel') || null; },
    saveUserLevel: function(level) { localStorage.setItem('userLevel', level); },
    getNextLevel: function(l) { const levels = ['A1','A2','B1','B2','C1']; const i = levels.indexOf(l.toUpperCase()); return i >= 0 && i < levels.length-1 ? levels[i+1] : null; },
    isModuleCompleted: function(k) { return JSON.parse(localStorage.getItem('learningModules') || '{}')[k] === true; },
    markModuleCompleted: function(k) { const m = JSON.parse(localStorage.getItem('learningModules') || '{}'); m[k] = true; localStorage.setItem('learningModules', JSON.stringify(m)); },
    checkAllModulesCompleted: function(l) { return Object.keys(this.allModules).filter(k => this.allModules[k].level.toUpperCase() === l.toUpperCase()).every(k => this.isModuleCompleted(k)); },
    shuffleArray: function(a) { return [...a].sort(() => Math.random() - 0.5); },
    showSection: function(id) { 
        document.querySelectorAll('.module-section').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; }); 
        const el = document.getElementById(id); 
        if (el) { el.style.display = 'flex'; el.classList.add('active'); } 
    },
    speakText: function(t) { 
        if (this.synth.speaking) this.synth.cancel(); 
        const u = new SpeechSynthesisUtterance(t); 
        u.lang = 'en-US'; 
        this.synth.speak(u); 
    },
    showQuizError: function(msg) { alert(msg); this.showSection('introSection'); },

    // Gamification
    loadGamification: function() {
        this.userPoints = parseInt(localStorage.getItem('userPoints') || '0');
        this.userBadges = JSON.parse(localStorage.getItem('userBadges') || '[]');
        this.dailyStreak = parseInt(localStorage.getItem('dailyStreak') || '0');
    },
    awardPoints: function(p) { this.userPoints += p; localStorage.setItem('userPoints', this.userPoints); },
    awardBadge: function(b) { 
        if (!this.userBadges.includes(b)) { 
            this.userBadges.push(b); 
            localStorage.setItem('userBadges', JSON.stringify(this.userBadges)); 
            alert(`Rozet Kazandın: ${b}`); 
        } 
    },
    checkDailyStreak: function() {
        const last = localStorage.getItem('lastLogin');
        const today = new Date().toDateString();
        if (last !== today) {
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            this.dailyStreak = (last === yesterday.toDateString()) ? this.dailyStreak + 1 : 1;
            localStorage.setItem('dailyStreak', this.dailyStreak);
            localStorage.setItem('lastLogin', today);
        }
    },

    // Sıfırlama
    resetProgress: function() {
        if (confirm('Tüm ilerleme silinecek. Emin misiniz?')) {
            localStorage.clear();
            alert('Sıfırlandı.');
            location.reload();
        }
    }
};

// =========================================================================
// SAYFA YÜKLENDİĞİNDE BAŞLAT
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath;
    LearningPath.init();

    // Butonlar
    const startBtn = document.getElementById('startTestButton');
    if (startBtn) startBtn.addEventListener('click', () => LearningPath.startLevelTest());
});
