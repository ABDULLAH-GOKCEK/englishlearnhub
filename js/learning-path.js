// =========================================================================
// js/learning-path.js (V15.5.5 – VERCEL UYUMLU + JSON YOLLARI DÜZELTİLDİ)
// =========================================================================

const LearningPath = {
    // Sabitler (Vercel için /data/ yolu — SLASH BAŞLANGICI ÖNEMLİ!)
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

    // Modül Kategori Haritası (senin JSON'lara göre güncellendi)
    MODULE_CATEGORY_MAP: {
        'a1_m1': { words: ['Animals', 'Greetings', 'Basic Nouns'], sentences: ['Greetings', 'Introduction', 'Daily Life'], readings: ['beginner'] },
        'a1_m2': { words: ['Numbers', 'Food', 'Colors', 'Time'], sentences: ['Family', 'Ordering Food', 'Simple Questions', 'Time'], readings: ['beginner'] },
        'a1_m3': { words: ['Family', 'Home', 'Jobs', 'Adjectives'], sentences: ['Directions', 'Past Events', 'Ability', 'Obligation'], readings: ['beginner'] },
        'a2_m1': { words: ['Health', 'Travel', 'Weather', 'Education'], sentences: ['Future Plans', 'Comparison', 'Modal Verbs'], readings: ['elementary'] },
        'a2_m2': { words: ['City', 'Shopping', 'Technology', 'Media'], sentences: ['Advice', 'Passive Voice', 'Reported Speech'], readings: ['elementary'] },
        'a2_m3': { words: ['Business', 'Abstract', 'Emotion', 'Politics'], sentences: ['Conditionals', 'Phrasal Verbs', 'Complex Sentence'], readings: ['elementary'] },
        'b1_m1': { words: ['Finance', 'Law', 'Science', 'Nature'], sentences: ['Inversion', 'Subjunctive', 'Advanced Tenses'], readings: ['intermediate'] },
        'c1_m1': { words: ['Advanced', 'Academic'], sentences: ['Complex', 'Phrasal'], readings: ['advanced'] },
        // Diğer modüller için genişletilebilir
    },

    // =========================================================================
    // 1. VERİ YÜKLEME (Vercel Uyumlu Error Handling)
    // =========================================================================
    loadAllData: async function() {
        const fetchData = async (path) => {
            try {
                console.log('Fetching:', path); // Debug log
                const res = await fetch(path);
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${path} bulunamadı.`);
                const data = await res.json();
                console.log('Loaded:', path, data); // Debug log
                return data;
            } catch (error) {
                console.error('JSON Yükleme Hatası:', path, error);
                alert(`Dosya yüklenemedi: ${path}. public/data/ klasörünü kontrol edin.`);
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

        this.allModules = moduleContentData;
        this.allModuleContents = moduleContentData;
        this.allLevelTestQuestions = testData.questions || [];
        this.allExamQuestions = examData || [];
        this.allWords = wordsData || [];
        this.allSentences = sentencesData || [];
        this.allReadings = readingsData || [];

        console.log('Veri Yükleme Tamamlandı:', this.allLevelTestQuestions.length, 'soru yüklendi.'); // Debug
    },

    // =========================================================================
    // 2. MODÜL İÇERİK FİLTRELEME
    // =========================================================================
    loadModuleContent: function(moduleKey) {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return;

        const level = moduleInfo.level || 'A1';
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
        if (this.allLevelTestQuestions.length === 0) {
            alert('Seviye testi soruları yüklenemedi. Console\'u kontrol edin (F12).');
            return;
        }
        this.currentQuizQuestions = this.shuffleArray([...this.allLevelTestQuestions]).slice(0, 10);
        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = 'Seviye Tespit Testi';
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
        console.log('Test Başlatıldı:', this.currentQuizQuestions.length, 'soru.'); // Debug
    },

    // =========================================================================
    // 4. MODÜL İÇERİK GÖSTERİMİ
    // =========================================================================
    displayModuleContent: function(moduleKey, sectionId = 'word') {
        const moduleInfo = this.allModules[moduleKey];
        if (!moduleInfo) return alert('Modül bulunamadı.');

        if (!moduleInfo.content) this.loadModuleContent(moduleKey);
        const content = moduleInfo.content[sectionId] || [];

        const container = document.getElementById('moduleContentSection');
        container.innerHTML = `<h3>${moduleInfo.name || moduleInfo.title} - ${this.STANDARD_SECTIONS.find(s => s.id === sectionId)?.name}</h3>`;

        if (content.length === 0) {
            container.innerHTML += '<p class="text-muted">İçerik bulunamadı. JSON\'dan filtreleme hatası olabilir.</p>';
        } else if (sectionId === 'reading') {
            content.forEach((item, i) => {
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
            const list = content.map(item => `<li><strong>${item.english || item.word}</strong> - ${item.turkish}</li>`).join('');
            container.innerHTML += `<ul class="list-unstyled">${list}</ul>`;
        }

        // SINAV BAŞLATMA BUTONU
        container.innerHTML += `
            <div class="text-center mt-4">
                <button class="btn btn-success btn-lg" onclick="LearningPath.startSectionQuiz('${moduleKey}', '${sectionId}')">
                    ${this.STANDARD_SECTIONS.find(s => s.id === sectionId)?.name} Sınavı
                </button>
            </div>
        `;

        this.showSection('moduleContentSection');
    },

    // =========================================================================
    // 5. BÖLÜM SINAVI
    // =========================================================================
    startSectionQuiz: function(moduleKey, sectionId) {
        const moduleInfo = this.allModules[moduleKey];
        const quizzes = (moduleInfo.content || []).filter(c => c.type === 'quiz');
        if (quizzes.length === 0) {
            // Fallback: JSON'dan soru oluştur
            this.currentQuizQuestions = [
                { question: `${sectionId} bölümünde temel kavram nedir?`, options: ['Temel', 'İleri', 'Orta'], answer: 0 }
            ];
        } else {
            this.currentQuizQuestions = quizzes.map(q => ({
                question: q.question,
                options: q.options,
                answer: q.options.indexOf(q.answer)
            }));
        }

        this.currentQuestionIndex = 0;
        this.currentQuizAnswers = [];
        document.getElementById('quizTitle').textContent = `${moduleInfo.name || moduleInfo.title} - ${this.STANDARD_SECTIONS.find(s => s.id === sectionId)?.name} Sınavı`;
        this.showQuizQuestion(this.currentQuizQuestions[0]);
        this.showSection('quizSection');
    },

    // =========================================================================
    // 6. SINAV MEKANİĞİ
    // =========================================================================
    showQuizQuestion: function(question) {
        const container = document.getElementById('quizQuestions');
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5>${question.question}</h5>
                    ${question.options.map((opt, i) => `
                        <div class="question-option p-3 border rounded mb-2" onclick="LearningPath.selectAnswer(${i})">
                            ${opt}
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
                html += `<div class="alert alert-success text-center">Tebrikler! <strong>${module.name || module.title}</strong> modülünü tamamladınız!</div>`;
            } else {
                html += `<div class="alert alert-danger text-center">Başarısız. Tekrar deneyin.</div>`;
            }
            html += `
                <div class="d-flex justify-content-center gap-2 mt-3">
                    <button class="btn btn-primary" onclick="LearningPath.displayLearningPath(LearningPath.getCurrentUserLevel())">
                        Öğrenme Yoluna Dön
                    </button>
                    <button class="btn btn-warning" onclick="LearningPath.startModuleQuiz('${this.currentModuleKey}')">
                        Tekrar Sınava Gir
                    </button>
                </div>`;
        } else {
            const level = this.calculateLevelFromScore(score);
            this.saveUserLevel(level);
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

        let pathHtml = `<h1 class="text-center mb-4">Öğrenme Yolum: ${levelName}</h1><div class="row g-4">`;

        const levelModules = Object.keys(this.allModules).filter(k => k.startsWith(levelName.toLowerCase()));
        if (levelModules.length === 0) {
            pathHtml += `<div class="alert alert-warning">Bu seviyede modül yok.</div>`;
        } else {
            levelModules.forEach(key => {
                const mod = this.allModules[key];
                const completed = this.isModuleCompleted(key);
                pathHtml += `
                    <div class="col-md-4">
                        <div class="card module-card ${completed ? 'completed' : 'in-progress'}">
                            <div class="card-body">
                                <h5>${mod.name || mod.title}</h5>
                                <p>${mod.description || mod.topic}</p>
                                <button class="btn btn-primary w-100" onclick="LearningPath.displayModuleContent('${key}', 'word')">
                                    ${completed ? 'Tekrarla' : 'Başla'}
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
        }

        pathHtml += `</div>`;
        pathContainer.innerHTML = pathHtml;
        this.showSection('learningPathSection');
        document.getElementById('navToPathButton').classList.remove('d-none');
    },

    // =========================================================================
    // 9. YARDIMCI FONKSİYONLAR
    // =========================================================================
    init: function() {
        this.loadAllData().then(() => {
            const level = this.getCurrentUserLevel();
            if (level && level !== 'null') {
                this.displayLearningPath(level);
            } else {
                this.showSection('introSection');
            }
        }).catch(() => alert('Veri yüklenemedi. Console\'u kontrol edin (F12).'));
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

    // Sıfırlama
    resetProgress: function() {
        if (confirm("Tüm ilerlemeniz sıfırlanacak. Emin misiniz?")) {
            localStorage.removeItem('userLevel');
            localStorage.removeItem('learningModules');
            localStorage.removeItem('levelTestAnswers');
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('wrong_')) localStorage.removeItem(key);
            }
            alert("Sıfırlandı. Test yeniden başlayacak.");
            window.location.reload(); 
        }
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    window.LearningPath = LearningPath; 
    LearningPath.init();

    // Butonlar
    const startBtn = document.getElementById('startTestButton');
    if (startBtn) startBtn.addEventListener('click', () => LearningPath.startLevelTest());

    const resetBtn = document.querySelector('[onclick="LearningPath.resetProgress()"]');
    if (resetBtn) resetBtn.addEventListener('click', () => LearningPath.resetProgress());
});