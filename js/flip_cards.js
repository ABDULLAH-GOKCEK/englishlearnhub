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
// Çevir Kartları JavaScript - RESPONSIVE DESTEKLİ GÜNCELLENDİ
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Çevir kartları modülü yüklendi - Responsive destekli');
    
    // Responsive özellikleri başlat
    initResponsiveFeatures();
    
    const flashcardsContainer = document.getElementById('flashcardsContainer');
    const categorySelect = document.getElementById('categorySelect');
    const totalCardsSpan = document.getElementById('totalCards');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    // Modal elementleri
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    let wordsData = [];
    let filteredWords = [];
    let currentPage = 1;
    let cardsPerPage = getCardsPerPage(); // Responsive kart sayısı
    let hoverTimer = null;
    let currentModalWord = null;
    let isModalFlipped = false;
    let isFlipping = false;
    
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
        
        // Ekran boyutu değiştiğinde kart sayısını güncelle
        window.addEventListener('resize', function() {
            cardsPerPage = getCardsPerPage();
            if (filteredWords.length > 0) {
                currentPage = 1;
                updatePagination();
                displayFlashcards();
            }
        });
    }
    
    // Cihaza göre sayfa başına kart sayısı belirle
    function getCardsPerPage() {
        const isMobile = document.documentElement.classList.contains('mobile-device');
        const isTablet = document.documentElement.classList.contains('tablet');
        
        if (isMobile) {
            return 8; // Mobilde daha az kart
        } else if (isTablet) {
            return 12; // Tablet'te orta seviye
        } else {
            return 16; // Masaüstünde daha fazla
        }
    }
    
    // Modal işlevselliği - GÜNCELLENDİ
    function openModal(word) {
        currentModalWord = word;
        isModalFlipped = false;
        isFlipping = false;
        modalImage.src = word.image;
        
        // Modal içeriğini güncelle - İngilizce yüz
        updateModalContent();
        
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Modal event'lerini başlat
        initializeModalEvents();
    }
    
    function updateModalContent() {
        const modalWordElement = document.querySelector('.modal-word');
        const modalCategoryElement = document.querySelector('.modal-category');
        const modalLevelElement = document.querySelector('.modal-level');
        
        if (isModalFlipped) {
            // Türkçe yüz
            if (modalWordElement) {
                modalWordElement.textContent = currentModalWord.turkish;
                modalWordElement.className = 'modal-word turkish';
            }
            if (modalCategoryElement) {
                modalCategoryElement.textContent = 'Türkçe';
            }
        } else {
            // İngilizce yüz
            if (modalWordElement) {
                modalWordElement.textContent = currentModalWord.displayWord || currentModalWord.word;
                modalWordElement.className = 'modal-word english';
            }
            if (modalCategoryElement) {
                modalCategoryElement.textContent = currentModalWord.category;
            }
        }
        
        if (modalLevelElement) {
            modalLevelElement.textContent = currentModalWord.difficulty || 'easy';
            modalLevelElement.className = `modal-level ${currentModalWord.difficulty || 'easy'}`;
        }
        
        // Döndürme ikonunu güncelle
        const flipIcon = document.querySelector('.modal-flip-icon i');
        if (flipIcon) {
            flipIcon.className = isModalFlipped ? 'fas fa-undo' : 'fas fa-sync-alt';
        }
    }
    
    function closeImageModal() {
        imageModal.classList.remove('active');
        document.body.style.overflow = '';
        isModalFlipped = false;
        isFlipping = false;
        currentModalWord = null;
    }
    
    // Modal kart döndürme fonksiyonu - GÜNCELLENDİ (DÖNME EFEKTİ)
    function flipModalCard() {
        if (isFlipping || !currentModalWord) return;
        
        isFlipping = true;
        
        // Görsele dönme efekti uygula
        modalImage.classList.add('flipping');
        
        setTimeout(() => {
            // Kartı çevir
            isModalFlipped = !isModalFlipped;
            
            // İçeriği güncelle
            updateModalContent();
            
            // Dönme efekti kaldır
            setTimeout(() => {
                modalImage.classList.remove('flipping');
                isFlipping = false;
            }, 200);
        }, 200);
    }
    
    // Modal seslendirme fonksiyonu - GÜNCELLENDİ (TÜRKÇE SES AYARI)
    function speakModalWord() {
        if (currentModalWord) {
            if (isModalFlipped) {
                // Türkçe seslendirme - Geliştirilmiş ayarlar
                speakText(currentModalWord.turkish, 'tr-TR');
            } else {
                // İngilizce seslendirme
                speakText(currentModalWord.displayWord || currentModalWord.word, 'en-US');
            }
        }
    }
    
    // Modal event listener'ları
    function initializeModalEvents() {
        const modalSpeakerIcon = document.querySelector('.modal-speaker-icon');
        const modalFlipIcon = document.querySelector('.modal-flip-icon');
        const modalCloseIcon = document.querySelector('.modal-close-icon');
        
        if (modalSpeakerIcon) {
            modalSpeakerIcon.onclick = function(e) {
                e.stopPropagation();
                speakModalWord();
            };
        }
        
        if (modalFlipIcon) {
            modalFlipIcon.onclick = function(e) {
                e.stopPropagation();
                flipModalCard();
            };
        }
        
        if (modalCloseIcon) {
            modalCloseIcon.onclick = function(e) {
                e.stopPropagation();
                closeImageModal();
            };
        }
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
                console.log(`✅ ${wordsData.length} kelime yüklendi - ${cardsPerPage} kart/sayfa`);
                
                // Kategori seçeneklerini doldur
                updateCategoryOptions(wordsData);
                // Sayfalama ve kartları göster
                updatePagination();
                displayFlashcards();
            } else {
                showError('Kartlar yüklenirken bir hata oluştu.');
            }
        })
        .catch(error => {
            console.error('Hata:', error);
            showError('Veriler yüklenirken bir hata oluştu.');
        });
    
    // Kategori seçeneklerini güncelle - ÖĞRENİM SIRASINA GÖRE
    function updateCategoryOptions(words) {
        const categories = [...new Set(words.map(word => word.category))];
        
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
    
    // Kategori değiştiğinde filtrele
    categorySelect.addEventListener('change', function() {
        const selectedCategory = this.value;
        
        if (selectedCategory === 'all') {
            filteredWords = [...wordsData];
        } else {
            filteredWords = wordsData.filter(word => word.category === selectedCategory);
        }
        
        currentPage = 1;
        updatePagination();
        displayFlashcards();
    });
    
    // Sayfalama kontrollerini güncelle
    function updatePagination() {
        const totalPages = Math.ceil(filteredWords.length / cardsPerPage);
        
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        
        pageInfo.textContent = totalPages > 0 
            ? `Sayfa ${currentPage} / ${totalPages}` 
            : 'Kart bulunamadı';
            
        totalCardsSpan.textContent = filteredWords.length;
    }
    
    // Önceki sayfa
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
            displayFlashcards();
        }
    });
    
    // Sonraki sayfa
    nextPageBtn.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredWords.length / cardsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updatePagination();
            displayFlashcards();
        }
    });
    
    // Kartları görüntüleme fonksiyonu - Responsive
    function displayFlashcards() {
        if (!filteredWords || filteredWords.length === 0) {
            flashcardsContainer.innerHTML = '<div class="no-cards"><p>Bu kategoride kart bulunamadı.</p></div>';
            return;
        }
        
        const startIndex = (currentPage - 1) * cardsPerPage;
        const endIndex = Math.min(startIndex + cardsPerPage, filteredWords.length);
        const currentPageWords = filteredWords.slice(startIndex, endIndex);
        
        flashcardsContainer.innerHTML = '';
        
        currentPageWords.forEach((word, index) => {
            const flashcard = createFlashcard(word, index);
            flashcardsContainer.appendChild(flashcard);
        });
    }
    
    // Kart oluşturma fonksiyonu - Responsive
    function createFlashcard(word, index) {
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        
        const displayWord = word.displayWord || word.word.replace(/_/g, ' ');
        
        // Zorluk seviyesi badge'i
        const difficultyBadge = word.difficulty ? `<span class="level-badge level-${word.difficulty}">${word.difficulty.toUpperCase()}</span>` : '';
        
        flashcard.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <div class="flashcard-image-container">
                        ${difficultyBadge}
                        <img src="${word.image}" alt="${displayWord}" class="flashcard-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjNmMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkeT0iLjM1ZW0iIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPlJlc2ltIFlvazwvdGV4dD48L3N2Zz4='">
                    </div>
                    <div class="flashcard-text">${displayWord}</div>
                    <div class="flashcard-hover-text">🔊 Telaffuz için üzerinde bekleyin</div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-text">${word.turkish}</div>
                    <div class="flashcard-category">${getCategoryTurkishName(word.category)}</div>
                </div>
            </div>
        `;
        
        // Resim tıklama event'i - MODAL AÇMA
        const imageElement = flashcard.querySelector('.flashcard-image');
        imageElement.addEventListener('click', function(e) {
            e.stopPropagation();
            openModal(word);
        });
        
        // Tıklama ile çevirme (küçük kart)
        flashcard.addEventListener('click', function() {
            this.classList.toggle('flipped');
        });
        
        // Hover ile telaffuz
        flashcard.addEventListener('mouseenter', function() {
            const self = this;
            hoverTimer = setTimeout(() => {
                if (!self.classList.contains('flipped')) {
                    speakText(displayWord, 'en-US');
                }
            }, 800);
        });
        
        flashcard.addEventListener('mouseleave', function() {
            if (hoverTimer) {
                clearTimeout(hoverTimer);
            }
        });
        
        // Mobil için touch events
        let touchStartTime = 0;
        flashcard.addEventListener('touchstart', function() {
            touchStartTime = Date.now();
        });
        
        flashcard.addEventListener('touchend', function() {
            const touchDuration = Date.now() - touchStartTime;
            if (touchDuration > 500) {
                speakText(displayWord, 'en-US');
            }
        });
        
        // Animasyon için
        setTimeout(() => {
            flashcard.style.opacity = '1';
            flashcard.style.transform = 'scale(1)';
        }, index * 100);
        
        return flashcard;
    }
    
    // Hata gösterimi
    function showError(message) {
        flashcardsContainer.innerHTML = `
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
    // flip_cards.js dosyasına bu kodu ekleyin:

// Kartlara tıklama olayını ekleme (mevcut kodunuzun sonuna ekleyin)
function initializeCardClickEvents() {
    const flashcards = document.querySelectorAll('.flashcard');
    
    flashcards.forEach(card => {
        card.addEventListener('click', function() {
            const cardData = {
                image: this.querySelector('.card-image img').src,
                english: this.querySelector('.word').textContent,
                turkish: this.querySelector('.translation').textContent,
                category: this.getAttribute('data-category') || 'Genel',
                level: this.getAttribute('data-level') || 'A1'
            };
            
            openCardModal(cardData);
        });
    });
}

// Sayfa yüklendiğinde ve kartlar oluşturulduğunda bu fonksiyonu çağırın
// Örnek kullanım (mevcut kodunuzda kartları oluşturduğunuz yerde):
document.addEventListener('DOMContentLoaded', function() {
    // Mevcut kodunuz...
    
    // Kartlar oluşturulduktan sonra:
    setTimeout(initializeCardClickEvents, 100);
});

// Veya pagination değiştiğinde:
function updatePagination() {
    // Mevcut pagination kodunuz...
    
    // Kart event'lerini yeniden başlat
    initializeCardClickEvents();
}
}
// flip_cards.js dosyasının sonuna ekleyin:

// Kart çevrildiğinde veya seslendirme yapıldığında
function trackFlashcardActivity(cardData, action) {
    let points = 0;
    
    switch(action) {
        case 'flip':
            points = 0.3;
            break;
        case 'speak_english':
            points = 0.5;
            break;
        case 'speak_turkish':
            points = 0.5;
            break;
        case 'learned':
            points = 1;
            break;
    }
    
    updateUserProgress(points);
    console.log(`${action} eylemi: ${points} puan`);
}

// Mevcut modal kodunuza entegre edin:
// Modal açıldığında
function openCardModal(cardData) {
    // Mevcut modal kodunuz...
    
    // Aktivite takibi
    trackFlashcardActivity(cardData, 'flip');
}

// Seslendirme butonlarına event ekleyin:
document.addEventListener('DOMContentLoaded', function() {
    // English ses butonu
    document.querySelector('.voice-btn[onclick*="speakModalWord(\'en\')"]')?.addEventListener('click', function() {
        const word = document.getElementById('modalCardWord')?.textContent;
        if (word) {
            trackFlashcardActivity({english: word}, 'speak_english');
        }
    });
    
    // Turkish ses butonu
    document.querySelector('.voice-btn[onclick*="speakModalWord(\'tr\')"]')?.addEventListener('click', function() {
        const word = document.getElementById('modalCardTranslation')?.textContent;
        if (word) {
            trackFlashcardActivity({turkish: word}, 'speak_turkish');
        }
    });
});