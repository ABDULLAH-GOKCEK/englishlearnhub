// js/modules/flip-cards.js
document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('flashcardsContainer');
    const categorySelect = document.getElementById('categorySelect');

    const words = [
        { en: "Cat", tr: "Kedi", img: "images/animals/cat.jpg", category: "Animals" },
        { en: "Dog", tr: "Köpek", img: "images/animals/dog.jpg", category: "Animals" },
        { en: "Apple", tr: "Elma", img: "images/foods/apple.jpg", category: "Foods" },
        { en: "Pizza", tr: "Pizza", img: "images/foods/pizza.jpg", category: "Foods" }
    ];

    function renderCards(filter = 'all') {
        container.innerHTML = '';
        const filtered = filter === 'all' ? words : words.filter(w => w.category === filter);

        filtered.forEach(word => {
            const card = document.createElement('div');
            card.className = 'flip-card cursor-pointer';
            card.innerHTML = `
                <div class="flip-card-inner">
                    <div class="flip-card-front bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
                        <img src="${word.img}" alt="${word.en}" class="w-24 h-24 object-cover rounded-lg mb-3">
                        <p class="text-xl font-bold text-indigo-700">${word.en}</p>
                    </div>
                    <div class="flip-card-back bg-indigo-600 text-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center">
                        <p class="text-xl font-bold">${word.tr}</p>
                        <button onclick="speak('${word.en}')" class="mt-2 bg-white text-indigo-600 px-3 py-1 rounded">Oku</button>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => card.querySelector('.flip-card-inner').classList.toggle('flipped'));
            card.querySelector('.flip-card-back button').addEventListener('click', (e) => {
                e.stopPropagation();
                speak(word.en);
                UserProgress.update(1, 1);
            });
            container.appendChild(card);
        });
    }

    categorySelect.addEventListener('change', (e) => renderCards(e.target.value));
    renderCards();
});

function speak(text) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    speechSynthesis.speak(utter);
}