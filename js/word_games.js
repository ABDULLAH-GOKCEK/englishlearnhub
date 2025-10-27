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
// Kelime Oyunları JavaScript - GERİ BİLDİRİMLER DÜZELTİLDİ
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Kelime oyunları modülü yüklendi');
    
    const gameContainer = document.getElementById('gameContainer');
    const gameCategorySelect = document.getElementById('gameCategory');
    const difficultySelect = document.getElementById('difficulty');
    const matchingGameBtn = document.getElementById('matchingGame');
    const wordPuzzleBtn = document.getElementById('wordPuzzle');
    const listeningTestBtn = document.getElementById('listeningTest');
    
    let wordsData = [];
    let selectedCategory = 'all';
    let selectedDifficulty = 'easy';
    
    // Öğrenim sırasına göre kategori sıralaması
    const learningOrder = [
        'Greetings', 'Introduction', 'Emergency', 'Numbers',
        'Food', 'Foods', 'Drinks', 'Shopping', 'Colors', 'Family',
        'Time', 'Weather', 'Home', 'Body', 'Emotions',
        'Transportation', 'Vehicles', 'Travel', 'Hobbies', 'Animals', 'Fruits', 'Health',
        'Work', 'Education', 'Technology', 'Sports', 'TurkishCulture'
    ];

    // Sayfa yüklendiğinde başlat
    initializeGame();

    function initializeGame() {
        console.log('🔄 Oyun başlatılıyor...');
        
        loadData('../data/words.json')
            .then(data => {
                if (data && Array.isArray(data) && data.length > 0) {
                    wordsData = data;
                    console.log('✅ Kelimeler yüklendi:', wordsData.length);
                    populateCategoryOptions();
                    setupEventListeners();
                } else {
                    showError('Kelimeler yüklenirken bir hata oluştu.');
                }
            })
            .catch(error => {
                console.error('Hata:', error);
                showError('Veriler yüklenirken bir hata oluştu.');
            });
    }
    
    function populateCategoryOptions() {
        const categories = [...new Set(wordsData.map(word => word.category))];
        
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
            
            const level = getCategoryLevel(category);
            if (level) {
                option.textContent += ` (${level})`;
            }
            
            gameCategorySelect.appendChild(option);
        });
    }
    
    function getCategoryLevel(category) {
        const index = learningOrder.indexOf(category);
        if (index === -1) return 'İleri';
        if (index <= 3) return 'Başlangıç';
        if (index <= 10) return 'Başlangıç+';
        if (index <= 15) return 'Temel';
        if (index <= 22) return 'Orta';
        return 'İleri';
    }
    
    function setupEventListeners() {
        gameCategorySelect.addEventListener('change', function() {
            selectedCategory = this.value;
        });
        
        difficultySelect.addEventListener('change', function() {
            selectedDifficulty = this.value;
        });
        
        matchingGameBtn.addEventListener('click', function() {
            startGame('matching');
        });
        
        wordPuzzleBtn.addEventListener('click', function() {
            startGame('puzzle');
        });
        
        listeningTestBtn.addEventListener('click', function() {
            startGame('listening');
        });
    }
    
    function getFilteredWords() {
        let filtered = selectedCategory === 'all' 
            ? [...wordsData] 
            : wordsData.filter(word => word.category === selectedCategory);
        
        switch(selectedDifficulty) {
            case 'easy':
                filtered = filtered.filter(word => word.word.length <= 5);
                break;
            case 'medium':
                filtered = filtered.filter(word => word.word.length > 5 && word.word.length <= 7);
                break;
            case 'hard':
                filtered = filtered.filter(word => word.word.length > 7);
                break;
        }
        
        return filtered.length > 0 ? filtered : wordsData.slice(0, 10);
    }
    
    function startGame(gameType) {
        console.log(`🚀 Oyun başlatılıyor: ${gameType}`);
        
        const filteredWords = getFilteredWords();
        
        if (filteredWords.length < 4) {
            showNotification('Bu kategoride ve zorluk seviyesinde yeterli kelime bulunamadı.', 'warning');
            return;
        }
        
        gameContainer.style.display = 'block';
        
        switch(gameType) {
            case 'matching':
                startMatchingGame(filteredWords);
                break;
            case 'puzzle':
                startWordPuzzle(filteredWords);
                break;
            case 'listening':
                startListeningTest(filteredWords);
                break;
        }
        
        showNotification(`${getCategoryTurkishName(selectedCategory)} - ${selectedDifficulty} seviye ile oyun başlatıldı!`, 'info');
        gameContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // EŞLEŞTİRME OYUNU - GERİ BİLDİRİMLİ
    function startMatchingGame(filteredWords) {
        let wordCount = 4;
        if (selectedDifficulty === 'medium') wordCount = 6;
        if (selectedDifficulty === 'hard') wordCount = 8;
        
        const gameWords = shuffleArray([...filteredWords]).slice(0, wordCount);
        
        gameContainer.innerHTML = `
            <div class="game-header">
                <h3 class="game-title">
                    <i class="fas fa-puzzle-piece"></i> 
                    Eşleştirme Oyunu
                </h3>
                <div class="game-controls">
                    <div class="game-stats">
                        <span id="timer">Süre: 0s</span>
                        <span id="score">Eşleşme: 0/${wordCount}</span>
                    </div>
                    <div class="settings-info">
                        <small>Kategori: ${getCategoryTurkishName(selectedCategory)} | Seviye: ${selectedDifficulty}</small>
                    </div>
                </div>
            </div>
            <div class="matching-game" id="matchingGameContainer"></div>
            <div class="game-feedback" id="matchingFeedback"></div>
            <div class="game-actions">
                <button class="btn" id="newGameBtn">
                    <i class="fas fa-redo"></i> Yeni Oyun
                </button>
                <button class="btn secondary" id="backToMenuBtn">
                    <i class="fas fa-arrow-left"></i> Menüye Dön
                </button>
            </div>
        `;
        
        const matchingContainer = document.getElementById('matchingGameContainer');
        const feedbackContainer = document.getElementById('matchingFeedback');
        
        // Kartları oluştur
        gameWords.forEach(word => {
            const imageCard = createCard('image', word.image, word.word);
            const wordCard = createCard('word', word.word, word.word);
            matchingContainer.appendChild(imageCard);
            matchingContainer.appendChild(wordCard);
        });
        
        // Kartları karıştır
        const cards = Array.from(matchingContainer.children);
        cards.sort(() => Math.random() - 0.5);
        matchingContainer.innerHTML = '';
        cards.forEach(card => matchingContainer.appendChild(card));
        
        let flippedCards = [];
        let matchedPairs = 0;
        let startTime = Date.now();
        let gameCompleted = false;
        
        const timer = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            document.getElementById('timer').textContent = `Süre: ${elapsedSeconds}s`;
        }, 1000);
        
        function createCard(type, content, word) {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.word = word;
            
            if (type === 'image') {
                card.innerHTML = `
                    <div class="card-inner">
                        <div class="card-front">
                            <i class="fas fa-image"></i>
                            <span>Resim</span>
                        </div>
                        <div class="card-back">
                            <img src="${content}" alt="${word}" class="card-image" onerror="this.style.display='none'">
                        </div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="card-inner">
                        <div class="card-front">
                            <i class="fas fa-font"></i>
                            <span>Kelime</span>
                        </div>
                        <div class="card-back">
                            <div class="card-word">${content}</div>
                        </div>
                    </div>
                `;
            }
            
            card.addEventListener('click', function() {
                handleCardClick(this);
            });
            
            return card;
        }
        
        function handleCardClick(cardElement) {
            if (cardElement.classList.contains('matched') || 
                cardElement.classList.contains('flipped') || 
                gameCompleted ||
                flippedCards.length >= 2) {
                return;
            }
            
            cardElement.classList.add('flipped');
            flippedCards.push(cardElement);
            
            if (flippedCards.length === 2) {
                const card1 = flippedCards[0];
                const card2 = flippedCards[1];
                
                if (card1.dataset.word === card2.dataset.word) {
                    // DOĞRU EŞLEŞME
                    card1.classList.add('matched');
                    card2.classList.add('matched');
                    matchedPairs++;
                    
                    document.getElementById('score').textContent = `Eşleşme: ${matchedPairs}/${wordCount}`;
                    showNotification('🎉 Doğru eşleştirme!', 'success');
                    playSuccessSound();
                    
                    if (matchedPairs === wordCount) {
                        gameCompleted = true;
                        clearInterval(timer);
                        const finalTime = Math.floor((Date.now() - startTime) / 1000);
                        setTimeout(() => {
                            showNotification(`🏆 Tebrikler! Tüm eşleştirmeleri ${finalTime} saniyede tamamladınız!`, 'success');
                        }, 500);
                    }
                    
                    flippedCards = [];
                } else {
                    // YANLIŞ EŞLEŞME
                    showNotification('❌ Yanlış eşleştirme!', 'warning');
                    setTimeout(() => {
                        card1.classList.remove('flipped');
                        card2.classList.remove('flipped');
                        flippedCards = [];
                    }, 1000);
                }
            }
        }
        
        document.getElementById('newGameBtn').addEventListener('click', function() {
            startGame('matching');
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', function() {
            gameContainer.style.display = 'none';
        });
    }

    // KELİME BULMACA - GERİ BİLDİRİMLİ
    function startWordPuzzle(filteredWords) {
        const randomWord = getRandomItem(filteredWords);
        const scrambledWord = scrambleWord(randomWord.word);
        
        gameContainer.innerHTML = `
            <div class="game-header">
                <h3 class="game-title">
                    <i class="fas fa-font"></i>
                    Kelime Bulmaca
                </h3>
                <div class="game-controls">
                    <div class="game-stats">
                        <span>İpucu: ${randomWord.turkish}</span>
                    </div>
                    <div class="settings-info">
                        <small>Kategori: ${getCategoryTurkishName(selectedCategory)} | Seviye: ${selectedDifficulty}</small>
                    </div>
                </div>
            </div>
            <div class="word-puzzle">
                <div class="puzzle-image-container">
                    <img src="${randomWord.image}" alt="${randomWord.word}" class="puzzle-image" onerror="this.style.display='none'">
                </div>
                <div class="puzzle-instruction">
                    <p>Karışık harfleri kullanarak doğru kelimeyi bulun:</p>
                    <div class="scrambled-word">${scrambledWord}</div>
                </div>
                <div class="answer-section">
                    <input type="text" class="answer-input" id="puzzleInput" placeholder="Kelimeyi yazın...">
                    <button class="btn" id="checkPuzzleBtn">
                        <i class="fas fa-check"></i> Kontrol Et
                    </button>
                </div>
                <div class="puzzle-feedback" id="puzzleFeedback"></div>
                <div class="puzzle-actions">
                    <button class="btn secondary" id="newPuzzleBtn">
                        <i class="fas fa-redo"></i> Yeni Kelime
                    </button>
                    <button class="btn secondary" id="backToMenuBtn2">
                        <i class="fas fa-arrow-left"></i> Menüye Dön
                    </button>
                </div>
            </div>
        `;
        
        const feedbackElement = document.getElementById('puzzleFeedback');
        
        document.getElementById('checkPuzzleBtn').addEventListener('click', function() {
            const userAnswer = document.getElementById('puzzleInput').value.trim().toLowerCase();
            const correctAnswer = randomWord.word.toLowerCase();
            
            if (userAnswer === '') {
                showNotification('Lütfen bir cevap yazın.', 'warning');
                return;
            }
            
            if (userAnswer === correctAnswer) {
                // DOĞRU CEVAP
                showNotification('🎉 Tebrikler! Doğru cevap!', 'success');
                speakText(randomWord.word, 'en-US');
                playSuccessSound();
                
                // Ekran geri bildirimi
                feedbackElement.textContent = `Doğru! "${randomWord.word}" kelimesini buldunuz.`;
                feedbackElement.className = 'puzzle-feedback correct';
                
                setTimeout(() => {
                    startGame('puzzle');
                }, 2000);
            } else {
                // YANLIŞ CEVAP
                showNotification('❌ Yanlış cevap, tekrar deneyin.', 'warning');
                
                // Ekran geri bildirimi
                feedbackElement.textContent = 'Yanlış cevap. Tekrar deneyin!';
                feedbackElement.className = 'puzzle-feedback incorrect';
                
                document.getElementById('puzzleInput').focus();
                document.getElementById('puzzleInput').select();
            }
        });
        
        document.getElementById('newPuzzleBtn').addEventListener('click', function() {
            startGame('puzzle');
        });
        
        document.getElementById('backToMenuBtn2').addEventListener('click', function() {
            gameContainer.style.display = 'none';
        });
        
        document.getElementById('puzzleInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('checkPuzzleBtn').click();
            }
        });
        
        setTimeout(() => {
            document.getElementById('puzzleInput').focus();
        }, 500);
    }

    // DİNLEME TESTİ - GERİ BİLDİRİMLİ
    function startListeningTest(filteredWords) {
        const randomWord = getRandomItem(filteredWords);
        
        gameContainer.innerHTML = `
            <div class="game-header">
                <h3 class="game-title">
                    <i class="fas fa-volume-up"></i>
                    Dinleme Testi
                </h3>
                <div class="game-controls">
                    <div class="game-stats">
                        <span id="attempts">Deneme: 0</span>
                    </div>
                    <div class="settings-info">
                        <small>Kategori: ${getCategoryTurkishName(selectedCategory)} | Seviye: ${selectedDifficulty}</small>
                    </div>
                </div>
            </div>
            <div class="listening-test">
                <div class="listen-image-container">
                    <img src="${randomWord.image}" alt="${randomWord.word}" class="listen-image" onerror="this.style.display='none'">
                </div>
                <div class="listen-controls">
                    <button class="listen-button" id="listenBtn">
                        <i class="fas fa-volume-up"></i>
                        <span>Kelimeyi Dinle</span>
                    </button>
                    <p class="listen-instruction">Butona basarak kelimeyi dinleyin ve aşağıya yazın</p>
                </div>
                <div class="answer-section">
                    <input type="text" class="answer-input" id="listeningInput" placeholder="Duyduğunuz kelimeyi yazın...">
                    <button class="btn" id="checkListeningBtn">
                        <i class="fas fa-check"></i> Kontrol Et
                    </button>
                </div>
                <div class="listening-feedback" id="listeningFeedback"></div>
                <div class="listening-actions">
                    <button class="btn secondary" id="newListeningBtn">
                        <i class="fas fa-redo"></i> Yeni Kelime
                    </button>
                    <button class="btn secondary" id="backToMenuBtn3">
                        <i class="fas fa-arrow-left"></i> Menüye Dön
                    </button>
                </div>
            </div>
        `;
        
        let attempts = 0;
        let isPlaying = false;
        const feedbackElement = document.getElementById('listeningFeedback');
        
        document.getElementById('listenBtn').addEventListener('click', function() {
            if (!isPlaying) {
                isPlaying = true;
                this.classList.add('playing');
                this.disabled = true;
                
                speakText(randomWord.word, 'en-US');
                
                setTimeout(() => {
                    this.classList.remove('playing');
                    this.disabled = false;
                    isPlaying = false;
                }, 2000);
            }
        });
        
        document.getElementById('checkListeningBtn').addEventListener('click', function() {
            const userAnswer = document.getElementById('listeningInput').value.trim().toLowerCase();
            const correctAnswer = randomWord.word.toLowerCase();
            
            if (userAnswer === '') {
                showNotification('Lütfen bir cevap yazın.', 'warning');
                return;
            }
            
            attempts++;
            document.getElementById('attempts').textContent = `Deneme: ${attempts}`;
            
            if (userAnswer === correctAnswer) {
                // DOĞRU CEVAP
                showNotification(`🎉 Tebrikler! Doğru cevap. ${attempts} denemede buldunuz!`, 'success');
                playSuccessSound();
                
                // Ekran geri bildirimi
                feedbackElement.textContent = `Doğru! "${randomWord.word}" kelimesini duydunuz.`;
                feedbackElement.className = 'listening-feedback correct';
                
                setTimeout(() => {
                    startGame('listening');
                }, 2000);
            } else {
                // YANLIŞ CEVAP
                showNotification('❌ Yanlış cevap. Tekrar dinleyip deneyin.', 'warning');
                
                // Ekran geri bildirimi
                feedbackElement.textContent = `Yanlış. Doğru cevap: "${randomWord.word}". Tekrar dinleyin!`;
                feedbackElement.className = 'listening-feedback incorrect';
                
                document.getElementById('listeningInput').focus();
                document.getElementById('listeningInput').select();
            }
        });
        
        document.getElementById('newListeningBtn').addEventListener('click', function() {
            startGame('listening');
        });
        
        document.getElementById('backToMenuBtn3').addEventListener('click', function() {
            gameContainer.style.display = 'none';
        });
        
        document.getElementById('listeningInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('checkListeningBtn').click();
            }
        });
        
        setTimeout(() => {
            document.getElementById('listeningInput').focus();
        }, 500);
    }

    // YARDIMCI FONKSİYONLAR
    function scrambleWord(word) {
        const letters = word.split('');
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        return letters.join('').toUpperCase();
    }
    
    function playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Ses çalınamadı:', error);
        }
    }
    
    // GELİŞTİRİLMİŞ BİLDİRİM FONKSİYONU
    function showNotification(message, type = 'info') {
        // Mevcut bildirimleri temizle
        const existingNotifications = document.querySelectorAll('.game-notification');
        existingNotifications.forEach(notification => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        // Yeni bildirim oluştur
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Bildirimi göster
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Bildirimi gizle
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
        
        console.log(`📢 Bildirim: ${message} (${type})`);
    }
    
    function getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle',
            'error': 'times-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    function showError(message) {
        gameContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn">
                    <i class="fas fa-redo"></i> Tekrar Dene
                </button>
            </div>
        `;
        gameContainer.style.display = 'block';
    }
});
// word_games.js dosyasının sonuna ekleyin:

// Oyun tamamlandığında
function trackGameCompletion(gameType, score, correctAnswers) {
    let points = 0;
    
    switch(gameType) {
        case 'matching':
            points = correctAnswers * 0.5;
            break;
        case 'quiz':
            points = correctAnswers * 0.7;
            break;
        case 'puzzle':
            points = correctAnswers * 0.6;
            break;
        default:
            points = correctAnswers * 0.5;
    }
    
    updateUserProgress(points);
    
    // Oyun istatistiklerini kaydet
    const gameStats = JSON.parse(localStorage.getItem('gameStats') || '[]');
    gameStats.push({
        type: gameType,
        score: score,
        correctAnswers: correctAnswers,
        points: points,
        date: new Date().toISOString()
    });
    localStorage.setItem('gameStats', JSON.stringify(gameStats));
}

// Mevcut oyun bitiş fonksiyonunuza entegre edin:
// ÖRNEK: Oyun bittiğinde
function gameFinished(score, correctAnswers, totalQuestions) {
    // Mevcut oyun bitiş kodunuz...
    
    // İlerleme takibi
    trackGameCompletion('quiz', score, correctAnswers);
}