// Tüm JavaScript dosyalarının EN ÜSTÜNE ekleyin:

// UserProfile kontrolü - eğer yüklenmemişse
if (typeof userProfile === 'undefined') {
    // Basit fallback fonksiyon
    window.updateUserProgress = function(points = 1) {
        console.log(`İlerleme puanı: ${points}`);
        // LocalStorage'a kaydet
        const progress = JSON.parse(localStorage.getItem('userProgress') || '{"totalPoints": 0}');
        progress.totalPoints = (progress.totalPoints || 0) + points;
        progress.lastUpdated = new Date().toISOString();
        localStorage.setItem('userProgress', JSON.stringify(progress));
    };
} else {
    // UserProfile varsa onu kullan
    window.updateUserProgress = function(points = 1) {
        userProfile.addLearnedWords(points);
    };
}

// Sayfa yüklendiğinde progress kontrolü
document.addEventListener('DOMContentLoaded', function() {
    const progress = JSON.parse(localStorage.getItem('userProgress') || '{"totalPoints": 0}');
    console.log(`Toplam puan: ${progress.totalPoints}`);
});
// Okuma-Anlama Modülü JavaScript - ÖĞRENİM SIRASINA GÖRE GÜNCELLENDİ (SORU SEÇİMİ DÜZELTİLDİ)
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Okuma-anlama modülü yüklendi');
    
    const storiesContainer = document.getElementById('storiesContainer');
    const readingContainer = document.getElementById('readingContainer');
    const levelSelect = document.getElementById('levelSelect');
    const categorySelect = document.getElementById('categorySelect');
    const findStoriesBtn = document.getElementById('findStoriesBtn');
    
    let storiesData = [];
    let currentStory = null;
    
    // Öğrenim sırasına göre kategori sıralaması
    const learningOrder = [
        'Greetings', 'Introduction', 'Emergency', 'Numbers',
        'Food', 'Foods', 'Drinks', 'Shopping', 'Colors', 'Family',
        'Time', 'Weather', 'Home', 'Body', 'Emotions',
        'Transportation', 'Vehicles', 'Travel', 'Hobbies', 'Animals', 'Fruits', 'Health',
        'Work', 'Education', 'Technology', 'Sports', 'TurkishCulture'
    ];

    // Hikayeleri yükle
    loadData('../data/reading_stories.json')
        .then(data => {
            if (data && Array.isArray(data) && data.length > 0) {
                storiesData = data;
                console.log('✅ Hikayeler yüklendi:', storiesData.length);
                
                // Kategori seçeneklerini doldur
                populateCategoryOptions();
            } else {
                showError('Hikayeler yüklenirken bir hata oluştu.');
            }
        })
        .catch(error => {
            console.error('Hata:', error);
            showError('Veriler yüklenirken bir hata oluştu.');
        });
    
    // Kategori seçeneklerini doldur - ÖĞRENİM SIRASINA GÖRE
    function populateCategoryOptions() {
        const categories = [...new Set(storiesData.map(story => story.category))];
        
        // Öğrenim sırasına göre sırala
        const orderedCategories = learningOrder.filter(cat => 
            categories.includes(cat)
        );
        
        const remainingCategories = categories.filter(cat => 
            !learningOrder.includes(cat)
        ).sort();
        
        const allCategories = [...orderedCategories, ...remainingCategories];
        
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = getCategoryTurkishName(category);
            
            // Seviye bilgisi ekle
            const level = getCategoryLevel(category);
            if (level) {
                option.textContent += ` (${level})`;
            }
            
            categorySelect.appendChild(option);
        });
    }
    
    // Kategori seviyesini belirle
    function getCategoryLevel(category) {
        const index = learningOrder.indexOf(category);
        
        if (index === -1) return 'İleri';
        
        if (index <= 3) return 'Başlangıç';
        if (index <= 10) return 'Başlangıç+';
        if (index <= 15) return 'Temel';
        if (index <= 22) return 'Orta';
        return 'İleri';
    }
    
    // Hikayeleri bul butonu
    findStoriesBtn.addEventListener('click', function() {
        const selectedLevel = levelSelect.value;
        const selectedCategory = categorySelect.value;
        
        // Hikayeleri filtrele
        let filteredStories = storiesData.filter(story => story.level === selectedLevel);
        
        if (selectedCategory !== 'all') {
            filteredStories = filteredStories.filter(story => story.category === selectedCategory);
        }
        
        if (filteredStories.length === 0) {
            storiesContainer.innerHTML = `
                <div class="no-stories">
                    <i class="fas fa-search"></i>
                    <h3>Hiç hikaye bulunamadı</h3>
                    <p>Seçtiğiniz kriterlere uygun hikaye bulunamadı. Lütfen farklı seviye veya kategori seçin.</p>
                </div>
            `;
            return;
        }
        
        // Hikayeleri göster
        displayStories(filteredStories);
    });
    
    // Hikayeleri görüntüle
    function displayStories(stories) {
        storiesContainer.innerHTML = `
            <h3>Bulunan Hikayeler (${stories.length})</h3>
            <div class="stories-grid" id="storiesGrid"></div>
        `;
        
        const storiesGrid = document.getElementById('storiesGrid');
        
        stories.forEach(story => {
            const storyCard = document.createElement('div');
            storyCard.className = 'story-card';
            storyCard.innerHTML = `
                <h4>${story.title}</h4>
                <div class="story-meta">
                    <span>${getLevelTurkishName(story.level)}</span>
                    <span>${getCategoryTurkishName(story.category)}</span>
                    <span>${story.questions.length} Soru</span>
                </div>
                <p>${story.content.substring(0, 150)}...</p>
                <button class="btn read-btn" data-id="${story.id}">
                    <i class="fas fa-book-open"></i> Okumaya Başla
                </button>
            `;
            
            storiesGrid.appendChild(storyCard);
        });
        
        // Okuma butonlarına event listener ekle
        document.querySelectorAll('.read-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const storyId = parseInt(this.dataset.id);
                const story = storiesData.find(s => s.id === storyId);
                if (story) {
                    startReading(story);
                }
            });
        });
    }
    
    // Okuma moduna geç - SORU SEÇİMİ DÜZELTİLDİ
    function startReading(story) {
        currentStory = story;
        
        // Hikayeleri gizle, okuma ekranını göster
        storiesContainer.style.display = 'none';
        readingContainer.style.display = 'block';
        
        // Okuma içeriğini oluştur
        readingContainer.innerHTML = `
            <div class="reading-header">
                <h3 class="reading-title">${story.title}</h3>
                <div class="reading-meta">
                    <span>${getLevelTurkishName(story.level)}</span>
                    <span>${getCategoryTurkishName(story.category)}</span>
                </div>
            </div>
            
            <div class="reading-audio">
                <button class="audio-btn" id="listenStoryBtn" title="Hikayeyi dinle">
                    <i class="fas fa-volume-up"></i>
                </button>
                <p>Hikayeyi dinlemek için tıklayın</p>
            </div>
            
            <div class="reading-content">
                ${story.content}
            </div>
            
            <div class="questions-container">
                <h3>Anlama Soruları (${story.questions.length} soru)</h3>
                <div id="questionsList"></div>
                <button class="btn" id="checkAnswersBtn" style="margin-top: 1.5rem;">
                    <i class="fas fa-check-circle"></i> Cevapları Kontrol Et
                </button>
            </div>
            
            <div class="reading-actions">
                <button class="btn secondary" id="backToStoriesBtn">
                    <i class="fas fa-arrow-left"></i> Hikayelere Dön
                </button>
                <button class="btn" id="newStoryBtn">
                    <i class="fas fa-redo"></i> Yeni Hikaye
                </button>
            </div>
        `;
        
        const questionsList = document.getElementById('questionsList');
        const listenStoryBtn = document.getElementById('listenStoryBtn');
        const checkAnswersBtn = document.getElementById('checkAnswersBtn');
        const backToStoriesBtn = document.getElementById('backToStoriesBtn');
        const newStoryBtn = document.getElementById('newStoryBtn');
        
        // Soruları ekrana yerleştir
        story.questions.forEach((question, index) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question';
            questionElement.innerHTML = `
                <div class="question-text">${index + 1}. ${question.question}</div>
                <div class="question-options" data-question="${index}">
                    ${question.options.map((option, i) => `
                        <div class="option" data-value="${i}">
                            <span class="option-number">${String.fromCharCode(65 + i)}</span>
                            <span class="option-text">${option}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="question-feedback" id="feedback-${index}"></div>
            `;
            
            questionsList.appendChild(questionElement);
        });
        
        // Seçeneklere tıklama eventi - DÜZELTİLDİ
        setTimeout(() => {
            document.querySelectorAll('.option').forEach(option => {
                option.addEventListener('click', function() {
                    const questionIndex = parseInt(this.parentElement.dataset.question);
                    const optionIndex = parseInt(this.dataset.value);
                    
                    console.log(`Soru ${questionIndex + 1}, Seçenek ${optionIndex} tıklandı`);
                    
                    // Aynı sorudaki diğer seçimleri temizle
                    this.parentElement.querySelectorAll('.option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // Bu seçeneği seçili yap
                    this.classList.add('selected');
                    
                    // Seçimi konsola yaz (debug için)
                    console.log(`Seçilen cevap: Soru ${questionIndex + 1} -> ${String.fromCharCode(65 + optionIndex)}`);
                });
            });
        }, 100);
        
        // Hikayeyi dinle butonu
        let isPlaying = false;
        listenStoryBtn.addEventListener('click', function() {
            if (!isPlaying) {
                isPlaying = true;
                listenStoryBtn.classList.add('playing');
                speakText(story.content, 'en-US');
                
                // Konuşma bittiğinde
                setTimeout(() => {
                    listenStoryBtn.classList.remove('playing');
                    isPlaying = false;
                }, story.content.length * 50); // Yaklaşık süre
            }
        });
        
        // Cevapları kontrol et butonu - DÜZELTİLDİ
        checkAnswersBtn.addEventListener('click', function() {
            console.log('Cevaplar kontrol ediliyor...');
            let correctAnswers = 0;
            const questions = story.questions;
            
            questions.forEach((question, index) => {
                const selectedOption = document.querySelector(`.question-options[data-question="${index}"] .option.selected`);
                const feedbackElement = document.getElementById(`feedback-${index}`);
                
                if (!selectedOption) {
                    feedbackElement.textContent = 'Lütfen bir cevap seçin.';
                    feedbackElement.className = 'question-feedback incorrect';
                    feedbackElement.style.display = 'block';
                    console.log(`Soru ${index + 1}: Cevap seçilmedi`);
                    return;
                }
                
                const selectedAnswer = parseInt(selectedOption.dataset.value);
                const isCorrect = selectedAnswer === question.correctAnswer;
                
                console.log(`Soru ${index + 1}: Seçilen: ${selectedAnswer}, Doğru: ${question.correctAnswer}, Sonuç: ${isCorrect ? 'Doğru' : 'Yanlış'}`);
                
                if (isCorrect) {
                    correctAnswers++;
                    selectedOption.classList.add('correct');
                    feedbackElement.textContent = '✓ Doğru! ' + question.explanation;
                    feedbackElement.className = 'question-feedback correct';
                } else {
                    selectedOption.classList.add('incorrect');
                    // Doğru cevabı göster
                    const correctOption = document.querySelector(`.question-options[data-question="${index}"] .option[data-value="${question.correctAnswer}"]`);
                    if (correctOption) {
                        correctOption.classList.add('correct');
                    }
                    feedbackElement.textContent = '✗ Yanlış. ' + question.explanation;
                    feedbackElement.className = 'question-feedback incorrect';
                }
                
                feedbackElement.style.display = 'block';
            });
            
            // Sonuçları göster
            const score = Math.round((correctAnswers / questions.length) * 100);
            const resultsHTML = `
                <div class="quiz-results">
                    <h3>Test Sonucu</h3>
                    <div class="score-display">${score} Puan</div>
                    <p>${correctAnswers} doğru, ${questions.length - correctAnswers} yanlış</p>
                    <div class="quiz-action">
                        <button class="btn" id="restartQuizBtn">
                            <i class="fas fa-redo"></i> Tekrar Dene
                        </button>
                    </div>
                </div>
            `;
            
            checkAnswersBtn.insertAdjacentHTML('afterend', resultsHTML);
            checkAnswersBtn.disabled = true;
            
            // Tekrar dene butonu
            document.getElementById('restartQuizBtn').addEventListener('click', function() {
                startReading(story);
            });
            
            console.log(`Test tamamlandı: ${correctAnswers}/${questions.length} doğru (${score}%)`);
        });
        
        // Hikayelere dön butonu
        backToStoriesBtn.addEventListener('click', function() {
            readingContainer.style.display = 'none';
            storiesContainer.style.display = 'block';
            storiesContainer.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-book-reader"></i>
                    <h3>Okuma-Anlama Çalışmaları</h3>
                    <p>Yukarıdaki seçenekleri kullanarak seviyenize uygun hikayeleri bulun.</p>
                </div>
            `;
        });
        
        // Yeni hikaye butonu
        newStoryBtn.addEventListener('click', function() {
            readingContainer.style.display = 'none';
            storiesContainer.style.display = 'block';
            findStoriesBtn.click();
        });
        
        // Sayfayı yukarı kaydır
        window.scrollTo(0, 0);
        
        console.log('✅ Okuma modu başlatıldı, sorular hazır');
    }
    
    // Seviye ismini Türkçe'ye çevir
    function getLevelTurkishName(level) {
        const levelMap = {
            'beginner': 'Başlangıç (A1)',
            'elementary': 'Temel (A2)', 
            'intermediate': 'Orta (B1)',
            'upper-intermediate': 'Orta Üstü (B2)'
        };
        return levelMap[level] || level;
    }
    
    // Hata gösterimi
    function showError(message) {
        storiesContainer.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="location.reload()">Tekrar Dene</button>
            </div>
        `;
    }
});
// reading.js dosyasının sonuna ekleyin:

// Okuma parçası tamamlandığında
function trackReadingCompletion(textTitle, wordCount, correctAnswers) {
    const points = (wordCount / 100) + (correctAnswers * 0.5); // Kelime sayısına göre puan
    
    updateUserProgress(points);
    
    // Okuma istatistiklerini kaydet
    const readingStats = JSON.parse(localStorage.getItem('readingStats') || '[]');
    readingStats.push({
        title: textTitle,
        wordCount: wordCount,
        correctAnswers: correctAnswers,
        points: points,
        date: new Date().toISOString()
    });
    localStorage.setItem('readingStats', JSON.stringify(readingStats));
}

// Okuma testi bitiş fonksiyonunuza entegre edin:
function completeReadingExercise() {
    // Mevcut okuma bitiş kodunuz...
    
    const wordCount = countWordsInText();
    const correctAnswers = getReadingCorrectAnswers();
    const textTitle = getReadingTitle();
    
    trackReadingCompletion(textTitle, wordCount, correctAnswers);
}