// gem/scripts/apps/desktop/icon_ui.js
window.IconUI = class IconUI {
    constructor(callbacks, dependencies) {
        this.callbacks = callbacks;
        this.dependencies = dependencies;
    }

    createIcon(fileData) {
        const { Utils } = this.dependencies;
        const iconChar = this._getIconForFile(fileData.name);

        const iconImg = Utils.createElement('div', { className: 'desktop-icon__image', textContent: iconChar });
        const iconLabel = Utils.createElement('span', { className: 'desktop-icon__label', textContent: fileData.name });
        const iconDiv = Utils.createElement('div', {
            className: 'desktop-icon',
            'data-path': fileData.path,
            title: fileData.path
        }, [iconImg, iconLabel]);

        iconDiv.addEventListener('dblclick', () => this.callbacks.onDoubleClick(fileData.path));

        // Basic drag logic will be added in a later stage.

        return iconDiv;
    }

    _getIconForFile(fileName) {
        const { Utils } = this.dependencies;
        const ext = Utils.getFileExtension(fileName);
        switch (ext) {
            case 'txt': case 'md': return '📄';
            case 'oopic': return '🎨';
            case 'sh': case 'js': return '📜';
            case 'json': return '{}';
            default: return '❔';
        }
    }
}