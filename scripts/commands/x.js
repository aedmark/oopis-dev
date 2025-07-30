// scripts/commands/x.js
window.XCommand = class XCommand extends Command {
    constructor() {
        super({
            commandName: "x",
            dependencies: [
                "apps/desktop/desktop_ui.js",
                "apps/desktop/taskbar_ui.js",
                "apps/desktop/desktop_manager.js",
                "apps/desktop/taskbar_manager.js",
                "apps/desktop/window_manager.js",
            ],
            applicationModules: ["DesktopUI", "TaskbarUI", "TaskbarManager", "DesktopManager", "WindowManager", "App"],
            description: "Initializes the OopisX Graphical Desktop Environment.",
            helpText: `Usage: x
      Initializes and displays the OopisX desktop environment, transitioning
      the session from a purely command-line interface to a graphical one.`,
            validations: { args: { exact: 0 } },
        });
    }

    async coreLogic(context) {
        const { options, dependencies } = context;
        const { ErrorHandler, AppLayerManager, DesktopManager } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError("x: Can only be run in an interactive session.");
        }

        if (typeof DesktopManager === "undefined" || typeof AppLayerManager === "undefined") {
            return ErrorHandler.createError("x: Desktop application module is not loaded.");
        }

        // We need to inject all necessary modules now
        const desktopDependencies = {
            ...dependencies,
            DesktopUI: dependencies.DesktopUI,
            WindowManager: dependencies.WindowManager
        };

        AppLayerManager.show(new DesktopManager(), { dependencies: desktopDependencies });

        return ErrorHandler.createSuccess("");
    }
}
window.CommandRegistry.register(new XCommand());