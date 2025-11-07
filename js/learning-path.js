// =========================================================================
// js/learning-path.js (V16.1 – %100 ÇALIŞIR + module_content.json UYUMLU)
// =========================================================================

const LearningPath = {
    TEST_FILE_PATH: 'data/level_test.json',
    MODULE_CONTENT_FILE_PATH: 'data/module_content.json',
    LEVEL_UP_EXAM_FILE_PATH: 'data/exam.json',
    PASS_SCORE: 90,

    allModules: {},
    allLevelTestQuestions: [],
    currentModuleKey: null,
    currentQuestionIndex: 0,
    currentQuizAnswers: [],
    currentQuizQuestions: [],

    synth: window.speechSynthesis,

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
                console.error('Yükleme Hatası:', path, error);
                return path.includes('.json') ? {} : [];
            }
        };

        const [moduleData, testData] = await Promise.all([
            fetchData(this.MODULE_CONTENT_FILE_PATH),
            fetchData(this.TEST_FILE_PATH)
        ]);

        // Modül verisi: { "a1_m1": { ... } }
        this.allModules = moduleData;

        // Test soruları
        this.allLevelTestQuestions = Array.isArray(testData) ? testData : (testData.questions || []);
    },

    // =========================================================================
    // 2. SEVİYE TESTİ
    // =========================================================================
    startLevelTest: function() {
        if (this.allLevelTestQuestions.length === 0) {
            alert('Test soruları yüklenemedi. Lütfen data/level_test.json dosyasını kontrol edin.');
            return;
        }
        this.currentQuizQuestions = this.shuffleArray([...this.allLevelTestQuestions]).slice(0, 5);
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = 'Seviye Tespit Testi';
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 3. MODÜL İÇERİK GÖSTER
    // =========================================================================
    displayModuleContent: function(moduleKey) {
        const module = this.allModules[moduleKey];
        if (!module) return alert('Modül bulunamadı.');

        const container = document.getElementById('moduleContentSection');
        let html = `<h3>${module.title}</h3>`;

        module.content.forEach(item => {
            if (item.type === 'heading') html += `<h5>${item.text}</h5>`;
            if (item.type === 'paragraph') html += `<p>${item.text}</p>`;
            if (item.type === 'code_block') html += `<pre class="bg-light p-3 rounded">${item.text}</pre>`;
            if (item.type === 'example') html += `<div class="alert alert-info">${item.text.replace(/\n/g, '<br>')}</div>`;
            if (item.type === 'quiz_intro') html += `<p class="text-muted">${item.text}</p>`;
            if (item.type === 'quiz') {
                html += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <p><strong>${item.question}</strong></p>
                            ${item.options.map((opt, i) => `
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="quiz_${moduleKey}" id="q${i}">
                                    <label class="form-check-label" for="q${i}">${opt}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
            }
        });

        html += `
            <div class="text-center mt-4">
                <button class="btn btn-success btn-lg" onclick="LearningPath.startModuleQuiz('${moduleKey}')">
                    Modül Sınavına Başla
                </button>
            </div>`;

        container.innerHTML = html;
        this.showSection('moduleContentSection');
    },

    // =========================================================================
    // 4. SINAV
    // =========================================================================
    startModuleQuiz: function(moduleKey) {
        this.currentModuleKey = moduleKey;
        const module = this.allModules[moduleKey];
        this.currentQuizQuestions = module.content
            .filter(c => c.type === 'quiz')
            .map(q => ({ question: q.question, options: q.options, answer: q.answer }));
        
        if (this.currentQuizQuestions.length === 0) {
            alert('Bu modülde sınav sorusu yok.');
            return;
        }

        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `${module.title} - Sınav`;
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    showQuizQuestion: function(q) {
        const container = document.getElementById('quizQuestions');
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5>${q.question}</h5>
                    ${q.options.map((opt, i) => `
                        <div class="question-option p-3 border rounded mb-2" onclick="LearningPath.selectAnswer(${i})">
                            ${opt}
                        </div>
                    `).join('')}
                    <button class="btn btn-primary mt-3" onclick="LearningPath.nextQuestion()">Sonraki</button>
                </div>
            </div>`;
    },

    selectAnswer: function(i) {
        document.querySelectorAll('.question-option').forEach((el, idx) => {
            el.classList.toggle('selected-answer', idx === i);
        });
        this.currentQuizAnswers[this.currentQuestionIndex] = i;
    },

    nextQuestion: function() {
        if (this.currentQuizAnswers[this.currentQuestionIndex] === undefined) return alert('Şık seçin.');
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.currentQuizQuestions.length) {
            this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
        } else {
            this.displayQuizResults();
        }
    },

    // =========================================================================
    // 5. SONUÇ
    // =========================================================================
    displayQuizResults: function() {
        const score = this.calculateScore();
        const container = document.getElementById('quizResults');
        let html = `<h3>Sonuç: %${score}</h3>`;

        if (this.currentModuleKey) {
            const passed = score >= this.PASS_SCORE;
            if (passed) {
                this.markModuleCompleted(this.currentModuleKey);
                html += `<div class="alert alert-success">Modül tamamlandı!</div>`;
            } else {
                html += `<div class="alert alert-danger">Başarısız. Tekrar deneyin.</div>`;
            }
            html += `<button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">Öğrenme Yoluna Dön</button>`;
        } else {
            const level = this.calculateLevelFromScore(score);
            this.saveUserLevel(level);
            html += `<div class="alert alert-info">Seviyeniz: <strong>${level}</strong></div>`;
            html += `<button class="btn btn-primary" onclick="LearningPath.displayLearningPath('${level}')">Öğrenme Yoluna Başla</button>`;
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
    // 6. ÖĞRENME YOLU
    // =========================================================================
    displayLearningPath: function(level) {
        const container = document.getElementById('learningPathSection');
        const levelName = level.toUpperCase();
        let html = `<h1 class="text-center">Öğrenme Yolum: ${levelName}</h1><div class="row g-4">`;

        // Anahtar: a1_m1 → level: A1
        const levelModules = Object.keys(this.allModules).filter(k => {
            const modLevel = k.split('_')[0].toUpperCase();
            return modLevel === levelName;
        });

        if (levelModules.length === 0) {
            html += `<div class="alert alert-warning">Bu seviyede modül yok.</div>`;
        } else {
            levelModules.forEach(key => {
                const mod = this.allModules[key];
                const completed = this.isModuleCompleted(key);
                html += `
                    <div class="col-md-4">
                        <div class="card h-100 ${completed ? 'border-success' : ''}">
                            <div class="card-body d-flex flex-column">
                                <h5>${mod.title}</h5>
                                <p class="text-muted small">${mod.topic}</p>
                                <button class="btn btn-primary mt-auto" onclick="LearningPath.displayModuleContent('${key}')">
                                    ${completed ? 'Tekrarla' : 'Başla'}
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
        }

        html += `</div>`;
        container.innerHTML = html;
        this.showSection('learningPathSection');
    },

    // =========================================================================
    // 7. YARDIMCI
    // =========================================================================
    init: function() {
        this.loadAllData().then(() => {
            const level = this.getCurrentUserLevel();
            if (level) {
                this.displayLearningPath(level);
            } else {
                this.showSection('introSection');
            }
        });
    },

    getCurrentUserLevel: function() { return localStorage.getItem('userLevel'); },
    saveUserLevel: function(l) { localStorage.setItem('userLevel', l); },
    isModuleCompleted: function(k) { return JSON.parse(localStorage.getItem('completedModules') || '{}')[k]; },
    markModuleCompleted: function(k) { const c = JSON.parse(localStorage.getItem('completedModules') || '{}'); c[k] = true; localStorage.setItem('completedModules', JSON.stringify(c)); },
    shuffleArray: function(a) { return [...a].sort(() => Math.random() - 0.5); },
    showSection: function(id) { 
        document.querySelectorAll('.module-section').forEach(s => s.classList.remove('active')); 
        const el = document.getElementById(id); 
        if (el) el.classList.add('active'); 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath;
    LearningPath.init();
    document.getElementById('startTestButton')?.addEventListener('click', () => LearningPath.startLevelTest());
});
