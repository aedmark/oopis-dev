// gem/scripts/apps/desktop/desktop_ui.js
window.DesktopUI = class DesktopUI {
    constructor(callbacks, dependencies) {
        this.callbacks = callbacks;
        this.dependencies = dependencies;
        this.elements = {};
        this._buildLayout();
    }
    
    hideWelcomeMessage() {
        if (this.elements.welcomeMessage) {
            this.elements.welcomeMessage.style.display = 'none';
        }
    }
    
    showWelcomeMessage() {
        if (this.elements.welcomeMessage) {
            this.elements.welcomeMessage.style.display = 'block';
        }
    }

    getContainer() {
        return this.elements.container;
    }

    _buildLayout() {
        const { Utils } = this.dependencies;
        this.elements.container = Utils.createElement('div', {
            id: 'desktop-container',
            className: 'desktop-placeholder'
        });
        
        // Add a subtle welcome message for empty desktop
        this.elements.welcomeMessage = Utils.createElement('div', {
            className: 'desktop-welcome',
            style: 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--color-text-subtle); font-size: var(--font-size-lg); pointer-events: none; z-index: -1;',
            innerHTML: 'Right-click to create files and folders<br>Double-click icons to open them'
        });
        
        this.elements.container.appendChild(this.elements.welcomeMessage);
    }
}