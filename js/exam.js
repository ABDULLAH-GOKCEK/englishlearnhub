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
// exam.js - ÖĞRENİM SIRASINA GÖRE GÜNCELLENMİŞ VERSİYON
console.log('✅ exam.js loaded - ÖĞRENİM SIRASINA GÖRE');

class ExamManager {
    constructor() {
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.totalTimeSpent = 0;
        this.timerInterval = null;
        this.QUESTION_TIME = 30;
        this.currentTimeSpent = 0;
        this.allQuestions = [];
        this.userAnswers = [];
        this.examType = 'multiple';
        this.categoryStats = {};
        
        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.setupEventListeners();
        this.updateProgressInfo();
    }

    async loadQuestions() {
        console.log('📥 Loading questions from data/exam.json...');
        try {
            const data = await loadData('data/exam.json');
            
            if (!data) {
                throw new Error('Data loading failed');
            }

            // JSON yapısını analiz et
            if (Array.isArray(data)) {
                this.allQuestions = data;
            } else if (data.questions && Array.isArray(data.questions)) {
                this.allQuestions = data.questions;
            } else if (data.exam && Array.isArray(data.exam)) {
                this.allQuestions = data.exam;
            } else {
                // Fallback: tüm dizileri birleştir
                Object.keys(data).forEach(key => {
                    if (Array.isArray(data[key])) {
                        this.allQuestions = this.allQuestions.concat(data[key]);
                    }
                });
            }

            console.log('✅ Total questions found:', this.allQuestions.length);

            // Kategori yöneticisine verileri aktar
            if (window.categoryManager) {
                window.categoryManager.extractCategoriesFromData(this.allQuestions);
                this.updateCategoryDropdown();
            }

        } catch (error) {
            console.error('❌ Error loading questions:', error);
            this.allQuestions = this.getFallbackQuestions();
            this.updateCategoryDropdown();
        }
    }

    updateCategoryDropdown() {
        const categorySelect = document.getElementById('examCategory');
        if (!categorySelect || !window.categoryManager) return;

        // Kategori dropdown'unu güncelle
        window.categoryManager.updateCategoryDropdown(categorySelect, true);
    }

    updateProgressInfo() {
        const progressInfo = document.getElementById('progressInfo');
        const progressBar = document.getElementById('learningProgressBar');
        const progressText = document.getElementById('progressText');

        if (!progressInfo || !window.categoryManager) return;

        // LocalStorage'dan tamamlanan kategorileri al
        const completedCategories = getFromStorage('completedCategories') || [];
        const progress = window.categoryManager.getLearningProgress(completedCategories);

        if (progress.total > 0) {
            progressInfo.style.display = 'block';
            progressBar.style.width = `${progress.progress}%`;
            
            progressText.innerHTML = `
                <strong>Öğrenim İlerlemesi:</strong> ${progress.completed}/${progress.total} kategori tamamlandı (%${Math.round(progress.progress)})
                ${progress.nextCategory ? `<br><small>Sonraki öneri: ${progress.nextCategory.turkish} (${progress.nextCategory.level})</small>` : ''}
            `;
        }
    }

    setupEventListeners() {
        const startExamBtn = document.getElementById('startExamBtn');
        const nextQuestionBtn = document.getElementById('nextQuestionBtn');
        const finishExamBtn = document.getElementById('finishExamBtn');
        const reviewExamBtn = document.getElementById('reviewExamBtn');
        const newExamBtn = document.getElementById('newExamBtn');
        const speakQuestionBtn = document.getElementById('speakQuestionBtn');
        const listenButton = document.getElementById('listenButton');
        const submitAnswerBtn = document.getElementById('submitAnswerBtn');
        const backToResultsBtn = document.getElementById('backToResultsBtn');
        const newExamFromReviewBtn = document.getElementById('newExamFromReviewBtn');
        const saveResultsBtn = document.getElementById('saveResultsBtn');

        if (startExamBtn) startExamBtn.addEventListener('click', () => this.startExam());
        if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
        if (finishExamBtn) finishExamBtn.addEventListener('click', () => this.finishExamEarly());
        if (reviewExamBtn) reviewExamBtn.addEventListener('click', () => this.reviewExam());
        if (newExamBtn) newExamBtn.addEventListener('click', () => this.newExam());
        if (speakQuestionBtn) speakQuestionBtn.addEventListener('click', () => this.speakCurrentQuestion());
        if (listenButton) listenButton.addEventListener('click', () => this.listenQuestion());
        if (submitAnswerBtn) submitAnswerBtn.addEventListener('click', () => this.submitWrittenAnswer());
        if (backToResultsBtn) backToResultsBtn.addEventListener('click', () => this.showResults());
        if (newExamFromReviewBtn) newExamFromReviewBtn.addEventListener('click', () => this.newExam());
        if (saveResultsBtn) saveResultsBtn.addEventListener('click', () => this.saveResults());

        // Enter tuşu ile cevap gönderme
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitWrittenAnswer();
                }
            });
        }
    }

    startExam() {
        console.log('🚀 Starting exam...');

        if (this.allQuestions.length === 0) {
            alert('Sorular yüklenemedi! Lütfen sayfayı yenileyin.');
            return;
        }

        const questionCount = parseInt(document.getElementById('questionCount').value);
        const category = document.getElementById('examCategory').value;
        const difficulty = document.getElementById('examDifficulty').value;
        this.examType = document.getElementById('examType').value;

        this.currentQuestions = this.filterQuestions(category, difficulty);
        
        if (this.currentQuestions.length === 0) {
            alert('Seçtiğiniz kriterlere uygun soru bulunamadı! Tüm sorular gösteriliyor.');
            this.currentQuestions = this.allQuestions.slice(0, questionCount);
        } else if (this.currentQuestions.length < questionCount) {
            alert(`Seçtiğiniz kriterlere uygun sadece ${this.currentQuestions.length} soru bulundu.`);
            this.currentQuestions = this.currentQuestions.slice(0, questionCount);
        } else {
            this.currentQuestions = shuffleArray(this.currentQuestions).slice(0, questionCount);
        }

        if (this.currentQuestions.length === 0) {
            alert('Soru bulunamadı!');
            return;
        }

        // Sınav istatistiklerini sıfırla
        this.resetExamStats();

        // UI'ı güncelle
        document.getElementById('examSetup').classList.add('hidden');
        document.getElementById('examContainer').classList.remove('hidden');
        document.getElementById('examResults').classList.add('hidden');
        document.getElementById('reviewContainer').classList.add('hidden');

        document.getElementById('totalQuestions').textContent = this.currentQuestions.length;
        document.getElementById('currentScore').textContent = this.score;

        this.loadQuestion();
    }

    resetExamStats() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.totalTimeSpent = 0;
        this.currentTimeSpent = 0;
        this.userAnswers = [];
        this.categoryStats = {};
        
        clearInterval(this.timerInterval);
        
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = this.QUESTION_TIME.toString();
            timerElement.style.color = 'inherit';
        }
    }

    loadQuestion() {
        if (this.currentQuestionIndex >= this.currentQuestions.length) {
            this.finishExam();
            return;
        }

        // Önce input alanlarını temizle
        this.resetInputFields();

        const question = this.currentQuestions[this.currentQuestionIndex];
        
        // Soru verisi kontrolü
        if (!this.isValidQuestion(question)) {
            console.error('❌ Invalid question data:', question);
            this.currentQuestionIndex++;
            this.loadQuestion();
            return;
        }

        // UI'ı güncelle
        document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
        document.getElementById('questionText').textContent = question.question;
        
        // Kategori bilgisini göster
        const categoryInfo = document.getElementById('categoryInfo');
        if (categoryInfo && question.category) {
            const turkishName = getCategoryTurkishName(question.category);
            const level = getCategoryLevel(question.category);
            categoryInfo.textContent = `${turkishName} (${level})`;
        }

        // Sınav türüne göre UI'ı ayarla
        this.setupQuestionUI(question);

        this.startTimer();
    }

    setupQuestionUI(question) {
        const listeningSection = document.getElementById('listeningSection');
        const writingSection = document.getElementById('writingSection');
        const optionsContainer = document.getElementById('optionsContainer');
        const answerInput = document.getElementById('answerInput');
        const submitAnswerBtn = document.getElementById('submitAnswerBtn');

        // Tüm bölümleri gizle ve sıfırla
        listeningSection.classList.add('hidden');
        writingSection.classList.add('hidden');
        optionsContainer.innerHTML = '';
        
        // Input ve butonları sıfırla
        if (answerInput) {
            answerInput.value = '';
            answerInput.disabled = false;
            answerInput.classList.remove('correct', 'wrong');
            answerInput.placeholder = 'Cevabınızı buraya yazın...';
        }
        
        if (submitAnswerBtn) {
            submitAnswerBtn.disabled = false;
            submitAnswerBtn.textContent = 'Cevapla';
        }

        // Sınav türüne göre UI'ı ayarla
        const isListening = this.examType === 'listening' || 
                           (this.examType === 'mixed' && Math.random() > 0.5);
        
        if (isListening) {
            this.setupListeningQuestion(question);
        } else {
            this.setupMultipleChoiceQuestion(question);
        }
    }

    setupListeningQuestion(question) {
        const listeningSection = document.getElementById('listeningSection');
        const writingSection = document.getElementById('writingSection');
        const answerInput = document.getElementById('answerInput');
        const submitAnswerBtn = document.getElementById('submitAnswerBtn');
        const listenButton = document.getElementById('listenButton');

        // Bölümleri göster
        listeningSection.classList.remove('hidden');
        writingSection.classList.remove('hidden');
        
        // Dinleme butonunu ayarla
        if (listenButton) {
            listenButton.onclick = () => this.listenQuestion();
            listenButton.disabled = false;
            listenButton.innerHTML = '<i class="fas fa-volume-up"></i> Soruyu Dinle';
            listenButton.classList.remove('playing');
        }

        // Yazma alanını hazırla
        if (answerInput) {
            answerInput.value = '';
            answerInput.disabled = false;
            answerInput.focus();
            answerInput.classList.remove('correct', 'wrong');
        }

        // Gönder butonunu ayarla
        if (submitAnswerBtn) {
            submitAnswerBtn.onclick = () => this.submitWrittenAnswer();
            submitAnswerBtn.disabled = false;
        }

        // Soruyu otomatik olarak seslendir (isteğe bağlı)
        setTimeout(() => {
            this.speakQuestion(question.question);
        }, 500);
    }

    setupMultipleChoiceQuestion(question) {
        const optionsContainer = document.getElementById('optionsContainer');
        
        if (!question.options || question.options.length < 2) {
            console.error('❌ Invalid options for question:', question);
            return;
        }

        const shuffledOptions = shuffleArray([...question.options]);
        
        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-btn';
            
            button.addEventListener('click', () => {
                this.checkAnswer(option, question);
            });
            
            optionsContainer.appendChild(button);
        });

        // Soruyu otomatik seslendir
        this.speakQuestion(question.question);
    }

    startTimer() {
        clearInterval(this.timerInterval);
        
        this.currentTimeSpent = 0;
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = this.QUESTION_TIME.toString();
            timerElement.style.color = 'inherit';
        }
        
        this.timerInterval = setInterval(() => {
            this.currentTimeSpent++;
            const remainingTime = this.QUESTION_TIME - this.currentTimeSpent;
            
            if (timerElement) {
                timerElement.textContent = remainingTime.toString();
                
                if (remainingTime <= 10) {
                    timerElement.style.color = 'red';
                }
                
                if (this.currentTimeSpent >= this.QUESTION_TIME) {
                    clearInterval(this.timerInterval);
                    this.handleTimeOut();
                }
            }
        }, 1000);
    }

    handleTimeOut() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        this.wrongCount++;
        this.totalTimeSpent += this.currentTimeSpent;
        
        this.userAnswers.push({
            question: question,
            userAnswer: null,
            isCorrect: false,
            timeSpent: this.currentTimeSpent,
            timedOut: true
        });

        this.updateCategoryStats(question.category, false);
        this.showFeedback(false, question);
        
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.loadQuestion();
        }, 2000);
    }

    checkAnswer(selectedAnswer, question) {
        const correctAnswer = this.getCorrectAnswer(question);
        const isCorrect = selectedAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        
        this.processAnswer(selectedAnswer, isCorrect, question);
    }

    submitWrittenAnswer() {
        const answerInput = document.getElementById('answerInput');
        const submitAnswerBtn = document.getElementById('submitAnswerBtn');
        const question = this.currentQuestions[this.currentQuestionIndex];
        
        if (!answerInput || !answerInput.value.trim()) {
            alert('Lütfen bir cevap yazın!');
            return;
        }

        // Butonu devre dışı bırak tekrar tıklanmasın
        if (submitAnswerBtn) {
            submitAnswerBtn.disabled = true;
        }

        const userAnswer = answerInput.value.trim();
        const correctAnswer = this.getCorrectAnswer(question);
        const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        
        this.processAnswer(userAnswer, isCorrect, question);
    }

    processAnswer(userAnswer, isCorrect, question) {
        clearInterval(this.timerInterval);
        this.totalTimeSpent += this.currentTimeSpent;
        
        this.userAnswers.push({
            question: question,
            userAnswer: userAnswer,
            isCorrect: isCorrect,
            timeSpent: this.currentTimeSpent,
            timedOut: false
        });

        if (isCorrect) {
            this.score += 10;
            this.correctCount++;
            document.getElementById('currentScore').textContent = this.score;
            
            // Doğru cevabı seslendir
            this.speakOption("Correct! " + userAnswer);
        } else {
            this.wrongCount++;
            
            // Yanlış cevabı ve doğru cevabı seslendir
            this.speakOption("Wrong! The correct answer is " + this.getCorrectAnswer(question));
        }

        this.updateCategoryStats(question.category, isCorrect);
        this.showFeedback(isCorrect, question);
        
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.loadQuestion();
        }, 3000);
    }

    updateCategoryStats(category, isCorrect) {
        if (!category) return;
        
        if (!this.categoryStats[category]) {
            this.categoryStats[category] = { correct: 0, total: 0 };
        }
        
        this.categoryStats[category].total++;
        if (isCorrect) {
            this.categoryStats[category].correct++;
        }
    }

    showFeedback(isCorrect, question) {
        const correctAnswer = this.getCorrectAnswer(question);
        
        // Çoktan seçmeli sorular için feedback
        const options = document.querySelectorAll('.option-btn');
        options.forEach(option => {
            option.disabled = true;
            
            const optionText = option.textContent.trim().toLowerCase();
            const correctText = correctAnswer.trim().toLowerCase();
            
            if (optionText === correctText) {
                option.classList.add('correct');
            } else if (optionText === (this.userAnswers[this.userAnswers.length - 1].userAnswer || '').toLowerCase() && !isCorrect) {
                option.classList.add('wrong');
            }
        });

        // Dinleme testi için feedback
        const writingSection = document.getElementById('writingSection');
        const answerInput = document.getElementById('answerInput');
        const submitAnswerBtn = document.getElementById('submitAnswerBtn');
        const listenButton = document.getElementById('listenButton');
        
        if (writingSection && !writingSection.classList.contains('hidden')) {
            if (answerInput) {
                answerInput.disabled = true;
                if (isCorrect) {
                    answerInput.classList.add('correct');
                } else {
                    answerInput.classList.add('wrong');
                    // Yanlış cevap gösterimi
                    answerInput.value = `Sizin cevabınız: ${this.userAnswers[this.userAnswers.length - 1].userAnswer} | Doğru cevap: ${correctAnswer}`;
                }
            }
            
            if (submitAnswerBtn) {
                submitAnswerBtn.disabled = true;
                submitAnswerBtn.textContent = isCorrect ? '✓ Doğru' : '✗ Yanlış';
            }
            
            if (listenButton) {
                listenButton.disabled = true;
            }
        }
    }

    resetInputFields() {
        const answerInput = document.getElementById('answerInput');
        const submitAnswerBtn = document.getElementById('submitAnswerBtn');
        const listenButton = document.getElementById('listenButton');
        
        if (answerInput) {
            answerInput.value = '';
            answerInput.disabled = false;
            answerInput.classList.remove('correct', 'wrong');
            answerInput.placeholder = 'Cevabınızı buraya yazın...';
        }
        
        if (submitAnswerBtn) {
            submitAnswerBtn.disabled = false;
            submitAnswerBtn.textContent = 'Cevapla';
        }
        
        if (listenButton) {
            listenButton.disabled = false;
            listenButton.innerHTML = '<i class="fas fa-volume-up"></i> Soruyu Dinle';
            listenButton.classList.remove('playing');
        }
    }

    nextQuestion() {
        clearInterval(this.timerInterval);
        this.totalTimeSpent += this.currentTimeSpent;
        
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadQuestion();
        } else {
            this.finishExam();
        }
    }

    finishExamEarly() {
        clearInterval(this.timerInterval);
        this.totalTimeSpent += this.currentTimeSpent;
        this.finishExam();
    }

    finishExam() {
        clearInterval(this.timerInterval);
        
        // Tamamlanan kategorileri güncelle
        this.updateCompletedCategories();
        
        // Sonuçları göster
        this.showResults();
    }

    updateCompletedCategories() {
        const completedCategories = getFromStorage('completedCategories') || [];
        const newCategories = [];
        
        this.currentQuestions.forEach(question => {
            if (question.category && 
                !completedCategories.includes(question.category) &&
                !newCategories.includes(question.category)) {
                newCategories.push(question.category);
            }
        });
        
        if (newCategories.length > 0) {
            const allCompleted = [...completedCategories, ...newCategories];
            saveToStorage('completedCategories', allCompleted);
            
            // Başarı mesajı göster
            if (this.correctCount >= this.currentQuestions.length * 0.7) {
                alert(`Tebrikler! ${newCategories.map(cat => getCategoryTurkishName(cat)).join(', ')} kategorilerini başarıyla tamamladınız!`);
            }
        }
    }

    showResults() {
        document.getElementById('examContainer').classList.add('hidden');
        document.getElementById('examResults').classList.remove('hidden');
        document.getElementById('reviewContainer').classList.add('hidden');

        const totalQuestions = this.currentQuestions.length;
        const accuracy = totalQuestions > 0 ? (this.correctCount / totalQuestions) * 100 : 0;
        const averageTime = totalQuestions > 0 ? Math.round(this.totalTimeSpent / totalQuestions) : 0;

        // Sonuçları güncelle
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalScoreNumber').textContent = this.score;
        document.getElementById('correctAnswers').textContent = this.correctCount;
        document.getElementById('wrongAnswers').textContent = this.wrongCount;
        document.getElementById('timeSpent').textContent = this.totalTimeSpent + 's';
        document.getElementById('averageTime').textContent = averageTime + 's';
        document.getElementById('accuracyRate').textContent = Math.round(accuracy) + '%';

        // Sonuç mesajı
        const resultMessage = document.getElementById('resultMessage');
        if (accuracy >= 80) {
            resultMessage.textContent = 'Mükemmel! Çok iyi gidiyorsunuz! 🎉';
            resultMessage.style.color = '#27ae60';
        } else if (accuracy >= 60) {
            resultMessage.textContent = 'İyi! Devam edin! 👍';
            resultMessage.style.color = '#f39c12';
        } else {
            resultMessage.textContent = 'Daha fazla pratik yapmalısınız. 💪';
            resultMessage.style.color = '#e74c3c';
        }

        // Kategori bazlı istatistikleri göster
        this.showCategoryStats();
    }

    showCategoryStats() {
        const categoryStatsContainer = document.getElementById('categoryStats');
        if (!categoryStatsContainer) return;

        categoryStatsContainer.innerHTML = '';

        Object.keys(this.categoryStats).forEach(category => {
            const stats = this.categoryStats[category];
            const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
            
            const statElement = document.createElement('div');
            statElement.className = 'category-stat';
            statElement.innerHTML = `
                <strong>${getCategoryTurkishName(category)}</strong>
                <span>${stats.correct}/${stats.total} (%${Math.round(accuracy)})</span>
            `;
            
            categoryStatsContainer.appendChild(statElement);
        });
    }

    reviewExam() {
        document.getElementById('examResults').classList.add('hidden');
        document.getElementById('reviewContainer').classList.remove('hidden');

        const reviewQuestionsContainer = document.getElementById('reviewQuestions');
        reviewQuestionsContainer.innerHTML = '';

        this.userAnswers.forEach((userAnswer, index) => {
            const question = userAnswer.question;
            const correctAnswer = this.getCorrectAnswer(question);
            
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-question';
            
            reviewElement.innerHTML = `
                <div class="review-question-header ${userAnswer.isCorrect ? 'correct' : 'incorrect'}">
                    <span>Soru ${index + 1}</span>
                    <span class="review-status">${userAnswer.isCorrect ? '✓ Doğru' : '✗ Yanlış'}</span>
                </div>
                <div class="review-question-text">${question.question}</div>
                <div class="review-options">
                    <div class="review-option ${userAnswer.isCorrect ? 'correct' : ''}">
                        <strong>Cevabınız:</strong> ${userAnswer.userAnswer || 'Cevaplanmadı'}
                    </div>
                    <div class="review-option correct">
                        <strong>Doğru Cevap:</strong> ${correctAnswer}
                    </div>
                </div>
                ${question.explanation ? `
                    <div class="review-explanation">
                        <strong>Açıklama:</strong> ${question.explanation}
                    </div>
                ` : ''}
            `;
            
            reviewQuestionsContainer.appendChild(reviewElement);
        });
    }

    newExam() {
        document.getElementById('examResults').classList.add('hidden');
        document.getElementById('reviewContainer').classList.add('hidden');
        document.getElementById('examSetup').classList.remove('hidden');
        
        // İlerleme bilgisini güncelle
        this.updateProgressInfo();
    }

    saveResults() {
        const results = {
            date: new Date().toLocaleDateString('tr-TR'),
            score: this.score,
            correctCount: this.correctCount,
            wrongCount: this.wrongCount,
            totalTime: this.totalTimeSpent,
            accuracy: Math.round((this.correctCount / this.currentQuestions.length) * 100),
            categories: this.categoryStats
        };

        // Mevcut sonuçları al
        const allResults = getFromStorage('examResults') || [];
        allResults.push(results);
        
        // En son 50 sonucu sakla
        if (allResults.length > 50) {
            allResults.shift();
        }
        
        saveToStorage('examResults', allResults);
        alert('Sonuçlar başarıyla kaydedildi!');
    }

    // SES FONKSİYONLARI
    speakQuestion(text) {
        speakText(text, 'en-US');
    }

    speakOption(text) {
        speakText(text, 'en-US');
    }

    listenQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        this.speakQuestion(question.question);
    }

    speakCurrentQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        this.speakQuestion(question.question);
    }

    // YARDIMCI FONKSİYONLAR
    isValidQuestion(question) {
        return question && 
               question.question && 
               this.getCorrectAnswer(question) && 
               (question.options && question.options.length >= 2 || this.examType === 'listening');
    }

    getCorrectAnswer(question) {
        return question.answer || question.correctAnswer;
    }

    filterQuestions(category, difficulty) {
        return this.allQuestions.filter(question => {
            if (!this.isValidQuestion(question)) return false;
            
            const categoryMatch = category === 'all' || question.category === category;
            const difficultyMatch = difficulty === 'all' || 
                                  (question.difficulty && question.difficulty.toLowerCase() === difficulty.toLowerCase());
            
            return categoryMatch && difficultyMatch;
        });
    }

    getFallbackQuestions() {
        return [
            {
                question: "What is the English translation of 'kedi'?",
                options: ["Dog", "Cat", "Bird", "Fish"],
                answer: "Cat",
                category: "Animals",
                difficulty: "easy"
            },
            {
                question: "What is the English translation of 'köpek'?",
                options: ["Cat", "Dog", "Bird", "Fish"],
                answer: "Dog",
                category: "Animals", 
                difficulty: "easy"
            }
        ];
    }
}

// Sayfa yüklendiğinde ExamManager'ı başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded - Initializing ExamManager');
    window.examManager = new ExamManager();
});
// exam.js dosyasının sonuna ekleyin:

// Sınav tamamlandığında
function trackExamCompletion(score, totalQuestions, correctAnswers) {
    const points = correctAnswers * 2; // Sınavlar daha fazla puan
    
    updateUserProgress(points);
    
    // Sınav sonuçlarını kaydet
    const examResults = JSON.parse(localStorage.getItem('examResults') || '[]');
    examResults.push({
        score: score,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        points: points,
        date: new Date().toISOString(),
        level: userProfile?.profile?.level || 'A1'
    });
    localStorage.setItem('examResults', JSON.stringify(examResults));
    
    // Seviye güncelleme kontrolü
    if (score >= 80) {
        suggestLevelUp();
    }
}

function suggestLevelUp() {
    const currentLevel = userProfile?.profile?.level;
    const nextLevels = {
        'A1': 'A2',
        'A2': 'B1', 
        'B1': 'B2',
        'B2': 'C1'
    };
    
    const nextLevel = nextLevels[currentLevel];
    if (nextLevel) {
        if (confirm(`Tebrikler! ${currentLevel} seviyesini başarıyla tamamladınız. ${nextLevel} seviyesine geçmek ister misiniz?`)) {
            userProfile.updateLevel(nextLevel);
            alert(`Artık ${nextLevel} seviyesindesiniz! Yeni içerikler kilidi açıldı.`);
        }
    }
}

// Mevcut sınav bitiş fonksiyonunuza entegre edin:
function finishExam() {
    // Mevcut sınav bitiş kodunuz...
    
    const score = calculateScore();
    const correctAnswers = getCorrectAnswerCount();
    const totalQuestions = getTotalQuestionCount();
    
    trackExamCompletion(score, totalQuestions, correctAnswers);
}