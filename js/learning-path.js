// learning-path.js dosyasındaki displayLearningPath fonksiyonu

    displayLearningPath: async function(level) {
        this.showSection('learningPathSection');
        const pathEl = document.getElementById('learningPathSection');
        
        pathEl.innerHTML = `
            <h2>${level} Seviyesi Öğrenme Yolu</h2>
            <p>Seviyeniz **${level}** olarak belirlendi. Size özel dersler yükleniyor...</p>
        `;

        try {
            const response = await fetch('data/learning_modules.json');
            if (!response.ok) throw new Error(`Modül verisi yüklenemedi: ${response.status}`);
            
            const modulesData = await response.json();
            const levelData = modulesData[level] || modulesData['A1']; 
            
            // Genel İlerlemeyi Hesaplama (Aynı kalır)
            let totalProgress = 0;
            const moduleCount = levelData.modules.length;
            if (moduleCount > 0) {
                const sumOfProgress = levelData.modules.reduce((sum, module) => sum + module.progress, 0);
                totalProgress = Math.round(sumOfProgress / moduleCount);
            }
            // ----------------------------------------------------

            // 🔴 GRUPLAMA MANTIĞI YENİDEN YAPILANDIRILDI
            const groupedModules = levelData.modules.reduce((groups, module) => {
                const topic = module.topic || 'Diğer'; // Konu yoksa 'Diğer' olarak grupla
                if (!groups[topic]) {
                    groups[topic] = [];
                }
                groups[topic].push(module);
                return groups;
            }, {});

            let groupedHtml = '';

            // Gruplar üzerinde döngü yaparak HTML'i oluşturma
            for (const topic in groupedModules) {
                const modulesInGroup = groupedModules[topic];
                
                // Konu Başlığı
                groupedHtml += `<h3 class="module-group-title">${topic} Modülleri (${modulesInGroup.length})</h3>`;
                
                // Modüller Listesi ve Kartları
                groupedHtml += `<div class="modules-list">`; 

                groupedHtml += modulesInGroup.map(module => `
                    <div class="module-card module-status-${module.status.toLowerCase().replace(/ /g, '-')}" 
                         data-progress="${module.progress}">
                        <h3>${module.name}</h3>
                        <p>Konu: ${module.topic}</p>
                        
                        ${module.progress > 0 ? `
                            <div class="module-stats-row">
                                <span class="module-stat-item">
                                    <i class="fas fa-clock"></i> 
                                    ${module.lastDuration} dk
                                </span>
                                <span class="module-stat-item">
                                    <i class="fas fa-chart-line"></i> 
                                    ${module.lastScore}% Skor
                                </span>
                            </div>
                        ` : ''}
                        
                        <div class="module-progress-container">
                            <div class="progress-bar-small">
                                <div class="progress-fill-small" style="width: ${module.progress}%;"></div>
                            </div>
                            <span class="progress-text">${module.progress}% ${module.progress === 100 ? 'Tamamlandı' : 'İlerledi'}</span>
                        </div>

                        <span class="module-status-badge">${module.status}</span>
                        <button class="btn btn-primary btn-sm" onclick="LearningPath.startModule('${module.id}')">${module.progress === 100 ? 'Tekrar Et' : 'İncele/Devam Et'}</button>
                    </div>
                `).join('');
                
                groupedHtml += `</div>`; // modules-list div'ini kapat
            }
            // ----------------------------------------------------

            // İçeriği güncelle: Tüm HTML burada birleştirilir
            pathEl.innerHTML = `
                <div class="level-path-header">
                    <h2>${level} Seviyesi Öğrenme Yolu: ${levelData.title}</h2>
                    <p>${levelData.description}</p>
                </div>

                <div class="summary-card">
                    <div class="summary-progress">
                        <span class="summary-percentage">${totalProgress}%</span>
                        <div class="summary-bar-wrapper">
                            <div class="summary-bar-fill" style="width: ${totalProgress}%;"></div>
                        </div>
                    </div>
                    <div class="summary-info">
                        <h3>${levelData.title} Genel İlerleme</h3>
                        <p>Bu seviyede toplam ${moduleCount} modül bulunmaktadır. Devam edin!</p>
                    </div>
                </div>

                ${totalProgress === 100 ? `
                    <div class="level-complete-card">
                        <h3 class="level-complete-title">🎉 Tebrikler! ${level} Seviyesi Tamamlandı!</h3>
                        <p>Bu seviyedeki tüm modülleri başarıyla bitirdiniz. Bir sonraki seviyeye geçmeye hazırsınız.</p>
                        <button class="btn btn-success btn-lg" onclick="LearningPath.advanceLevel('${level}')">
                            Bir Sonraki Seviyeye Geç
                        </button>
                    </div>
                ` : ''}

                <div class="grouped-modules-container">
                    ${groupedHtml}
                </div>
                
                <button class="btn btn-secondary mt-4" onclick="LearningPath.resetTest()">Teste Geri Dön/Yeniden Başlat</button>
            `;

        } catch (error) {
            console.error('❌ Öğrenme Modülleri yüklenirken kritik hata:', error);
            pathEl.innerHTML = `
                 <h2>Hata: Modüller Yüklenemedi</h2>
                 <p>Modüllerin yüklenmesi sırasında kritik bir hata oluştu. (Konsolu kontrol edin)</p>
                 <button class="btn btn-secondary mt-4" onclick="LearningPath.resetTest()">Giriş Ekranına Dön</button>
            `;
        }
    },
