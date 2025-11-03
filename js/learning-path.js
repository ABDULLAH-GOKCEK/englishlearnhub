/**
 * learning-path.js
 * Seviye Testi ve Öğrenme Yolu Modülünün Ana Logic'i (TAMAMEN GÜNCEL)
 */

console.log('🚀 LearningPath başlatılıyor...');

const LearningPath = {
    allQuestions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    totalQuestions: 0,
    testStarted: false,
    
    // =================================================================
    // 1. BAŞLATMA VE EVENT YÖNETİMİ
    // =================================================================

    init: function() {
        console.log('🔗 Eventler bağlanıyor...');
        // DOM'da var olan elemanlara listener ekle
        const startBtn = document.getElementById('startTestBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const prevBtn = document.getElementById('prevQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');
        
        if (startBtn) startBtn.addEventListener('click', this.startTest.bind(this));
        if (nextBtn) nextBtn.addEventListener('click', this.navigateTest.bind(this, 1));
        if (prevBtn) prevBtn.addEventListener('click', this.navigateTest.bind(this, -1));
        if (submitBtn) submitBtn.addEventListener('click', this.submitTest.bind(this));


        this.resetTest(); 
    },
    
    // =================================================================
    // 2. TESTİ SIFIRLAMA VE BAŞLATMA
    // =================================================================
    
    resetTest: function() {
        this.allQuestions = []; 
        this.userAnswers = []; 
        this.currentQuestionIndex = 0;
        this.totalQuestions = 0;
        this.testStarted = false; 
        
        // DOM elemanlarını sıfırla
        const currentNumEl = document.getElementById('currentQuestionNumber');
        const totalCountEl = document.getElementById('totalQuestionCount');
        const progressBar = document.getElementById('testProgressBar');

        if(currentNumEl) currentNumEl.textContent = '0';
        if(totalCountEl) totalCountEl.textContent = '0';
        if(progressBar) progressBar.style.width = '0%';
        
        const questionContainer = document.getElementById('questionContainer');
        if(questionContainer) questionContainer.innerHTML = 'Lütfen bekleyiniz, test yükleniyor...';

        console.log('🔄 Test başarıyla sıfırlandı. Giriş ekranı gösteriliyor.');
        this.showSection('levelTestIntroSection'); 
    },

    startTest: async function() {
        if (this.testStarted && this.allQuestions.length > 0 && this.currentQuestionIndex < this.totalQuestions) {
             return; 
        }

        this.resetTest(); 
        this.testStarted = true; 

        this.showSection('levelTestSection');
        
        const totalCountEl = document.getElementById('totalQuestionCount');
        if(totalCountEl) totalCountEl.textContent = '20'; 

        try {
            const response = await fetch('data/level_test.json'); 
            if (!response.ok) {
                throw new Error(`HTTP hata kodu: ${response.status}`);
            }
            this.allQuestions = await response.json();
            this.totalQuestions = this.allQuestions.length;
            
            this.userAnswers = new Array(this.totalQuestions).fill(null);
            
            console.log(`✅ ${this.totalQuestions} soru yüklendi.`);

            this.currentQuestionIndex = 0;
            this.renderQuestion();
            this.updateTestHeader();

        } catch (error) {
            console.error('❌ Sorular yüklenirken hata oluştu:', error);
            const questionContainer = document.getElementById('questionContainer');
            if(questionContainer) questionContainer.innerHTML = 
                `<p class="text-danger">Sorular yüklenemedi. Lütfen dosya yolunu (data/level_test.json) kontrol edin. (${error.message})</p>`;
        }
    },

    // =================================================================
    // 3. SORU GÖSTERİMİ VE YÖNETİMİ
    // =================================================================

    renderQuestion: function() {
        if (!this.allQuestions[this.currentQuestionIndex]) return;

        const question = this.allQuestions[this.currentQuestionIndex];
        const container = document.getElementById('questionContainer');
        const currentAnswer = this.userAnswers[this.currentQuestionIndex];

        if (!container) return; 

        container.innerHTML = `
            <p class="question-text">${this.currentQuestionIndex + 1}. ${question.questionText}</p>
            <div class="options-container" id="optionsContainer">
                ${question.options.map(option => `
                    <button class="answer-btn ${currentAnswer === option ? 'selected' : ''}" 
                            data-answer="${option}">
                        ${option}
                    </button>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.answer-btn').forEach(button => {
            button.addEventListener('click', this.handleAnswerSelection.bind(this)); 
        });

        this.updateNavigationButtons();
    },

    handleAnswerSelection: function(e) {
        const selectedButton = e.target.closest('.answer-btn');
        if (!selectedButton) return;

        const answer = selectedButton.dataset.answer;
        
        selectedButton.closest('.options-container').querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        selectedButton.classList.add('selected');

        this.userAnswers[this.currentQuestionIndex] = answer;
        console.log(`📝 Soru ${this.currentQuestionIndex + 1} için cevap kaydedildi: ${answer}`);
    },

    navigateTest: function(direction) {
        if (direction === 1 && this.userAnswers[this.currentQuestionIndex] === null) {
            alert('Lütfen bu soruyu cevaplayın.');
            return;
        }

        const newIndex = this.currentQuestionIndex + direction;

        if (newIndex >= 0 && newIndex < this.totalQuestions) {
            this.currentQuestionIndex = newIndex;
            this.renderQuestion();
        }

        this.updateTestHeader();
        this.updateNavigationButtons();
    },

    // =================================================================
    // 4. TESTİ BİTİRME VE SONUÇLANDIRMA
    // =================================================================

    submitTest: function() {
        if (this.userAnswers[this.totalQuestions - 1] === null) {
            alert('Lütfen son soruyu cevaplayın!');
            return;
        }
        
        const userLevel = this.calculateLevel();
        
        this.displayResults(userLevel); 
        
        if (typeof updateUserLevel === 'function') {
             updateUserLevel(userLevel);
        }
    },
    
    calculateLevel: function() {
        let correctCount = 0;

        this.allQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            if (userAnswer === question.correctAnswer) {
                correctCount++;
            }
        });

        if (correctCount >= 17) return 'C1';
        if (correctCount >= 14) return 'B2';
        if (correctCount >= 10) return 'B1';
        if (correctCount >= 6) return 'A2';
        return 'A1';
    },

    displayResults: function(level) {
        const resultsEl = document.getElementById('resultsSection');
        this.showSection('resultsSection'); 
        if (!resultsEl) return;

        resultsEl.innerHTML = `
            <div class="result-card">
                <h2>Seviye Tespit Sonucu</h2>
                <p>Tebrikler, testiniz başarıyla tamamlandı!</p>
                <p>Tespit edilen İngilizce seviyeniz:</p>
                <div class="level-badge level-${level.toLowerCase()}">${level}</div>
                <p class="mt-3">Bu seviyeye göre size özel hazırlanan öğrenme yolunu aşağıda görebilirsiniz.</p>
                <button class="btn btn-primary mt-3" onclick="LearningPath.displayLearningPath('${level}')">Öğrenme Yolunu Gör</button>
            </div>
        `;
    },

    // =================================================================
    // 5. ÖĞRENME YOLU GÖSTERİMİ VE GELİŞTİRMELER
    // =================================================================

    displayLearningPath: async function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        
        if (!pathEl) return;

        pathEl.innerHTML = `
            <h2>${level} Seviyesi Öğrenme Yolu</h2>
            <p>Seviyeniz **${level}** olarak belirlendi. Size özel dersler yükleniyor...</p>
        `;

        try {
            const response = await fetch('data/learning_modules.json');
            if (!response.ok) throw new Error(`Modül verisi yüklenemedi: ${response.status}`);
            
            const modulesData = await response.json();
            const levelData = modulesData[level] || modulesData['A1']; 
            
            // Genel İlerlemeyi Hesaplama
            let totalProgress = 0;
            const moduleCount = levelData.modules.length;

            if (moduleCount > 0) {
                const sumOfProgress = levelData.modules.reduce((sum, module) => sum + module.progress, 0);
                totalProgress = Math.round(sumOfProgress / moduleCount);
            }
            
            // Tüm benzersiz konu başlıklarını al (Filtreler için)
            const allTopics = levelData.modules.map(m => m.topic).filter((value, index, self) => self.indexOf(value) === index);
            
            // Ana HTML Yapısını oluştur
            pathEl.innerHTML = `
                <div class="level-path-header">
                    <h2>${level} Seviyesi Öğrenme Yolu: ${levelData.title}</h2>
                    <p>${levelData.description}</p>
                </div>

                <div class="summary-card">
                    <div class="summary-progress">
                        <span class="summary-percentage">${totalProgress}%</span>
                        <div class="summary-bar-wrapper">
                            <div class="summary-bar-fill" style="width: ${totalProgress}%;"></div>
                        </div>
                    </div>
                    <div class="summary-info">
                        <h3>${levelData.title} Genel İlerleme</h3>
                        <p>Bu seviyede toplam ${moduleCount} modül bulunmaktadır. Devam edin!</p>
                    </div>
                </div>
                
                <div class="filter-controls">
                    <select id="topicFilter" onchange="LearningPath.applyFilters()">
                        <option value="all">Tüm Konular</option>
                        ${allTopics.map(topic => `<option value="${topic}">${topic}</option>`).join('')}
                    </select>
                    
                    <select id="statusFilter" onchange="LearningPath.applyFilters()">
                        <option value="all">Tüm Durumlar</option>
                        <option value="Yeni">Yeni</option>
                        <option value="Devam Ediyor">Devam Ediyor</option>
                        <option value="Tamamlandı">Tamamlandı</option>
                    </select>

                    <select id="sortOrder" onchange="LearningPath.applyFilters()">
                        <option value="default">Sırala: Varsayılan</option>
                        <option value="progressAsc">İlerleme: % Düşükten</option>
                        <option value="progressDesc">İlerleme: % Yüksekten</option>
                        <option value="nameAsc">İsim: A-Z</option>
                    </select>
                </div>

                ${totalProgress === 100 ? `
                    <div class="level-complete-card">
                        <h3 class="level-complete-title">🎉 Tebrikler! ${level} Seviyesi Tamamlandı!</h3>
                        <p>Bu seviyedeki tüm modülleri başarıyla bitirdiniz. Bir sonraki seviyeye geçmeye hazırsınız.</p>
                        <button class="btn btn-success btn-lg" onclick="LearningPath.advanceLevel('${level}')">
                            Bir Sonraki Seviyeye Geç
                        </button>
                    </div>
                ` : ''}

                <div class="grouped-modules-container">
                    </div>
                
                <button class="btn btn-secondary mt-4" onclick="LearningPath.resetTest()">Teste Geri Dön/Yeniden Başlat</button>
            `;

            // Modülleri filtre ve sıralama olmadan ilk kez yükle
            this.renderModules(level);

        } catch (error) {
            console.error('❌ Öğrenme Modülleri yüklenirken hata:', error);
            pathEl.innerHTML = `
                 <h2>Hata</h2>
                 <p>Öğrenme modülleri yüklenemedi. Lütfen konsol hatalarını kontrol edin.</p>
                 <button class="btn btn-secondary mt-4" onclick="LearningPath.resetTest()">Giriş Ekranına Dön</button>
            `;
        }
    },
    
    // Filtreleme ve Sıralama Kontrollerinden Çağrılır
    applyFilters: function() {
        // Seviyeyi DOM'dan çek
        const levelElement = document.querySelector('.level-path-header h2');
        if (!levelElement) return;

        const currentLevelMatch = levelElement.textContent.match(/([A-Z][0-9])/);
        const currentLevel = currentLevelMatch ? currentLevelMatch[0] : 'A1';

        const topicFilter = document.getElementById('topicFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const sortOrder = document.getElementById('sortOrder').value;

        this.renderModules(currentLevel, topicFilter, statusFilter, sortOrder);
    },

    // Modülleri Filtreleyerek, Sıralayarak ve Gruplayarak Yeniden Çizer
    renderModules: async function(level, topicFilter = 'all', statusFilter = 'all', sortOrder = 'default') {
        // Veriyi tekrar çekme
        const response = await fetch('data/learning_modules.json');
        const modulesData = await response.json();
        const levelData = modulesData[level] || modulesData['A1']; 
        
        let filteredModules = levelData.modules;
        
        // 1. Filtreleme Uygulama
        if (topicFilter !== 'all') {
            filteredModules = filteredModules.filter(m => m.topic === topicFilter);
        }

        if (statusFilter !== 'all') {
            filteredModules = filteredModules.filter(m => m.status === statusFilter);
        }

        // 2. Sıralama Uygulama
        filteredModules.sort((a, b) => {
            if (sortOrder === 'progressAsc') {
                return a.progress - b.progress;
            } else if (sortOrder === 'progressDesc') {
                return b.progress - a.progress;
            } else if (sortOrder === 'nameAsc') {
                return a.name.localeCompare(b.name);
            }
            return 0; // Varsayılan
        });
        
        // 3. Filtrelenmiş ve Sıralanmış Modülleri Gruplama
        const groupedModules = filteredModules.reduce((groups, module) => {
            const topic = module.topic;
            if (!groups[topic]) {
                groups[topic] = [];
            }
            groups[topic].push(module);
            return groups;
        }, {});

        // 4. HTML Oluşturma
        let groupedHtml = '';
        for (const topic in groupedModules) {
            const modulesInGroup = groupedModules[topic];
            
            // Konu başlığı
            groupedHtml += `<h3 class="module-group-title">${topic} Modülleri (${modulesInGroup.length})</h3>`;
            groupedHtml += `<div class="modules-list">`; 

            groupedHtml += modulesInGroup.map(module => `
                <div class="module-card module-status-${module.status.toLowerCase().replace(/ /g, '-')}" 
                    data-progress="${module.progress}">
                    <h3>${module.name}</h3>
                    <p>Konu: ${module.topic}</p>
                    
                    ${module.progress > 0 ? `
                        <div class="module-stats-row">
                            <span class="module-stat-item">
                                <i class="fas fa-clock"></i> 
                                ${module.lastDuration} dk
                            </span>
                            <span class="module-stat-item">
                                <i class="fas fa-chart-line"></i> 
                                ${module.lastScore}% Skor
                            </span>
                        </div>
                    ` : ''}
                    
                    <div class="module-progress-container">
                        <div class="progress-bar-small">
                            <div class="progress-fill-small" style="width: ${module.progress}%;"></div>
                        </div>
                        <span class="progress-text">${module.progress}% ${module.progress === 100 ? 'Tamamlandı' : 'İlerledi'}</span>
                    </div>

                    <span class="module-status-badge">${module.status}</span>
                    <button class="btn btn-primary btn-sm" onclick="LearningPath.startModule('${module.id}')">${module.progress === 100 ? 'Tekrar Et' : 'İncele/Devam Et'}</button>
                </div>
            `).join('');
            
            groupedHtml += `</div>`;
        }

        // Sadece modül listesi kısmını güncelle
        const container = document.querySelector('.grouped-modules-container');
        if (container) {
            container.innerHTML = groupedHtml;
            
            if (groupedHtml === '') {
                container.innerHTML = `<p style="text-align: center; margin-top: 30px; font-size: 1.2rem; color: #6c757d;">Seçili filtre ve sıralama kriterlerine uyan modül bulunamadı.</p>`;
            }
        }
    },

   // 🔴 Modül Başlatma Fonksiyonu (Hata Tespiti İyileştirildi)
    startModule: async function(moduleId) {
        this.showSection('moduleContentSection');
        
        const titleEl = document.getElementById('moduleTitle');
        const contentBodyEl = document.getElementById('moduleContentBody');
        
        if (!titleEl || !contentBodyEl) return; 

        titleEl.textContent = 'İçerik Yükleniyor...';
        contentBodyEl.innerHTML = '<div class="text-center mt-5"><i class="fas fa-spinner fa-spin fa-3x"></i></div>';

        try {
            // content.json dosyasından modül içeriğini çekiyoruz
            const response = await fetch('data/module_content.json'); 
            
            // Eğer dosya yolu yanlışsa veya sunucu hata verdiyse (404/500), HATA mesajı atar.
            if (!response.ok) {
                console.error('MODÜL İÇERİĞİ YÜKLENEMEDİ! HTTP Durumu:', response.status);
                throw new Error(`Dosya yüklenirken hata oluştu. Lütfen data/module_content.json dosyasının varlığını ve yolunu kontrol edin. HTTP Status: ${response.status}`);
            }
            
            const contentData = await response.json();
            const module = contentData[moduleId];

            if (!module) {
                titleEl.textContent = 'Hata: İçerik Eksik';
                contentBodyEl.innerHTML = `<p class="text-danger"><strong>${moduleId}</strong> kimliğine sahip modül, <strong>module_content.json</strong> dosyası içinde bulunamadı.</p>`;
                return;
            }

            // ... (İçerik render etme kısmı aynen kalır)

            titleEl.textContent = module.title;
            let contentHtml = '';

            module.content.forEach(item => {
                // ... (İçerik tipleri işlenmeye devam eder)
                if (item.type === 'heading') {
                    contentHtml += `<h3>${item.text}</h3>`;
                } else if (item.type === 'paragraph') {
                    contentHtml += `<p>${item.text}</p>`;
                } else if (item.type === 'code_block') {
                    contentHtml += `<pre class="code-block">${item.text}</pre>`;
                } else if (item.type === 'example') {
                    contentHtml += `<div class="example-box">${item.text.replace(/\n/g, '<br>')}</div>`;
                } else if (item.type === 'quiz_intro') {
                    contentHtml += `<p class="quiz-intro">${item.text}</p>`;
                } else if (item.type === 'quiz') {
                    contentHtml += `
                        <div class="module-quiz-card">
                            <p><strong>Soru:</strong> ${item.question}</p>
                            <div class="quiz-options-simulated">
                                ${item.options.map(opt => `<span class="quiz-option-item">${opt}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }
            });

            contentBodyEl.innerHTML = contentHtml;

        } catch (error) {
            console.error('❌ Modül içeriği yüklenirken hata:', error);
            titleEl.textContent = 'Yükleme Hatası';
            contentBodyEl.innerHTML = `<p class="text-danger"><strong>Ders içeriği yüklenirken kritik bir hata oluştu.</strong> Lütfen tarayıcı konsolunu kontrol edin. Hata Mesajı: <code>${error.message}</code></p>`;
        }
    },
    
    // 🟢 Modülü Tamamla Fonksiyonu
    completeModule: function() {
        const currentModuleId = LearningPath.currentModuleId;
        if (!currentModuleId) {
            alert("Hata: Tamamlanacak modül bulunamadı.");
            return;
        }

        const currentLevel = localStorage.getItem('userLevel') || 'A1';
        let modulesData = JSON.parse(localStorage.getItem('learningModules')) || {};
        
        // Modülü bul ve güncelle
        let moduleFound = false;
        if (modulesData[currentLevel] && modulesData[currentLevel].modules) {
            const modules = modulesData[currentLevel].modules;
            for (let i = 0; i < modules.length; i++) {
                if (modules[i].id === currentModuleId) {
                    modules[i].status = "Tamamlandı";
                    modules[i].progress = 100;
                    modules[i].lastScore = 100; // Quiz olmadığı için varsayılan tam puan verelim
                    modules[i].lastDuration = Math.ceil(Math.random() * 15) + 5; // Rastgele süre
                    moduleFound = true;
                    break;
                }
            }
        }

        if (moduleFound) {
            // Güncellenmiş veriyi localStorage'a kaydet
            localStorage.setItem('learningModules', JSON.stringify(modulesData));

            // Kullanıcıya bilgi ver ve öğrenme yolu ekranına dön
            alert(`${currentModuleId} modülü başarıyla tamamlandı ve puanlandı!`);
            
            // Öğrenme yolunu tekrar çiz
            this.displayLearningPath(currentLevel); 
            this.showSection('learningPathSection');

        } else {
            alert("Hata: Modül verisi bulunamadı veya kaydedilemedi.");
        }
    },
    // Seviye Atlatma Mantığı
    advanceLevel: function(currentLevel) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const currentIndex = levels.indexOf(currentLevel);
        
        if (currentIndex < 0 || currentIndex >= levels.length - 1) {
            alert('Tebrikler! Şu anda son seviyedesiniz. Öğrenmeye devam edin!');
            return;
        }

        const nextLevel = levels[currentIndex + 1];
        
        alert(`Tebrikler! ${currentLevel} seviyesini başarıyla tamamladınız. Yeni seviyeniz: ${nextLevel}. Şimdi bu seviyeye ait derslere başlayabilirsiniz!`);
        
        this.resetTest(); 
    },

    // =================================================================
    // 6. ARAYÜZ GÜNCELLEMELERİ
    // =================================================================

    updateTestHeader: function() {
        const currentNumEl = document.getElementById('currentQuestionNumber');
        const totalCountEl = document.getElementById('totalQuestionCount');
        const progressBar = document.getElementById('testProgressBar');

        if(currentNumEl) currentNumEl.textContent = this.currentQuestionIndex + 1;
        if(totalCountEl) totalCountEl.textContent = this.totalQuestions;

        const progress = ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
        if(progressBar) progressBar.style.width = `${progress}%`;
    },

    updateNavigationButtons: function() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const submitBtn = document.getElementById('submitTestBtn');

        if(prevBtn) prevBtn.style.display = this.currentQuestionIndex > 0 ? 'inline-block' : 'none';

        if (this.currentQuestionIndex === this.totalQuestions - 1) {
            if(nextBtn) nextBtn.style.display = 'none';
            if(submitBtn) submitBtn.style.display = 'inline-block';
        } else {
            if(nextBtn) nextBtn.style.display = 'inline-block';
            if(submitBtn) submitBtn.style.display = 'none';
        }
    },

    showSection: function(sectionId) {
        // Tüm section'ları gizle
        document.querySelectorAll('.module-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; 
        });
        
        // Hedef section'ı göster
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block'; 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 SAYFA YÜKLENDİ - LearningPath başlatılıyor');
    LearningPath.init();
});


