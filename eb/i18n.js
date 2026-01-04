/**
 * CopyBot Internationalization (i18n) System
 * Détection intelligente de la langue basée sur l'IP (VPN compatible)
 * Français par défaut pour les pays francophones
 */

class I18n {
    constructor() {
        this.currentLang = 'fr'; // Français par défaut
        this.translations = {};
        this.supportedLangs = ['fr', 'en'];

        // Pays francophones (codes ISO)
        this.frenchSpeakingCountries = [
            'FR', // France
            'BE', // Belgique
            'CH', // Suisse
            'CA', // Canada
            'LU', // Luxembourg
            'MC', // Monaco
            'SN', // Sénégal
            'CI', // Côte d'Ivoire
            'ML', // Mali
            'BF', // Burkina Faso
            'NE', // Niger
            'TG', // Togo
            'BJ', // Bénin
            'GA', // Gabon
            'CG', // Congo
            'CD', // RD Congo
            'CM', // Cameroun
            'MG', // Madagascar
            'HT', // Haïti
            'MA', // Maroc
            'TN', // Tunisie
            'DZ', // Algérie
            'MU', // Maurice
            'RE', // Réunion
            'GP', // Guadeloupe
            'MQ', // Martinique
            'GF', // Guyane française
            'PF', // Polynésie française
            'NC'  // Nouvelle-Calédonie
        ];
    }

    /**
     * Initialise le système i18n
     */
    async init() {
        // Détecte la langue optimale
        this.currentLang = await this.detectLanguage();

        // Charge les traductions
        await this.loadTranslations(this.currentLang);

        // Applique les traductions
        this.applyTranslations();

        // Crée le bouton de changement de langue
        this.createLanguageSwitcher();

        console.log(`[i18n] Langue initialisée: ${this.currentLang}`);
    }

    /**
     * Détection intelligente de la langue
     * PRIORITÉ: API géolocalisation IP (fonctionne avec VPN)
     */
    async detectLanguage() {
        // 1. Vérifier le choix sauvegardé en priorité
        const savedLang = localStorage.getItem('copybot-lang');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            console.log(`[i18n] Langue sauvegardée trouvée: ${savedLang}`);
            return savedLang;
        }

        // 2. PRIORITÉ : Détecter le pays via IP (fonctionne avec VPN!)
        try {
            const country = await this.detectCountryByIP();
            if (country) {
                console.log(`[i18n] Pays détecté via IP: ${country}`);
                if (this.frenchSpeakingCountries.includes(country.toUpperCase())) {
                    console.log(`[i18n] Pays francophone détecté: ${country}`);
                    return 'fr';
                } else {
                    console.log(`[i18n] Pays non-francophone détecté: ${country} -> Anglais`);
                    return 'en';
                }
            }
        } catch (e) {
            console.log('[i18n] Détection IP échouée, fallback navigateur');
        }

        // 3. Fallback: langue du navigateur
        const browserLang = navigator.language || navigator.userLanguage;
        console.log(`[i18n] Fallback langue navigateur: ${browserLang}`);

        if (browserLang.startsWith('fr')) {
            return 'fr';
        }

        // 4. Par défaut : anglais pour les non-francophones
        return 'en';
    }

    /**
     * Détecte le pays via l'IP (compatible VPN)
     * Utilise plusieurs APIs en fallback
     */
    async detectCountryByIP() {
        // Liste d'APIs gratuites de géolocalisation IP
        const apis = [
            {
                url: 'https://ipapi.co/json/',
                getCountry: (data) => data.country_code
            },
            {
                url: 'https://ip-api.com/json/?fields=countryCode',
                getCountry: (data) => data.countryCode
            },
            {
                url: 'https://ipwho.is/',
                getCountry: (data) => data.country_code
            }
        ];

        for (const api of apis) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const response = await fetch(api.url, {
                    signal: controller.signal,
                    cache: 'no-store' // Important pour VPN
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    const country = api.getCountry(data);
                    if (country) {
                        console.log(`[i18n] API ${api.url} -> ${country}`);
                        return country;
                    }
                }
            } catch (e) {
                console.log(`[i18n] API ${api.url} échouée`);
                continue;
            }
        }

        return null;
    }

    /**
     * Charge les fichiers de traduction
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
            this.translations = await response.json();
            console.log(`[i18n] Traductions chargées pour: ${lang}`);
        } catch (e) {
            console.error(`[i18n] Erreur de chargement des traductions:`, e);
            // Fallback vers le français
            if (lang !== 'fr') {
                await this.loadTranslations('fr');
            }
        }
    }

    /**
     * Obtient une traduction par clé (ex: "config.title")
     */
    t(key) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                console.warn(`[i18n] Clé manquante: ${key}`);
                return key;
            }
        }

        return value;
    }

    /**
     * Applique les traductions à tous les éléments avec data-i18n
     */
    applyTranslations() {
        // Éléments avec data-i18n pour le contenu texte
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation !== key) {
                // Utiliser innerHTML si la traduction contient du HTML
                if (translation.includes('<') && translation.includes('>')) {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Éléments avec data-i18n-placeholder pour les placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation !== key) {
                el.placeholder = translation;
            }
        });

        // Éléments avec data-i18n-title pour les titres
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation !== key) {
                el.title = translation;
            }
        });

        // Met à jour l'attribut lang du HTML
        document.documentElement.lang = this.currentLang;
    }

    /**
     * Retourne le SVG du drapeau pour la langue donnée
     * France 🇫🇷 et États-Unis 🇺🇸
     */
    getFlagSVG(lang) {
        if (lang === 'fr') {
            // Drapeau France
            return `<svg class="lang-flag" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#ED2939" x="24" y="0" width="12" height="36"/>
                <rect fill="#002395" x="0" y="0" width="12" height="36"/>
                <rect fill="#FFFFFF" x="12" y="0" width="12" height="36"/>
            </svg>`;
        } else {
            // Drapeau États-Unis
            return `<svg class="lang-flag" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#B22234" width="36" height="36"/>
                <rect fill="#FFFFFF" y="2.77" width="36" height="2.77"/>
                <rect fill="#FFFFFF" y="8.31" width="36" height="2.77"/>
                <rect fill="#FFFFFF" y="13.85" width="36" height="2.77"/>
                <rect fill="#FFFFFF" y="19.38" width="36" height="2.77"/>
                <rect fill="#FFFFFF" y="24.92" width="36" height="2.77"/>
                <rect fill="#FFFFFF" y="30.46" width="36" height="2.77"/>
                <rect fill="#3C3B6E" width="14.4" height="19.38"/>
                <g fill="#FFFFFF">
                    <circle cx="2.4" cy="1.94" r="0.7"/>
                    <circle cx="4.8" cy="1.94" r="0.7"/>
                    <circle cx="7.2" cy="1.94" r="0.7"/>
                    <circle cx="9.6" cy="1.94" r="0.7"/>
                    <circle cx="12" cy="1.94" r="0.7"/>
                    <circle cx="3.6" cy="3.88" r="0.7"/>
                    <circle cx="6" cy="3.88" r="0.7"/>
                    <circle cx="8.4" cy="3.88" r="0.7"/>
                    <circle cx="10.8" cy="3.88" r="0.7"/>
                    <circle cx="2.4" cy="5.82" r="0.7"/>
                    <circle cx="4.8" cy="5.82" r="0.7"/>
                    <circle cx="7.2" cy="5.82" r="0.7"/>
                    <circle cx="9.6" cy="5.82" r="0.7"/>
                    <circle cx="12" cy="5.82" r="0.7"/>
                    <circle cx="3.6" cy="7.76" r="0.7"/>
                    <circle cx="6" cy="7.76" r="0.7"/>
                    <circle cx="8.4" cy="7.76" r="0.7"/>
                    <circle cx="10.8" cy="7.76" r="0.7"/>
                    <circle cx="2.4" cy="9.69" r="0.7"/>
                    <circle cx="4.8" cy="9.69" r="0.7"/>
                    <circle cx="7.2" cy="9.69" r="0.7"/>
                    <circle cx="9.6" cy="9.69" r="0.7"/>
                    <circle cx="12" cy="9.69" r="0.7"/>
                    <circle cx="3.6" cy="11.63" r="0.7"/>
                    <circle cx="6" cy="11.63" r="0.7"/>
                    <circle cx="8.4" cy="11.63" r="0.7"/>
                    <circle cx="10.8" cy="11.63" r="0.7"/>
                    <circle cx="2.4" cy="13.57" r="0.7"/>
                    <circle cx="4.8" cy="13.57" r="0.7"/>
                    <circle cx="7.2" cy="13.57" r="0.7"/>
                    <circle cx="9.6" cy="13.57" r="0.7"/>
                    <circle cx="12" cy="13.57" r="0.7"/>
                    <circle cx="3.6" cy="15.51" r="0.7"/>
                    <circle cx="6" cy="15.51" r="0.7"/>
                    <circle cx="8.4" cy="15.51" r="0.7"/>
                    <circle cx="10.8" cy="15.51" r="0.7"/>
                    <circle cx="2.4" cy="17.44" r="0.7"/>
                    <circle cx="4.8" cy="17.44" r="0.7"/>
                    <circle cx="7.2" cy="17.44" r="0.7"/>
                    <circle cx="9.6" cy="17.44" r="0.7"/>
                    <circle cx="12" cy="17.44" r="0.7"/>
                </g>
            </svg>`;
        }
    }

    /**
     * Crée le bouton de changement de langue dans le header
     * UNIQUEMENT les drapeaux, pas de texte FR/EN
     */
    createLanguageSwitcher() {
        // Trouve le header-right
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        // Vérifie si le bouton existe déjà
        if (document.getElementById('langSwitcher')) return;

        // Crée le conteneur du switcher
        const switcher = document.createElement('div');
        switcher.id = 'langSwitcher';
        switcher.className = 'lang-switcher';

        // Bouton actuel avec UNIQUEMENT le drapeau (SVG pour compatibilité)
        const currentBtn = document.createElement('button');
        currentBtn.className = 'lang-current';
        currentBtn.innerHTML = this.currentLang === 'fr'
            ? this.getFlagSVG('fr')
            : this.getFlagSVG('en');

        // Dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'lang-dropdown';
        dropdown.innerHTML = `
            <button class="lang-option ${this.currentLang === 'fr' ? 'active' : ''}" data-lang="fr">
                ${this.getFlagSVG('fr')}
                <span class="lang-name">Français</span>
            </button>
            <button class="lang-option ${this.currentLang === 'en' ? 'active' : ''}" data-lang="en">
                ${this.getFlagSVG('en')}
                <span class="lang-name">English</span>
            </button>
        `;

        switcher.appendChild(currentBtn);
        switcher.appendChild(dropdown);

        // Insère AVANT le bouton Discord
        const discordBtn = headerRight.querySelector('.discord-btn');
        if (discordBtn) {
            headerRight.insertBefore(switcher, discordBtn);
        } else {
            headerRight.appendChild(switcher);
        }

        // Event listeners
        currentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            switcher.classList.toggle('open');
        });

        dropdown.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', async (e) => {
                e.stopPropagation();
                const lang = option.getAttribute('data-lang');
                await this.switchLanguage(lang);
                switcher.classList.remove('open');
            });
        });

        // Ferme le dropdown en cliquant ailleurs
        document.addEventListener('click', () => {
            switcher.classList.remove('open');
        });
    }

    /**
     * Change de langue
     */
    async switchLanguage(lang) {
        if (!this.supportedLangs.includes(lang) || lang === this.currentLang) return;

        this.currentLang = lang;
        localStorage.setItem('copybot-lang', lang);

        await this.loadTranslations(lang);
        this.applyTranslations();
        this.updateSwitcherUI();

        console.log(`[i18n] Langue changée vers: ${lang}`);

        // Animation de feedback
        this.showLanguageChangeNotification(lang);
    }

    /**
     * Met à jour l'UI du switcher - UNIQUEMENT drapeau
     */
    updateSwitcherUI() {
        const currentBtn = document.querySelector('.lang-current');
        if (currentBtn) {
            currentBtn.innerHTML = this.currentLang === 'fr'
                ? this.getFlagSVG('fr')
                : this.getFlagSVG('en');
        }

        document.querySelectorAll('.lang-option').forEach(option => {
            const isActive = option.getAttribute('data-lang') === this.currentLang;
            option.classList.toggle('active', isActive);
        });
    }

    /**
     * Affiche une notification de changement de langue
     */
    showLanguageChangeNotification(lang) {
        const notification = document.createElement('div');
        notification.className = 'lang-notification';
        notification.innerHTML = lang === 'fr'
            ? `${this.getFlagSVG('fr')} Français`
            : `${this.getFlagSVG('en')} English`;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Instance globale
const i18n = new I18n();

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    i18n.init();
});

// Export pour utilisation dans d'autres scripts
window.i18n = i18n;
