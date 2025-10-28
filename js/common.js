// Firebase V11+ importları (HTML <script type="module"> içinde çalışır)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log('✅ common.js loaded - FIREBASE DESTEKLİ VERSİYON');

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
            // Bildirim konteyneri hazırsa hata göster
            if (document.getElementById('notification-container')) {
                showNotification("Firebase yapılandırması eksik. Veriler kaydedilemeyecek.", "error");
            }
            return;
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Oturum açma
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // Oturum açma durumunu dinle ve userId'yi güncelle
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log(`🔑 Firebase User ID: ${userId} (Authenticated)`);
            } else {
                // Anonim kullanıcılar için rastgele bir ID kullanma
                userId = crypto.randomUUID();
                console.log(`🔑 Firebase User ID: ${userId} (Anonymous/Fallback)`);
            }
            // userId ve db hazır olduğunda eventi tetikle
            document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { userId: userId, db: db, appId: appId } }));
        });

    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
        showNotification("Firebase başlatılırken kritik hata oluştu.", "error");
    }
}

// --- Firestore Yol Yönetimi Fonksiyonları ---

/**
 * Kullanıcıya özel veriler için Firestore yolunu döndürür.
 */
function getUserCollectionPath(collectionName) {
    if (!userId || userId === 'loading') {
        throw new Error("Firestore: User ID is not ready.");
    }
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
}

// --- Firestore Veri İşlemleri Fonksiyonları ---

/**
 * Yeni bir kelimeyi Firestore'a kaydeder.
 */
async function saveLearnedWord(wordData) {
    if (!db) {
        console.error("❌ Firestore not initialized. Cannot save word.");
        return;
    }
    try {
        const collectionRef = collection(db, getUserCollectionPath('learnedWords'));
        const docId = wordData.word.toLowerCase();
        const docRef = doc(collectionRef, docId);
        
        await setDoc(docRef, {
            ...wordData,
            createdAt: serverTimestamp(),
            userId: userId,
        }, { merge: true }); 
        
        console.log(`💾 Learned word saved: ${wordData.word}`);
        showNotification(`'${wordData.word}' kelimesi kaydedildi!`, "info");
        
    } catch (error) {
        console.error("❌ Error saving learned word:", error);
        showNotification("Kelime kaydedilirken bir hata oluştu.", "error");
    }
}

/**
 * Kullanıcının kaydettiği kelimeleri gerçek zamanlı olarak dinler.
 */
function listenForLearnedWords(callback) {
    if (!db) {
        console.error("❌ Firestore not initialized. Cannot listen.");
        return () => {}; // Boş bir durdurucu döndür
    }
    
    const collectionRef = collection(db, getUserCollectionPath('learnedWords'));
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

// Kelime formatlama fonksiyonu
function formatWord(word) {
    if (!word) return '';
    return word.replace(/_/g, ' ');
}

// Basit Bildirim
function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;
    
    const div = document.createElement('div');
    div.className = `p-3 mb-2 rounded shadow-lg text-white font-semibold transform transition-transform duration-300 ease-out translate-y-0 opacity-100 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} max-w-xs`;
    div.textContent = message;
    
    notificationContainer.appendChild(div);

    setTimeout(() => {
        div.classList.replace('translate-y-0', 'translate-y-4');
        div.classList.replace('opacity-100', 'opacity-0');
        div.addEventListener('transitionend', () => div.remove());
    }, 3500);
}


// Sayfa yüklendiğinde Firebase'i başlat
document.addEventListener('DOMContentLoaded', initializeFirebase);


// Bu fonksiyonları window objesine ata ki diğer scriptler erişebilsin
window.formatWord = formatWord;
window.saveLearnedWord = saveLearnedWord;
window.listenForLearnedWords = listenForLearnedWords;
window.showNotification = showNotification;
