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
// Günlük Cümleler - RESPONSIVE DESTEKLİ GÜNCELLENDİ
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Günlük cümleler modülü yüklendi - Responsive destekli');
    
    // Responsive özellikleri başlat
    initResponsiveFeatures();
    
    // Elementler
    const elements = {
        englishText: document.getElementById('englishText'),
        turkishText: document.getElementById('turkishText'),
        sentenceCategory: document.getElementById('sentenceCategory'),
        sentenceNumber: document.getElementById('sentenceNumber'),
        dailyCategorySelect: document.getElementById('dailyCategorySelect'),
        prevSentenceBtn: document.getElementById('prevSentenceBtn'),
        nextSentenceBtn: document.getElementById('nextSentenceBtn'),
        speakEnglishIcon: document.getElementById('speakEnglishIcon'),
        speakTurkishIcon: document.getElementById('speakTurkishIcon'),
        learningProgress: document.getElementById('learningProgress')
    };

    let sentencesData = [];
    let filteredSentences = [];
    let currentSentenceIndex = 0;

    // Responsive özellikleri başlat
    function initResponsiveFeatures() {
        const isMobile = document.documentElement.classList.contains('mobile-device');
        const isTablet = document.documentElement.classList.contains('tablet');
        
        console.log(`📱 Responsive mod: ${isMobile ? 'Mobil' : isTablet ? 'Tablet' : 'Masaüstü'}`);
        
        // Mobilde touch event'leri optimize et
        if (isMobile) {
            setupMobileTouchEvents();
        }
    }
    
    // Mobil için touch event'leri
    function setupMobileTouchEvents() {
        const sentenceCard = document.querySelector('.daily-sentence-card');
        if (sentenceCard) {
            let touchStartX = 0;
            let touchEndX = 0;
            
            sentenceCard.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            });
            
            sentenceCard.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });
            
            function handleSwipe() {
                const swipeThreshold = 50;
                const diff = touchStartX - touchEndX;
                
                if (Math.abs(diff) > swipeThreshold) {
                    if (diff > 0) {
                        // Sola kaydırma - sonraki cümle
                        navigateToNextSentence();
                    } else {
                        // Sağa kaydırma - önceki cümle
                        navigateToPrevSentence();
                    }
                }
            }
        }
    }
    
    // Navigasyon fonksiyonları
    function navigateToPrevSentence() {
        if (filteredSentences.length === 0) return;
        currentSentenceIndex = (currentSentenceIndex - 1 + filteredSentences.length) % filteredSentences.length;
        showCurrentSentence();
    }
    
    function navigateToNextSentence() {
        if (filteredSentences.length === 0) return;
        currentSentenceIndex = (currentSentenceIndex + 1) % filteredSentences.length;
        showCurrentSentence();
    }

    // Cümleleri yükle
    async function loadSentences() {
        try {
            const data = await loadData('data/daily_sentences.json');
            if (data && data.length > 0) {
                sentencesData = data;
                console.log(`✅ ${sentencesData.length} cümle yüklendi`);
                setupApp();
            } else {
                throw new Error('Cümleler yüklenemedi');
            }
        } catch (error) {
            console.error('Hata:', error);
            // Demo veriler - öğrenim sırasına göre
            sentencesData = getDemoSentences();
            setupApp();
        }
    }

    function getDemoSentences() {
        return [
            // Aşama 1: Temel
            { id: 1, english: "Hello, how are you?", turkish: "Merhaba, nasılsın?", category: "Greetings" },
            { id: 2, english: "What is your name?", turkish: "Adın ne?", category: "Introduction" },
            { id: 3, english: "Help!", turkish: "İmdat!", category: "Emergency" },
            { id: 4, english: "I have two apples.", turkish: "İki elmam var.", category: "Numbers" },
            
            // Aşama 2: Günlük Yaşam
            { id: 5, english: "I would like a coffee", turkish: "Bir kahve istiyorum", category: "Food" },
            { id: 6, english: "This is delicious!", turkish: "Bu çok lezzetli!", category: "Foods" },
            { id: 7, english: "Water please.", turkish: "Su lütfen.", category: "Drinks" },
            { id: 8, english: "How much does this cost?", turkish: "Bu ne kadar?", category: "Shopping" },
            { id: 9, english: "The sky is blue.", turkish: "Gökyüzü mavi.", category: "Colors" },
            { id: 10, english: "This is my family.", turkish: "Bu benim ailem.", category: "Family" }
        ];
    }

    function setupApp() {
        populateCategories();
        filterSentences();
        setupEventListeners();
        showLearningProgress();
    }

    function populateCategories() {
        const categories = [...new Set(sentencesData.map(s => s.category))];
        
        // Öğrenim sırasına göre sırala
        const learningOrder = [
            'Greetings', 'Introduction', 'Emergency', 'Numbers',
            'Food', 'Foods', 'Drinks', 'Shopping', 'Colors', 'Family',
            'Time', 'Weather', 'Home', 'Body', 'Emotions',
            'Transportation', 'Vehicles', 'Travel', 'Hobbies', 'Animals', 'Fruits', 'Health',
            'Work', 'Education', 'Technology', 'Sports', 'TurkishCulture'
        ];
        
        const orderedCategories = learningOrder.filter(cat => 
            categories.includes(cat)
        );
        
        // Kalan kategorileri alfabetik sırala
        const remainingCategories = categories.filter(cat => 
            !learningOrder.includes(cat)
        ).sort();
        
        const allCategories = [...orderedCategories, ...remainingCategories];
        
        allCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = getCategoryTurkishName(cat);
            
            // Seviye bilgisi ekle
            const level = getCategoryLevel(cat);
            if (level) {
                option.textContent += ` (${level})`;
            }
            
            elements.dailyCategorySelect.appendChild(option);
        });
    }

    // Öğrenim ilerlemesini göster
    function showLearningProgress() {
        if (!elements.learningProgress) return;
        
        const completedCategories = getFromStorage('completedCategories') || [];
        const learningOrder = [
            'Greetings', 'Introduction', 'Emergency', 'Numbers',
            'Food', 'Foods', 'Drinks', 'Shopping', 'Colors', 'Family',
            'Time', 'Weather', 'Home', 'Body', 'Emotions',
            'Transportation', 'Vehicles', 'Travel', 'Hobbies', 'Animals', 'Fruits', 'Health',
            'Work', 'Education', 'Technology', 'Sports', 'TurkishCulture'
        ];
        
        const availableCategories = learningOrder.filter(cat => 
            sentencesData.some(s => s.category === cat)
        );
        
        const completedCount = completedCategories.filter(cat => 
            availableCategories.includes(cat)
        ).length;
        
        const progress = availableCategories.length > 0 ? 
            (completedCount / availableCategories.length) * 100 : 0;
        
        elements.learningProgress.innerHTML = `
            <div class="progress-card">
                <h3>📚 Öğrenim İlerlemesi</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <p>${completedCount}/${availableCategories.length} kategori tamamlandı (%${Math.round(progress)})</p>
            </div>
        `;
    }

    function filterSentences() {
        const category = elements.dailyCategorySelect.value;
        filteredSentences = category === 'all' 
            ? sentencesData 
            : sentencesData.filter(s => s.category === category);
        
        currentSentenceIndex = 0;
        showCurrentSentence();
    }

    function showCurrentSentence() {
        if (filteredSentences.length === 0) {
            elements.englishText.textContent = 'Cümle bulunamadı';
            elements.turkishText.textContent = '';
            elements.sentenceCategory.textContent = '';
            elements.sentenceNumber.textContent = '0/0';
            return;
        }

        const sentence = filteredSentences[currentSentenceIndex];
        
        elements.englishText.textContent = sentence.english;
        elements.turkishText.textContent = sentence.turkish;
        elements.sentenceCategory.textContent = getCategoryTurkishName(sentence.category);
        elements.sentenceNumber.textContent = `${currentSentenceIndex + 1}/${filteredSentences.length}`;
    }

    function setupEventListeners() {
        // Kategori değişimi
        elements.dailyCategorySelect.addEventListener('change', filterSentences);

        // Navigasyon
        elements.prevSentenceBtn.addEventListener('click', navigateToPrevSentence);
        elements.nextSentenceBtn.addEventListener('click', navigateToNextSentence);

        // Ses
        elements.speakEnglishIcon.addEventListener('click', () => {
            if (filteredSentences.length === 0) return;
            speakText(filteredSentences[currentSentenceIndex].english, 'en-US');
        });

        elements.speakTurkishIcon.addEventListener('click', () => {
            if (filteredSentences.length === 0) return;
            speakText(filteredSentences[currentSentenceIndex].turkish, 'tr-TR');
        });

        // Klavye kısayolları
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') navigateToPrevSentence();
            if (e.key === 'ArrowRight') navigateToNextSentence();
            if (e.key === ' ') {
                e.preventDefault();
                speakText(filteredSentences[currentSentenceIndex].english, 'en-US');
            }
        });
    }

    // Başlat
    loadSentences();
});

// Kategori İngilizce ismini Türkçe'ye çevir
function getCategoryTurkishName(category) {
    const categoryMap = {
        'Animals': 'Hayvanlar',
        'Foods': 'Yiyecekler',
        'Colors': 'Renkler',
        'Vehicles': 'Araçlar',
        'Numbers': 'Sayılar',
        'Greetings': 'Selamlaşma',
        'Introduction': 'Tanışma',
        'Food': 'Yemek',
        'Shopping': 'Alışveriş',
        'Travel': 'Seyahat',
        'Health': 'Sağlık',
        'Emergency': 'Acil Durumlar',
        'Time': 'Zaman ve Tarih',
        'Weather': 'Hava Durumu',
        'Family': 'Aile ve İlişkiler',
        'Work': 'İş ve Ofis',
        'Technology': 'Teknoloji ve İnternet',
        'Home': 'Ev ve Yaşam',
        'Transportation': 'Ulaşım ve Trafik',
        'Hobbies': 'Hobiler ve Boş Zaman',
        'Emotions': 'Duygular ve Hisler',
        'Education': 'Eğitim ve Okul',
        'TurkishCulture': 'Türk Kültürü',
        'Fruits': 'Meyveler',
        'Tools': 'Araçlar',
        'Sports': 'Spor',
        'Furniture': 'Mobilya',
        'Drinks': 'İçecekler',
        'Clothes': 'Giyecekler',
        'Body': 'Vücut Bölümleri'
    };
    return categoryMap[category] || category;
}

// Kategori seviyesini belirle
function getCategoryLevel(category) {
    const learningOrder = [
        'Greetings', 'Introduction', 'Emergency', 'Numbers',
        'Food', 'Foods', 'Drinks', 'Shopping', 'Colors', 'Family',
        'Time', 'Weather', 'Home', 'Body', 'Emotions',
        'Transportation', 'Vehicles', 'Travel', 'Hobbies', 'Animals', 'Fruits', 'Health',
        'Work', 'Education', 'Technology', 'Sports', 'TurkishCulture'
    ];
    
    const index = learningOrder.indexOf(category);
    
    if (index === -1) return 'İleri';
    
    if (index <= 3) return 'Başlangıç';
    if (index <= 10) return 'Başlangıç+';
    if (index <= 15) return 'Temel';
    if (index <= 22) return 'Orta';
    return 'İleri';
}
// daily.js dosyasının sonuna ekleyin:

// Günlük cümle öğrenildiğinde
function trackDailySentence(sentence, translation) {
    updateUserProgress(1.5); // Cümleler daha fazla puan
    
    // Günlük aktiviteyi kaydet
    const dailyActivity = JSON.parse(localStorage.getItem('dailyActivity') || '[]');
    dailyActivity.push({
        type: 'sentence',
        sentence: sentence,
        translation: translation,
        date: new Date().toISOString().split('T')[0] // Sadece tarih
    });
    localStorage.setItem('dailyActivity', JSON.stringify(dailyActivity));
}

// Cümle kartlarına event ekleyin
document.addEventListener('DOMContentLoaded', function() {
    const sentenceCards = document.querySelectorAll('.sentence-card, .daily-card');
    
    sentenceCards.forEach(card => {
        card.addEventListener('click', function() {
            const sentence = this.querySelector('.sentence')?.textContent;
            const translation = this.querySelector('.translation')?.textContent;
            
            if (sentence && translation) {
                trackDailySentence(sentence, translation);
            }
        });
    });
});