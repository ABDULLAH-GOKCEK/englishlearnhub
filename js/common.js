// js/common.js
console.log("common.js yüklendi");

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}

function formatWord(word) {
  return word?.replace(/_/g, ' ') || '';
}

window.speak = speak;
window.formatWord = formatWord;