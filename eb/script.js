// Hide loading screen when page is ready
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 500);
});

// Initialize Socket.io
const socket = io();

// 📢 Écoute des Annonces Admin
socket.on('server-notification', (data) => {
    // Supprimer l'ancienne si elle existe
    const existing = document.getElementById('admin-broadcast-notif');
    if (existing) existing.remove();

    // Créer une notification visuelle style "Toast"
    const notif = document.createElement('div');
    notif.id = 'admin-broadcast-notif';
    notif.style.position = 'fixed';
    notif.style.top = '20px';
    notif.style.left = '50%';
    notif.style.transform = 'translateX(-50%)';
    notif.style.background = data.type === 'error' ? '#ef4444' : '#3b82f6';
    notif.style.color = '#fff';
    notif.style.padding = '15px 30px';
    notif.style.borderRadius = '8px';
    notif.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    notif.style.zIndex = '9999';
    notif.style.fontWeight = 'bold';
    notif.style.fontSize = '1.1rem';
    notif.style.display = 'flex';
    notif.style.alignItems = 'center';
    notif.style.gap = '10px';
    notif.style.animation = 'slideDown 0.5s ease forwards';
    notif.style.border = '1px solid rgba(255,255,255,0.2)';

    notif.innerHTML = `<span>📢 ${data.message}</span>`;

    document.body.appendChild(notif);

    // Son de notification
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(e => { });
    } catch (e) { }
});

socket.on('clear-notification', () => {
    const existing = document.getElementById('admin-broadcast-notif');
    if (existing) {
        existing.style.animation = 'slideUp 0.5s ease forwards';
        setTimeout(() => existing.remove(), 500);
    }
});

socket.on('maintenance_start', (msg) => {
    alert("⚠️ MAINTENANCE EN COURS\nLe site passe en mode maintenance. Vous allez être redirigé.");
    window.location.reload();
});

// Animation CSS pour la notif
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes slideDown {
    from { top: -100px; opacity: 0; }
    to { top: 20px; opacity: 1; }
}
@keyframes slideUp {
    from { top: 20px; opacity: 1; }
    to { top: -100px; opacity: 0; }
}`;
document.head.appendChild(styleSheet);

// DOM Elements
const cloneBtn = document.getElementById('startCloneBtn'); // UPDATED ID
const tokenInput = document.getElementById('token');
const sourceServerIdInput = document.getElementById('sourceServerId');
const targetServerIdInput = document.getElementById('targetServerId');
const cloneRolesCheckbox = document.getElementById('cloneRoles');
const cloneChannelsCheckbox = document.getElementById('cloneChannels');
const cloneEmojisCheckbox = document.getElementById('cloneEmojis');
const progressMonitor = document.getElementById('progressMonitor');
const channelsCount = document.getElementById('channelsCount');
const rolesCount = document.getElementById('rolesCount');
const emojisCount = document.getElementById('emojisCount');
const attemptsCount = document.getElementById('attemptsCount');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const stopCloneBtn = document.getElementById('stopCloneBtn');
const refreshCloneBtn = document.getElementById('refreshCloneBtn');
const previewBtn = document.getElementById('previewBtn');
const previewModal = document.getElementById('previewModal');
const closePreview = document.getElementById('closePreview');
const previewList = document.getElementById('previewList');
const structureTree = document.getElementById('structureTree');
const serverIcon = document.getElementById('serverIcon');
const serverName = document.getElementById('serverName');
const serverMemberCount = document.getElementById('serverMemberCount');

// --- MODE SELECTOR LOGIC ---
const modeStructure = document.getElementById('modeStructure');
const modeEmoji = document.getElementById('modeEmoji');
const groupRoles = document.getElementById('groupRoles');
const groupChannels = document.getElementById('groupChannels');
const groupEmojis = document.getElementById('groupEmojis');

function setMode(mode) {
    if (mode === 'structure') {
        // Active Structure
        modeStructure.classList.add('active');
        modeEmoji.classList.remove('active');

        // Checkboxes Logic
        cloneRolesCheckbox.checked = true;
        cloneChannelsCheckbox.checked = true;
        cloneEmojisCheckbox.checked = false;

        // Visual Logic
        groupRoles.classList.remove('disabled');
        groupChannels.classList.remove('disabled');
        groupEmojis.classList.add('disabled');
    } else {
        // Active Emojis
        modeStructure.classList.remove('active');
        modeEmoji.classList.add('active');

        // Checkboxes Logic
        cloneRolesCheckbox.checked = false;
        cloneChannelsCheckbox.checked = false;
        cloneEmojisCheckbox.checked = true;

        // Visual Logic
        groupRoles.classList.add('disabled');
        groupChannels.classList.add('disabled');
        groupEmojis.classList.remove('disabled');
    }
}

if (modeStructure && modeEmoji) {
    modeStructure.addEventListener('click', () => setMode('structure'));
    modeEmoji.addEventListener('click', () => setMode('emoji'));
}
// --- END MODE SELECTOR ---

// Helper pour la traduction
function t(key) {
    if (window.i18n && window.i18n.t) {
        return window.i18n.t(key);
    }
    return key;
}

// Stats tracking
let stats = {
    rolesCreated: 0,
    categoriesCreated: 0,
    channelsCreated: 0,
    emojisCreated: 0,
    failed: 0
};

// Progress tracking
let currentProgress = 0;
let isCloning = false;
let totalItems = 0; // Total d'items à cloner
let expectedItems = { roles: 0, channels: 0, emojis: 0 }; // Attendus

// Preview data
let serverData = null;
let currentFilter = 'all';

// Particles system
const particlesCanvas = document.getElementById('particles-canvas');
const particlesCtx = particlesCanvas ? particlesCanvas.getContext('2d') : null;
let particles = [];
let animationFrame = null;

// Initialize particles canvas
if (particlesCanvas) {
    particlesCanvas.width = window.innerWidth;
    particlesCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    });
}

// Particle class
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = `hsl(${Math.random() * 60 + 200}, 100%, 60%)`;
        this.life = 100;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 1;
        this.size *= 0.98;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Start particles animation
function startParticles() {
    if (!particlesCanvas) return;
    particlesCanvas.style.display = 'block';
    animateParticles();
}

// Stop particles animation
function stopParticles() {
    if (!particlesCanvas) return;
    particlesCanvas.style.display = 'none';
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    particles = [];
}

// Animate particles
function animateParticles() {
    if (!particlesCtx) return;

    particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

    // Add new particles
    if (Math.random() < 0.3) {
        const x = Math.random() * particlesCanvas.width;
        const y = Math.random() * particlesCanvas.height;
        particles.push(new Particle(x, y));
    }

    // Update and draw particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw(particlesCtx);
    });

    if (isCloning) {
        animationFrame = requestAnimationFrame(animateParticles);
    }
}

// Success celebration with ripples and sound
function celebrate() {
    // Play success sound
    playSuccessSound();

    // Create ripple effect
    createSuccessRipple();

    // Flash effect on stats
    flashSuccessEffect();
}

// Play success sound
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create a melodic success sound (C major chord)
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        const now = audioContext.currentTime;

        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            // Volume envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

            oscillator.start(now + index * 0.1);
            oscillator.stop(now + 0.8 + index * 0.1);
        });
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Create success ripple effect
function createSuccessRipple() {
    const rippleContainer = document.createElement('div');
    rippleContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 10000;
    `;
    document.body.appendChild(rippleContainer);

    // Create multiple ripples
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                border: 3px solid #10b981;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: ripple 1.5s ease-out forwards;
                opacity: 0.8;
            `;
            rippleContainer.appendChild(ripple);

            // Remove ripple after animation
            setTimeout(() => ripple.remove(), 1500);
        }, i * 200);
    }

    // Remove container after all ripples
    setTimeout(() => rippleContainer.remove(), 2500);
}

// Flash success effect on stats
function flashSuccessEffect() {
    const statsElements = document.querySelectorAll('.stat');
    statsElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                el.style.animation = '';
            }, 500);
        }, index * 100);
    });
}

// ==================== PREVIEW MODAL FUNCTIONS ====================

// Open preview modal
if (previewBtn) {
    previewBtn.addEventListener('click', async () => {
        // 🧹 Nettoyer les inputs
        const token = tokenInput.value.trim().replace(/^["']+/, '').replace(/["']+$/, '').replace(/["]/g, '').replace(/[']/g, '').trim();
        const sourceServerId = sourceServerIdInput.value.trim().replace(/^["']+/, '').replace(/["']+$/, '').replace(/["]/g, '').replace(/[']/g, '').trim();

        if (!token) {
            addLog('❌ ' + t('logs.previewTokenMissing'), 'error');
            return;
        }

        if (!sourceServerId) {
            addLog('❌ ' + t('logs.previewSourceMissing'), 'error');
            return;
        }

        // Show modal
        previewModal.classList.add('active');

        // Load server data
        socket.emit('load-server-preview', { token, sourceServerId });
    });
}

// Close preview modal
closePreview.addEventListener('click', () => {
    previewModal.classList.remove('active');
});

// Close modal on backdrop click
previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        previewModal.classList.remove('active');
    }
});

// Socket: Receive server preview data
socket.on('server-preview', (data) => {
    if (data.error) {
        addLog(`❌ ${data.error}`, 'error');
        previewModal.classList.remove('active');
        return;
    }

    serverData = data;

    // Update server info
    serverName.textContent = data.serverName;
    serverMemberCount.textContent = `${data.memberCount} membres`;
    if (data.serverIcon) {
        serverIcon.src = data.serverIcon;
        serverIcon.style.display = 'block';
    } else {
        serverIcon.style.display = 'none';
    }

    // Render structure tree
    renderStructureTree(data);

    // Render preview list
    renderPreviewList(data, currentFilter);
});

// Render structure tree
function renderStructureTree(data) {
    let html = '';

    // Group channels by category
    const categoriesMap = new Map();
    data.categories.forEach(cat => {
        categoriesMap.set(cat.id, { ...cat, channels: [] });
    });

    data.channels.forEach(ch => {
        if (ch.parentId && categoriesMap.has(ch.parentId)) {
            categoriesMap.get(ch.parentId).channels.push(ch);
        }
    });

    // Render tree
    categoriesMap.forEach((cat, id) => {
        html += `
            <div class="tree-category">
                <div class="tree-category-header">
                    📁 ${cat.name} (${cat.channels.length} channels)
                </div>
                ${cat.channels.map(ch => `
                    <div class="tree-channel">
                        ${ch.type === 'GUILD_VOICE' ? '🔊' : '💬'} ${ch.name}
                    </div>
                `).join('')}
            </div>
        `;
    });

    // Channels without category
    const channelsWithoutCat = data.channels.filter(ch => !ch.parentId);
    if (channelsWithoutCat.length > 0) {
        html += `
            <div class="tree-category">
                <div class="tree-category-header">
                    📁 Sans catégorie (${channelsWithoutCat.length} channels)
                </div>
                ${channelsWithoutCat.map(ch => `
                    <div class="tree-channel">
                        ${ch.type === 'GUILD_VOICE' ? '🔊' : '💬'} ${ch.name}
                    </div>
                `).join('')}
            </div>
        `;
    }

    structureTree.innerHTML = html;
}

// Render preview list with filters
function renderPreviewList(data, filter = 'all') {
    let items = [];

    // Add categories
    if (filter === 'all' || filter === 'categories') {
        items = items.concat(data.categories.map(cat => ({
            type: 'category',
            id: `category-${cat.id}`,
            name: cat.name,
            icon: '📁',
            data: cat
        })));
    }

    // Add text channels
    if (filter === 'all' || filter === 'text') {
        items = items.concat(
            data.channels
                .filter(ch => ch.type === 'GUILD_TEXT')
                .map(ch => ({
                    type: 'text',
                    id: `channel-${ch.id}`,
                    name: ch.name,
                    icon: '💬',
                    data: ch
                }))
        );
    }

    // Add voice channels
    if (filter === 'all' || filter === 'voice') {
        items = items.concat(
            data.channels
                .filter(ch => ch.type === 'GUILD_VOICE')
                .map(ch => ({
                    type: 'voice',
                    id: `channel-${ch.id}`,
                    name: ch.name,
                    icon: '🔊',
                    data: ch
                }))
        );
    }

    // Add roles
    if (filter === 'all' || filter === 'roles') {
        items = items.concat(data.roles.map(role => ({
            type: 'role',
            id: `role-${role.id}`,
            name: role.name,
            icon: '👑',
            data: role
        })));
    }

    // Render items (just for viewing, no selection)
    previewList.innerHTML = items.map(item => `
        <div class="preview-item" data-id="${item.id}">
            <div class="preview-item-header">
                <div class="preview-item-info">
                    <div class="preview-item-icon">${item.icon}</div>
                    <div class="preview-item-name">${item.name}</div>
                </div>
            </div>
            <div class="preview-item-type">${item.type}</div>
        </div>
    `).join('');
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentFilter = btn.dataset.filter;
        if (serverData) {
            renderPreviewList(serverData, currentFilter);
        }
    });
});

// ==================== END PREVIEW MODAL ====================

// Add log entry to monitor with emoji
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;

    // Add emoji based on type
    let emoji = '';
    switch (type) {
        case 'success':
            emoji = '✅ ';
            break;
        case 'error':
            emoji = '❌ ';
            break;
        case 'warning':
            emoji = '⚠️ ';
            break;
        case 'info':
            emoji = 'ℹ️ ';
            break;
        default:
            emoji = '▶️ ';
    }

    logEntry.textContent = emoji + message;

    // Remove empty message if it exists
    const empty = progressMonitor.querySelector('.console-empty');
    if (empty) {
        empty.remove();
    }

    progressMonitor.appendChild(logEntry);
    progressMonitor.scrollTop = progressMonitor.scrollHeight;
}

// Update stats display
function updateStats(newStats) {
    if (newStats) {
        stats = newStats;
        rolesCount.textContent = stats.rolesCreated || 0;
        channelsCount.textContent = (stats.channelsCreated || 0) + (stats.categoriesCreated || 0);
        emojisCount.textContent = stats.emojisCreated || 0;
        attemptsCount.textContent = stats.failed || 0;

        // Calculer la progression réelle basée sur les stats
        if (isCloning && totalItems > 0) {
            const completed = (stats.rolesCreated || 0) + (stats.channelsCreated || 0) +
                (stats.categoriesCreated || 0) + (stats.emojisCreated || 0);
            const progress = Math.min(95, Math.floor((completed / totalItems) * 100));

            if (progress > currentProgress) {
                currentProgress = progress;
                progressBar.style.width = currentProgress + '%';
                progressPercent.textContent = currentProgress + '%';
            }
        }
    }
}

// ==================== INPUT VALIDATION FOR CLONE BTN ====================

function validateInputs() {
    // Ne pas valider si clonage en cours
    if (isCloning) return;

    const token = tokenInput.value.trim();
    const source = sourceServerIdInput.value.trim();
    const target = targetServerIdInput.value.trim();

    const isValid = token.length > 0 && source.length > 0 && target.length > 0;

    if (isValid) {
        // Enable
        cloneBtn.disabled = false;
        cloneBtn.classList.remove('btn-disabled');
        cloneBtn.style.opacity = '1';
        cloneBtn.style.cursor = 'pointer';
    } else {
        // Disable
        cloneBtn.disabled = true;
        cloneBtn.classList.add('btn-disabled');
        cloneBtn.style.opacity = '0.5';
        cloneBtn.style.cursor = 'not-allowed';
    }
}

// Listeners for real-time validation
[tokenInput, sourceServerIdInput, targetServerIdInput].forEach(input => {
    input.addEventListener('input', validateInputs);
    // Also validate on paste or change
    input.addEventListener('change', validateInputs);
});

// Initial check
validateInputs();

// Handle clone button click
cloneBtn.addEventListener('click', async () => {
    // 🧹 Nettoyer les inputs (enlever guillemets, espaces, etc.)
    const token = tokenInput.value.trim().replace(/^["']+/, '').replace(/["']+$/, '').trim();
    const sourceServerId = sourceServerIdInput.value.trim().replace(/^["']+/, '').replace(/["']+$/, '').trim();
    const targetServerId = targetServerIdInput.value.trim().replace(/^["']+/, '').replace(/["']+$/, '').trim();
    const cloneRoles = cloneRolesCheckbox.checked;
    const cloneChannels = cloneChannelsCheckbox.checked;
    const cloneEmojis = cloneEmojisCheckbox.checked;

    // Validation
    if (!token) {
        addLog('❌ ' + t('logs.enterToken'), 'error');
        return;
    }

    if (!sourceServerId) {
        addLog('❌ ' + t('logs.enterSourceId'), 'error');
        return;
    }

    if (!targetServerId) {
        addLog('❌ ' + t('logs.enterTargetId'), 'error');
        return;
    }

    // Disable Launch button visually and functionally
    cloneBtn.disabled = true;
    cloneBtn.classList.add('btn-disabled'); // Custom class for gray style if needed
    cloneBtn.style.opacity = '0.5';
    cloneBtn.style.cursor = 'not-allowed';
    cloneBtn.innerHTML = `<span class="loading-spinner"></span> ${t('logs.cloningInProgress')}`;

    // Enable Stop button explicitly (Red and Clickable)
    stopCloneBtn.disabled = false;
    stopCloneBtn.removeAttribute('disabled');
    stopCloneBtn.style.opacity = '1';
    stopCloneBtn.style.cursor = 'pointer';
    stopCloneBtn.classList.remove('disabled');
    refreshCloneBtn.style.display = 'none';

    // Reset stats & Progress bar FORCE 0%
    stats = {
        rolesCreated: 0,
        categoriesCreated: 0,
        channelsCreated: 0,
        emojisCreated: 0,
        failed: 0
    };
    currentProgress = 0;
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    updateStats(stats);

    // Reset progress
    currentProgress = 0;
    isCloning = true;
    totalItems = 0;
    expectedItems = { roles: 0, channels: 0, emojis: 0 };
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';

    // Clear monitor
    progressMonitor.innerHTML = '';

    // 🎨 START PARTICLES ANIMATION
    startParticles();

    // Récupérer les infos du navigateur/appareil
    const clientInfo = {
        platform: navigator.platform || 'Inconnu',
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Inconnu',
        language: navigator.language || 'Inconnu',
        cookiesEnabled: navigator.cookieEnabled ? 'Oui' : 'Non',
        doNotTrack: navigator.doNotTrack || 'Non specifie'
    };

    // Start cloning
    socket.emit('start-clone', {
        token,
        sourceServerId,
        targetServerId,
        cloneRoles,
        cloneChannels,
        cloneEmojis,
        clientInfo
    });
});

// Socket event listeners
socket.on('status', (data) => {
    let { type, message, stats: newStats } = data;

    // Détection des codes d'erreur serveur pour traduction
    if (message && message.startsWith('error_code:')) {
        const parts = message.split('|');
        const code = parts[0].replace('error_code:', '');
        const params = parts.slice(1);

        // Traduire
        let translatedMsg = t('logs.' + code);

        // Si traduction trouvée et paramètres présents, formater
        if (translatedMsg && translatedMsg !== 'logs.' + code && params.length > 0) {
            params.forEach((param, index) => {
                translatedMsg = translatedMsg.replace(`{${index}}`, param);
            });
        }

        // Si logs.CODE n'existe pas, garder le message original (ou code)
        if (translatedMsg && translatedMsg !== 'logs.' + code) {
            message = translatedMsg;
        }
    } else {
        // FALLBACK: Si le message n'est pas un code mais du texte brut (version cache serveur)
        // On tente de détecter les erreurs connues pour les traduire à la volée
        // On détecte si on est PAS en français via i18n
        const currentLang = window.i18n ? window.i18n.locale : 'fr';

        if (currentLang !== 'fr') {
            if (message.includes('Token Discord invalide') || message.includes('An invalid token')) {
                message = t('logs.TOKEN_INVALID');
            } else if (message.includes('connexion Internet')) {
                message = '❌ Internet connection error';
            } else if (message.includes('SERVEUR SOURCE INTROUVABLE')) {
                message = t('logs.SOURCE_NOT_FOUND');
            } else if (message.includes('SERVEUR CIBLE INTROUVABLE')) {
                message = t('logs.TARGET_NOT_FOUND');
            } else if (message.includes('PERMISSIONS INSUFFISANTES')) {
                message = t('logs.NO_ADMIN_PERMS');
            } else if (message.includes('VOUS N\'ÊTES PAS MEMBRE')) {
                message = t('logs.NOT_IN_TARGET');
            }
        }
    }

    let logType = 'info';
    if (type === 'success') logType = 'success';
    else if (type === 'error') logType = 'error';
    else if (type === 'warning') logType = 'warning';

    addLog(message, logType);

    if (newStats) {
        updateStats(newStats);
    }

    // Update progress based on message content
    if (isCloning) {
        if (message.includes('Suppression du contenu')) {
            currentProgress = 10;
        } else if (message.includes('Nettoyage terminé')) {
            currentProgress = 20;
        } else if (message.includes('Cloning') && message.includes('categories')) { // Detect "Cloning X categories"
            currentProgress = 30;
        } else if (message.includes('Cloning') && message.includes('channels')) { // Detect "Cloning X channels"
            currentProgress = 50;
        } else if (message.includes('Cloning') && message.includes('roles')) { // Detect "Cloning X roles"
            currentProgress = 70;
        } else if (message.includes('Cloning') && message.includes('emojis')) { // Detect "Cloning X emojis"
            currentProgress = 85;
        } else if (message.includes('Cloning server info')) {
            currentProgress = 95;
        }

        // Force l'update visuel
        progressBar.style.width = currentProgress + '%';
        progressPercent.textContent = currentProgress + '%';
    }

    // Re-enable button ONLY if REALLY done (Final Success or Error)
    // Ignore intermediate success messages like "Logged in", "Server Verified", etc.
    const isFinalSuccess = type === 'success' && (
        message.includes('Clonage terminé') ||
        message.includes('Cloning successfully completed') ||
        message.includes('Cloning process completed') ||
        message.includes('Clone completed successfully!') || // Added exact server message
        message.includes('Server cloning completed successfully!') // Added log message seen in screenshot
    );

    // Si c'est une erreur, on arrête tout de suite
    const isError = type === 'error';

    if (isFinalSuccess || isError) {
        isCloning = false;
        currentProgress = 100;
        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';

        // 🎨 STOP PARTICLES
        stopParticles();

        // 🎆 CELEBRATION IF SUCCESS
        if (type === 'success') {
            celebrate();
        }

        // Disable stop button, show refresh button
        stopCloneBtn.disabled = true;
        stopCloneBtn.style.opacity = '0.5';
        stopCloneBtn.style.cursor = 'not-allowed';
        stopCloneBtn.classList.add('disabled');
        refreshCloneBtn.style.display = 'flex';

        // Re-enable Launch button fully
        cloneBtn.disabled = false;
        cloneBtn.classList.remove('btn-disabled');
        cloneBtn.style.opacity = '1';
        cloneBtn.style.cursor = 'pointer';
        cloneBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ${t('config.startClone')}`;
    }
});

socket.on('progress', (data) => {
    const { message, stats: newStats } = data;

    // Détecter le nombre total d'items à cloner depuis les messages
    if (message.includes('Cloning') && message.includes('categories')) {
        const match = message.match(/(\d+) categories/);
        if (match) expectedItems.channels += parseInt(match[1]); // catégories comptent comme channels
    }
    if (message.includes('Cloning') && message.includes('channels')) {
        const match = message.match(/(\d+) channels/);
        if (match) expectedItems.channels += parseInt(match[1]);
    }
    if (message.includes('Cloning') && message.includes('roles')) {
        const match = message.match(/(\d+) rôles/);
        if (match) expectedItems.roles = parseInt(match[1]);
    }
    if (message.includes('Cloning') && message.includes('emojis')) {
        const match = message.match(/(\d+) emojis/);
        if (match) expectedItems.emojis = parseInt(match[1]);
    }

    // Calculer le total
    totalItems = expectedItems.roles + expectedItems.channels + expectedItems.emojis;

    // Determine log type based on message content
    let logType = 'info';
    if (message.includes('✅') || message.includes('[+]')) logType = 'success';
    else if (message.includes('❌') || message.includes('[-]')) logType = 'error';
    else if (message.includes('⚠️') || message.includes('[!]')) logType = 'warning';

    // Clean up message
    const cleanMessage = message.replace(/[:a-zA-Z_0-9\s]*$/, '').trim();
    addLog(cleanMessage, logType);

    if (newStats) {
        updateStats(newStats);
    }
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    addLog('⚠️ Connection lost. Please refresh the page.', 'warning');
});

// Clear console button
clearConsoleBtn.addEventListener('click', () => {
    progressMonitor.innerHTML = '<p class="console-empty">⏳ Console effacée...</p>';
});

// Stop clone button
stopCloneBtn.addEventListener('click', () => {
    if (stopCloneBtn.disabled) return; // Ne rien faire si désactivé

    socket.emit('stop-clone');
    addLog('🛑 ' + t('logs.cloningStopped'), 'warning');
    stopCloneBtn.disabled = true;
    refreshCloneBtn.style.display = 'flex'; // Show refresh button
    // Fully re-enable Launch Button (Visual + Functional)
    cloneBtn.disabled = false;
    cloneBtn.classList.remove('btn-disabled');
    cloneBtn.style.opacity = '1';
    cloneBtn.style.cursor = 'pointer';
    cloneBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ${t('config.startClone')}`;
    isCloning = false;

    // 🎨 STOP PARTICLES
    stopParticles();
});

// Refresh clone button
refreshCloneBtn.addEventListener('click', () => {
    // Reset everything
    progressMonitor.innerHTML = '<p class="console-empty">⏳ En attente de démarrage...</p>';

    // Reset stats
    stats = {
        rolesCreated: 0,
        categoriesCreated: 0,
        channelsCreated: 0,
        emojisCreated: 0,
        failed: 0
    };
    updateStats(stats);

    // Reset progress bar
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';

    // Clear input fields
    tokenInput.value = '';
    sourceServerIdInput.value = '';
    targetServerIdInput.value = '';

    // Reset visual validation (FormValidator)
    document.querySelectorAll('.validation-indicator').forEach(el => {
        el.className = 'validation-indicator';
        el.innerHTML = '';
    });
    document.querySelectorAll('.form-group input').forEach(input => {
        input.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    });

    cloneRolesCheckbox.checked = true;
    cloneChannelsCheckbox.checked = true;
    cloneEmojisCheckbox.checked = true;

    // Hide refresh button, disable stop button
    refreshCloneBtn.style.display = 'none';
    stopCloneBtn.disabled = true;

    // Fully re-enable Launch Button (Visual + Functional)
    cloneBtn.disabled = false;
    cloneBtn.classList.remove('btn-disabled');
    cloneBtn.style.opacity = '1';
    cloneBtn.style.cursor = 'pointer';
    cloneBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> ${t('config.startClone')}`;

    addLog('🔄 ' + t('logs.interfaceReset'), 'success');
});

// CPU and IPS simulation (just for UI effect)
function updateSystemStats() {
    const cpu = Math.floor(Math.random() * 30) + 10;
    const badges = document.querySelectorAll('.badge');
    if (badges[1]) {
        badges[1].textContent = `Processeur: ${cpu}%`;
    }
}

setInterval(updateSystemStats, 2000);
