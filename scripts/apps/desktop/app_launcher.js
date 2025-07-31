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
            'json': { manager: 'EditorManager', files: ['apps/editor/editor_manager.js', 'apps/editor/editor_ui.js'] },
            'html': { manager: 'EditorManager', files: ['apps/editor/editor_manager.js', 'apps/editor/editor_ui.js'] },
            'css': { manager: 'EditorManager', files: ['apps/editor/editor_manager.js', 'apps/editor/editor_ui.js'] },
            'bas': { manager: 'BasicManager', files: ['apps/basic/basic_manager.js', 'apps/basic/basic_ui.js', 'apps/basic/basic_interp.js'] },
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
            // For unknown files, try to determine if it's a directory
            const pathInfo = FileSystemManager.validatePath(filePath, { allowMissing: false });
            if (pathInfo.success && pathInfo.data.node.type === 'directory') {
                // Launch file explorer for directories
                await CommandExecutor.processSingleCommand(`explore "${filePath}"`, { isInteractive: true });
            } else {
                // Fallback to the 'edit' command for unknown text files
                await CommandExecutor.processSingleCommand(`edit "${filePath}"`, { isInteractive: true });
            }
            return;
        }

        console.log(`Launching ${appInfo.manager} for file: ${filePath}`);
        
        // Load the necessary application scripts
        for (const file of appInfo.files) {
            console.log(`Loading script: ${file}`);
            await CommandExecutor._loadScript(file);
        }

        const AppManagerClass = window[appInfo.manager];
        if (!AppManagerClass) {
            console.error(`App manager class ${appInfo.manager} not found.`);
            return;
        }
        
        // Make UI classes available in dependencies
        const uiClassName = appInfo.manager.replace('Manager', 'UI');
        const UIClass = window[uiClassName];
        if (!UIClass) {
            console.error(`UI class ${uiClassName} not found.`);
            return;
        }

        const pathInfo = FileSystemManager.validatePath(filePath, { expectedType: 'file' });
        if (!pathInfo.success) {
            console.error(`Could not read file: ${filePath}`, pathInfo.error);
            return;
        }
        
        console.log(`File content length: ${pathInfo.data.node.content?.length || 0}`);
        console.log(`File content preview: "${pathInfo.data.node.content?.substring(0, 50)}..."`);

        // Create the window first
        const contentContainer = Utils.createElement('div', { className: 'app-content-container' });
        const fileName = filePath.split('/').pop();
        const windowId = this.windowManager.createWindow({
            title: `${fileName} - ${appInfo.manager.replace('Manager', '')}`,
            contentElement: contentContainer,
            width: 800,
            height: 600
        });

        // Create a windowed app layer manager that handles window closing
        const windowedAppLayerManager = {
            hide: (app) => {
                this.windowManager.closeWindow(windowId);
            }
        };

        // Instantiate and launch the app *inside* the window's content area
        const appInstance = new AppManagerClass();
        const launchOptions = {
            ...this.dependencies,
            [uiClassName]: UIClass, // Add the UI class to dependencies
            AppLayerManager: windowedAppLayerManager, // Override with windowed version
            filePath: filePath,
            fileContent: pathInfo.data.node.content,
            isWindowed: true // Flag to indicate windowed mode
        };
        
        console.log(`Launching app with options:`, { filePath, contentLength: pathInfo.data.node.content?.length });
        
        // Store app instance for cleanup
        this.windowManager.setWindowData(windowId, { appInstance });
        
        try {
            // Pass file data directly for windowed apps, not nested in dependencies
            const appOptions = {
                dependencies: launchOptions,
                filePath: filePath,
                fileContent: pathInfo.data.node.content
            };
            appInstance.enter(contentContainer, appOptions);
            console.log(`App ${appInfo.manager} launched successfully`);
        } catch (error) {
            console.error(`Error launching app ${appInfo.manager}:`, error);
        }
    }
}