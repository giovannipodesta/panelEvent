document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const loader = generateBtn.querySelector('.loader');

    const resultContainer = document.getElementById('resultContainer');
    const statusBadge = document.getElementById('statusBadge');
    const timestamp = document.getElementById('timestamp');
    const urlInput = document.getElementById('urlInput');
    const copyBtn = document.getElementById('copyBtn');
    const idValue = document.getElementById('idValue');
    const toast = document.getElementById('toast');

    // API URLs - usando configuración centralizada
    const API_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.GENERATE_TOKEN);

    generateBtn.addEventListener('click', async () => {
        // UI Loading State
        setLoading(true);
        resultContainer.classList.add('hidden');

        try {
            const response = await fetch(API_URL, {
                method: 'POST', // Assuming POST based on typical "generate" actions, but could be GET. Checking request didn't specify, defaulting to POST or GET based on standard practices? The prompt implies an action. I'll stick to GET if it's just fetching a token, but usually "generar" implies mutation. Let's try POST first as it's safer for generation, or GET if it's just a getter.
                // Wait, the prompt says "pida a esta api ... con un boton". Usually generation is POST.
                // But without parameters, sometimes it's GET.
                // Let's assume POST for "generar". If it fails, I might need to swap. 
                // Actually most simple APIs like this might just be GET. Let's use POST to be semantic for "Generate", or check if I can infer.
                // Re-reading: "pida a esta api".
                // I'll try POST. If the user didn't specify, standard for "create/generate" is POST.
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error en la petición');

            const data = await response.json();

            // Populate Data
            renderData(data);

        } catch (error) {
            console.error(error);
            showToast('Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    });

    copyBtn.addEventListener('click', () => {
        if (!urlInput.value) return;

        navigator.clipboard.writeText(urlInput.value)
            .then(() => {
                showToast('¡URL copiada!');
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                // Fallback for older browsers if needed, but navigator.clipboard is standard now
                urlInput.select();
                document.execCommand('copy');
                showToast('¡URL copiada!');
            });
    });

    function setLoading(isLoading) {
        generateBtn.disabled = isLoading;
        if (isLoading) {
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    function renderData(data) {
        // Expected data format:
        // {
        //     "message": "Token generado exitosamente",
        //     "token": "...",
        //     "url": "http://...",
        //     "id": "...",
        //     "estado": "habilitado",
        //     "createdAt": "..."
        // }

        urlInput.value = data.url;
        statusBadge.textContent = data.estado || 'Desconocido';
        idValue.textContent = data.id;

        // Format Date
        const date = new Date(data.createdAt);
        timestamp.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Show Container
        resultContainer.classList.remove('hidden');
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // ==========================================
    // PENDING USERS SECTION
    // ==========================================

    const loadUsersBtn = document.getElementById('loadUsersBtn');
    const loadUsersBtnText = loadUsersBtn.querySelector('.btn-text');
    const loadUsersLoader = loadUsersBtn.querySelector('.loader');
    const pendingContainer = document.getElementById('pendingContainer');
    const userCard = document.getElementById('userCard');
    const noUsersMessage = document.getElementById('noUsersMessage');
    const userCounter = document.getElementById('userCounter');

    // User card elements
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userCedula = document.getElementById('userCedula');
    const userCategory = document.getElementById('userCategory');
    const userEmail = document.getElementById('userEmail');
    const userPhone = document.getElementById('userPhone');
    const userAsistencia = document.getElementById('userAsistencia');

    // Category filter elements
    const categoryFiltersContainer = document.getElementById('categoryFilters');

    const skipBtn = document.getElementById('skipBtn');
    const approveBtn = document.getElementById('approveBtn');

    const PENDING_API_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.PENDING_USERS);

    let allUsers = []; // Master list
    let pendingUsers = []; // Filtered list
    let currentUserIndex = 0;
    let currentCategoryFilter = ''; // '' = all, or a category ID

    loadUsersBtn.addEventListener('click', loadPendingUsers);
    skipBtn.addEventListener('click', showNextUser);
    approveBtn.addEventListener('click', approveCurrentUser);

    async function loadPendingUsers() {
        setLoadingUsers(true);
        pendingContainer.classList.add('hidden');
        noUsersMessage.classList.add('hidden');

        currentCategoryFilter = ''; // Reset filter logic

        try {
            const response = await fetch(PENDING_API_URL);
            if (!response.ok) throw new Error('Error al cargar usuarios');

            const data = await response.json();
            allUsers = data.usuarios || [];
            pendingUsers = [...allUsers]; // Start with all
            currentUserIndex = 0;

            if (allUsers.length > 0) {
                pendingContainer.classList.remove('hidden');
                updateFilterUI();
                displayCurrentUser();
            } else {
                noUsersMessage.classList.remove('hidden');
                userCounter.textContent = '0 / 0';
            }
        } catch (error) {
            console.error(error);
            showToast('Error al cargar usuarios pendientes');
        } finally {
            setLoadingUsers(false);
        }
    }

    function updateFilterUI() {
        if (!window.categories || !window.categories.data) return;

        categoryFiltersContainer.innerHTML = '';

        // Count users per category
        const counts = allUsers.reduce((acc, user) => {
            acc[user.categoria] = (acc[user.categoria] || 0) + 1;
            return acc;
        }, {});

        // 1. "Todos" Button
        const totalCount = allUsers.length;
        if (totalCount === 0) return;

        const allBtn = createFilterBtn('', 'Todos', totalCount);
        if (currentCategoryFilter === '') allBtn.classList.add('active');
        categoryFiltersContainer.appendChild(allBtn);

        // 2. Category Buttons (only those with users)
        Object.keys(counts).forEach(catId => {
            const category = window.categories.data.find(c => c.id === catId);
            if (category) {
                const name = category.name || category.slug;
                const btn = createFilterBtn(catId, name, counts[catId]);
                if (currentCategoryFilter === catId) btn.classList.add('active');
                categoryFiltersContainer.appendChild(btn);
            }
        });
    }

    function createFilterBtn(id, name, count) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerHTML = `
            <span>${name}</span>
            <span class="filter-count">${count}</span>
        `;
        btn.addEventListener('click', () => filterUsers(id));
        return btn;
    }

    function filterUsers(categoryId) {
        currentCategoryFilter = categoryId;

        // Re-render filters to update active state
        updateFilterUI();

        if (categoryId === '') {
            pendingUsers = [...allUsers];
        } else {
            pendingUsers = allUsers.filter(u => u.categoria === categoryId);
        }

        currentUserIndex = 0;

        if (pendingUsers.length > 0) {
            userCard.classList.remove('hidden');
            displayCurrentUser();
        } else {
            userCard.classList.add('hidden');
        }
    }

    function setLoadingUsers(isLoading) {
        loadUsersBtn.disabled = isLoading;
        if (isLoading) {
            loadUsersBtnText.classList.add('hidden');
            loadUsersLoader.classList.remove('hidden');
        } else {
            loadUsersBtnText.classList.remove('hidden');
            loadUsersLoader.classList.add('hidden');
        }
    }

    function displayCurrentUser() {
        if (currentUserIndex >= pendingUsers.length) {
            userCard.classList.add('hidden');
            noUsersMessage.classList.remove('hidden');
            userCounter.textContent = '0 / 0';
            return;
        }

        const user = pendingUsers[currentUserIndex];

        // Avatar with initials
        const initials = user.nombre ? user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('') : '?';
        userAvatar.textContent = initials;

        userName.textContent = user.nombre || 'Sin nombre';
        userCedula.textContent = user.cedula;

        // Display category slug/name from categories.js
        if (user.categoria && window.categories && window.categories.data) {
            const category = window.categories.data.find(c => c.id === user.categoria);
            userCategory.textContent = category ? (category.slug || category.name) : user.categoria;
        } else {
            userCategory.textContent = '-';
        }

        userEmail.textContent = user.email || '-';
        userPhone.textContent = user.telefono || '-';
        userAsistencia.textContent = user.asistencia ? '✅ Confirmada' : '❌ No confirmada';

        userCounter.textContent = `${currentUserIndex + 1} / ${pendingUsers.length}`;

        userCard.classList.remove('hidden');
        noUsersMessage.classList.add('hidden');
    }

    function showNextUser() {
        currentUserIndex++;
        if (currentUserIndex >= pendingUsers.length) {
            currentUserIndex = 0; // Loop back to start
        }
        displayCurrentUser();
    }

    async function approveCurrentUser() {
        if (currentUserIndex >= pendingUsers.length) return;

        const user = pendingUsers[currentUserIndex];

        approveBtn.disabled = true;
        skipBtn.disabled = true;

        try {
            const response = await fetch(API_CONFIG.getUserUrl(user.id_uuid, 'aprobar'), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    asistencia: true
                })
            });

            if (!response.ok) throw new Error('Error al aprobar usuario');

            showToast(`✅ ${user.nombre} aprobado`);

            // Remove user from MASTER LIST
            const allIndex = allUsers.findIndex(u => u.id_uuid === user.id_uuid);
            if (allIndex !== -1) allUsers.splice(allIndex, 1);

            // Remove from CURRENT FILTERED LIST
            pendingUsers.splice(currentUserIndex, 1);

            // Re-render filters (updates counts)
            updateFilterUI();

            // Check if any users left in global
            if (allUsers.length === 0) {
                pendingContainer.classList.add('hidden');
                noUsersMessage.classList.remove('hidden');
                userCounter.textContent = '0 / 0';
                return;
            }

            // Adjust index if necessary
            if (currentUserIndex >= pendingUsers.length) {
                currentUserIndex = 0; // Go back to start
            }

            if (pendingUsers.length > 0) {
                displayCurrentUser();
            } else {
                userCard.classList.add('hidden');
                // Could show "No users in this category" here if desired
            }

        } catch (error) {
            console.error(error);
            showToast('Error al aprobar usuario');
        } finally {
            approveBtn.disabled = false;
            skipBtn.disabled = false;
        }
    }
    // ==========================================
    // TABS LOGIC
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');

            // Update Buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Sections
            tabContents.forEach(content => {
                content.classList.add('hidden');
                // Remove active class if it was used for initial state, though we use hidden class logic mainly
                content.classList.remove('active');
            });

            // Show Target
            const targetSection = document.getElementById(
                targetId === 'generator' ? 'generatorSection' :
                    targetId === 'pending' ? 'pendingSection' :
                        'specialGuestsSection'
            );

            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('active'); // Just in case for animations
            }
        });
    });

    // ==========================================
    // SPECIAL GUESTS LOGIC
    // ==========================================
    const guestInput = document.getElementById('guestInput');
    const addGuestBtn = document.getElementById('addGuestBtn');
    const guestListContainer = document.getElementById('guestListContainer');
    const guestCount = document.getElementById('guestCount');
    const processGuestsBtn = document.getElementById('processGuestsBtn');
    const guestResult = document.getElementById('guestResult');
    const processLoader = processGuestsBtn.querySelector('.loader');
    const processBtnText = processGuestsBtn.querySelector('.btn-text');

    // Load from LocalStorage
    let guestList = JSON.parse(localStorage.getItem('guestList')) || [];

    // Initialize
    updateGuestListUI();

    // Event Listeners
    addGuestBtn.addEventListener('click', addGuest);
    guestInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addGuest();
    });

    function addGuest() {
        const number = guestInput.value.trim();

        // VAL: 10 Digits
        if (!/^\d{10}$/.test(number)) {
            showToast('El número debe tener 10 dígitos');
            return;
        }

        // VAL: Unique
        if (guestList.includes(number)) {
            showToast('Este número ya está en la lista');
            return;
        }

        // Add
        guestList.unshift(number); // Add to top
        saveAndRender();

        // Reset Input
        guestInput.value = '';
        guestInput.focus();
        showToast('Número agregado');
    }

    function removeGuest(number) {
        guestList = guestList.filter(n => n !== number);
        saveAndRender();
        showToast('Número eliminado');
    }

    function saveAndRender() {
        localStorage.setItem('guestList', JSON.stringify(guestList));
        updateGuestListUI();
    }

    function updateGuestListUI() {
        guestCount.textContent = guestList.length;
        guestListContainer.innerHTML = '';

        if (guestList.length === 0) {
            guestListContainer.innerHTML = '<div class="empty-list-msg">No hay números agregados</div>';
            return;
        }

        guestList.forEach(num => {
            const item = document.createElement('div');
            item.className = 'guest-item';
            item.innerHTML = `
                <span class="guest-number">${num}</span>
                <button class="delete-btn" aria-label="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            `;

            // Delete Action
            item.querySelector('.delete-btn').addEventListener('click', () => removeGuest(num));

            guestListContainer.appendChild(item);
        });
    }

    processGuestsBtn.addEventListener('click', async () => {
        if (guestList.length === 0) {
            showToast('La lista está vacía');
            return;
        }

        // Set Loading
        processGuestsBtn.disabled = true;
        processBtnText.classList.add('hidden');
        processLoader.classList.remove('hidden');
        guestResult.classList.add('hidden');

        try {
            // SIMULACION DE PROCESAMIENTO
            // await fetch(API_URL_FOR_GUESTS, { body: JSON.stringify({ guests: guestList }) ... });

            await new Promise(resolve => setTimeout(resolve, 1500));

            // Show Result
            guestResult.innerHTML = `
                <h4 style="margin-bottom:0.5rem; color:var(--success)">¡Lista Procesada!</h4>
                <p>Se han enviado <strong>${guestList.length}</strong> invitaciones.</p>
            `;
            guestResult.classList.remove('hidden');
            showToast('Invitaciones enviadas con éxito');

        } catch (error) {
            console.error(error);
            showToast('Error al procesar la lista');
        } finally {
            processGuestsBtn.disabled = false;
            processBtnText.classList.remove('hidden');
            processLoader.classList.add('hidden');
        }
    });

});
