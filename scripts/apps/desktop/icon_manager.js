// gem/scripts/apps/desktop/icon_manager.js
window.IconManager = class IconManager {
    constructor(desktopContainer, dependencies, callbacks) {
        this.desktopContainer = desktopContainer;
        this.dependencies = dependencies;
        this.callbacks = callbacks;
        this.ui = new this.dependencies.IconUI({
            onDoubleClick: (path) => this.callbacks.onIconDoubleClick(path)
        }, this.dependencies);
        this.icons = [];
    }

    async loadIcons() {
        const { FileSystemManager, UserManager } = this.dependencies;
        const currentUser = UserManager.getCurrentUser().name;
        const desktopPath = `/home/${currentUser}/Desktop`;

        // Ensure the Desktop directory exists
        const pathInfo = FileSystemManager.validatePath(desktopPath, { allowMissing: true });
        if (!pathInfo.data.node) {
            await this.dependencies.CommandExecutor.processSingleCommand(`mkdir -p ${desktopPath}`, { isInteractive: false });
        }

        const desktopNode = FileSystemManager.getNodeByPath(desktopPath);
        if (desktopNode && desktopNode.children) {
            Object.keys(desktopNode.children).forEach(name => {
                const fullPath = `${desktopPath}/${name}`;
                const iconData = { name, path: fullPath };
                const iconElement = this.ui.createIcon(iconData);
                this.desktopContainer.appendChild(iconElement);
                this.icons.push({ element: iconElement, data: iconData });
            });
        }
        this.arrangeIcons();
    }

    arrangeIcons() {
        // Simple grid layout for now
        const PADDING = 20;
        const ICON_WIDTH = 80;
        const ICON_HEIGHT = 90;
        const containerWidth = this.desktopContainer.clientWidth;
        const cols = Math.floor((containerWidth - PADDING) / ICON_WIDTH);

        this.icons.forEach((icon, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            icon.element.style.left = `${PADDING + col * ICON_WIDTH}px`;
            icon.element.style.top = `${PADDING + row * ICON_HEIGHT}px`;
        });
    }
}