// =========================================================================
// js/learning-path.js (V15.5.4 – VERCEL UYUMLU + FAVICON + %100 ÇALIŞIR)
// =========================================================================

const LearningPath = {
    // Sabitler (Vercel için /data/ yolu)
    TEST_FILE_PATH: '/data/level_test.json',
    MODULE_CONTENT_FILE_PATH: '/data/module_content.json',
    LEVEL_UP_EXAM_FILE_PATH: '/data/exam.json',
    PASS_SCORE: 90,

    // Veri Depoları
    allModules: {},
    allWords: [],
    allSentences: [],
    allReadings: [],
    allLevelTestQuestions: [],
    allExamQuestions: [],
    
    // Geçici Durum
    currentModuleKey: null,
    currentSection: null,
    currentQuestionIndex: 0,
    currentQuizAnswers: [],
    currentQuizQuestions: [],

    // Seslendirme
    synth: window.speechSynthesis,

    // =========================================================================
    // 1. VERİ YÜKLEME
    // =========================================================================
    loadAllData: async function() {
        const fetchData = async (path) => {
            try {
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
                return await res.json();
            } catch (error) {
                console.error('Yükleme Hatası:', path, error);
                alert(`Dosya bulunamadı: ${path}\n/public/data/ klasörüne taşıyın.`);
                return path.includes('level_test') ? { questions: [] } : {};
            }
        };

        const [moduleData, testData, wordsData, sentencesData, readingsData, examData] = await Promise.all([
            fetchData(this.MODULE_CONTENT_FILE_PATH),
            fetchData(this.TEST_FILE_PATH),
            fetchData('/data/words.json'),
            fetchData('/data/sentences.json'),
            fetchData('/data/reading_stories.json'),
            fetchData(this.LEVEL_UP_EXAM_FILE_PATH)
        ]);

        this.allModules = moduleData;
        this.allLevelTestQuestions = testData.questions || [];
        this.allWords = wordsData || [];
        this.allSentences = sentencesData || [];
        this.allReadings = readingsData || [];
        this.allExamQuestions = examData || [];
    },

    // =========================================================================
    // 2. SEVİYE TESTİ
    // =========================================================================
    startLevelTest: function() {
        if (this.allLevelTestQuestions.length === 0) {
            alert('Seviye testi soruları yüklenemedi. /public/data/level_test.json kontrol edin.');
            return;
        }
        this.currentQuizQuestions = this.shuffleArray([...this.allLevelTestQuestions]).slice(0, 10);
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = 'Seviye Tespit Testi';
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 3. ÖĞRENME YOLU
    // =========================================================================
    displayLearningPath: function(level) {
        const container = document.getElementById('learningPathSection');
        const levelName = level.toUpperCase();
        let html = `<h1 class="text-center mb-4">Öğrenme Yolum: ${levelName}</h1><div class="row g-4">`;

        const levelModules = Object.keys(this.allModules).filter(k => k.startsWith(levelName.toLowerCase()));
        if (levelModules.length === 0) {
            html += `<div class="alert alert-warning">Bu seviyede modül yok.</div>`;
        } else {
            levelModules.forEach(key => {
                const mod = this.allModules[key];
                const progress = JSON.parse(localStorage.getItem('sectionProgress') || '{}')[key] || {};
                const completed = ['word', 'sentence', 'reading'].every(s => progress[s]);
                html += `
                    <div class="col-md-4">
                        <div class="card h-100 ${completed ? 'border-success' : ''}">
                            <div class="card-body d-flex flex-column">
                                <h5>${mod.title || 'Modül'}</h5>
                                <p class="text-muted small">${mod.topic || ''}</p>
                                <div class="mt-auto">
                                    <button class="btn btn-sm btn-outline-primary w-100 mb-1" onclick="LearningPath.displayModuleSection('${key}', 'word')">
                                        Kelime
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary w-100 mb-1" onclick="LearningPath.displayModuleSection('${key}', 'sentence')">
                                        Cümle
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary w-100 mb-1" onclick="LearningPath.displayModuleSection('${key}', 'reading')">
                                        Okuma
                                    </button>
                                    ${completed ? '' : `<button class="btn btn-success btn-sm w-100 mt-2" onclick="LearningPath.startModuleFinalExam('${key}')">
                                        Bitirme Sınavı
                                    </button>`}
                                </div>
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
    // 4. BÖLÜM İÇERİK
    // =========================================================================
    displayModuleSection: function(moduleKey, sectionType) {
        const mod = this.allModules[moduleKey];
        if (!mod) return alert('Modül yok.');

        this.currentModuleKey = moduleKey;
        this.currentSection = sectionType;

        const container = document.getElementById('moduleContentSection');
        let html = `<h3>${mod.title} - ${this.getSectionName(sectionType)}</h3>`;

        // module_content.json içeriği
        if (mod.content && mod.content.length > 0) {
            mod.content.forEach(item => {
                if (item.type === 'heading') html += `<h5>${item.text}</h5>`;
                if (item.type === 'paragraph') html += `<p>${item.text}</p>`;
                if (item.type === 'code_block') html += `<pre class="bg-light p-3 rounded">${item.text}</pre>`;
                if (item.type === 'example') html += `<div class="alert alert-info">${item.text.replace(/\n/g, '<br>')}</div>`;
            });
        } else {
            html += '<p class="text-muted">İçerik yükleniyor...</p>';
        }

        html += `
            <div class="text-center mt-4">
                <button class="btn btn-primary btn-lg" onclick="LearningPath.startSectionQuiz('${moduleKey}', '${sectionType}')">
                    ${this.getSectionName(sectionType)} Sınavı
                </button>
            </div>`;

        container.innerHTML = html;
        this.showSection('moduleContentSection');
    },

    getSectionName: function(type) {
        const names = { word: 'Kelime', sentence: 'Cümle', reading: 'Okuma' };
        return names[type] || type;
    },

    // =========================================================================
    // 5. BÖLÜM SINAVI
    // =========================================================================
    startSectionQuiz: function(moduleKey, sectionType) {
        const mod = this.allModules[moduleKey];
        const quizzes = (mod.content || []).filter(c => c.type === 'quiz');
        if (quizzes.length === 0) return alert('Bu bölümde soru yok.');

        this.currentQuizQuestions = quizzes.map(q => ({
            question: q.question,
            options: q.options,
            answer: q.options.indexOf(q.answer)
        }));

        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `${mod.title} - ${this.getSectionName(sectionType)} Sınavı`;
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 6. BİTİRME SINAVI
    // =========================================================================
    startModuleFinalExam: function(moduleKey) {
        const mod = this.allModules[moduleKey];
        const allQuizzes = (mod.content || []).filter(c => c.type === 'quiz');
        if (allQuizzes.length < 3) return alert('Yeterli soru yok.');

        this.currentQuizQuestions = this.shuffleArray(allQuizzes).slice(0, 5).map(q => ({
            question: q.question,
            options: q.options,
            answer: q.options.indexOf(q.answer)
        }));

        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        this.currentModuleKey = moduleKey;
        document.getElementById('quizTitle').textContent = `${mod.title} - Bitirme Sınavı`;
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 7. SINAV MEKANİĞİ
    // =========================================================================
    showQuizQuestion: function(q) {
        const container = document.getElementById('quizQuestions');
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5>${q.question}</h5>
                    ${q.options.map((opt, i) => `
                        <div class="question-option p-3 border rounded mb-2 ${this.currentQuizAnswers[this.currentQuestionIndex] === i ? 'selected-answer' : ''}" 
                             onclick="LearningPath.selectAnswer(${i})">
                            ${opt}
                        </div>
                    `).join('')}
                    <button class="btn btn-primary mt-3" onclick="LearningPath.nextQuestion()">Sonraki</button>
                </div>
            </div>`;
    },

    selectAnswer: function(i) {
        this.currentQuizAnswers[this.currentQuestionIndex] = i;
        this.showQuizQuestion(this.currentQuizQuestions[this.currentQuestionIndex]);
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
    // 8. SONUÇ
    // =========================================================================
    displayQuizResults: function() {
        const score = this.calculateScore();
        const container = document.getElementById('quizResults');
        let html = `<h3>Sonuç: %${score}</h3>`;

        if (this.currentSection) {
            if (score >= this.PASS_SCORE) {
                this.markSectionCompleted(this.currentModuleKey, this.currentSection);
                html += `<div class="alert alert-success">${this.getSectionName(this.currentSection)} tamamlandı!</div>`;
            } else {
                html += `<div class="alert alert-danger">Başarısız. Tekrar deneyin.</div>`;
            }
            html += `<button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">Öğrenme Yoluna Dön</button>`;
        } else if (this.currentModuleKey) {
            if (score >= this.PASS_SCORE) {
                this.markModuleCompleted(this.currentModuleKey);
                html += `<div class="alert alert-success">Modül tamamlandı!</div>`;
            } else {
                html += `<div class="alert alert-danger">Bitirme sınavı başarısız.</div>`;
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
        this.currentSection = null;
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
    // 9. İLERLEME
    // =========================================================================
    markSectionCompleted: function(moduleKey, section) {
        const progress = JSON.parse(localStorage.getItem('sectionProgress') || '{}');
        if (!progress[moduleKey]) progress[moduleKey] = {};
        progress[moduleKey][section] = true;
        localStorage.setItem('sectionProgress', JSON.stringify(progress));
    },

    markModuleCompleted: function(moduleKey) {
        const progress = JSON.parse(localStorage.getItem('sectionProgress') || '{}');
        if (!progress[moduleKey]) progress[moduleKey] = {};
        ['word', 'sentence', 'reading'].forEach(s => progress[moduleKey][s] = true);
        localStorage.setItem('sectionProgress', JSON.stringify(progress));
    },

    // =========================================================================
    // 10. SIFIRLAMA
    // =========================================================================
    resetProgress: function() {
        if (confirm('Tüm ilerleme sıfırlansın mı?')) {
            localStorage.clear();
            alert('Sıfırlandı.');
            location.reload();
        }
    },

    // =========================================================================
    // 11. YARDIMCI
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
    shuffleArray: function(a) { return [...a].sort(() => Math.random() - 0.5); },
    showSection: function(id) {
        document.querySelectorAll('.module-section').forEach(s => {
            s.style.display = 'none';
            s.classList.remove('active');
        });
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'flex';
            el.classList.add('active');
        }
    }
};

// =========================================================================
// BAŞLAT
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath;
    LearningPath.init();

    document.getElementById('startTestButton')?.addEventListener('click', () => LearningPath.startLevelTest());
    document.getElementById('navToPathButton')?.addEventListener('click', () => {
        const level = LearningPath.getCurrentUserLevel();
        if (level) LearningPath.displayLearningPath(level);
    });
});
