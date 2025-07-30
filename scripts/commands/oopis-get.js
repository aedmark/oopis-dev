// scripts/commands/oopis-get.js
window.OopisGetCommand = class OopisGetCommand extends Command {
    constructor() {
        super({
            commandName: "oopis-get",
            description: "Manages OopisOS packages from a central repository.",
            helpText: `Usage: oopis-get <sub-command> [options]
      The primary interface for all package management tasks.

      SUB-COMMANDS:
        list               Displays all available packages.
        install <pkg_name> Downloads and installs a package.
        update             Refreshes the local cache of the package manifest.
        remove <pkg_name>  Deletes a package from the system.`,
        });

        // The central, trusted source for all our wonderful community add-ons!
        this.REPO_URL = "https://raw.githubusercontent.com/aedmark/OopisOS-Packages/blob/main/";
        this.MANIFEST_FILE = "packages.json";
        this.TEMP_MANIFEST_PATH = "/tmp/packages.json";
    }

    async coreLogic(context) {
        const { args, dependencies } = context;
        const { ErrorHandler, CommandExecutor } = dependencies;
        const subCommand = args[0];

        if (!subCommand) {
            return ErrorHandler.createError("oopis-get: missing sub-command. See 'help oopis-get'.");
        }

        // Before any operation, let's make sure our temporary workspace exists.
        await CommandExecutor.processSingleCommand("mkdir -p /tmp", { isInteractive: false });

        switch (subCommand.toLowerCase()) {
            case "list":
                return this._handleList(context);
            case "install":
                return this._handleInstall(context);
            case "update":
                return this._handleUpdate(context);
            case "remove":
                return this._handleRemove(context);
            default:
                return ErrorHandler.createError(`oopis-get: unknown sub-command '${subCommand}'.`);
        }
    }

    async _fetchAndParseManifest(dependencies) {
        const { CommandExecutor, ErrorHandler } = dependencies;

        const wgetResult = await CommandExecutor.processSingleCommand(
            `wget -O ${this.TEMP_MANIFEST_PATH} ${this.REPO_URL}${this.MANIFEST_FILE}`,
            { isInteractive: false }
        );
        if (!wgetResult.success) {
            return { error: `could not fetch package list. ${wgetResult.error}` };
        }

        const catResult = await CommandExecutor.processSingleCommand(
            `cat ${this.TEMP_MANIFEST_PATH}`,
            { isInteractive: false }
        );
        await CommandExecutor.processSingleCommand(`rm ${this.TEMP_MANIFEST_PATH}`, { isInteractive: false });

        if (!catResult.success) {
            return { error: `could not read package manifest. ${catResult.error}` };
        }

        try {
            const manifest = JSON.parse(catResult.output);
            return { manifest };
        } catch (e) {
            return { error: "failed to parse package manifest." };
        }
    }

    async _handleList(context) {
        const { dependencies } = context;
        const { ErrorHandler, OutputManager } = dependencies;

        await OutputManager.appendToOutput("Fetching package list from repository...");

        const result = await this._fetchAndParseManifest(dependencies);
        if (result.error) {
            return ErrorHandler.createError(`oopis-get: ${result.error}`);
        }

        let output = "Available Packages:\n";
        result.manifest.packages.forEach(pkg => {
            output += `  ${pkg.name.padEnd(20)} - ${pkg.description}\n`;
        });
        return ErrorHandler.createSuccess(output);
    }

    async _handleInstall(context) {
        const { args, dependencies } = context;
        const { CommandExecutor, CommandRegistry, ErrorHandler, OutputManager } = dependencies;
        const packageName = args[1];

        if (!packageName) {
            return ErrorHandler.createError("oopis-get: install requires a package name.");
        }

        await OutputManager.appendToOutput(`Attempting to install '${packageName}'...`);

        const result = await this._fetchAndParseManifest(dependencies);
        if (result.error) {
            return ErrorHandler.createError(`oopis-get: ${result.error}`);
        }

        const pkg = result.manifest.packages.find(p => p.name === packageName);
        if (!pkg) {
            return ErrorHandler.createError(`oopis-get: package not found: ${packageName}`);
        }

        const installPath = `/bin/${pkg.name}`;
        const downloadUrl = `${this.REPO_URL}${pkg.path}`;

        await OutputManager.appendToOutput(`Downloading from ${downloadUrl}...`);
        const downloadResult = await CommandExecutor.processSingleCommand(
            `wget -O ${installPath} ${downloadUrl}`,
            { isInteractive: false }
        );

        if (!downloadResult.success) {
            return ErrorHandler.createError(`oopis-get: failed to download package. ${downloadResult.error}`);
        }

        await OutputManager.appendToOutput("Setting permissions...");
        const chmodResult = await CommandExecutor.processSingleCommand(
            `chmod 755 ${installPath}`,
            { isInteractive: false }
        );

        if (!chmodResult.success) {
            return ErrorHandler.createError(`oopis-get: failed to set permissions. ${chmodResult.error}`);
        }

        // Dynamically update the system to recognize the new command
        CommandRegistry.addCommandToManifest(pkg.name);

        return ErrorHandler.createSuccess(`Successfully installed '${packageName}'.`);
    }

    async _handleUpdate(context) {
        return context.dependencies.ErrorHandler.createSuccess("Placeholder: update sub-command reached.");
    }

    async _handleRemove(context) {
        const { args, dependencies } = context;
        const { CommandExecutor, CommandRegistry, FileSystemManager, ErrorHandler, OutputManager } = dependencies;
        const packageName = args[1];

        if (!packageName) {
            return ErrorHandler.createError("oopis-get: remove requires a package name.");
        }

        const packagePath = `/bin/${packageName}`;

        // Verify the package file actually exists before trying to remove it.
        const pathValidation = FileSystemManager.validatePath(packagePath, { allowMissing: true });
        if (!pathValidation.data.node) {
            return ErrorHandler.createError(`oopis-get: package '${packageName}' is not installed.`);
        }

        await OutputManager.appendToOutput(`Removing '${packageName}'...`);
        const rmResult = await CommandExecutor.processSingleCommand(
            `rm ${packagePath}`,
            { isInteractive: false }
        );

        if (!rmResult.success) {
            return ErrorHandler.createError(`oopis-get: failed to remove package file. ${rmResult.error}`);
        }

        // Dynamically unregister the command so the system no longer knows about it.
        CommandRegistry.unregisterCommand(packageName);

        return ErrorHandler.createSuccess(`Successfully removed '${packageName}'.`);
    }
};
window.CommandRegistry.register(new OopisGetCommand());