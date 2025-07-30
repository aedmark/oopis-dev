// gem/scripts/apps/desktop/desktop_ui.js
window.DesktopUI = class DesktopUI {
    constructor(callbacks, dependencies) {
        this.callbacks = callbacks;
        this.dependencies = dependencies;
        this.elements = {};
        this._buildLayout();
    }

    getContainer() {
        return this.elements.container;
    }

    _buildLayout() {
        const { Utils } = this.dependencies;
        this.elements.container = Utils.createElement('div', {
            id: 'desktop-container',
            className: 'desktop-placeholder' // We can reuse this style for now
        });
    }
}