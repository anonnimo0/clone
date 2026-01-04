/**
 * CopyBot Enhancements
 * - Animations d'entrée au scroll
 * - Validation en temps réel
 * - Notifications Push navigateur
 */

// ==================== SCROLL ANIMATIONS ====================

class ScrollAnimations {
    constructor() {
        this.animatedElements = [];
        this.observer = null;
        this.init();
    }

    init() {
        // Sélectionner tous les éléments à animer
        this.animatedElements = document.querySelectorAll(
            '.card, .tutorial-card, .discord-card, .hero-badge, .hero-title, ' +
            '.hero-subtitle, .hero-description, .section-title, .section-description, ' +
            '.video-container, .stats-grid .stat, .form-group, .checkbox-group, .button-group'
        );

        // Ajouter la classe initiale
        this.animatedElements.forEach((el, index) => {
            el.classList.add('scroll-animate');
            el.style.transitionDelay = `${index * 0.02}s`;
        });

        // Créer l'observer
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // Optionnel: arrêter d'observer après animation
                    // this.observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observer tous les éléments
        this.animatedElements.forEach(el => {
            this.observer.observe(el);
        });

        // Animer les éléments déjà visibles au chargement
        setTimeout(() => {
            this.animatedElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    el.classList.add('animate-in');
                }
            });
        }, 100);

        console.log('[Animations] Scroll animations initialized');
    }
}

// ==================== REAL-TIME VALIDATION ====================

class FormValidator {
    constructor() {
        this.tokenInput = document.getElementById('token');
        this.sourceInput = document.getElementById('sourceServerId');
        this.targetInput = document.getElementById('targetServerId');
        this.cloneBtn = document.getElementById('startCloneBtn'); // ID corrigé

        this.validationState = {
            token: false,
            source: false,
            target: false
        };

        this.init();
    }

    init() {
        if (!this.tokenInput || !this.sourceInput || !this.targetInput || !this.cloneBtn) {
            console.warn('[Validation] Required elements not found');
            return;
        }

        // Créer les indicateurs de validation
        this.createValidationIndicators();

        // Event listeners avec debounce
        this.tokenInput.addEventListener('input', this.debounce(() => this.validateToken(), 500));
        this.sourceInput.addEventListener('input', this.debounce(() => this.validateServerId('source'), 300));
        this.targetInput.addEventListener('input', this.debounce(() => this.validateServerId('target'), 300));

        // Validation au blur
        this.tokenInput.addEventListener('blur', () => this.validateToken());
        this.sourceInput.addEventListener('blur', () => this.validateServerId('source'));
        this.targetInput.addEventListener('blur', () => this.validateServerId('target'));

        console.log('[Validation] Real-time validation initialized');
    }

    createValidationIndicators() {
        // Ajouter un indicateur à chaque input
        [this.tokenInput, this.sourceInput, this.targetInput].forEach(input => {
            const wrapper = input.parentElement;
            wrapper.style.position = 'relative';

            const indicator = document.createElement('div');
            indicator.className = 'validation-indicator';
            indicator.innerHTML = '';
            wrapper.appendChild(indicator);
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    validateToken() {
        // Nettoyer le token (enlever les guillemets) pour la validation
        const rawToken = this.tokenInput.value.trim();
        const token = rawToken.replace(/^["']+|["']+$/g, '');

        const indicator = this.tokenInput.parentElement.querySelector('.validation-indicator');

        if (!token) {
            this.setIndicator(indicator, 'empty');
            this.validationState.token = false;
            this.updateButtonState();
            return;
        }

        // Validation format token Discord
        // Format: base64.base64.base64 ou ancien format
        const tokenRegex = /^[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}$|^[A-Za-z0-9_-]{59,}$/;

        if (token.length < 50) {
            this.setIndicator(indicator, 'invalid', 'Token trop court');
            this.validationState.token = false;
        } else if (!tokenRegex.test(token)) {
            this.setIndicator(indicator, 'warning', 'Format inhabituel');
            this.validationState.token = true; // Permettre quand même
        } else {
            this.setIndicator(indicator, 'valid', 'Format valide');
            this.validationState.token = true;
        }

        this.updateButtonState();
    }

    validateServerId(type) {
        const input = type === 'source' ? this.sourceInput : this.targetInput;
        const id = input.value.trim();
        const indicator = input.parentElement.querySelector('.validation-indicator');

        if (!id) {
            this.setIndicator(indicator, 'empty');
            this.validationState[type] = false;
            this.updateButtonState();
            return;
        }

        // Validation ID Discord (snowflake: 17-19 chiffres)
        const idRegex = /^\d{17,19}$/;

        if (!idRegex.test(id)) {
            this.setIndicator(indicator, 'invalid', 'ID invalide (17-19 chiffres)');
            this.validationState[type] = false;
        } else {
            this.setIndicator(indicator, 'valid', 'ID valide');
            this.validationState[type] = true;
        }

        // Vérifier si source et target sont identiques
        if (this.sourceInput.value.trim() === this.targetInput.value.trim() &&
            this.sourceInput.value.trim() !== '') {
            const sourceIndicator = this.sourceInput.parentElement.querySelector('.validation-indicator');
            const targetIndicator = this.targetInput.parentElement.querySelector('.validation-indicator');
            this.setIndicator(sourceIndicator, 'warning', 'Même serveur!');
            this.setIndicator(targetIndicator, 'warning', 'Même serveur!');
        }

        this.updateButtonState();
    }

    setIndicator(indicator, status, tooltip = '') {
        indicator.className = 'validation-indicator ' + status;

        switch (status) {
            case 'valid':
                indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
                break;
            case 'invalid':
                indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>';
                break;
            case 'warning':
                indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                break;
            case 'loading':
                indicator.innerHTML = '<div class="spinner"></div>';
                break;
            default:
                indicator.innerHTML = '';
        }

        indicator.title = tooltip;
    }

    updateButtonState() {
        const allValid = this.validationState.token &&
            this.validationState.source &&
            this.validationState.target;

        // Ajouter une classe visuelle au bouton
        if (allValid) {
            this.cloneBtn.classList.add('ready');
            this.cloneBtn.classList.remove('not-ready');
        } else {
            this.cloneBtn.classList.remove('ready');
            if (this.tokenInput.value || this.sourceInput.value || this.targetInput.value) {
                this.cloneBtn.classList.add('not-ready');
            } else {
                this.cloneBtn.classList.remove('not-ready');
            }
        }
    }
}

// ==================== PUSH NOTIFICATIONS ====================

class PushNotifications {
    constructor() {
        this.permission = 'default';
        this.init();
    }

    async init() {
        // Vérifier si les notifications sont supportées
        if (!('Notification' in window)) {
            console.log('[Notifications] Non supportées par ce navigateur');
            return;
        }

        // Demander la permission au premier clic sur le bouton clone
        const cloneBtn = document.getElementById('startCloneBtn');
        if (cloneBtn) {
            cloneBtn.addEventListener('click', () => this.requestPermission(), { once: true });
        }

        this.permission = Notification.permission;
        console.log(`[Notifications] Permission actuelle: ${this.permission}`);
    }

    async requestPermission() {
        if (this.permission === 'granted') return true;
        if (this.permission === 'denied') return false;

        try {
            const result = await Notification.requestPermission();
            this.permission = result;

            if (result === 'granted') {
                this.showNotification(
                    '🔔 Notifications activées!',
                    'Vous recevrez une notification quand le clonage sera terminé.',
                    'info'
                );
            }

            return result === 'granted';
        } catch (e) {
            console.error('[Notifications] Erreur:', e);
            return false;
        }
    }

    showNotification(title, body, type = 'info') {
        if (this.permission !== 'granted') return;

        // Icône selon le type
        let icon = '/favicon.svg';

        const options = {
            body: body,
            icon: icon,
            badge: icon,
            vibrate: [200, 100, 200],
            tag: 'copybot-notification',
            renotify: true,
            requireInteraction: type === 'success' || type === 'error',
            silent: false
        };

        try {
            const notification = new Notification(title, options);

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto-fermer après 10 secondes
            setTimeout(() => notification.close(), 10000);

        } catch (e) {
            console.error('[Notifications] Erreur création:', e);
        }
    }

    // Notification de succès
    notifySuccess(stats) {
        const body = `✅ Clonage terminé!\n` +
            `📁 ${stats.channelsCreated || 0} salons\n` +
            `👑 ${stats.rolesCreated || 0} rôles\n` +
            `😀 ${stats.emojisCreated || 0} emojis`;

        this.showNotification('🎉 CopyBot - Succès!', body, 'success');
    }

    // Notification d'erreur
    notifyError(message) {
        this.showNotification('❌ CopyBot - Erreur', message, 'error');
    }

    // Notification de progression
    notifyProgress(percent) {
        if (percent === 50) {
            this.showNotification('⏳ CopyBot', 'Clonage en cours... 50%', 'info');
        }
    }
}

// ==================== COUNTER ANIMATION ====================

class CounterAnimation {
    constructor() {
        this.counters = [];
        this.init();
    }

    init() {
        // Observer les changements sur les compteurs de stats
        const statsValues = document.querySelectorAll('.stat-value');

        statsValues.forEach(el => {
            // Créer un MutationObserver pour détecter les changements
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        this.animateValue(el);
                    }
                });
            });

            observer.observe(el, {
                childList: true,
                characterData: true,
                subtree: true
            });
        });

        console.log('[Counter] Animation initialized');
    }

    animateValue(element) {
        const endValue = parseInt(element.textContent) || 0;
        const startValue = parseInt(element.dataset.lastValue) || 0;

        if (endValue === startValue) return;

        // Animation rapide pour les petits changements
        const duration = Math.min(500, Math.abs(endValue - startValue) * 50);
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const current = Math.floor(startValue + (endValue - startValue) * easeOut);
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = endValue;
                element.dataset.lastValue = endValue;

                // Effet de pulse
                element.classList.add('counter-pop');
                setTimeout(() => element.classList.remove('counter-pop'), 300);
            }
        };

        element.dataset.lastValue = startValue;
        requestAnimationFrame(animate);
    }
}

// ==================== INTEGRATION WITH SOCKET ====================

// Hook into existing socket events for notifications
function hookSocketNotifications() {
    if (typeof io === 'undefined') return;

    const originalSocket = window.socket || io();

    // Hook status events
    const originalOnStatus = originalSocket.listeners('status')[0];

    originalSocket.off('status');
    originalSocket.on('status', (data) => {
        // Call original handler
        if (originalOnStatus) originalOnStatus(data);

        // Send notification
        if (data.type === 'success' && data.message.includes('terminé')) {
            window.pushNotifications?.notifySuccess(data.stats || {});
        } else if (data.type === 'error') {
            window.pushNotifications?.notifyError(data.message);
        }
    });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    // Attendre que le DOM soit prêt
    setTimeout(() => {
        // Initialiser les animations de scroll
        window.scrollAnimations = new ScrollAnimations();

        // Initialiser la validation en temps réel
        window.formValidator = new FormValidator();

        // Initialiser les notifications push
        window.pushNotifications = new PushNotifications();

        // Initialiser les animations de compteur
        // INTENTIONALLY DISABLED - Causes fluctuating numbers during fast updates
        // window.counterAnimation = new CounterAnimation();

        // Hook les notifications au socket
        hookSocketNotifications();

        console.log('[Enhancements] All enhancements loaded!');
    }, 500);
});

// ==================== EXPORT ====================

window.CopyBotEnhancements = {
    ScrollAnimations,
    FormValidator,
    PushNotifications,
    CounterAnimation
};
