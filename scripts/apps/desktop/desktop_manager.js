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

    enter(appLayer, options = {}) {
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

    exit() {
        if (!this.isActive) return;
        this.isActive = false;
        if (this.container) {
            this.container.remove();
        }
        this.dependencies.AppLayerManager.hide(this);
    }
}