// js/modules/teaching.js
document.addEventListener('DOMContentLoaded', () => {
    const words = [
        { en: "Cat", tr: "Kedi", img: "../../images/animals/cat.jpg", category: "Animals" },
        { en: "Dog", tr: "Köpek", img: "../../images/animals/dog.jpg", category: "Animals" },
        { en: "Apple", tr: "Elma", img: "../../images/foods/apple.jpg", category: "Foods" },
        { en: "Pizza", tr: "Pizza", img: "../../images/foods/pizza.jpg", category: "Foods" },
        { en: "Car", tr: "Araba", img: "../../images/vehicles/car.jpg", category: "Vehicles" },
        { en: "Bus", tr: "Otobüs", img: "../../images/vehicles/bus.jpg", category: "Vehicles" }
    ];

    const container = document.getElementById('wordsContainer');
    const select = document.getElementById('categorySelect');

    function render(filter = 'all') {
        container.innerHTML = '';
        const filtered = filter === 'all' ? words : words.filter(w => w.category === filter);

        filtered.forEach(word => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition card-hover cursor-pointer';
            card.innerHTML = `
                <img src="${word.img}" alt="${word.en}" class="w-full h-32 object-cover rounded-lg mb-3">
                <h3 class="font-bold text-lg text-indigo-700">${word.en}</h3>
                <p class="text-gray-600">${word.tr}</p>
                <button class="mt-2 text-indigo-600 font-medium">Oku</button>
            `;
            card.querySelector('button').onclick = (e) => {
                e.stopPropagation();
                speak(word.en);
                UserProgress.update(1, 1);
            };
            card.onclick = () => openModal(word);
            container.appendChild(card);
        });
    }

    function speak(text) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        speechSynthesis.speak(utter);
    }

    function openModal(word) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <img src="${word.img}" alt="${word.en}" class="w-full h-64 object-cover rounded-lg mb-4">
                <h2 class="text-3xl font-bold text-indigo-700">${word.en}</h2>
                <p class="text-xl text-gray-600 mb-4">${word.tr}</p>
                <button onclick="speak('${word.en}')" class="btn btn-primary">Oku</button>
                <button onclick="this.closest('.modal').remove()" class="btn mt-2">Kapat</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => e.target === modal && modal.remove();
    }

    select.addEventListener('change', (e) => render(e.target.value));
    render();
});

window.completeModule = () => {
    UserProgress.update(50, 10);
    alert('Tebrikler! +50 XP kazandın!');
    setTimeout(() => location.href = '/', 800);
};