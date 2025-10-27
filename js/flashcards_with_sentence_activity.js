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
// Kartlarla Cümleler JavaScript - ÖĞRENİM SIRASINA GÖRE GÜNCELLENDİ
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Cümle kurma çalışması modülü yüklendi');
    
    const sentenceCard = document.getElementById('sentenceCard');
    const sentenceEnglish = document.getElementById('sentenceEnglish');
    const sentenceTurkish = document.getElementById('sentenceTurkish');
    const flashcardsArea = document.getElementById('flashcardsArea');
    const constructedSentence = document.getElementById('constructedSentence');
    const checkSentenceBtn = document.getElementById('checkSentenceBtn');
    const speakAnswerBtn = document.getElementById('speakAnswerBtn');
    const clearSentenceBtn = document.getElementById('clearSentenceBtn');
    const newSentenceBtn = document.getElementById('newSentenceBtn');
    const sentenceCategory = document.getElementById('sentenceCategory');
    const difficultyLevel = document.getElementById('difficultyLevel');
    const feedback = document.getElementById('feedback');
    const learningProgress = document.getElementById('learningProgress');
    const progressFill = document.getElementById('progressFill');
    const progressStats = document.getElementById('progressStats');
    const progressPercent = document.getElementById('progressPercent');
    const nextCategoryName = document.getElementById('nextCategoryName');
    const categoryBadge = document.getElementById('categoryBadge');
    const gameStats = document.getElementById('gameStats');
    const gameInstruction = document.getElementById('gameInstruction');
    
    let sentencesData = [];
    let currentSentence = null;
    let draggedWord = null;
    let isEnglishQuestion = true;
    let gameStatistics = getFromStorage('sentenceGameStats') || {
        totalSentences: 0,
        correctAnswers: 0,
        completedCategories: []
    };

    // Sayfa yüklendiğinde kategori yöneticisini başlat
    initializeGame();

    async function initializeGame() {
        try {
            // Önce cümle verilerini yükle
            await loadSentencesData();
            
            // Kategori yöneticisini başlat
            if (window.categoryManager) {
                window.categoryManager.extractCategoriesFromData(sentencesData);
                populateCategoryOptions();
                updateLearningProgress();
            } else {
                console.error('Kategori yöneticisi bulunamadı');
                populateCategoryOptionsFallback();
            }
            
            // İlk cümleyi yükle
            loadNewSentence();
        } catch (error) {
            console.error('Başlatma hatası:', error);
            populateCategoryOptionsFallback();
            loadNewSentence();
        }
        
        // Olay dinleyicileri
        setupEventListeners();
    }

    // Cümle verilerini yükle
    async function loadSentencesData() {
        sentencesData = await loadData('../data/daily_sentences.json');
        if (!sentencesData || !Array.isArray(sentencesData)) {
            // Örnek cümleler yedek olarak
            sentencesData = getSampleSentences();
            console.log('Örnek cümleler kullanılıyor');
        }
        console.log('✅ Cümleler yüklendi:', sentencesData.length);
    }

    // Kategori seçeneklerini doldur - ÖĞRENİM SIRASINA GÖRE
    function populateCategoryOptions() {
        const categories = window.categoryManager.getCategoriesByLearningOrder();
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.english;
            option.textContent = `${cat.turkish} (${cat.level})`;
            sentenceCategory.appendChild(option);
        });
    }

    // Fallback kategori doldurma
    function populateCategoryOptionsFallback() {
        const categories = [...new Set(sentencesData.map(sentence => sentence.category))].sort();
        
        categories.forEach(category => {
            if (category) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = getCategoryTurkishName(category);
                sentenceCategory.appendChild(option);
            }
        });
    }

    // Öğrenim ilerlemesini güncelle
    function updateLearningProgress() {
        if (!window.categoryManager) return;

        const progress = window.categoryManager.getLearningProgress(
            gameStatistics.completedCategories
        );
        
        // İlerleme çubuğunu güncelle
        progressFill.style.width = `${progress.progress}%`;
        progressStats.textContent = `${progress.completed}/${progress.total} tamamlandı`;
        progressPercent.textContent = `%${Math.round(progress.progress)}`;
        
        // Sonraki kategoriyi göster
        if (progress.nextCategory) {
            nextCategoryName.textContent = `${progress.nextCategory.turkish} (${progress.nextCategory.level})`;
            // Önerilen kategoriyi seç
            sentenceCategory.value = progress.nextCategory.english;
        } else {
            nextCategoryName.textContent = 'Tüm kategoriler tamamlandı! 🎉';
            sentenceCategory.value = 'all';
        }
        
        // İstatistikleri güncelle
        gameStats.textContent = `Tamamlanan: ${gameStatistics.totalSentences} | Doğru: ${gameStatistics.correctAnswers}`;
        
        // İlerleme panelini göster
        learningProgress.style.display = 'block';
    }

    // Event listener'ları kur
    function setupEventListeners() {
        newSentenceBtn.addEventListener('click', loadNewSentence);
        sentenceCategory.addEventListener('change', loadNewSentence);
        difficultyLevel.addEventListener('change', loadNewSentence);
        checkSentenceBtn.addEventListener('click', checkSentence);
        speakAnswerBtn.addEventListener('click', speakAnswer);
        clearSentenceBtn.addEventListener('click', clearAll);
        
        // Cümle kartına tıklandığında telafuz et
        sentenceCard.addEventListener('click', function() {
            if (currentSentence) {
                const textToSpeak = isEnglishQuestion ? currentSentence.english : currentSentence.turkish;
                speakText(textToSpeak, isEnglishQuestion ? 'en-US' : 'tr-TR');
            }
        });
        
        // Sürükle-bırak olaylarını ayarla
        setupDragAndDrop();
    }
    
    // Yeni cümle yükleme fonksiyonu
    function loadNewSentence() {
        const selectedCategory = sentenceCategory.value;
        const selectedDifficulty = difficultyLevel.value;
        
        let filteredSentences = sentencesData;
        
        // Kategori seçilmişse filtrele
        if (selectedCategory !== 'all' && selectedCategory !== 'recommended') {
            filteredSentences = sentencesData.filter(sentence => 
                sentence.category === selectedCategory
            );
        }
        
        // Önerilen kategori seçilmişse
        if (selectedCategory === 'recommended' && window.categoryManager) {
            const nextCat = window.categoryManager.getNextRecommendedCategory(
                gameStatistics.completedCategories
            );
            if (nextCat) {
                filteredSentences = sentencesData.filter(sentence => 
                    sentence.category === nextCat.english
                );
            }
        }
        
        // Zorluk seviyesine göre filtrele
        filteredSentences = filterSentencesByDifficulty(filteredSentences, selectedDifficulty);
        
        if (filteredSentences.length === 0) {
            showFeedback('Bu kategoride ve zorluk seviyesinde cümle bulunamadı.', 'incorrect');
            return;
        }
        
        currentSentence = getRandomItem(filteredSentences);
        
        // İstatistikleri güncelle
        gameStatistics.totalSentences++;
        saveToStorage('sentenceGameStats', gameStatistics);
        updateLearningProgress();
        
        // Rastgele soru dilini belirle (Türkçe veya İngilizce)
        isEnglishQuestion = Math.random() > 0.5;
        
        if (isEnglishQuestion) {
            // İngilizce soru, Türkçe cevap
            sentenceEnglish.textContent = currentSentence.english;
            sentenceTurkish.textContent = "Türkçe çevirisini oluşturun";
            gameInstruction.textContent = "İngilizce cümlenin Türkçe çevirisini oluşturun";
        } else {
            // Türkçe soru, İngilizce cevap
            sentenceEnglish.textContent = "İngilizce çevirisini oluşturun";
            sentenceTurkish.textContent = currentSentence.turkish;
            gameInstruction.textContent = "Türkçe cümlenin İngilizce çevirisini oluşturun";
        }
        
        // Kategori rozetini güncelle
        categoryBadge.textContent = getCategoryTurkishName(currentSentence.category);
        
        clearAll();
        createWordFlashcards();
        
        // Bilgi mesajı göster
        showFeedback('Yeni cümle yüklendi. Kelimeleri doğru sıraya dizin.', 'info');
    }

    // Cümleleri zorluk seviyesine göre filtrele
    function filterSentencesByDifficulty(sentences, difficulty) {
        return sentences.filter(sentence => {
            const wordCount = isEnglishQuestion ? 
                sentence.turkish.split(' ').length : 
                sentence.english.split(' ').length;
            
            switch(difficulty) {
                case 'easy':
                    return wordCount <= 5;
                case 'medium':
                    return wordCount > 5 && wordCount <= 8;
                case 'hard':
                    return wordCount > 8;
                default:
                    return true;
            }
        });
    }
    
    // Kelime kartları oluşturma
    function createWordFlashcards() {
        flashcardsArea.innerHTML = '';
        
        // Doğru cevabı belirle
        const correctAnswer = isEnglishQuestion ? 
            currentSentence.turkish : currentSentence.english;
        
        // Cevabı kelimelere ayır ve noktalama işaretlerini temizle
        const answerWords = correctAnswer.split(' ')
            .map(word => word.replace(/[.,!?;:"]/g, ''))
            .filter(word => word.length > 0);
        
        const shuffledWords = shuffleArray([...answerWords]);
        
        shuffledWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.textContent = word;
            wordCard.dataset.word = word;
            wordCard.title = "Bu kelimeyi tıklayarak cevap alanına ekleyin";
            
            // Tıklama ile cevap kutusuna ekle
            wordCard.addEventListener('click', function() {
                if (!this.classList.contains('used')) {
                    addWordToAnswer(this);
                }
            });
            
            flashcardsArea.appendChild(wordCard);
        });
    }
    
    // Kelimeyi cevap alanına ekle
    function addWordToAnswer(wordElement) {
        const word = wordElement.dataset.word;
        
        const answerWord = document.createElement('div');
        answerWord.className = 'answer-word';
        answerWord.textContent = word;
        answerWord.dataset.word = word;
        answerWord.draggable = true;
        answerWord.title = "Bu kelimeyi sürükleyerek sırasını değiştirebilir veya tıklayarak kaldırabilirsiniz";
        
        // Sürükleme olayları
        answerWord.addEventListener('dragstart', function(e) {
            draggedWord = this;
            this.classList.add('dragging');
            e.dataTransfer.setData('text/plain', word);
        });
        
        answerWord.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedWord = null;
        });
        
        // Tıklama ile kaldırma
        answerWord.addEventListener('click', function() {
            returnWordToFlashcards(this);
        });
        
        constructedSentence.appendChild(answerWord);
        wordElement.classList.add('used');
        wordElement.style.display = 'none';
    }

    // Kelimeyi flashcard alanına geri döndür
    function returnWordToFlashcards(answerElement) {
        const word = answerElement.dataset.word;
        answerElement.remove();
        
        // Kelimeyi tekrar flashcard alanına ekle
        const wordCards = Array.from(flashcardsArea.querySelectorAll('.word-card.used'));
        const originalCard = wordCards.find(card => card.dataset.word === word);
        
        if (originalCard) {
            originalCard.classList.remove('used');
            originalCard.style.display = 'block';
        }
    }
    
    // Sürükle-bırak özelliğini ayarla
    function setupDragAndDrop() {
        constructedSentence.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        constructedSentence.addEventListener('drop', function(e) {
            e.preventDefault();
            if (draggedWord && draggedWord.classList.contains('answer-word')) {
                // Kelimelerin yerlerini değiştir
                const allWords = Array.from(constructedSentence.querySelectorAll('.answer-word'));
                const dropX = e.clientX;
                const dropY = e.clientY;
                
                let closestWord = null;
                let closestDistance = Infinity;
                
                // En yakın kelimeyi bul
                allWords.forEach(word => {
                    if (word !== draggedWord) {
                        const rect = word.getBoundingClientRect();
                        const wordCenterX = rect.left + rect.width / 2;
                        const wordCenterY = rect.top + rect.height / 2;
                        const distance = Math.sqrt(
                            Math.pow(dropX - wordCenterX, 2) + 
                            Math.pow(dropY - wordCenterY, 2)
                        );
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestWord = word;
                        }
                    }
                });
                
                if (closestWord) {
                    constructedSentence.insertBefore(draggedWord, closestWord);
                } else {
                    constructedSentence.appendChild(draggedWord);
                }
            }
        });
    }
    
    // Telaffuz Et fonksiyonu
    function speakAnswer() {
        const userWords = Array.from(constructedSentence.querySelectorAll('.answer-word'))
            .map(word => word.dataset.word)
            .join(' ');
        
        if (userWords.trim() === '') {
            showFeedback('Önce bir cümle oluşturun.', 'incorrect');
            return;
        }
        
        // Cevabın dilini belirle (soru İngilizce ise cevap Türkçe, soru Türkçe ise cevap İngilizce)
        const lang = isEnglishQuestion ? 'tr-TR' : 'en-US';
        speakText(userWords, lang);
    }
    
    // Cümleyi kontrol etme
    function checkSentence() {
        const userWords = Array.from(constructedSentence.querySelectorAll('.answer-word'))
            .map(word => word.dataset.word)
            .join(' ');
        
        if (userWords.trim() === '') {
            showFeedback('Lütfen önce bir cümle oluşturun.', 'incorrect');
            return;
        }
        
        const correctAnswer = isEnglishQuestion ? 
            currentSentence.turkish : currentSentence.english;
        
        // Noktalama işaretlerini kaldır ve karşılaştır
        const cleanUserAnswer = userWords.replace(/[.,!?;:"]/g, '').toLowerCase();
        const cleanCorrectAnswer = correctAnswer.replace(/[.,!?;:"]/g, '').toLowerCase();
        
        if (cleanUserAnswer === cleanCorrectAnswer) {
            gameStatistics.correctAnswers++;
            saveToStorage('sentenceGameStats', gameStatistics);
            
            // Kategoriyi tamamlandı olarak işaretle
            if (!gameStatistics.completedCategories.includes(currentSentence.category)) {
                gameStatistics.completedCategories.push(currentSentence.category);
                saveToStorage('sentenceGameStats', gameStatistics);
                updateLearningProgress();
            }
            
            showFeedback('Tebrikler! Cümleniz doğru. 🎉', 'correct');
            constructedSentence.classList.add('correct-animation');
            
            // Doğru cevabı telaffuz et
            speakText(userWords, isEnglishQuestion ? 'tr-TR' : 'en-US');
            
            // 2 saniye sonra yeni cümle yükle
            setTimeout(() => {
                constructedSentence.classList.remove('correct-animation');
                loadNewSentence();
            }, 2000);
        } else {
            showFeedback(`Cümleniz yanlış. Doğru cevap: "${correctAnswer}"`, 'incorrect');
        }
    }
    
    // Her şeyi temizle
    function clearAll() {
        constructedSentence.innerHTML = '';
        flashcardsArea.innerHTML = '';
        feedback.className = 'feedback';
        feedback.textContent = '';
        
        // Tüm kullanılmış kelimeleri geri getir
        const usedCards = document.querySelectorAll('.word-card.used');
        usedCards.forEach(card => {
            card.classList.remove('used');
            card.style.display = 'block';
        });
    }
    
    // Geri bildirim gösterme
    function showFeedback(message, type) {
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
        
        if (type === 'info') {
            // Bilgi mesajları 3 saniye sonra kaybolsun
            setTimeout(() => {
                if (feedback.textContent === message) {
                    feedback.className = 'feedback';
                    feedback.textContent = '';
                }
            }, 3000);
        }
    }

    // Örnek cümleler (yedek)
    function getSampleSentences() {
        return [
            // Greetings
            { english: "Hello, how are you?", turkish: "Merhaba, nasılsın?", category: "Greetings" },
            { english: "Good morning!", turkish: "Günaydın!", category: "Greetings" },
            
            // Introduction
            { english: "What is your name?", turkish: "Adın ne?", category: "Introduction" },
            { english: "Where are you from?", turkish: "Nerelisin?", category: "Introduction" },
            
            // Emergency
            { english: "Help!", turkish: "İmdat!", category: "Emergency" },
            { english: "Call an ambulance!", turkish: "Ambulans çağırın!", category: "Emergency" },
            
            // Numbers
            { english: "I have two apples.", turkish: "İki elmam var.", category: "Numbers" },
            { english: "There are five people.", turkish: "Beş kişi var.", category: "Numbers" },
            
            // Food
            { english: "I'm hungry.", turkish: "Acıktım.", category: "Food" },
            { english: "This is delicious!", turkish: "Bu çok lezzetli!", category: "Foods" }
        ];
    }
});