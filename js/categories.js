// categories.js - Tüm uygulama için ortak kategori yönetimi
class CategoryManager {
    constructor() {
        this.categories = new Set();
        this.categoryMap = {}; // İngilizce-Türkçe eşleme
        this.learningOrder = []; // Öğrenim sırası
    }

    // JSON verisinden kategorileri çıkar
    extractCategoriesFromData(data) {
        if (!data) return;
        
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.category) {
                    this.addCategory(item.category);
                }
            });
        } else if (typeof data === 'object') {
            // Farklı JSON yapıları için
            if (data.questions && Array.isArray(data.questions)) {
                this.extractCategoriesFromData(data.questions);
            } else if (data.words && Array.isArray(data.words)) {
                this.extractCategoriesFromData(data.words);
            } else if (data.flashcards && Array.isArray(data.flashcards)) {
                this.extractCategoriesFromData(data.flashcards);
            }
            
            // Doğrudan öğeleri kontrol et
            Object.values(data).forEach(value => {
                if (Array.isArray(value)) {
                    this.extractCategoriesFromData(value);
                } else if (value && value.category) {
                    this.addCategory(value.category);
                }
            });
        }
        
        // Kategorileri öğrenim sırasına göre düzenle
        this.organizeCategoriesByLearningOrder();
    }

    // Kategori ekle
    addCategory(category) {
        if (category && typeof category === 'string') {
            this.categories.add(category);
            
            // Türkçe isim eşlemesi yoksa ekle
            if (!this.categoryMap[category]) {
                this.categoryMap[category] = this.getTurkishCategoryName(category);
            }
        }
    }

    // Kategorileri öğrenim sırasına göre düzenle
    organizeCategoriesByLearningOrder() {
        const learningOrder = this.getLearningOrder();
        
        // Mevcut kategorileri öğrenim sırasına göre filtrele ve sırala
        const orderedCategories = learningOrder.filter(category => 
            this.categories.has(category)
        );
        
        // Öğrenim sırasında olmayan kategorileri sona ekle
        const remainingCategories = Array.from(this.categories).filter(category => 
            !learningOrder.includes(category)
        ).sort();
        
        this.learningOrder = [...orderedCategories, ...remainingCategories];
    }

    // Kategori dropdown'unu güncelle (öğrenim sırasına göre)
    updateCategoryDropdown(selectElement, includeAll = true) {
        if (!selectElement) return;
        
        // Mevcut seçili değeri sakla
        const currentValue = selectElement.value;
        
        // Önceki option'ları temizle (ilk option'ı koru)
        while (selectElement.options.length > (includeAll ? 1 : 0)) {
            selectElement.remove(includeAll ? 1 : 0);
        }
        
        // Öğrenim sırasına göre kategorileri kullan
        const displayCategories = this.learningOrder.length > 0 ? 
            this.learningOrder : Array.from(this.categories).sort();
        
        // Yeni option'ları ekle
        displayCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.categoryMap[category] || category;
            
            // Seviye bilgisi ekle (isteğe bağlı)
            const level = this.getCategoryLevel(category);
            if (level) {
                option.textContent += ` (${level})`;
            }
            
            selectElement.appendChild(option);
        });
        
        // Önceki seçimi koru veya varsayılan yap
        if (this.categories.has(currentValue)) {
            selectElement.value = currentValue;
        } else {
            selectElement.value = includeAll ? 'all' : displayCategories[0] || '';
        }
    }

    // Kategori öğrenim sırasını getir
    getLearningOrder() {
        return [
            // Aşama 1: Temel Hayatta Kalma ve Temel İletişim (İlk 1-2 Ay)
            'Greetings',
            'Introduction', 
            'Emergency',
            'Numbers',
            
            // Aşama 2: Günlük Yaşam ve Temel İhtiyaçlar (2-4. Aylar)
            'Food',
            'Foods',
            'Drinks',
            'Shopping',
            'Colors',
            'Family',
            
            // Aşama 3: Çevreyi Anlama ve Sosyalleşme (4-6. Aylar)
            'Time',
            'Weather',
            'Home',
            'Body',
            'Emotions',
            
            // Aşama 4: İlgi Alanlarına ve Özelleşmiş Konulara Geçiş (6. Aydan İtibaren)
            'Transportation',
            'Vehicles',
            'Travel',
            'Hobbies',
            'Animals',
            'Fruits',
            'Health',
            
            // Aşama 5: Kariyer, Uzmanlık ve Kültür (Orta-İleri Seviye)
            'Work',
            'Education',
            'Technology',
            'Sports',
            'TurkishCulture',
            
            // Diğer Kategoriler (İhtiyaca Bağlı)
            'Tools',
            'Furniture',
            'Clothes'
        ];
    }

    // Kategori seviyesini belirle
    getCategoryLevel(category) {
        const learningOrder = this.getLearningOrder();
        const index = learningOrder.indexOf(category);
        
        if (index === -1) return 'İleri';
        
        if (index <= 3) return 'Başlangıç';
        if (index <= 10) return 'Başlangıç+';
        if (index <= 15) return 'Temel';
        if (index <= 22) return 'Orta';
        return 'İleri';
    }

    // Öğrenim sırasına göre kategorileri getir
    getCategoriesByLearningOrder() {
        if (this.learningOrder.length === 0) {
            this.organizeCategoriesByLearningOrder();
        }
        
        return this.learningOrder.map(category => ({
            english: category,
            turkish: this.categoryMap[category] || category,
            level: this.getCategoryLevel(category)
        }));
    }

    // Bir sonraki önerilen kategoriyi getir
    getNextRecommendedCategory(completedCategories = []) {
        const learningOrder = this.getLearningOrder();
        
        for (const category of learningOrder) {
            if (this.categories.has(category) && !completedCategories.includes(category)) {
                return {
                    english: category,
                    turkish: this.categoryMap[category] || category,
                    level: this.getCategoryLevel(category)
                };
            }
        }
        
        return null;
    }

    // İngilizce kategori ismini Türkçe'ye çevir
    getTurkishCategoryName(category) {
        const categoryMap = {
            // Aşama 1: Temel
            'Greetings': 'Selamlaşma',
            'Introduction': 'Tanışma',
            'Emergency': 'Acil Durumlar',
            'Numbers': 'Sayılar',
            
            // Aşama 2: Günlük Yaşam
            'Food': 'Yemek',
            'Foods': 'Yiyecekler',
            'Drinks': 'İçecekler',
            'Shopping': 'Alışveriş',
            'Colors': 'Renkler',
            'Family': 'Aile ve İlişkiler',
            
            // Aşama 3: Sosyalleşme
            'Time': 'Zaman ve Tarih',
            'Weather': 'Hava Durumu',
            'Home': 'Ev ve Yaşam',
            'Body': 'Vücut Bölümleri',
            'Emotions': 'Duygular ve Hisler',
            
            // Aşama 4: İlgi Alanları
            'Transportation': 'Ulaşım ve Trafik',
            'Vehicles': 'Araçlar',
            'Travel': 'Seyahat',
            'Hobbies': 'Hobiler ve Boş Zaman',
            'Animals': 'Hayvanlar',
            'Fruits': 'Meyveler',
            'Health': 'Sağlık',
            
            // Aşama 5: Uzmanlık
            'Work': 'İş ve Ofis',
            'Education': 'Eğitim ve Okul',
            'Technology': 'Teknoloji ve İnternet',
            'Sports': 'Spor',
            'TurkishCulture': 'Türk Kültürü',
            
            // Diğer
            'Tools': 'Araçlar',
            'Furniture': 'Mobilya',
            'Clothes': 'Giyecekler',
            
            // Mevcut diğer kategoriler
            'Art': 'Sanat',
            'Antonyms': 'Zıt Anlamlılar',
            'Basic Phrases': 'Temel İfadeler',
            'Clothing': 'Giysiler',
            'Geography': 'Coğrafya',
            'Grammar': 'Dilbilgisi',
            'History': 'Tarih',
            'Jobs': 'Meslekler',
            'Literature': 'Edebiyat',
            'Math': 'Matematik',
            'Movies': 'Filmler',
            'Music': 'Müzik',
            'Nature': 'Doğa',
            'Objects': 'Nesneler',
            'Places': 'Yerler',
            'Science': 'Bilim',
            'Synonyms': 'Eş Anlamlılar',
            'Vocabulary': 'Kelime Bilgisi',
            'General': 'Genel',
            'Psychology': 'Psikoloji',
            'Environment': 'Çevre',
            'Culture': 'Kültür',
            'Activities': 'Etkinlikler',
            'Daily Life': 'Günlük Yaşam'
        };
        
        return categoryMap[category] || category;
    }

    // Tüm kategorileri getir
    getAllCategories() {
        return Array.from(this.categories);
    }

    // Türkçe isimleriyle kategorileri getir
    getCategoriesWithTurkishNames() {
        return Array.from(this.categories).map(category => ({
            english: category,
            turkish: this.categoryMap[category] || category,
            level: this.getCategoryLevel(category)
        }));
    }

    // Öğrenim ilerlemesini getir
    getLearningProgress(completedCategories = []) {
        const learningOrder = this.getLearningOrder();
        const availableCategories = learningOrder.filter(cat => this.categories.has(cat));
        const completedCount = completedCategories.filter(cat => 
            availableCategories.includes(cat)
        ).length;
        
        return {
            total: availableCategories.length,
            completed: completedCount,
            progress: availableCategories.length > 0 ? 
                (completedCount / availableCategories.length) * 100 : 0,
            nextCategory: this.getNextRecommendedCategory(completedCategories)
        };
    }
}

// Global kategori yöneticisi
window.categoryManager = new CategoryManager();