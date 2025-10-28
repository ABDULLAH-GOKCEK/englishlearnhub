// Tüm sayfalarda kullanılacak ortak fonksiyonlar
console.log('✅ common.js loaded - GÜNCEL VERSİYON');

// --- Global Değişkenler (Canvas Ortamından Gelir) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase & Firestore importları
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setLogLevel, onSnapshot, collection, query, addDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let app, db, auth;
let userId = null;

// Hata ayıklama log seviyesini ayarla
setLogLevel('Debug');


// Kelime formatlama fonksiyonu (Global olarak erişilebilir)
window.formatWord = function(word) {
    if (!word) return '';
    // Alt çizgileri boşlukla değiştir
    return word.replace(/_/g, ' ');
};

// --- Firebase Başlatma Fonksiyonu ---
async function initializeFirebase() {
    console.log('🔥 Firebase başlatılıyor...');
    
    if (Object.keys(firebaseConfig).length === 0) {
        console.error('❌ Firebase konfigürasyonu eksik. Veritabanı işlemleri çalışmayacaktır.');
        return;
    }

    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Kimlik doğrulama işlemi
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log('👤 Özel kimlik doğrulama başarılı.');
        } else {
            // Token yoksa anonim giriş yap
            await signInAnonymously(auth);
            console.log('👤 Anonim kimlik doğrulama başarılı.');
        }

        // Kimlik doğrulama durumu değiştiğinde kullanıcı ID'sini al
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log(`✅ Kullanıcı Kimliği belirlendi: ${userId}`);
                
                // Firestore hazır olduğunda bir olay tetikle
                const event = new CustomEvent('firebaseReady', { detail: { userId: userId } });
                document.dispatchEvent(event);
            } else {
                console.log('❌ Kullanıcı oturumu açık değil.');
                userId = null;
            }
        });

    } catch (error) {
        console.error('❌ Firebase başlatma hatası:', error);
        window.showNotification(`Firebase Hatası: ${error.message}`, 'error');
    }
}


// --- Bildirim Fonksiyonu (Global olarak erişilebilir) ---
window.showNotification = function(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error('Bildirim konteyneri bulunamadı.');
        return;
    }

    const notification = document.createElement('div');
    
    let bgColor, icon;
    if (type === 'success') {
        bgColor = 'bg-green-500';
        icon = 'fas fa-check-circle';
    } else if (type === 'error') {
        bgColor = 'bg-red-500';
        icon = 'fas fa-exclamation-triangle';
    } else if (type === 'info') {
        bgColor = 'bg-blue-500';
        icon = 'fas fa-info-circle';
    } else {
        bgColor = 'bg-gray-500';
        icon = 'fas fa-bell';
    }

    notification.className = `${bgColor} text-white p-4 rounded-lg shadow-xl mb-3 flex items-center transition-opacity duration-300`;
    notification.innerHTML = `<i class="${icon} mr-3"></i> <span>${message}</span>`;

    container.appendChild(notification);

    // 5 saniye sonra bildirimi kaldır
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.addEventListener('transitionend', () => notification.remove());
    }, 5000);
};

// --- Firestore İşlevleri (Global olarak erişilebilir) ---

/**
 * Öğrenilen bir kelimeyi Firestore'a kaydeder.
 * @param {object} wordData - Kelime verileri (word, meaning, partOfSpeech, exampleSentence, meaningContext)
 */
window.saveLearnedWord = async function(wordData) {
    if (!userId) {
        window.showNotification('Kullanıcı oturumu hazır değil. Lütfen birkaç saniye bekleyin.', 'error');
        return;
    }
    
    try {
        // Kelimeleri private alana kaydet: /artifacts/{appId}/users/{userId}/learned_words
        const collectionPath = `artifacts/${appId}/users/${userId}/learned_words`;
        const wordsCollectionRef = collection(db, collectionPath);
        
        // Firestore'a kaydetme
        const docRef = await addDoc(wordsCollectionRef, {
            ...wordData,
            createdAt: serverTimestamp(), // Sunucu zaman damgasını kullan
            word: window.formatWord(wordData.word).toLowerCase(), // Arama kolaylığı için küçük harf ve formatlı kaydet
            isMastered: false
        });
        
        window.showNotification(`'${wordData.word}' kelimesi başarıyla kaydedildi!`, 'success');
        console.log('Kelime kaydedildi. Belge ID:', docRef.id);
    } catch (e) {
        console.error('Kelime kaydetme hatası:', e);
        window.showNotification('Kelime kaydedilirken bir hata oluştu.', 'error');
    }
};

/**
 * Kullanıcının kaydettiği kelimeleri gerçek zamanlı dinler.
 * @param {function} callback - Yeni veriler geldiğinde çağrılacak fonksiyon.
 * @returns {function} Dinlemeyi durdurmak için kullanılacak unsubscribe fonksiyonu.
 */
window.listenForLearnedWords = function(callback) {
    if (!userId) {
        // Firebase hazır olana kadar bekle
        const eventHandler = () => {
            document.removeEventListener('firebaseReady', eventHandler);
            window.listenForLearnedWords(callback); // Tekrar dene
        };
        document.addEventListener('firebaseReady', eventHandler);
        return () => {}; // Geçici bir boş durdurucu döndür
    }

    const collectionPath = `artifacts/${appId}/users/${userId}/learned_words`;
    const wordsCollectionRef = collection(db, collectionPath);
    
    // Geçici olarak orderBy kullanmadan tüm veriyi alıp JS'te sıralayacağız.
    const q = query(wordsCollectionRef);
    
    console.log(`👂 Firestore dinlemesi başlatıldı: ${collectionPath}`);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const words = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Firestore Timestamp'i Date objesine dönüştür
            const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();

            words.push({
                id: doc.id,
                ...data,
                createdAt: createdAt
            });
        });
        
        // JS ile sıralama (Firestore'da index sorununu önlemek için)
        words.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        console.log(`🔔 Yeni kelime verisi alındı: ${words.length} kelime.`);
        callback(words);
    }, (error) => {
        console.error('Firestore dinleme hatası:', error);
        window.showNotification('Veri yüklenirken bir hata oluştu.', 'error');
    });

    // Dinlemeyi durdurma fonksiyonunu döndür
    return unsubscribe;
};


// Sayfa yüklendiğinde otomatik başlat
document.addEventListener('DOMContentLoaded', initializeFirebase);

console.log('🔄 common.js yükleme tamamlandı.');
