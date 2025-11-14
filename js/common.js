// js/common.js
// Ortak yardımcı fonksiyonlar - TÜM MODÜLLERDE KULLANILIR

console.log('common.js yüklendi - Ortak fonksiyonlar aktif');

/**
 * Kelimelerdeki alt tireleri boşlukla değiştirir
 * Örnek: "hello_world" → "hello world"
 */
function formatWord(word) {
    if (!word || typeof word !== 'string') return '';
    return word.replace(/_/g, ' ').trim();
}

/**
 * Metni sesli okur (Web Speech API)
 * @param {string} text - Okunacak metin
 * @param {string} lang - Dil (varsayılan: 'en-US')
 */
function speak(text, lang = 'en-US') {
    if (!text || typeof text !== 'string') return;

    // Önceki sesi iptal et (çakışmayı önle)
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => console.log(`Sesli okuma bitti: "${text}"`);
    utterance.onerror = (e) => console.error('Sesli okuma hatası:', e);

    speechSynthesis.speak(utterance);
}

/**
 * JSON verisini yükler (yorum satırlarını temizler)
 * @param {string} url - Veri dosyası yolu
 * @returns {Promise<Array|Object>} - JSON verisi
 */
async function loadData(url) {
    try {
        console.log(`Veri yükleniyor: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();

        // JSON yorum satırlarını temizle (// ve /* */)
        const cleanJson = text.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? '' : m);

        const data = JSON.parse(cleanJson);

        // Kelimeleri formatla (eğer dizi ise)
        if (Array.isArray(data)) {
            return data.map(item => {
                if (item.word) {
                    item.word = formatWord(item.word);
                    item.displayWord = item.displayWord || item.word;
                }
                if (item.english) item.english = formatWord(item.english);
                if (item.turkish) item.turkish = formatWord(item.turkish);
                return item;
            });
        }

        return data;
    } catch (error) {
        console.error(`Veri yüklenemedi: ${url}`, error);
        return [];
    }
}

// Global erişim
window.formatWord = formatWord;
window.speak = speak;
window.loadData = loadData;

// Ses API hazır mı?
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        console.log('Sesler yüklendi:', speechSynthesis.getVoices().length);
    };
}