// gem/scripts/apps/desktop/app_launcher.js
window.AppLauncher = class AppLauncher {
    constructor(windowManager, dependencies) {
        this.windowManager = windowManager;
        this.dependencies = dependencies;
        this.appRegistry = {
            'txt': { manager: 'EditorManager', files: ['apps/editor/editor_manager.js', 'apps/editor/editor_ui.js'] },
            'md': { manager: 'EditorManager', files: ['apps/editor/editor_manager.js', 'apps/editor/editor_ui.js'] },
            'sh': { manager: 'EditorManager', files: ['apps/editor/editor_manager.js', 'apps/editor/editor_ui.js'] },
            'js': { manager: 'EditorManager', files: ['apps/editor/editor_manager.js', 'apps/editor/editor_ui.js'] },
            'oopic': { manager: 'PaintManager', files: ['apps/paint/paint_manager.js', 'apps/paint/paint_ui.js'] },
            // We can add more file associations here!
        };
    }

    async launch(filePath) {
        const { Utils, FileSystemManager, CommandExecutor } = this.dependencies;
        const extension = Utils.getFileExtension(filePath);
        const appInfo = this.appRegistry[extension];

        if (!appInfo) {
            console.warn(`No application registered for extension: ${extension}`);
            // Fallback to the 'edit' command for unknown text files for now
            await CommandExecutor.processSingleCommand(`edit "${filePath}"`, { isInteractive: true });
            return;
        }

        // Load the necessary application scripts
        for (const file of appInfo.files) {
            await CommandExecutor._loadScript(file);
        }

        const AppManagerClass = window[appInfo.manager];
        if (!AppManagerClass) {
            console.error(`App manager class ${appInfo.manager} not found.`);
            return;
        }

        const pathInfo = FileSystemManager.validatePath(filePath, { expectedType: 'file' });
        if (!pathInfo.success) {
            console.error(`Could not read file: ${filePath}`);
            return;
        }

        // Create the window first
        const contentContainer = Utils.createElement('div', { className: 'app-content-container' });
        const windowId = this.windowManager.createWindow({
            title: filePath,
            contentElement: contentContainer,
            width: 800,
            height: 600
        });

        // Instantiate and launch the app *inside* the window's content area
        const appInstance = new AppManagerClass();
        const launchOptions = {
            ...this.dependencies,
            filePath: filePath,
            fileContent: pathInfo.data.node.content
        };
        appInstance.enter(contentContainer, { dependencies: launchOptions });
    }
}