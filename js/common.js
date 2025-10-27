// Tüm sayfalarda kullanılacak ortak fonksiyonlar
console.log('✅ common.js loaded - GÜNCELLENMİŞ VERSİYON');

// Kelime formatlama fonksiyonu
function formatWord(word) {
    if (!word) return '';
    return word.replace(/_/g, ' ');
}

// Veri yükleme fonksiyonu - TAMAMEN YENİ
async function loadData(url) {
    try {
        console.log(`📡 Loading data from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        // JSON yorum satırlarını temizle
        const jsonWithoutComments = text.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
        
        let data = JSON.parse(jsonWithoutComments);
        console.log('✅ Data loaded successfully:', data.length + ' items');
        
        // TÜM KELİMELERİ FORMATLA - KESİN ÇÖZÜM
        if (Array.isArray(data)) {
            data = data.map(item => {
                if (item && item.word) {
                    // Hem displayWord hem de word'ü güncelle
                    const formattedWord = formatWord(item.word);
                    return {
                        ...item,
                        word: formattedWord, // Orijinal word'ü de değiştir
                        displayWord: formattedWord
                    };
                }
                return item;
            });
            console.log('🎯 Kelimeler formatlandı:', data.length + ' kelime');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error loading data:', error);
        return null;
    }
}

// Metni seslendirme - GÜNCEL
function speakText(text, lang = 'en-US') {
    try {
        if (!text || !('speechSynthesis' in window)) return false;
        
        // Metni formatla
        const formattedText = formatWord(text);
        
        // Önceki konuşmaları durdur
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(formattedText);
        utterance.lang = lang;
        
        // Dil ayarları
        if (lang === 'tr-TR') {
            utterance.rate = 0.85;
            utterance.pitch = 1.0;
        } else {
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
        }
        
        utterance.volume = 1.0;
        
        // Ses seçimi
        const voices = speechSynthesis.getVoices();
        if (lang === 'tr-TR') {
            const turkishVoice = voices.find(voice => 
                voice.lang === 'tr-TR' || voice.lang === 'tr'
            );
            if (turkishVoice) utterance.voice = turkishVoice;
        } else {
            const englishVoice = voices.find(voice => 
                voice.lang === 'en-US' || voice.lang === 'en-GB'
            );
            if (englishVoice) utterance.voice = englishVoice;
        }
        
        speechSynthesis.speak(utterance);
        return true;
    } catch (error) {
        console.error('Text-to-speech error:', error);
        return false;
    }
}

// LocalStorage'dan veri okuma
function getFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('LocalStorage read error:', error);
        return null;
    }
}

// LocalStorage'a veri yazma
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('LocalStorage write error:', error);
        return false;
    }
}

// Rastgele öğe seçme
function getRandomItem(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

// Karıştırılmış dizi oluşturma
function shuffleArray(array) {
    if (!array || !Array.isArray(array)) return [];
    
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Kategori İngilizce ismini Türkçe'ye çevir
function getCategoryTurkishName(category) {
    const categoryMap = {
        // Aşama 1: Temel
        'Greetings': 'Selamlaşma',
        'Introduction': 'Tanışma', 
        'Emergency': 'Acil Durumlar',
        'Numbers': 'Sayılar',
        
        // Aşama 2: Günlük Yaşam
        'Food': 'Yemek',
        'Foods': 'Yiyecekler',
        'Drinks': 'İçecekler',
        'Shopping': 'Alışveriş',
        'Colors': 'Renkler',
        'Family': 'Aile ve İlişkiler',
        
        // Aşama 3: Sosyalleşme
        'Time': 'Zaman ve Tarih',
        'Weather': 'Hava Durumu',
        'Home': 'Ev ve Yaşam',
        'Body': 'Vücut Bölümleri',
        'Emotions': 'Duygular ve Hisler',
        
        // Aşama 4: İlgi Alanları
        'Transportation': 'Ulaşım ve Trafik',
        'Vehicles': 'Araçlar',
        'Travel': 'Seyahat',
        'Hobbies': 'Hobiler ve Boş Zaman',
        'Animals': 'Hayvanlar',
        'Fruits': 'Meyveler',
        'Health': 'Sağlık',
        
        // Aşama 5: Uzmanlık
        'Work': 'İş ve Ofis',
        'Education': 'Eğitim ve Okul',
        'Technology': 'Teknoloji ve İnternet',
        'Sports': 'Spor',
        'TurkishCulture': 'Türk Kültürü',
        
        // Diğer
        'Tools': 'Araçlar',
        'Furniture': 'Mobilya',
        'Clothes': 'Giyecekler'
    };
    return categoryMap[category] || category;
}

// Kategori seviyesini belirle - YENİ FONKSİYON
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

// Sayfalar arasında veri taşımak için
function setSessionData(key, value) {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('SessionStorage error:', error);
        return false;
    }
}

function getSessionData(key) {
    try {
        const data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('SessionStorage error:', error);
        return null;
    }
}

// Rastgele boolean değer üretme
function getRandomBoolean() {
    return Math.random() > 0.5;
}

function scrambleWord(word) {
    const formattedWord = formatWord(word);
    const letters = formattedWord.split('');
    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.join('').toUpperCase();
}

// Global fonksiyonları window objesine ekle
window.loadData = loadData;
window.speakText = speakText;
window.getFromStorage = getFromStorage;
window.saveToStorage = saveToStorage;
window.getRandomItem = getRandomItem;
window.shuffleArray = shuffleArray;
window.getCategoryTurkishName = getCategoryTurkishName;
window.setSessionData = setSessionData;
window.getSessionData = getSessionData;
window.getRandomBoolean = getRandomBoolean;
window.formatWord = formatWord;
window.scrambleWord = scrambleWord;
window.getCategoryLevel = getCategoryLevel;

// Sayfa yüklendiğinde mevcut sesleri kontrol et
if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener('voiceschanged', function() {
        console.log('Sesler yüklendi:', speechSynthesis.getVoices().length + ' ses mevcut');
    });
}

// Hata ayıklama için
console.log('🔄 common.js initialized successfully');
// common.js dosyasının SONUNA ekleyin:

// UserProfile yüklenmesini kontrol eden merkezi fonksiyon
function initializeUserProgress() {
    // user-profile.js yüklendi mi kontrol et
    if (typeof userProfile !== 'undefined') {
        window.updateUserProgress = function(points = 1) {
            userProfile.addLearnedWords(points);
            console.log(`📊 İlerleme güncellendi: +${points} puan`);
        };
    } else {
        // Fallback - sadece localStorage'a kaydet
        window.updateUserProgress = function(points = 1) {
            const progress = JSON.parse(localStorage.getItem('userProgress') || '{"totalPoints": 0, "learnedWords": 0}');
            progress.totalPoints = (progress.totalPoints || 0) + points;
            progress.learnedWords = (progress.learnedWords || 0) + points;
            progress.lastUpdated = new Date().toISOString();
            localStorage.setItem('userProgress', JSON.stringify(progress));
            console.log(`📊 İlerleme kaydedildi: +${points} puan`);
        };
    }
}

// Sayfa yüklendiğinde otomatik başlat
document.addEventListener('DOMContentLoaded', function() {
    initializeUserProgress();
    
    // Debug için progress durumunu göster
    const progress = JSON.parse(localStorage.getItem('userProgress') || '{"totalPoints": 0}');
    console.log(`🎯 Mevcut toplam puan: ${progress.totalPoints}`);
});