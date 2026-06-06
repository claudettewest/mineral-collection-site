document.addEventListener('DOMContentLoaded', () => {
    const mineralForm = new MineralForm();
    const mineralList = new MineralList();
    const uploadForm = new UploadForm();
    const gemmaAssistant = new GemmaAssistant();

    const landingButton = document.querySelector('[data-nav="landing"]');
    const dashboardButton = document.querySelector('[data-nav="dashboard"]');
    const collectionButton = document.querySelector('[data-nav="collection"]');
    const addSpecimenNavButton = document.querySelector('[data-nav="add-specimen"]');
    const aiAssistantButton = document.querySelector('[data-nav="ai-assistant"]');
    const authButton = document.querySelector('[data-nav="auth"]');
    const settingsButton = document.querySelector('[data-nav="settings"]');
    const navItems = document.querySelectorAll('.side-nav-item');
    const mobileMenuButton = document.querySelector('[data-role="mobile-menu"]');
    const navBackdrop = document.querySelector('[data-role="nav-backdrop"]');
    const landingContainer = document.getElementById('landing-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const formContainer = document.getElementById('form-container');
    const uploadContainer = document.getElementById('upload-container');
    const listContainer = document.getElementById('list-container');
    const gemmaContainer = document.getElementById('gemma-container');
    const settingsContainer = document.getElementById('settings-container');
    const authContainer = document.getElementById('auth-container');
    const registerForm = document.querySelector('[data-auth="register-form"]');
    const loginForm = document.querySelector('[data-auth="login-form"]');
    const registerStatus = document.querySelector('[data-auth="register-status"]');
    const loginStatus = document.querySelector('[data-auth="login-status"]');
    const currentUserStatus = document.querySelector('[data-auth="current-user"]');
    const landingWelcomeBack = document.querySelector('[data-landing="welcome-back"]');
    const themeButtons = document.querySelectorAll('[data-theme-option]');
    const savedTheme = localStorage.getItem('mineral-theme') || 'dark';

    formContainer.appendChild(mineralForm.render());
    uploadContainer.appendChild(uploadForm.render());
    listContainer.appendChild(mineralList.render());
    gemmaContainer.appendChild(gemmaAssistant.render());
    window.getMineralAuthHeaders = getAuthHeaders;
    applyTheme(savedTheme);

    landingButton.addEventListener('click', () => {
        showLanding();
    });

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

    aiAssistantButton.addEventListener('click', () => {
        showGemma();
    });

    settingsButton.addEventListener('click', () => {
        showSettings();
    });

    authButton.addEventListener('click', () => {
        showAuth();
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

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setAuthStatus(registerStatus, 'Registering...');
        const formData = new FormData(registerForm);
        const payload = {
            fullName: String(formData.get('fullName') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            receiveEmails: formData.get('receiveEmails') === 'on',
            password: String(formData.get('password') || ''),
            confirmPassword: String(formData.get('confirmPassword') || ''),
        };

        try {
            const user = await submitAuth('/api/register', payload);
            saveCurrentUser(user);
            registerForm.reset();
            setAuthStatus(registerStatus, `Registered ${user.fullName} as ${user.userType}.`, 'success');
        } catch (error) {
            setAuthStatus(registerStatus, error.message, 'error');
        }
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        setAuthStatus(loginStatus, 'Logging in...');
        const formData = new FormData(loginForm);
        const payload = {
            email: String(formData.get('email') || '').trim(),
            password: String(formData.get('password') || ''),
        };

        try {
            const user = await submitAuth('/api/login', payload);
            saveCurrentUser(user);
            loginForm.reset();
            setAuthStatus(loginStatus, `Logged in as ${user.fullName}.`, 'success');
        } catch (error) {
            setAuthStatus(loginStatus, error.message, 'error');
        }
    });

    renderCurrentUser();

    function showDashboard() {
        landingContainer.style.display = 'none';
        dashboardContainer.style.display = '';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        authContainer.style.display = 'none';
        setActiveNav('dashboard');
    }

    function showLanding() {
        landingContainer.style.display = '';
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        authContainer.style.display = 'none';
        setActiveNav('landing');
    }

    function showForm() {
        landingContainer.style.display = 'none';
        dashboardContainer.style.display = 'none';
        formContainer.style.display = '';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        authContainer.style.display = 'none';
        setActiveNav('add-specimen');
    }

    function showUpload() {
        landingContainer.style.display = 'none';
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = '';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        authContainer.style.display = 'none';
    }

    function showList() {
        landingContainer.style.display = 'none';
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = '';
        gemmaContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        authContainer.style.display = 'none';
        setActiveNav('collection');
    }

    function showGemma() {
        landingContainer.style.display = 'none';
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = '';
        settingsContainer.style.display = 'none';
        authContainer.style.display = 'none';
        setActiveNav('ai-assistant');
    }

    function showSettings() {
        landingContainer.style.display = 'none';
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        settingsContainer.style.display = '';
        authContainer.style.display = 'none';
        setActiveNav('settings');
    }

    function showAuth() {
        landingContainer.style.display = 'none';
        dashboardContainer.style.display = 'none';
        formContainer.style.display = 'none';
        uploadContainer.style.display = 'none';
        listContainer.style.display = 'none';
        gemmaContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        authContainer.style.display = '';
        setActiveNav('auth');
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

    async function submitAuth(url, payload) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.error || 'The request failed');
        }
        return body;
    }

    function saveCurrentUser(user) {
        localStorage.setItem('mineral-user', JSON.stringify(user));
        renderCurrentUser();
        refreshMinerals();
    }

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('mineral-user') || 'null');
        } catch (error) {
            return null;
        }
    }

    function renderCurrentUser() {
        const user = getCurrentUser();
        currentUserStatus.textContent = user
            ? `Logged in as ${user.fullName} (${user.userType}).`
            : 'No user is logged in.';
        landingWelcomeBack.hidden = !user;
        landingWelcomeBack.textContent = user ? `Welcome back, ${user.fullName}.` : '';
    }

    function setAuthStatus(element, message, state = '') {
        element.textContent = message;
        element.dataset.state = state;
    }

    function getAuthHeaders(extraHeaders = {}) {
        const user = getCurrentUser();
        return user?.email
            ? { ...extraHeaders, 'X-User-Email': user.email }
            : { ...extraHeaders };
    }

    function apiFetch(url, options = {}) {
        return fetch(url, {
            ...options,
            headers: getAuthHeaders(options.headers || {}),
        });
    }

    mineralForm.onSubmit(async (mineral, options = { returnToList: true }) => {
        try {
            const isEdit = Boolean(mineral.id);
            const response = await apiFetch(isEdit ? `/api/minerals/${mineral.id}` : '/api/minerals', {
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
            renderLanding(mineralList.minerals);
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
            const response = await apiFetch(`/api/minerals/${mineral.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                console.error('Failed to delete mineral');
                return;
            }

            mineralList.removeMineral(mineral.id);
            renderLanding(mineralList.minerals);
            renderDashboard(mineralList.minerals);
            renderLocations(mineralList.minerals);
        } catch (error) {
            console.error('Error deleting mineral:', error);
        }
    });

    mineralList.onPhotos(async (mineral, newPhotos) => {
        const fullMineral = await fetchFullMineral(mineral.id);
        const existingPhotos = normalizeMineralPhotos(fullMineral);
        const photos = [...existingPhotos, ...newPhotos];
        const updatedMineral = {
            ...fullMineral,
            photos,
            photo: '',
        };

        const response = await apiFetch(`/api/minerals/${mineral.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedMineral),
        });

        if (!response.ok) {
            throw new Error('Failed to save photos');
        }

        const savedMineral = await response.json();
        mineralList.updateMineral(savedMineral);
        renderLanding(mineralList.minerals);
        renderDashboard(mineralList.minerals);
        renderLocations(mineralList.minerals);
    });

    function refreshMinerals() {
        if (!getCurrentUser()) {
            mineralList.setMinerals([]);
            renderLanding([]);
            renderDashboard([]);
            renderLocations([]);
            return Promise.resolve([]);
        }

        return apiFetch('/api/minerals')
            .then((response) => response.json())
            .then((minerals) => {
                mineralList.setMinerals(minerals);
                renderLanding(minerals);
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
        const recentCount = records.filter(wasAddedInLast30Days).length;
        const typeCounts = getTypeCounts(records);

        document.querySelector('[data-dashboard="total-specimens"]').textContent = records.length;
        document.querySelector('[data-dashboard="locations"]').textContent = locations.size;
        document.querySelector('[data-dashboard="photos"]').textContent = photoCount;
        document.querySelector('[data-dashboard="recent-specimens"]').textContent = recentCount;
        renderTypeChart(typeCounts, records.length);
    }

    function renderLanding(minerals) {
        if (!getCurrentUser()) {
            renderLatestLoginPrompt();
            return;
        }

        const records = Array.isArray(minerals) ? minerals : [];
        renderLatestSpecimens(records);
        apiFetch('/api/minerals/latest?limit=5')
            .then((response) => (response.ok ? response.json() : []))
            .then((latestMinerals) => {
                if (latestMinerals.length) {
                    renderLatestSpecimens(latestMinerals);
                }
            })
            .catch((error) => console.error('Error loading latest specimen photos:', error));
    }

    function getPhotoCount(mineral) {
        if (Number.isFinite(Number(mineral.photoCount))) {
            return Number(mineral.photoCount);
        }
        return normalizeMineralPhotos(mineral).length;
    }

    function wasAddedInLast30Days(mineral) {
        const createdAt = Date.parse(mineral.createdAt || '');
        if (!Number.isFinite(createdAt)) {
            return false;
        }

        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        return Date.now() - createdAt <= thirtyDaysMs;
    }

    function fetchFullMineral(id) {
        return apiFetch(`/api/minerals/${id}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Unable to load specimen details');
                }
                return response.json();
            });
    }

    function normalizeMineralPhotos(mineral) {
        if (Array.isArray(mineral.photos)) {
            return mineral.photos;
        }

        if (mineral.photos) {
            try {
                const photos = JSON.parse(mineral.photos);
                if (Array.isArray(photos)) {
                    return photos;
                }
            } catch (error) {
                console.error('Error parsing mineral photos:', error);
            }
        }

        return mineral.photo ? [{ dataUrl: mineral.photo, name: mineral.name || '', size: 0, type: '' }] : [];
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

    function renderLatestSpecimens(minerals) {
        const container = document.querySelector('[data-dashboard="latest-specimens"]');
        const latest = [...minerals]
            .sort((left, right) => Number(right.id || 0) - Number(left.id || 0))
            .slice(0, 5);

        if (!latest.length) {
            container.innerHTML = '<p class="dashboard-empty">No specimens recorded yet.</p>';
            return;
        }

        container.innerHTML = latest.map((mineral, index) => {
            const photo = normalizeMineralPhotos(mineral)[0];
            const photoSrc = typeof photo === 'string' ? photo : photo?.mainWebp || photo?.dataUrl || photo?.thumbWebp || '/no_photo.png';
            const isPlaceholder = photoSrc === '/no_photo.png';
            const number = mineral.specimenId || String(mineral.id || '').padStart(4, '0');
            const description = String(mineral.description || '').trim() || 'No description recorded yet.';
            return `
                <article class="latest-specimen-card${index === 0 ? ' is-featured' : ''}">
                    <div class="latest-photo">
                        <img class="${isPlaceholder ? 'is-placeholder' : ''}" src="${escapeHtml(photoSrc)}" alt="${escapeHtml(`${mineral.name || 'Specimen'} photo`)}" loading="lazy">
                    </div>
                    <div class="latest-specimen-copy">
                        <span class="latest-number">${escapeHtml(number)}</span>
                        <h4>${escapeHtml(mineral.name || 'Unnamed specimen')}</h4>
                        <p>${escapeHtml(description)}</p>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderLatestLoginPrompt() {
        const container = document.querySelector('[data-dashboard="latest-specimens"]');
        container.innerHTML = '<p class="dashboard-empty landing-login-message">Login/register to start adding your collection</p>';
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
    showLanding();
});
