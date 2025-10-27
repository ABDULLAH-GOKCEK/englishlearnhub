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
function goBack() {
  window.history.back();
}

async function loadActivities() {
  const container = document.getElementById("activity-container");

  try {
    const response = await fetch("data/sentences.json");
    const activities = await response.json();

    activities.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "sentence-box";

      const sentence = document.createElement("p");
      sentence.innerHTML = item.sentence.replace("___", `<strong>___</strong>`);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Kelimeyi yaz...";
      input.setAttribute("aria-label", `Cümle ${index + 1} için boşluğu doldur`);

      const checkBtn = document.createElement("button");
      checkBtn.textContent = "Kontrol Et";
      checkBtn.onclick = () => {
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = item.answer.toLowerCase();
        if (userAnswer === correctAnswer) {
          alert("✅ Doğru!");
        } else {
          alert(`❌ Yanlış. Doğru cevap: ${item.answer}`);
        }
      };

      div.append(sentence, input, checkBtn);
      container.appendChild(div);
    });
  } catch (error) {
    container.innerHTML = "<p>Etkinlikler yüklenemedi.</p>";
    console.error("Cümle etkinliği verisi alınamadı:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadActivities);
