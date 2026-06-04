document.addEventListener('DOMContentLoaded', () => {
    const mineralForm = new MineralForm();
    const mineralList = new MineralList();
    const uploadForm = new UploadForm();
    const gemmaAssistant = new GemmaAssistant();

    const dashboardButton = document.querySelector('[data-nav="dashboard"]');
    const collectionButton = document.querySelector('[data-nav="collection"]');
    const addSpecimenNavButton = document.querySelector('[data-nav="add-specimen"]');
    const locationsButton = document.querySelector('[data-nav="locations"]');
    const aiAssistantButton = document.querySelector('[data-nav="ai-assistant"]');
    const settingsButton = document.querySelector('[data-nav="settings"]');
    const navItems = document.querySelectorAll('.side-nav-item');
    const mobileMenuButton = document.querySelector('[data-role="mobile-menu"]');
    const navBackdrop = document.querySelector('[data-role="nav-backdrop"]');
    const dashboardContainer = document.getElementById('dashboard-container');
    const formContainer = document.getElementById('form-container');
    const uploadContainer = document.getElementById('upload-container');
    const listContainer = document.getElementById('list-container');
    const gemmaContainer = document.getElementById('gemma-container');
    const locationsContainer = document.getElementById('locations-container');
    const settingsContainer = document.getElementById('settings-container');
    const themeButtons = document.querySelectorAll('[data-theme-option]');
    const savedTheme = localStorage.getItem('mineral-theme') || 'dark';

    formContainer.appendChild(mineralForm.render());
    uploadContainer.appendChild(uploadForm.render());
    listContainer.appendChild(mineralList.render());
    gemmaContainer.appendChild(gemmaAssistant.render());
    applyTheme(savedTheme);

    dashboardButton.addEventListener('click', () => {
        showDashboard();
    });

    collectionButton.addEventListener('click', () => {
        showList();
    });

    addSpecimenNavButton.addEventListener('click', () => {
        mineralForm.clear();
        showForm();
    });

    locationsButton.addEventListener('click', () => {
        showLocations();
    });

    aiAssistantButton.addEventListener('click', () => {
        showGemma();
    });

    settingsButton.addEventListener('click', () => {
        showSettings();
    });

    mobileMenuButton.addEventListener('click', () => {
        setMobileNavOpen(!document.body.classList.contains('nav-open'));
    });

    navBackdrop.addEventListener('click', () => {
        setMobileNavOpen(false);
    });

    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            setMobileNavOpen(false);
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMobileNavOpen(false);
        }
    });

    themeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyTheme(button.dataset.themeOption);
        });
    });

    function showDashboard() {
        dashboardContainer.style.display = '';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        locationsContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        setActiveNav('dashboard');
    }

    function showLanding() {
        showDashboard();
    }

    function showForm() {
        dashboardContainer.style.display = 'none';
        formContainer.style.display = '';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        locationsContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        setActiveNav('add-specimen');
    }

    function showUpload() {
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = '';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        locationsContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
    }

    function showList() {
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = '';
        gemmaContainer.style.display = 'none';
        locationsContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        setActiveNav('collection');
    }

    function showLocations() {
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        locationsContainer.style.display = '';
        settingsContainer.style.display = 'none';
        setActiveNav('locations');
    }

    function showGemma() {
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = '';
        locationsContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        setActiveNav('ai-assistant');
    }

    function showSettings() {
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        locationsContainer.style.display = 'none';
        settingsContainer.style.display = '';
        setActiveNav('settings');
    }

    function setActiveNav(navName) {
        navItems.forEach((item) => {
            item.classList.toggle('is-active', item.dataset.nav === navName);
        });
    }

    function setMobileNavOpen(isOpen) {
        document.body.classList.toggle('nav-open', isOpen);
        mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
        mobileMenuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    }

    function applyTheme(themeName) {
        const theme = themeName === 'light' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('mineral-theme', theme);
        themeButtons.forEach((button) => {
            const isActive = button.dataset.themeOption === theme;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    mineralForm.onSubmit(async (mineral, options = { returnToList: true }) => {
        try {
            const isEdit = Boolean(mineral.id);
            const response = await fetch(isEdit ? `/api/minerals/${mineral.id}` : '/api/minerals', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mineral),
            });

            if (!response.ok) {
                console.error('Failed to save mineral');
                return;
            }

            const savedMineral = await response.json();
            if (isEdit) {
                mineralList.updateMineral(savedMineral);
            } else {
                mineralList.addMineral(savedMineral);
            }
            renderDashboard(mineralList.minerals);
            renderLocations(mineralList.minerals);
            if (options.returnToList) {
                mineralForm.clear();
                showList();
            } else {
                mineralForm.markSaved(savedMineral);
            }
        } catch (error) {
            console.error('Error saving mineral:', error);
        }
    });

    mineralForm.onCancel(() => {
        showList();
    });

    uploadForm.onUploadComplete(() => {
        refreshMinerals();
    });

    uploadForm.onDeleteAll(() => {
        mineralForm.clear();
        refreshMinerals();
    });

    mineralList.onEdit((mineral) => {
        mineralForm.edit(mineral);
        showForm();
    });

    mineralList.onDelete(async (mineral) => {
        if (!confirm(`Delete ${mineral.name}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/minerals/${mineral.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                console.error('Failed to delete mineral');
                return;
            }

            mineralList.removeMineral(mineral.id);
            renderDashboard(mineralList.minerals);
            renderLocations(mineralList.minerals);
        } catch (error) {
            console.error('Error deleting mineral:', error);
        }
    });

    function refreshMinerals() {
        return fetch('/api/minerals')
            .then((response) => response.json())
            .then((minerals) => {
                mineralList.setMinerals(minerals);
                renderDashboard(minerals);
                renderLocations(minerals);
            })
            .catch((error) => console.error('Error loading minerals:', error));
    }

    function renderDashboard(minerals) {
        const records = Array.isArray(minerals) ? minerals : [];
        const locations = new Set(records
            .map((mineral) => String(mineral.origin || '').trim())
            .filter(Boolean));
        const photoCount = records.reduce((count, mineral) => count + getPhotoCount(mineral), 0);
        const typeCounts = getTypeCounts(records);

        document.querySelector('[data-dashboard="total-specimens"]').textContent = records.length;
        document.querySelector('[data-dashboard="locations"]').textContent = locations.size;
        document.querySelector('[data-dashboard="photos"]').textContent = photoCount;
        renderTypeChart(typeCounts, records.length);
    }

    function getPhotoCount(mineral) {
        if (Array.isArray(mineral.photos)) {
            return mineral.photos.length;
        }

        if (mineral.photos) {
            try {
                const photos = JSON.parse(mineral.photos);
                if (Array.isArray(photos)) {
                    return photos.length;
                }
            } catch (error) {
                console.error('Error parsing mineral photos:', error);
            }
        }

        return mineral.photo ? 1 : 0;
    }

    function getTypeCounts(minerals) {
        const counts = minerals.reduce((items, mineral) => {
            const type = String(mineral.type || '').trim() || 'Not recorded';
            items[type] = (items[type] || 0) + 1;
            return items;
        }, {});

        return Object.entries(counts)
            .map(([type, count]) => ({ type, count }))
            .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));
    }

    function renderTypeChart(typeCounts, total) {
        const pie = document.querySelector('[data-dashboard="type-pie"]');
        const legend = document.querySelector('[data-dashboard="type-legend"]');
        const colors = ['#5dd9d0', '#f4b860', '#e66b6b', '#8fa7ff', '#b58cff', '#76d275', '#f08cc6', '#8fd3ff', '#d3c26f'];

        if (!typeCounts.length || !total) {
            pie.style.background = 'var(--panel-strong)';
            legend.innerHTML = '<p class="dashboard-empty">No type data recorded.</p>';
            return;
        }

        let cursor = 0;
        const segments = typeCounts.map((item, index) => {
            const start = cursor;
            const end = cursor + (item.count / total) * 100;
            cursor = end;
            return `${colors[index % colors.length]} ${start}% ${end}%`;
        });
        pie.style.background = `conic-gradient(${segments.join(', ')})`;

        legend.innerHTML = typeCounts.map((item, index) => `
            <div class="type-legend-row">
                <span class="type-swatch" style="background:${colors[index % colors.length]}"></span>
                <span>${escapeHtml(item.type)}</span>
                <strong>${item.count}</strong>
            </div>
        `).join('');
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderLocations(minerals) {
        const counts = getContinentCounts(Array.isArray(minerals) ? minerals : []);
        Object.entries(counts).forEach(([continent, count]) => {
            document.querySelectorAll(`[data-continent-count="${continent}"]`).forEach((item) => {
                item.textContent = count;
            });
        });

        const summary = document.querySelector('[data-role="continent-summary"]');
        summary.innerHTML = Object.entries(counts)
            .map(([continent, count]) => `
                <article class="continent-count-card">
                    <span>${escapeHtml(continent)}</span>
                    <strong>${count}</strong>
                </article>
            `).join('');
    }

    function getContinentCounts(minerals) {
        const counts = {
            'North America': 0,
            'South America': 0,
            Europe: 0,
            Africa: 0,
            Asia: 0,
            Oceania: 0,
        };

        minerals.forEach((mineral) => {
            const continent = inferContinent(mineral.origin);
            if (continent) {
                counts[continent] += 1;
            }
        });

        return counts;
    }

    function inferContinent(origin) {
        const text = String(origin || '').toLowerCase();
        if (!text.trim()) {
            return null;
        }

        const continentTerms = [
            ['North America', ['north america', 'usa', 'united states', 'canada', 'mexico', 'greenland', 'guatemala', 'belize', 'honduras', 'el salvador', 'nicaragua', 'costa rica', 'panama', 'jamaica', 'cuba']],
            ['South America', ['south america', 'argentina', 'bolivia', 'brazil', 'chile', 'colombia', 'ecuador', 'guyana', 'paraguay', 'peru', 'suriname', 'uruguay', 'venezuela']],
            ['Europe', ['europe', 'uk', 'united kingdom', 'england', 'scotland', 'wales', 'ireland', 'france', 'germany', 'spain', 'portugal', 'italy', 'switzerland', 'austria', 'belgium', 'netherlands', 'norway', 'sweden', 'finland', 'denmark', 'poland', 'czech', 'slovakia', 'hungary', 'romania', 'bulgaria', 'greece', 'russia', 'ukraine']],
            ['Africa', ['africa', 'south africa', 'morocco', 'egypt', 'ethiopia', 'kenya', 'tanzania', 'namibia', 'botswana', 'zambia', 'zimbabwe', 'madagascar', 'nigeria', 'ghana', 'congo', 'angola']],
            ['Asia', ['asia', 'china', 'india', 'japan', 'korea', 'thailand', 'vietnam', 'malaysia', 'indonesia', 'philippines', 'pakistan', 'afghanistan', 'iran', 'iraq', 'turkey', 'saudi arabia', 'oman', 'uae', 'united arab emirates', 'russia']],
            ['Oceania', ['oceania', 'australia', 'new zealand', 'papua new guinea', 'fiji']],
        ];

        const match = continentTerms.find(([, terms]) => (
            terms.some((term) => text.includes(term))
        ));
        return match ? match[0] : null;
    }

    refreshMinerals();
    showDashboard();
});
