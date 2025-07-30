// gem/scripts/apps/desktop/desktop_manager.js
window.DesktopManager = class DesktopManager extends App {
    constructor() {
        super();
        this.dependencies = {};
        this.ui = null;
        this.windowManager = null;
    }

    enter(appLayer, options = {}) {
        if (this.isActive) return;
        this.isActive = true;
        this.dependencies = options.dependencies;

        const { WindowManager, DesktopUI, TaskbarManager } = this.dependencies;

        this.ui = new DesktopUI({}, this.dependencies);
        this.container = this.ui.getContainer();

        appLayer.innerHTML = '';
        appLayer.appendChild(this.container);

        // Instantiate the TaskbarManager first
        this.taskbarManager = new TaskbarManager(this.container, null, this.dependencies);

        // Define the callbacks that link the WindowManager to the TaskbarManager
        const windowEventCallbacks = {
            onWindowCreated: (id, title) => this.taskbarManager.addWindow(id, title),
            onWindowDestroyed: (id) => this.taskbarManager.removeWindow(id),
            onWindowFocused: (id) => this.taskbarManager.updateActiveWindow(id),
        };

        // Pass the callbacks when creating the WindowManager
        this.windowManager = new WindowManager(this.container, this.dependencies, windowEventCallbacks);

        // Now give the TaskbarManager a reference to the fully-initialized WindowManager
        this.taskbarManager.windowManager = this.windowManager;

        // Create a test window to prove it all works
        const welcomeContent = this.dependencies.Utils.createElement('div', {
            innerHTML: '<h3>It Works!</h3><p>The Window Manager now notifies the Taskbar Manager when windows are created or focused. Check out the new taskbar at the bottom!</p>'
        });

        this.windowManager.createWindow({
            title: "Phase 3 Complete",
            contentElement: welcomeContent,
            width: 450,
            height: 220
        });

        console.log("OopisX Taskbar is now online.");
    }

    exit() {
        if (!this.isActive) return;
        this.isActive = false;
        // In the future, we'll need to properly close all open windows here
        if (this.container) {
            this.container.remove();
        }
        this.dependencies.AppLayerManager.hide(this);
    }
}