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
// Öğrenme Modülü JavaScript - RESPONSIVE DESTEKLİ GÜNCELLENDİ
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Öğrenme modülü yüklendi - Responsive destekli');
    
    // Responsive özellikleri başlat
    initResponsiveFeatures();
    
    // Elementleri seç
    const wordsContainer = document.getElementById('wordsContainer');
    const categorySelect = document.getElementById('category');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const playAllAudioBtn = document.getElementById('playAllAudio');
    const stopAudioBtn = document.getElementById('stopAudio');
    
    // Modal elementleri
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    // Değişkenler
    let wordsData = [];
    let filteredWords = [];
    let currentPage = 1;
    let wordsPerPage = getWordsPerPage(); // Responsive kelime sayısı
    
    // Öğrenim sırasına göre kategori sıralaması
    const learningOrder = [
        'Greetings', 'Introduction', 'Emergency', 'Numbers',
        'Food', 'Foods', 'Drinks', 'Shopping', 'Colors', 'Family',
        'Time', 'Weather', 'Home', 'Body', 'Emotions',
        'Transportation', 'Vehicles', 'Travel', 'Hobbies', 'Animals', 'Fruits', 'Health',
        'Work', 'Education', 'Technology', 'Sports', 'TurkishCulture'
    ];

    // Responsive özellikleri başlat
    function initResponsiveFeatures() {
        const isMobile = document.documentElement.classList.contains('mobile-device');
        const isTablet = document.documentElement.classList.contains('tablet');
        
        console.log(`📱 Responsive mod: ${isMobile ? 'Mobil' : isTablet ? 'Tablet' : 'Masaüstü'}`);
        
        // Ekran boyutu değiştiğinde kelime sayısını güncelle
        window.addEventListener('resize', function() {
            wordsPerPage = getWordsPerPage();
            if (filteredWords.length > 0) {
                currentPage = 1;
                updatePagination();
                displayWords();
            }
        });
    }
    
    // Cihaza göre sayfa başına kelime sayısı belirle
    function getWordsPerPage() {
        const isMobile = document.documentElement.classList.contains('mobile-device');
        const isTablet = document.documentElement.classList.contains('tablet');
        
        if (isMobile) {
            return 6; // Mobilde daha az kelime
        } else if (isTablet) {
            return 8; // Tablet'te orta seviye
        } else {
            return 10; // Masaüstünde daha fazla
        }
    }
    
    // Modal açma fonksiyonu - Responsive destekli
    function openModal(word) {
        modalImage.src = word.image;
        
        // Modal içeriğini güncelle
        const modalWordElement = document.querySelector('.modal-word');
        const modalCategoryElement = document.querySelector('.modal-category');
        const modalLevelElement = document.querySelector('.modal-level');
        
        if (modalWordElement) {
            modalWordElement.textContent = word.displayWord || word.word;
            modalWordElement.className = 'modal-word english'; // İngilizce için mavi
        }
        if (modalCategoryElement) {
            modalCategoryElement.textContent = getCategoryTurkishName(word.category);
        }
        if (modalLevelElement) {
            modalLevelElement.textContent = word.difficulty || 'easy';
            modalLevelElement.className = `modal-level ${word.difficulty || 'easy'}`;
        }
        
        // Modal ses ikonunu güncelle
        const modalSpeakerIcon = document.querySelector('.modal-speaker-icon');
        if (modalSpeakerIcon) {
            modalSpeakerIcon.onclick = function(e) {
                e.stopPropagation();
                speakWord(word.displayWord || word.word);
            };
        }
        
        // Modal kapatma ikonunu güncelle
        const modalCloseIcon = document.querySelector('.modal-close-icon');
        if (modalCloseIcon) {
            modalCloseIcon.onclick = function(e) {
                e.stopPropagation();
                closeImageModal();
            };
        }
        
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeImageModal() {
        imageModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Modal kapatma event'leri
    imageModal.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            closeImageModal();
        }
    });

    // ESC tuşu ile kapatma
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && imageModal.classList.contains('active')) {
            closeImageModal();
        }
    });
    
    // Kelimeleri yükle
    loadData('../data/words.json')
        .then(data => {
            if (data && Array.isArray(data) && data.length > 0) {
                // Kelimeleri formatla ve zorluk seviyesine göre sırala
                wordsData = data.map(word => ({
                    ...word,
                    displayWord: word.word.replace(/_/g, ' ')
                }));
                
                // Zorluk seviyesine göre sırala: easy -> medium -> hard
                wordsData.sort((a, b) => {
                    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
                    const aOrder = difficultyOrder[a.difficulty] || 4;
                    const bOrder = difficultyOrder[b.difficulty] || 4;
                    return aOrder - bOrder;
                });
                
                filteredWords = [...wordsData];
                console.log(`✅ ${wordsData.length} kelime yüklendi - ${wordsPerPage} kelime/sayfa`);
                
                // Kategori seçeneklerini doldur
                populateCategories();
                // Sayfalama ve kelimeleri göster
                updatePagination();
                displayWords();
            } else {
                showError('Kelimeler yüklenirken bir hata oluştu.');
            }
        })
        .catch(error => {
            console.error('Hata:', error);
            showError('Veriler yüklenirken bir hata oluştu.');
        });
    
    // Kelime seslendirme fonksiyonu
    function speakWord(word) {
        const displayWord = word.replace(/_/g, ' ');
        speakText(displayWord, 'en-US');
    }
    
    // Kategorileri doldur - ÖĞRENİM SIRASINA GÖRE
    function populateCategories() {
        const categories = [...new Set(wordsData.map(word => word.category))];
        
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
    
    // Kategori değiştiğinde
    categorySelect.addEventListener('change', function() {
        const selectedCategory = this.value;
        
        if (selectedCategory === 'all') {
            filteredWords = [...wordsData];
        } else {
            filteredWords = wordsData.filter(word => word.category === selectedCategory);
        }
        
        currentPage = 1;
        updatePagination();
        displayWords();
    });
    
    // Sayfalama kontrollerini güncelle
    function updatePagination() {
        const totalPages = Math.ceil(filteredWords.length / wordsPerPage);
        
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        
        pageInfo.textContent = totalPages > 0 
            ? `Sayfa ${currentPage} / ${totalPages}` 
            : 'Kelime bulunamadı';
    }
    
    // Önceki sayfa
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
            displayWords();
        }
    });
    
    // Sonraki sayfa
    nextPageBtn.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredWords.length / wordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updatePagination();
            displayWords();
        }
    });
    
    // Tüm sesleri çal
    playAllAudioBtn.addEventListener('click', function() {
        const startIndex = (currentPage - 1) * wordsPerPage;
        const endIndex = Math.min(startIndex + wordsPerPage, filteredWords.length);
        const currentPageWords = filteredWords.slice(startIndex, endIndex);
        
        // Önceki sesleri temizle
        speechSynthesis.cancel();
        
        // Sesleri sırayla çal
        let currentIndex = 0;
        
        function playNextWord() {
            if (currentIndex >= currentPageWords.length) return;
            
            const word = currentPageWords[currentIndex];
            const displayWord = word.displayWord || word.word.replace(/_/g, ' ');
            
            // Kelimeyi seslendir
            speakText(displayWord, 'en-US');
            
            currentIndex++;
            
            // Bir sonraki kelime için 2 saniye bekle
            setTimeout(playNextWord, 2000);
        }
        
        playNextWord();
    });
    
    // Sesleri durdur
    stopAudioBtn.addEventListener('click', function() {
        speechSynthesis.cancel();
    });
    
    // Kelimeleri görüntüle - Responsive grid
    function displayWords() {
        if (!filteredWords || filteredWords.length === 0) {
            wordsContainer.innerHTML = '<div class="no-words"><p>Bu kategoride kelime bulunamadı.</p></div>';
            return;
        }
        
        const startIndex = (currentPage - 1) * wordsPerPage;
        const endIndex = Math.min(startIndex + wordsPerPage, filteredWords.length);
        const currentPageWords = filteredWords.slice(startIndex, endIndex);
        
        wordsContainer.innerHTML = '';
        
        currentPageWords.forEach((word, index) => {
            const wordCard = createWordCard(word);
            wordsContainer.appendChild(wordCard);
            
            // Animasyon için gecikme
            setTimeout(() => {
                wordCard.style.opacity = '1';
                wordCard.style.transform = 'scale(1)';
            }, index * 100);
        });
    }
    
    // Kelime kartı oluştur - Responsive
    function createWordCard(word) {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-card';
        
        const displayWord = word.displayWord || word.word.replace(/_/g, ' ');
        
        // Zorluk seviyesi badge'i
        const difficultyBadge = word.difficulty ? `<span class="level-badge level-${word.difficulty}">${word.difficulty.toUpperCase()}</span>` : '';
        
        // Ses ikonu
        const speakerIcon = `<div class="word-speaker-icon" title="Seslendir">
            <i class="fas fa-volume-up"></i>
        </div>`;
        
        wordCard.innerHTML = `
            <div class="word-image-container">
                ${difficultyBadge}
                <img src="${word.image}" alt="${displayWord}" class="word-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjNmMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkeT0iLjM1ZW0iIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPlJlc2ltIFlvazwvdGV4dD48L3N2Zz4='">
            </div>
            <div class="word-info">
                <h3>${displayWord}</h3>
                ${speakerIcon}
            </div>
            <span class="category-badge">${getCategoryTurkishName(word.category)}</span>
        `;
        
        // Başlangıçta kartı gizle (animasyon için)
        wordCard.style.opacity = '0';
        wordCard.style.transform = 'scale(0.8)';
        wordCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // Elementleri seç
        const imageElement = wordCard.querySelector('.word-image');
        const speakerIconElement = wordCard.querySelector('.word-speaker-icon');
        
        // Resim tıklama event'i - MODAL AÇMA
        imageElement.addEventListener('click', function(e) {
            e.stopPropagation();
            openModal(word);
        });
        
        // Ses ikonu tıklama event'i
        speakerIconElement.addEventListener('click', function(e) {
            e.stopPropagation();
            speakWord(displayWord);
        });
        
        // Karta tıklanabilirlik ekle - MODAL AÇMA
        wordCard.addEventListener('click', function() {
            openModal(word);
        });
        
        return wordCard;
    }
    
    // Hata gösterimi
    function showError(message) {
        wordsContainer.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="location.reload()">Tekrar Dene</button>
            </div>
        `;
    }
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
// teaching.js dosyasının sonuna ekleyin:

// Kelime başarıyla öğrenildiğinde çağrılacak fonksiyon
function trackWordLearned(englishWord, turkishWord) {
    console.log(`Kelime öğrenildi: ${englishWord} - ${turkishWord}`);
    updateUserProgress(1);
    
    // Local Storage'a öğrenilen kelimeleri kaydet
    const learnedWords = JSON.parse(localStorage.getItem('learnedWords') || '[]');
    learnedWords.push({
        word: englishWord,
        translation: turkishWord,
        date: new Date().toISOString(),
        timestamp: Date.now()
    });
    localStorage.setItem('learnedWords', JSON.stringify(learnedWords));
}

// Mevcut kelime öğrenme fonksiyonlarınızı bulun ve şu şekilde güncelleyin:
// ÖRNEK: Bir kelime kartına tıklandığında
document.addEventListener('DOMContentLoaded', function() {
    // Kelime kartlarına tıklama event'i ekleyin
    const wordCards = document.querySelectorAll('.word-card, .flashcard');
    
    wordCards.forEach(card => {
        card.addEventListener('click', function() {
            const englishWord = this.querySelector('.english-word')?.textContent || 
                              this.querySelector('.word')?.textContent;
            const turkishWord = this.querySelector('.turkish-word')?.textContent || 
                               this.querySelector('.translation')?.textContent;
            
            if (englishWord && turkishWord) {
                trackWordLearned(englishWord, turkishWord);
            }
        });
    });
    
    // Seslendirme butonları için
    const speakButtons = document.querySelectorAll('.speak-btn, .voice-btn');
    speakButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Seslendirme yapıldığında da ilerlemeyi kaydet
            updateUserProgress(0.5); // Yarım puan
        });
    });
});