// gem/scripts/apps/desktop/desktop_manager.js
window.DesktopManager = class DesktopManager extends App {
    constructor() {
        super();
        this.dependencies = {};
        this.ui = null;
        this.windowManager = null;
        this.iconManager = null;
        this.appLauncher = null;
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
            onIconDoubleClick: (path) => this.appLauncher.launch(path)
        });
        this.iconManager.loadIcons(); // Asynchronously load and display icons

        console.log("OopisX Desktop Environment with Icon support is now online.");
    }

    async _createWelcomeFiles() {
        const { FileSystemManager, UserManager, CommandExecutor } = this.dependencies;
        const currentUser = UserManager.getCurrentUser().name;
        const desktopPath = `/home/${currentUser}/Desktop`;

        const desktopNode = FileSystemManager.getNodeByPath(desktopPath);
        if (desktopNode && Object.keys(desktopNode.children).length === 0) {
            // Desktop is empty, let's create some files!
            const welcomeContent = `Welcome to OopisX, the graphical user interface for OopisOS!\n\n- You can drag these icons around.\n- Double-click them to open applications.\n- Right-click the desktop to create new files or folders.`;
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