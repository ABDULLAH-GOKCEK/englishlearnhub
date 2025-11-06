// =========================================================================
// js/learning-path.js (V11 - Seviye Atlama, Tekrar Sistemi ve İstatistikler)
// =========================================================================

const LearningPath = {
    TEST_FILE_PATH: 'data/level_test.json',
    MODULE_CONTENT_FILE_PATH: 'data/module_content.json', 
    PASS_SCORE: 90, // Başarı eşiği: %90
    // V11: Seviye Sırası Tanımlaması
    LEVEL_SEQUENCE: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    
    // --- Yardımcı Fonksiyonlar ---

    getIconForTopic: function(topic) {
        // V10: Daha spesifik ikonlar
        const iconMap = {
            'Be Fiili': 'fas fa-id-card',
            'Sahiplik': 'fas fa-hand-holding-usd',
            'Basit Kelime': 'fas fa-spell-check',
            'Şimdiki Zaman': 'fas fa-clock',
            'Sayılabilir/Sayılamaz': 'fas fa-balance-scale',
            'Geçmiş Zaman': 'fas fa-history',
            'Gelecek Zaman': 'fas fa-forward',
            'Sıfatlar ve Zarflar': 'fas fa-plus-minus',
            'Pasif Yapı': 'fas fa-user-lock',
            'Koşul Cümleleri (Conditionals)': 'fas fa-stream',
            'Geniş Kelime': 'fas fa-book-open',
            'Sıfat Cümlecikleri (Relative Clauses)': 'fas fa-link',
            'Deyimler/Phrasal Verbs': 'fas fa-comments',
            // Genel kategoriler
            'Dilbilgisi': 'fas fa-graduation-cap',
            'Kelime': 'fas fa-language',
            'Okuma': 'fas fa-book-reader',
            'Dinleme': 'fas fa-volume-up',
            'Konuşma': 'fas fa-microphone-alt',
            'Quiz': 'fas fa-question-circle'
        };
        
        let icon = iconMap[topic] || 'fas fa-chalkboard';

        // Eğer ikon bulamazsa, genel konuyu kontrol et
        if (icon === 'fas fa-chalkboard') {
            if (topic.includes('Zaman')) icon = 'fas fa-clock';
            else if (topic.includes('Kelime')) icon = 'fas fa-book-open';
            else if (topic.includes('Fiil')) icon = 'fas fa-running';
            else if (topic.includes('Cümle')) icon = 'fas fa-stream';
        }

        return `<i class="${icon}"></i>`;
    },

    loadData: async function(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Dosya yüklenemedi: ${filePath}`);
            }
            return response.json();
        } catch (error) {
            console.error(`Veri yükleme hatası (${filePath}):`, error);
            return null;
        }
    },

    // --- Ana İşlevler ---

    init: async function() {
        const userLevel = localStorage.getItem('userLevel') || 'A1';
        this.displayLearningPath(userLevel);
        
        // Menüye tıklandığında istatistikleri gösterme işlevi ekleyelim (Varsayalım bir menü butonu var)
        const statsButton = document.getElementById('showStatsButton');
        if (statsButton) {
            statsButton.onclick = () => this.displayStats();
        }
        
        // Geri düğmesi varsa
        const backButton = document.getElementById('backToPathButton');
        if (backButton) {
            backButton.onclick = () => this.displayLearningPath(localStorage.getItem('userLevel') || 'A1');
        }
    },

    showSection: function(sectionId) {
        // Tüm ana bölümleri gizle (varsayılan div ID'leri)
        ['levelTestSection', 'learningPathSection', 'moduleContentSection', 'quizSection', 'statsSection'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });

        // İstenen bölümü göster
        const targetElement = document.getElementById(sectionId);
        if (targetElement) {
            targetElement.style.display = 'block';
        }
    },

    displayLearningPath: async function(level) {
        this.showSection('learningPathSection');
        
        // Kullanıcı seviyesini güncelle (Geri gelindiğinde vs. doğru seviyeyi gösterdiğinden emin ol)
        localStorage.setItem('userLevel', level);
        
        const pathEl = document.getElementById('learningPathSection');
        pathEl.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="display-6">${level} Seviyesi Öğrenme Yolu</h2>
                <button id="showStatsButton" class="btn btn-info btn-lg" onclick="LearningPath.displayStats()">
                    <i class="fas fa-chart-line me-2"></i> İstatistikler
                </button>
            </div>
            <div id="pathProgress" class="mb-5"></div>
            <div id="moduleList" class="module-grid"></div>
        `;

        // Modül verilerini yükle
        const allModules = await this.loadData('data/learning_modules.json');
        if (!allModules) {
            pathEl.innerHTML = `<p class="alert alert-danger">Modül verileri yüklenemedi. Lütfen 'data/learning_modules.json' dosyasını kontrol edin.</p>`;
            return;
        }

        // Kullanıcının seviyesine uygun modülleri filtrele
        let modules = allModules.filter(m => m.level === level);

        // LocalStorage'dan ilerlemeyi yükle
        const progressData = JSON.parse(localStorage.getItem('learningModules') || '{}');

        // Modül ilerlemesini güncelle
        modules = modules.map(module => {
            const moduleProgress = progressData[module.id] || {};
            const isCompleted = moduleProgress.isCompleted || false;
            
            // Eğer tamamlanmışsa durumu 'Tamamlandı' yap
            module.status = isCompleted ? 'Tamamlandı' : 'Başla';
            module.progress = isCompleted ? 100 : 0; // Basit ilerleme gösterimi
            module.score = moduleProgress.lastScore || 0;
            return module;
        });

        // V11 KRİTİK KONTROL: Seviye Atlama Mekanizması
        const totalModules = modules.length;
        const completedModulesCount = modules.filter(m => m.status === 'Tamamlandı').length;

        if (totalModules > 0 && completedModulesCount === totalModules) {
            const currentLevelIndex = this.LEVEL_SEQUENCE.indexOf(level);
            const nextLevel = this.LEVEL_SEQUENCE[currentLevelIndex + 1];
            
            // Eğer seviye atlanabilir durumdaysa (C2'de değilse) ve kullanıcı hala eski seviyesindeyse
            if (nextLevel && localStorage.getItem('userLevel') === level) {
                this.advanceLevel(level);
                return; // Seviye atlama ekranını göster
            }
        }
        
        // İlerleme Çubuğunu Güncelle
        const progressPercent = totalModules > 0 ? Math.round((completedModulesCount / totalModules) * 100) : 0;
        document.getElementById('pathProgress').innerHTML = `
            <div class="progress" style="height: 30px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" 
                    style="width: ${progressPercent}%;" aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100">
                    %${progressPercent} Tamamlandı (${completedModulesCount}/${totalModules})
                </div>
            </div>
        `;


        // Modül Kartlarını Oluştur
        const moduleCards = modules.map(module => {
            const iconHtml = this.getIconForTopic(module.topic);
            const statusClass = module.status === 'Tamamlandı' ? 'border-success' : (module.status === 'Başla' ? 'border-primary' : 'border-warning');
            const scoreHtml = module.score > 0 ? `<p class="card-text"><small class="text-muted">Son Skor: %${module.score}</small></p>` : '';
            
            return `
                <div class="col">
                    <div class="card module-card h-100 ${statusClass}" onclick="LearningPath.loadModuleContent(${module.id}, '${module.topic}')">
                        <div class="card-body text-center">
                            <div class="icon-container mb-3">${iconHtml}</div>
                            <h5 class="card-title">${module.topic}</h5>
                            <p class="card-text">${module.description}</p>
                            ${scoreHtml}
                        </div>
                        <div class="card-footer text-end p-2 bg-transparent border-0">
                            <span class="badge ${module.status === 'Tamamlandı' ? 'bg-success' : 'bg-primary'}">${module.status}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('moduleList').innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">${moduleCards}</div>`;
        pathEl.style.alignItems = 'normal';
        pathEl.style.textAlign = 'left';
    },

    // V11 YENİ: Seviye Atlama Fonksiyonu
    advanceLevel: function(currentLevel) {
        const currentLevelIndex = this.LEVEL_SEQUENCE.indexOf(currentLevel);
        const nextLevelIndex = currentLevelIndex + 1;
        
        if (nextLevelIndex < this.LEVEL_SEQUENCE.length) {
            const nextLevel = this.LEVEL_SEQUENCE[nextLevelIndex];
            
            // Yeni seviyeyi kaydet
            localStorage.setItem('userLevel', nextLevel);
            
            this.showSection('learningPathSection');
            const pathEl = document.getElementById('learningPathSection');
            pathEl.style.alignItems = 'center'; 
            pathEl.style.textAlign = 'center';

            // Başarı mesajını göster
            pathEl.innerHTML = `
                <div class="result-card p-5 shadow-lg bg-light rounded-3">
                    <h3 class="text-success mb-4"><i class="fas fa-trophy fa-3x mb-3"></i><br> TEBRİKLER! Seviye Atladınız!</h3>
                    <p class="h4">Başarıyla **${currentLevel}** seviyesindeki tüm modülleri tamamladınız.</p>
                    <p class="h1 level-result mt-3 mb-4 text-primary">Yeni Seviyeniz: <span>${nextLevel}</span></p>
                    <p class="mt-4">Öğrenme yolunuza **${nextLevel}** seviyesinde devam edebilirsiniz. Yeni modüller ve zorluklar sizi bekliyor!</p>
                    
                    <button class="btn btn-lg btn-primary mt-4" onclick="LearningPath.displayLearningPath('${nextLevel}')">
                        Yeni Öğrenme Yolunu Başlat
                    </button>
                    
                    <p class="mt-3"><small class="text-muted">Not: Önceki seviye ilerlemeniz istatistikler için tutulmaya devam edecektir.</small></p>
                </div>
            `;
            
        } else {
             // C2'den sonra seviye kalmadıysa
             this.showSection('learningPathSection');
             const pathEl = document.getElementById('learningPathSection');
             pathEl.style.alignItems = 'center';
             pathEl.style.textAlign = 'center';
             pathEl.innerHTML = `
                 <div class="result-card p-5 shadow-lg bg-light rounded-3">
                     <h3 class="text-success mb-4"><i class="fas fa-crown fa-3x mb-3"></i><br> UZMAN SEVİYESİNE ULAŞILDI!</h3>
                     <p class="h4">Tebrikler! **${currentLevel}** dahil tüm seviyelerdeki modülleri başarıyla tamamladınız.</p>
                     <p class="mt-4">Artık İngilizcede uzman bir kullanıcı olarak kabul ediliyorsunuz. Pratik yapmaya devam edin!</p>
                     <button class="btn btn-lg btn-primary mt-4" onclick="LearningPath.displayLearningPath('${currentLevel}')">
                        Modüllere Geri Dön
                    </button>
                 </div>
             `;
        }
    },


    loadModuleContent: async function(moduleId, moduleTopic) {
        this.showSection('moduleContentSection');
        const contentEl = document.getElementById('moduleContentSection');
        contentEl.innerHTML = `
            <button class="btn btn-secondary mb-3" onclick="LearningPath.displayLearningPath(localStorage.getItem('userLevel'))">
                <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
            </button>
            <h3 class="mb-4">${moduleTopic} İçeriği</h3>
            <div id="moduleContentDetail" class="p-4 bg-light rounded shadow-sm">
                Yükleniyor...
            </div>
            <button class="btn btn-success btn-lg mt-4" onclick="LearningPath.startQuiz(${moduleId}, 'quiz')">
                <i class="fas fa-pen-to-square me-2"></i> Quiz Çöz
            </button>
        `;

        const allContent = await this.loadData(this.MODULE_CONTENT_FILE_PATH);
        if (!allContent) {
            document.getElementById('moduleContentDetail').innerHTML = `<p class="text-danger">İçerik yüklenemedi. Lütfen 'data/module_content.json' dosyasını kontrol edin.</p>`;
            return;
        }

        const content = allContent.find(c => c.id === moduleId);
        if (content && content.text) {
            document.getElementById('moduleContentDetail').innerHTML = `
                <div class="mb-3">
                    <label for="speechRate" class="form-label">Ses Hızı: <span id="rateValue">1.0</span></label>
                    <input type="range" class="form-range" id="speechRate" min="0.5" max="2" step="0.1" value="1" onchange="LearningPath.updateSpeechRate(this.value)">
                </div>
                <p class="lead">${content.text.replace(/\n/g, '<br>')}</p>
                <button class="btn btn-outline-primary mt-3" onclick="LearningPath.readText('${content.text.replace(/'/g, "\\'")}')">
                    <i class="fas fa-volume-up me-2"></i> Metni Seslendir
                </button>
            `;
            // Ses hızı güncelleme fonksiyonu için dinleyici ekle
            document.getElementById('speechRate').oninput = function() {
                document.getElementById('rateValue').textContent = this.value;
            };

        } else {
            document.getElementById('moduleContentDetail').innerHTML = `<p>Bu modül için henüz detaylı içerik bulunmamaktadır. Lütfen doğrudan Quize başlayın.</p>`;
        }
    },

    speechSynthesis: window.speechSynthesis,
    currentUtterance: null,
    speechRate: 1.0,

    updateSpeechRate: function(rate) {
        this.speechRate = parseFloat(rate);
        document.getElementById('rateValue').textContent = this.speechRate.toFixed(1);
    },

    readText: function(text) {
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; 
        utterance.rate = this.speechRate; 
        
        this.speechSynthesis.speak(utterance);
        this.currentUtterance = utterance;
    },

    // --- Quiz İşlevleri ---
    
    currentQuiz: null,
    currentQuizIndex: 0,
    currentModuleId: null,

    startQuiz: async function(moduleId, quizType) {
        this.showSection('quizSection');
        this.currentModuleId = moduleId;
        this.currentQuizIndex = 0;
        
        // Bu verinin `data/quiz_questions.json` içinde olduğunu varsayıyoruz
        const quizData = await this.loadData('data/quiz_questions.json');
        if (!quizData) {
            document.getElementById('quizSection').innerHTML = `<p class="alert alert-danger">Soru verileri yüklenemedi. Lütfen 'data/quiz_questions.json' dosyasını kontrol edin.</p>`;
            return;
        }

        // Modüle ait tüm soruları filtrele
        let moduleQuestions = quizData.filter(q => q.moduleId === moduleId && q.quizType === quizType);

        if (moduleQuestions.length === 0) {
            document.getElementById('quizSection').innerHTML = `<p class="alert alert-warning">Bu modül için **${quizType}** türünde soru bulunamadı.</p>`;
            return;
        }
        
        // V10: Tekrar Mekanizması Uygulaması
        const wrongKey = `wrong_${moduleId}_${quizType}`;
        const wrongIds = JSON.parse(localStorage.getItem(wrongKey) || '[]');
        
        let prioritizedQuestions = [];
        let remainingQuestions = [];

        // Hata yapılanları önceliklendir
        moduleQuestions.forEach(q => {
            if (wrongIds.includes(q.id)) {
                prioritizedQuestions.push(q);
            } else {
                remainingQuestions.push(q);
            }
        });

        // Kalan soruları karıştır
        remainingQuestions.sort(() => Math.random() - 0.5);

        // Hata yapılanları başa, kalanları arkasına ekle
        this.currentQuiz = [...prioritizedQuestions, ...remainingQuestions];

        // Yanıtları sıfırla (burada skor ve yanlış listesini tutacağız)
        this.quizResults = {
            moduleId: moduleId,
            quizType: quizType,
            correctAnswers: 0,
            wrongAnswers: [],
            totalQuestions: this.currentQuiz.length
        };

        this.displayQuizQuestion();
    },

    displayQuizQuestion: function() {
        if (this.currentQuizIndex >= this.currentQuiz.length) {
            this.showQuizResult();
            return;
        }

        const question = this.currentQuiz[this.currentQuizIndex];
        const quizEl = document.getElementById('quizSection');

        // Seçenekleri karıştır
        const optionsHtml = question.options.map((option, index) => {
            // Tırnak işaretlerini kaçırarak fonksiyon çağrısında sorun çıkmasını engelle
            const safeOption = option.replace(/'/g, "\\'"); 
            return `
                <button class="btn btn-outline-secondary quiz-option mb-2 w-100 text-start" 
                    onclick="LearningPath.checkAnswer(${this.currentQuizIndex}, '${safeOption}')">
                    ${String.fromCharCode(65 + index)}. ${option}
                </button>
            `;
        }).join('');

        quizEl.innerHTML = `
            <div class="card p-4 shadow-sm">
                <p class="text-muted mb-1">Soru ${this.currentQuizIndex + 1} / ${this.currentQuiz.length}</p>
                <h4 class="card-title mb-4">${question.questionText}</h4>
                <div id="quizOptions" class="d-grid gap-2">
                    ${optionsHtml}
                </div>
                <div id="feedback" class="mt-3"></div>
            </div>
            <button class="btn btn-warning mt-3" onclick="LearningPath.startQuiz(${this.currentModuleId}, 'quiz')">
                <i class="fas fa-sync-alt me-2"></i> Yeniden Başlat
            </button>
            <button class="btn btn-info mt-3 ms-2" onclick="LearningPath.loadModuleContent(${this.currentModuleId}, 'Geri Dönüş')">
                <i class="fas fa-book-open me-2"></i> İçeriğe Bak
            </button>
        `;
    },

    checkAnswer: function(questionIndex, selectedOption) {
        const question = this.currentQuiz[questionIndex];
        const isCorrect = (selectedOption === question.correctAnswer);
        const feedbackEl = document.getElementById('feedback');
        const optionsEl = document.getElementById('quizOptions');

        // Tüm butonları devre dışı bırak
        Array.from(optionsEl.getElementsByTagName('button')).forEach(btn => btn.disabled = true);

        if (isCorrect) {
            feedbackEl.innerHTML = `<div class="alert alert-success mt-3"><i class="fas fa-check-circle me-2"></i> Doğru! Harika.</div>`;
            this.quizResults.correctAnswers++;
        } else {
            feedbackEl.innerHTML = `
                <div class="alert alert-danger mt-3"><i class="fas fa-times-circle me-2"></i> Yanlış. Doğru cevap: <strong>${question.correctAnswer}</strong></div>
            `;
            // Yanlış cevabı kaydet (V10: Tekrar Mekanizması için)
            this.quizResults.wrongAnswers.push(question.id);
        }

        // Bir sonraki soruya geç
        setTimeout(() => {
            this.currentQuizIndex++;
            this.displayQuizQuestion();
        }, 1500);
    },

    showQuizResult: function() {
        const quizEl = document.getElementById('quizSection');
        const score = Math.round((this.quizResults.correctAnswers / this.quizResults.totalQuestions) * 100);
        const passed = score >= this.PASS_SCORE;
        const resultClass = passed ? 'alert-success' : 'alert-danger';
        const resultIcon = passed ? 'fas fa-trophy' : 'fas fa-redo-alt';

        // V10: Skoru ve yanlışları kaydet
        this.calculateModuleScore(this.quizResults.moduleId, score, this.quizResults.wrongAnswers);

        quizEl.innerHTML = `
            <div class="card p-5 shadow-lg">
                <h3 class="card-title text-center mb-4"><i class="${resultIcon} me-2"></i> Quiz Sonuçları</h3>
                <div class="${resultClass} p-3 text-center">
                    <p class="h5">Toplam Soru: ${this.quizResults.totalQuestions}</p>
                    <p class="h5">Doğru Cevap: ${this.quizResults.correctAnswers}</p>
                    <p class="h1 mb-4">Skorunuz: %${score}</p>
                    <p class="lead">${passed ? 'Tebrikler! Modülü başarıyla tamamladınız.' : 'Daha iyi anlamak için pratik yapmaya devam edin.'}</p>
                </div>
                
                <div class="d-grid gap-2 d-md-block text-center mt-4">
                    <button class="btn btn-primary btn-lg" onclick="LearningPath.displayLearningPath(localStorage.getItem('userLevel'))">
                        <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Dön
                    </button>
                    <button class="btn btn-warning btn-lg" onclick="LearningPath.startQuiz(${this.currentModuleId}, 'quiz')">
                        <i class="fas fa-redo-alt me-2"></i> Tekrar Çöz
                    </button>
                </div>
            </div>
        `;
    },

    // V10 KRİTİK: Skoru ve Yanlışları Kaydetme
    calculateModuleScore: function(moduleId, score, wrongQuestionIds) {
        const progressData = JSON.parse(localStorage.getItem('learningModules') || '{}');
        
        progressData[moduleId] = progressData[moduleId] || {};
        
        // Yüksek skoru kaydet (En yüksek skor yerine, son skoru kaydetmek daha mantıklı olabilir.)
        // Şu anki mantık: Son skoru kaydet
        progressData[moduleId].lastScore = score;
        

        // Başarı eşiğini geçerse tamamlandı olarak işaretle
        if (score >= this.PASS_SCORE) {
            progressData[moduleId].isCompleted = true;
            progressData[moduleId].completionDate = new Date().toISOString();
        }

        // Yanlışları kaydet (Tekrar Mekanizması için)
        const wrongKey = `wrong_${moduleId}_quiz`;
        
        // Sadece bu testte yanlış yapılan ID'leri kaydet
        localStorage.setItem(wrongKey, JSON.stringify(Array.from(wrongQuestionIds)));
        
        // İlerleme verilerini kaydet
        localStorage.setItem('learningModules', JSON.stringify(progressData));
        
        // Genel ilerleme istatistiğini güncelle
        this.updateGeneralProgress(moduleId, score);
    },

    // V10: Genel İlerleme İstatistiklerini Güncelleme
    updateGeneralProgress: function(moduleId, score) {
        let stats = JSON.parse(localStorage.getItem('userStats') || '{}');
        stats.totalQuizzes = (stats.totalQuizzes || 0) + 1;
        stats.totalScore = (stats.totalScore || 0) + score;
        stats.averageScore = Math.round(stats.totalScore / stats.totalQuizzes);

        // Tamamlanan modülleri say
        const progressData = JSON.parse(localStorage.getItem('learningModules') || '{}');
        const completedCount = Object.values(progressData).filter(p => p.isCompleted).length;
        stats.completedModules = completedCount;

        localStorage.setItem('userStats', JSON.stringify(stats));
    },

    // V10: İstatistik Sayfası Görüntüleme
    displayStats: function() {
        this.showSection('statsSection');
        const statsEl = document.getElementById('statsSection');
        const stats = JSON.parse(localStorage.getItem('userStats') || '{}');
        const level = localStorage.getItem('userLevel') || 'A1';

        // Modüllerden alınan ilerleme verisi
        const progressData = JSON.parse(localStorage.getItem('learningModules') || '{}');
        const completedModules = Object.values(progressData).filter(p => p.isCompleted);
        const totalCompleted = completedModules.length;
        
        // İstatistik HTML'i oluştur
        const statsHtml = `
            <button class="btn btn-secondary mb-3" onclick="LearningPath.displayLearningPath('${level}')">
                <i class="fas fa-arrow-left me-2"></i> Öğrenme Yoluna Geri Dön
            </button>
            <h2 class="display-6 mb-4"><i class="fas fa-chart-line me-3"></i> Genel Öğrenme İstatistikleri</h2>

            <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-5">
                <div class="col">
                    <div class="card text-center bg-primary text-white h-100 shadow">
                        <div class="card-body">
                            <i class="fas fa-check-circle fa-3x mb-3"></i>
                            <h5 class="card-title">Tamamlanan Modül</h5>
                            <p class="display-4">${totalCompleted}</p>
                            <p class="card-text">Toplam bitirdiğiniz konu sayısı.</p>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="card text-center bg-info text-white h-100 shadow">
                        <div class="card-body">
                            <i class="fas fa-crosshairs fa-3x mb-3"></i>
                            <h5 class="card-title">Ortalama Başarı Puanı</h5>
                            <p class="display-4">%${stats.averageScore || 0}</p>
                            <p class="card-text">Tüm sınavlardaki genel ortalamanız.</p>
                        </div>
                    </div>
                </div>
                <div class="col">
                    <div class="card text-center bg-success text-white h-100 shadow">
                        <div class="card-body">
                            <i class="fas fa-language fa-3x mb-3"></i>
                            <h5 class="card-title">Mevcut Seviye</h5>
                            <p class="display-4">${level}</p>
                            <p class="card-text">Öğrenmeye devam ettiğiniz kur seviyesi.</p>
                        </div>
                    </div>
                </div>
            </div>

            <h3 class="mt-5 mb-3">Detaylı İlerleme</h3>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Modül ID</th>
                            <th>Son Skor</th>
                            <th>Durum</th>
                            <th>Tamamlanma Tarihi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.keys(progressData).map(id => {
                            const mod = progressData[id];
                            return `
                                <tr>
                                    <td>${id}</td>
                                    <td>%${mod.lastScore || 0}</td>
                                    <td>${mod.isCompleted ? '<span class="badge bg-success">Tamamlandı</span>' : '<span class="badge bg-warning text-dark">Devam Ediyor</span>'}</td>
                                    <td>${mod.completionDate ? new Date(mod.completionDate).toLocaleDateString() : '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <p class="text-center mt-5">
                <button class="btn btn-outline-danger" onclick="LearningPath.resetProgress()">
                    <i class="fas fa-trash-alt me-2"></i> Tüm İlerlemeyi Sıfırla
                </button>
            </p>
        `;

        statsEl.innerHTML = statsHtml;
    },
    
    // --- Diğer Yardımcı İşlevler ---
    
    resetProgress: function() {
        if (confirm('TÜM öğrenme ilerlemenizi (skorlar, tamamlanan modüller) sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            localStorage.removeItem('learningModules');
            localStorage.removeItem('userStats');
            
            // Tüm yanlış cevap anahtarlarını da temizle
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('wrong_')) {
                    localStorage.removeItem(key);
                }
            });
            
            alert('İlerleme sıfırlandı. Seviyeniz A1 olarak ayarlanacak.');
            this.resetUserLevel(); 
            this.displayLearningPath('A1');
        }
    },

    resetUserLevel: function() {
        localStorage.setItem('userLevel', 'A1');
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    // LearningPath objesinin global erişilebilirliğini sağla
    window.LearningPath = LearningPath;
    LearningPath.init();
});
