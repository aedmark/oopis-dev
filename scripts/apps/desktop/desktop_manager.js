// gem/scripts/apps/desktop/desktop_manager.js
window.DesktopManager = class DesktopManager extends App {
    constructor() {
        super();
        this.dependencies = {};
        this.ui = null;
        this.windowManager = null;
        this.iconManager = null;
        this.appLauncher = null;
        this.contextMenu = null;
        this.selectedIcons = new Set();
    }

    async enter(appLayer, options = {}) {
        if (this.isActive) return;
        this.isActive = true;
        this.dependencies = options.dependencies;

        const { WindowManager, DesktopUI, TaskbarManager, AppLauncher, IconManager } = this.dependencies;

        // 1. Create the Desktop UI and Taskbar
        this.ui = new DesktopUI({}, this.dependencies);
        this.container = this.ui.getContainer();
        appLayer.innerHTML = '';
        appLayer.appendChild(this.container);
        this.taskbarManager = new TaskbarManager(this.container, null, this.dependencies);

        // 2. Setup the Window Manager with callbacks for the Taskbar
        const windowEventCallbacks = {
            onWindowCreated: (id, title) => this.taskbarManager.addWindow(id, title),
            onWindowDestroyed: (id) => this.taskbarManager.removeWindow(id),
            onWindowFocused: (id) => this.taskbarManager.updateActiveWindow(id),
        };
        this.windowManager = new WindowManager(this.container, this.dependencies, windowEventCallbacks);
        this.taskbarManager.windowManager = this.windowManager;

        // 3. Initialize the App Launcher service
        this.appLauncher = new AppLauncher(this.windowManager, this.dependencies);

        // 4. Initialize the Icon Manager and load icons
        this.iconManager = new IconManager(this.container, this.dependencies, {
            onIconDoubleClick: (path) => this.appLauncher.launch(path),
            onIconClick: (path, element) => this._handleIconClick(path, element),
            onIconRightClick: (path, element, event) => this._handleIconRightClick(path, element, event)
        });
        this.iconManager.setDesktopUI(this.ui);

        // 5. Setup desktop context menu
        this._setupDesktopContextMenu();

        // 6. Setup keyboard shortcuts
        this._setupKeyboardShortcuts();

        // FIX: Ensure welcome files are created *before* loading icons
        await this._createWelcomeFiles();
        this.iconManager.loadIcons(); // Now this will find the files

        console.log("OopisX Desktop Environment with Icon support is now online.");
    }

    _setupDesktopContextMenu() {
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (e.target === this.container || e.target.classList.contains('desktop-placeholder')) {
                this._showDesktopContextMenu(e.clientX, e.clientY);
            }
        });

        this.container.addEventListener('click', (e) => {
            if (e.target === this.container || e.target.classList.contains('desktop-placeholder')) {
                this._clearSelection();
                this._hideContextMenu();
            }
        });
    }

    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            if (e.key === 'Delete' && this.selectedIcons.size > 0) {
                this._deleteSelectedIcons();
            } else if (e.key === 'F2' && this.selectedIcons.size === 1) {
                this._renameSelectedIcon();
            } else if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this._selectAllIcons();
            } else if (e.ctrlKey && e.altKey && e.key === 'x') {
                e.preventDefault();
                this.exit();
            }
        });
    }

    _handleIconClick(path, element) {
        if (!window.event || !window.event.ctrlKey) {
            this._clearSelection();
        }
        this._selectIcon(path, element);
    }

    _handleIconRightClick(path, element, event) {
        event.preventDefault();
        if (!this.selectedIcons.has(path)) {
            this._clearSelection();
            this._selectIcon(path, element);
        }
        this._showIconContextMenu(event.clientX, event.clientY, path);
    }

    _selectIcon(path, element) {
        this.selectedIcons.add(path);
        element.classList.add('selected');
    }

    _clearSelection() {
        this.selectedIcons.forEach(path => {
            const icon = this.iconManager.getIconByPath(path);
            if (icon) icon.element.classList.remove('selected');
        });
        this.selectedIcons.clear();
    }

    _selectAllIcons() {
        this._clearSelection();
        this.iconManager.icons.forEach(icon => {
            this._selectIcon(icon.data.path, icon.element);
        });
    }

    _showDesktopContextMenu(x, y) {
        const { ModalManager } = this.dependencies;
        const menuItems = [
            { label: 'New Folder', action: () => this._createNewFolder() },
            { label: 'New Text File', action: () => this._createNewFile('txt') },
            { label: 'New Drawing', action: () => this._createNewFile('oopic') },
            { separator: true },
            { label: 'Paste', action: () => this._pasteFiles(), disabled: !this._hasClipboard() },
            { separator: true },
            { label: 'Refresh', action: () => this._refreshDesktop() },
            { separator: true },
            { label: 'Exit Desktop', action: () => this.exit() }
        ];
        this._showContextMenu(menuItems, x, y);
    }

    _showIconContextMenu(x, y, path) {
        const menuItems = [
            { label: 'Open', action: () => this.appLauncher.launch(path) },
            { separator: true },
            { label: 'Cut', action: () => this._cutFiles() },
            { label: 'Copy', action: () => this._copyFiles() },
            { label: 'Delete', action: () => this._deleteSelectedIcons() },
            { separator: true },
            { label: 'Rename', action: () => this._renameSelectedIcon(), disabled: this.selectedIcons.size !== 1 }
        ];
        this._showContextMenu(menuItems, x, y);
    }

    _showContextMenu(items, x, y) {
        this._hideContextMenu();
        const { Utils } = this.dependencies;
        
        this.contextMenu = Utils.createElement('div', {
            className: 'desktop-context-menu',
            style: `position: fixed; left: ${x}px; top: ${y}px; z-index: 10000;`
        });

        items.forEach(item => {
            if (item.separator) {
                this.contextMenu.appendChild(Utils.createElement('div', { className: 'context-menu-separator' }));
            } else {
                const menuItem = Utils.createElement('div', {
                    className: `context-menu-item ${item.disabled ? 'disabled' : ''}`,
                    textContent: item.label
                });
                if (!item.disabled) {
                    menuItem.addEventListener('click', () => {
                        item.action();
                        this._hideContextMenu();
                    });
                }
                this.contextMenu.appendChild(menuItem);
            }
        });

        document.body.appendChild(this.contextMenu);
        
        // Hide menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', this._hideContextMenu.bind(this), { once: true });
        }, 0);
    }

    _hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    async _createNewFolder() {
        const { ModalManager } = this.dependencies;
        const name = await this._promptForName('New Folder', 'New Folder');
        if (name) {
            await this._executeCommand(`mkdir "${this._getDesktopPath()}/${name}"`);
            this._refreshDesktop();
        }
    }

    async _createNewFile(extension) {
        const { ModalManager } = this.dependencies;
        const name = await this._promptForName('New File', `New File.${extension}`);
        if (name) {
            const fullName = name.endsWith(`.${extension}`) ? name : `${name}.${extension}`;
            await this._executeCommand(`touch "${this._getDesktopPath()}/${fullName}"`);
            this._refreshDesktop();
        }
    }

    async _deleteSelectedIcons() {
        if (this.selectedIcons.size === 0) return;
        
        const { ModalManager } = this.dependencies;
        const confirmed = await new Promise(resolve => {
            ModalManager.request({
                context: 'graphical',
                messageLines: [`Delete ${this.selectedIcons.size} item(s)?`],
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });

        if (confirmed) {
            for (const path of this.selectedIcons) {
                await this._executeCommand(`rm -rf "${path}"`);
            }
            this._refreshDesktop();
        }
    }

    async _renameSelectedIcon() {
        if (this.selectedIcons.size !== 1) return;
        
        const path = Array.from(this.selectedIcons)[0];
        const currentName = path.split('/').pop();
        const newName = await this._promptForName('Rename', currentName);
        
        if (newName && newName !== currentName) {
            const newPath = path.replace(currentName, newName);
            await this._executeCommand(`mv "${path}" "${newPath}"`);
            this._refreshDesktop();
        }
    }

    _copyFiles() {
        // Store selected files in a simple clipboard
        this.clipboard = { action: 'copy', files: Array.from(this.selectedIcons) };
    }

    _cutFiles() {
        this.clipboard = { action: 'cut', files: Array.from(this.selectedIcons) };
    }

    async _pasteFiles() {
        if (!this.clipboard) return;
        
        const desktopPath = this._getDesktopPath();
        for (const file of this.clipboard.files) {
            const fileName = file.split('/').pop();
            const targetPath = `${desktopPath}/${fileName}`;
            
            if (this.clipboard.action === 'copy') {
                await this._executeCommand(`cp -r "${file}" "${targetPath}"`);
            } else {
                await this._executeCommand(`mv "${file}" "${targetPath}"`);
            }
        }
        
        if (this.clipboard.action === 'cut') {
            this.clipboard = null;
        }
        this._refreshDesktop();
    }

    _hasClipboard() {
        return this.clipboard && this.clipboard.files.length > 0;
    }

    _refreshDesktop() {
        this.iconManager.clearIcons();
        this.iconManager.loadIcons();
        this._clearSelection();
    }

    async _promptForName(title, defaultValue) {
        const { ModalManager } = this.dependencies;
        return new Promise(resolve => {
            ModalManager.request({
                context: 'graphical',
                type: 'input',
                messageLines: [title + ':'],
                placeholder: defaultValue,
                onConfirm: (value) => resolve(value.trim()),
                onCancel: () => resolve(null)
            });
        });
    }

    async _executeCommand(command) {
        const { CommandExecutor } = this.dependencies;
        return await CommandExecutor.processSingleCommand(command, { isInteractive: false });
    }

    _getDesktopPath() {
        const { UserManager } = this.dependencies;
        const currentUser = UserManager.getCurrentUser().name;
        return `/home/${currentUser}/Desktop`;
    }

    async _createWelcomeFiles() {
        const { FileSystemManager, UserManager, CommandExecutor } = this.dependencies;
        const currentUser = UserManager.getCurrentUser().name;
        const desktopPath = `/home/${currentUser}/Desktop`;

        const desktopNode = FileSystemManager.getNodeByPath(desktopPath);
        if (desktopNode && Object.keys(desktopNode.children).length === 0) {
            // Desktop is empty, let's create some files!
            const welcomeContent = `Welcome to OopisX, the graphical user interface for OopisOS!\n\n- You can drag these icons around.\n- Double-click them to open applications.\n- Right-click the desktop to create new files or folders.\n- Use Ctrl+A to select all, Delete to delete, F2 to rename.`;
            const welcomePath = `${desktopPath}/Welcome.txt`;
            await CommandExecutor.processSingleCommand(`echo "${welcomeContent}" > "${welcomePath}"`, { isInteractive: false });

            const paintPath = `${desktopPath}/My Drawing.oopic`;
            await CommandExecutor.processSingleCommand(`touch "${paintPath}"`, { isInteractive: false });
        }
    }

    exit() {
        if (!this.isActive) return;
        this.isActive = false;
        if (this.container) {
            this.container.remove();
        }
        this.dependencies.AppLayerManager.hide(this);
    }
}