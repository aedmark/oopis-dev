// scripts/commands/clearfs.js
window.ClearfsCommand = class ClearfsCommand extends Command {
    constructor() {
        super({
            commandName: "clearfs",
            description: "Clears the current user's home directory of all contents.",
            helpText: `Usage: clearfs
      Clears the current user's home directory of all contents.
      DESCRIPTION
      The clearfs command permanently removes all files and subdirectories
      within the current user's home directory (e.g., /home/Guest),
      effectively resetting it to an empty state.
      This command only affects the home directory of the user who runs it.
      It does not affect other parts of the file system.
      WARNING
      This operation is irreversible. All data within your home
      directory will be permanently lost. The command will prompt for
      confirmation before proceeding.`,
            argValidation: {
                exact: 0,
            },
        });
    }

    async coreLogic(context) {
        const { options, currentUser, dependencies } = context;
        const {
            ModalManager,
            ErrorHandler,
            FileSystemManager,
            Config,
            TerminalUI,
            OutputManager,
        } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError(
                "clearfs: Can only be run in interactive mode."
            );
        }

        const username = currentUser;
        const userHomePath = `/home/${username}`;

        const confirmed = await new Promise((resolve) =>
            ModalManager.request({
                context: "terminal",
                messageLines: [
                    `WARNING: This will permanently erase ALL files and directories in your home directory (${userHomePath}).`,
                    "This action cannot be undone.",
                    "Are you sure you want to clear your home directory?",
                ],
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
                options,
            })
        );

        if (!confirmed) {
            return ErrorHandler.createSuccess(
                `Home directory clear for '${username}' cancelled. No action taken.`
            );
        }

        const homeDirNode = FileSystemManager.getNodeByPath(userHomePath);

        if (
            !homeDirNode ||
            homeDirNode.type !== Config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE
        ) {
            return ErrorHandler.createError(
                `clearfs: Critical error - Could not find home directory for '${username}' at '${userHomePath}'.`
            );
        }

        homeDirNode.children = {};
        homeDirNode.mtime = new Date().toISOString();

        const currentPath = FileSystemManager.getCurrentPath();
        if (currentPath.startsWith(userHomePath)) {
            FileSystemManager.setCurrentPath(userHomePath);
        }

        TerminalUI.updatePrompt();
        OutputManager.clearOutput();

        const successMessage = `Home directory for user '${username}' has been cleared.`;
        await OutputManager.appendToOutput(successMessage, {
            typeClass: Config.CSS_CLASSES.SUCCESS_MSG,
        });

        return ErrorHandler.createSuccess("", { stateModified: true });
    }
}
window.CommandRegistry.register(new ClearfsCommand());