// js/common.js – 17 Kasım 2025
console.log("common.js yüklendi - Ortak fonksiyonlar aktif");

const sounds = {};
for (let i = 1; i <= 20; i++) {
  sounds[i] = new Audio(`/assets/sounds/${i}.mp3`);
}

window.speak = function(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onerror = e => console.log("Sesli okuma hatası:", e);
    utterance.onend = () => console.log("Sesli okuma bitti:", text);
    speechSynthesis.speak(utterance);
  }
};