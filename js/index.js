document.addEventListener("DOMContentLoaded", async () => {
  const categoryList = document.getElementById("category-list");

  try {
    const response = await fetch("data/categories.json");
    const categories = await response.json();

    categories.forEach(cat => {
      const button = document.createElement("button");
      button.textContent = cat.name;
      button.className = "category-btn";
      button.setAttribute("aria-label", `${cat.name} kategorisini seç`);
      button.onclick = () => {
        window.location.href = cat.link;
      };
      categoryList.appendChild(button);
    });
  } catch (error) {
    categoryList.innerHTML = "<p>Veriler yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>";
    console.error("Kategori verisi alınamadı:", error);
  }
});
