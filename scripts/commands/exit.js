// scripts/commands/exit.js

window.ExitCommand = class ExitCommand extends Command {
    constructor() {
        super({
            commandName: "exit",
            description: "Exits the current shell or application.",
            helpText: `Usage: exit
      Exits the current interactive shell session.
      DESCRIPTION
      In a normal shell, 'exit' behaves like the 'logout' command,
      ending the current user's session.
      When used inside a script or application like 'basic' or 'chidi',
      it will close the application and return to the shell.`,
            validations: {
                args: {
                    exact: 0
                }
            },
        });
    }

    async coreLogic(context) {
        const { dependencies } = context;
        const { CommandExecutor, ErrorHandler } = dependencies;

        if (CommandExecutor.isInDreamatorium) {
            return ErrorHandler.createSuccess("You are in the Dreamatorium. Type 'exit' to return to reality.");
        }

        // In a real terminal, this would close the tab/window.
        // Here, it just acts as an alias for logout for the main shell.
        return CommandExecutor.processSingleCommand("logout", { isInteractive: true });
    }
}

window.CommandRegistry.register(new ExitCommand());