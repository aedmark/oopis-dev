// scripts/apps/mxml_converter/mxml_converter_ui.js
window.MusicXMLConverterUI = class MusicXMLConverterUI {
    constructor(initialState, callbacks, dependencies) {
        this.elements = {};
        this.callbacks = callbacks;
        this.dependencies = dependencies;
        this._buildLayout(initialState);
    }

    getContainer() {
        return this.elements.container;
    }

    _buildLayout(initialState) {
        const { Utils, UIComponents } = this.dependencies;
        const appWindow = UIComponents.createAppWindow('MusicXML Converter', this.callbacks.onExit);
        this.elements.container = appWindow.container;
        this.elements.main = appWindow.main;
        this.elements.footer = appWindow.footer;

        const inputFileLabel = Utils.createElement('p', { textContent: `Input: ${initialState.inputFile.path}` });
        const outputFileLabel = Utils.createElement('p', { textContent: `Output: ${initialState.outputFile || initialState.inputFile.path.replace('.musicxml', '.sh')}` });

        this.elements.convertBtn = UIComponents.createButton({
            text: "Convert to Script",
            onClick: this.callbacks.onConvert,
            classes: ['btn--confirm']
        });

        this.elements.statusLabel = Utils.createElement('p', { id: 'mxml-status', textContent: `Status: ${initialState.status}` });

        const content = Utils.createElement('div', { style: { padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' } },
            inputFileLabel,
            outputFileLabel,
            this.elements.convertBtn,
            this.elements.statusLabel
        );

        this.elements.main.appendChild(content);
    }

    updateStatus(message) {
        if (this.elements.statusLabel) {
            this.elements.statusLabel.textContent = `Status: ${message}`;
        }
    }

    hideAndReset() {
        this.elements = {};
        this.callbacks = {};
    }
}