// Firebase V11+ importları (HTML <script type="module"> içinde çalışır)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, onSnapshot, serverTimestamp, getDoc, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log('✅ common.js loaded - GÜNCELLENMİŞ VE FIREBASE DESTEKLİ VERSİYON');

// --- Global Firebase ve Auth Değişkenleri ---
let app;
let auth;
let db;
let userId = 'loading';
let appId;

// --- Firebase Başlatma ve Oturum Açma ---

/**
 * Firebase'i başlatır ve kullanıcı oturumunu açar (Özel Token veya Anonim).
 */
async function initializeFirebase() {
    try {
        // Gerekli global değişkenleri güvenli bir şekilde al
        appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (Object.keys(firebaseConfig).length === 0) {
            console.error("❌ Firebase Config not found. Progress tracking will not work.");
            return;
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // Token yoksa anonim olarak giriş yap
            await signInAnonymously(auth);
        }

        // Oturum açma durumunu dinle ve userId'yi güncelle
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log(`🔑 Firebase User ID: ${userId} (Authenticated)`);
                // Firestore başlatıldıktan sonra, UI'ı güncelleyecek bir olay tetikle
                document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { userId: userId, db: db, appId: appId } }));
            } else {
                // Anonim kullanıcılar için rastgele bir ID kullanma (geçici)
                userId = crypto.randomUUID();
                console.log(`🔑 Firebase User ID: ${userId} (Anonymous - No persistence)`);
                document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { userId: userId, db: db, appId: appId } }));
            }
        });

    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
    }
}

// --- Firestore Yol Yönetimi Fonksiyonları ---

/**
 * Kullanıcıya özel veriler için Firestore yolunu döndürür.
 * @param {string} collectionName - Koleksiyonun adı (örn: 'learnedWords')
 * @returns {string} Firestore koleksiyon yolu
 */
function getUserCollectionPath(collectionName) {
    if (!userId || userId === 'loading') {
        throw new Error("Firestore: User ID is not ready.");
    }
    // Veriler, /artifacts/{appId}/users/{userId}/{collectionName} yolunda saklanacak.
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
}

// --- Firestore Veri İşlemleri Fonksiyonları ---

/**
 * Yeni bir kelimeyi Firestore'a kaydeder.
 * @param {object} wordData - Kelime verisi (word, meaning, exampleSentence, etc.)
 */
async function saveLearnedWord(wordData) {
    if (!db) {
        console.error("❌ Firestore not initialized. Cannot save word.");
        return;
    }
    try {
        const collectionRef = collection(db, getUserCollectionPath('learnedWords'));
        // Firestore doküman ID'si olarak kelimenin kendisini (küçük harfli) kullan
        const docId = wordData.word.toLowerCase();
        const docRef = doc(collectionRef, docId);
        
        await setDoc(docRef, {
            ...wordData,
            createdAt: serverTimestamp(),
            userId: userId,
            // Daha önce kaydedilmişse üzerine yazılır ve güncellenir.
        }, { merge: true }); 
        
        console.log(`💾 Learned word saved: ${wordData.word}`);
        
    } catch (error) {
        console.error("❌ Error saving learned word:", error);
        // Hata durumunda kullanıcıya görsel bir bildirim göster
        showNotification("Kelime kaydedilirken bir hata oluştu.", "error");
    }
}

/**
 * Kullanıcının kaydettiği kelimeleri gerçek zamanlı olarak dinler.
 * @param {function} callback - Yeni veriler geldiğinde çalıştırılacak fonksiyon
 * @returns {function} Dinlemeyi durdurma fonksiyonu (unsubscribe)
 */
function listenForLearnedWords(callback) {
    if (!db) {
        console.error("❌ Firestore not initialized. Cannot listen.");
        return () => {}; // Boş bir durdurucu döndür
    }
    
    const collectionRef = collection(db, getUserCollectionPath('learnedWords'));
    // En son kaydedilen kelimeleri görmek için 'createdAt' alanına göre sıralama
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const words = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Firestore Timestamp'i okunabilir hale getir
            createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        callback(words);
    }, (error) => {
        console.error("❌ Error listening for learned words:", error);
        showNotification("Kelime listesi yüklenirken bir hata oluştu.", "error");
    });

    return unsubscribe;
}

// --- Yardımcı Fonksiyonlar ---

// Kelime formatlama fonksiyonu (Mevcut common.js dosyanızdan)
function formatWord(word) {
    if (!word) return '';
    return word.replace(/_/g, ' ');
}

// Basit Bildirim (Alert yerine kullanılacak)
function showNotification(message, type = 'info') {
    // Burada özel bir modal veya toast bildirim oluşturmanız gerekir.
    // Şimdilik sadece console.log kullanılıyor:
    console.log(`[Bildirim - ${type.toUpperCase()}]: ${message}`);
    // Gerçek uygulamada, bu fonksiyon bir DOM öğesi oluşturmalıdır.
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;
    
    const div = document.createElement('div');
    div.className = `p-3 mb-2 rounded shadow-lg text-white ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
    div.textContent = message;
    notificationContainer.appendChild(div);

    setTimeout(() => div.remove(), 4000);
}


// Sayfa yüklendiğinde Firebase'i başlat
document.addEventListener('DOMContentLoaded', initializeFirebase);


// Bu fonksiyonları window objesine ata ki diğer scriptler erişebilsin
window.formatWord = formatWord;
window.saveLearnedWord = saveLearnedWord;
window.listenForLearnedWords = listenForLearnedWords;
window.showNotification = showNotification;

// Mevcut common.js dosyanızdaki diğer fonksiyonlar buraya eklenebilir.
// Örneğin: loadData, initializeUserProgress (artık Firestore'a göre güncellenmeli)
// Ancak bu entegrasyon için sadece bu temel Firestore fonksiyonları yeterlidir.
