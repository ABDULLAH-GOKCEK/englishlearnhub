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
 * Initializes Firebase and signs in the user (Custom Token or Anonymous).
 */
async function initializeFirebase() {
    try {
        // Safely retrieve global variables provided by the Canvas environment
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
        
        // Use the initial auth token if available, otherwise sign in anonymously
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // Listen for auth state changes and update userId
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log(`🔑 Firebase User ID: ${userId} (Authenticated)`);
            } else {
                // Use a random ID for anonymous users if token fails
                userId = crypto.randomUUID();
                console.log(`🔑 Firebase User ID: ${userId} (Anonymous/Fallback)`);
            }
            // Dispatch event when userId and db are ready
            document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { userId: userId, db: db, appId: appId } }));
        });

    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
    }
}

// --- Firestore Path Management Functions ---

/**
 * Returns the Firestore path for user-specific data.
 * Data is stored at /artifacts/{appId}/users/{userId}/{collectionName}
 * @param {string} collectionName - Name of the collection (e.g., 'learnedWords')
 * @returns {string} Firestore collection path
 */
function getUserCollectionPath(collectionName) {
    if (!userId || userId === 'loading') {
        // This should not happen if called after 'firebaseReady' event
        throw new Error("Firestore: User ID is not ready.");
    }
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
}

// --- Firestore Data Operations Functions ---

/**
 * Saves a new word to Firestore.
 * @param {object} wordData - Word data (word, meaning, exampleSentence, etc.)
 */
async function saveLearnedWord(wordData) {
    if (!db) {
        console.error("❌ Firestore not initialized. Cannot save word.");
        return;
    }
    try {
        const collectionRef = collection(db, getUserCollectionPath('learnedWords'));
        // Use the word itself (lowercase) as the document ID for easy lookup and uniqueness
        const docId = wordData.word.toLowerCase();
        const docRef = doc(collectionRef, docId);
        
        await setDoc(docRef, {
            ...wordData,
            createdAt: serverTimestamp(),
            userId: userId,
        }, { merge: true }); // Merge ensures it updates if it already exists
        
        console.log(`💾 Learned word saved: ${wordData.word}`);
        showNotification(`'${wordData.word}' kelimesi kaydedildi!`, "info");
        
    } catch (error) {
        console.error("❌ Error saving learned word:", error);
        showNotification("Kelime kaydedilirken bir hata oluştu.", "error");
    }
}

/**
 * Listens for the user's saved words in real-time.
 * @param {function} callback - Function to execute when new data arrives
 * @returns {function} Unsubscribe function
 */
function listenForLearnedWords(callback) {
    if (!db) {
        console.error("❌ Firestore not initialized. Cannot listen.");
        return () => {}; // Return a no-op function
    }
    
    const collectionRef = collection(db, getUserCollectionPath('learnedWords'));
    // Query ordered by creation time
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const words = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Convert Firestore Timestamp to Date object for easier use
            createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        callback(words);
    }, (error) => {
        console.error("❌ Error listening for learned words:", error);
        showNotification("Kelime listesi yüklenirken bir hata oluştu.", "error");
    });

    return unsubscribe;
}

// --- Helper Functions ---

// Word formatting function (from your original common.js)
function formatWord(word) {
    if (!word) return '';
    return word.replace(/_/g, ' ');
}

// Simple Notification Display (replaces alert/confirm)
function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;
    
    const div = document.createElement('div');
    // Styling adapted for Tailwind and dynamic visibility
    div.className = `p-3 mb-2 rounded shadow-lg text-white font-semibold transform transition-transform duration-300 ease-out translate-y-0 opacity-100 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} max-w-xs`;
    div.textContent = message;
    
    // Add to container
    notificationContainer.appendChild(div);

    // Fade out and remove after 3.5 seconds
    setTimeout(() => {
        div.classList.replace('translate-y-0', 'translate-y-4');
        div.classList.replace('opacity-100', 'opacity-0');
        div.addEventListener('transitionend', () => div.remove());
    }, 3500);
}


// Initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', initializeFirebase);


// Attach functions to the window object so they can be accessed by other scripts
window.formatWord = formatWord;
window.saveLearnedWord = saveLearnedWord;
window.listenForLearnedWords = listenForLearnedWords;
window.showNotification = showNotification;
