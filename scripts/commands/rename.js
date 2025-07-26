// scripts/commands/rename.js
window.RenameCommand = class RenameCommand extends Command {
    constructor() {
        super({
            commandName: "rename",
            description: "Renames a file or directory.",
            helpText: `Usage: rename <old_name> <new_name>
      Rename a file or directory in the current location.
      DESCRIPTION
      The rename command changes the name of a single file or directory
      from <old_name> to <new_name>. It is a safer, more explicit
      alternative to 'mv' for renaming operations, as it will not
      move the file to a different directory.
      Both <old_name> and <new_name> must be in the same directory.
      EXAMPLES
      rename report-draft.txt report-final.txt
      Renames the draft report to its final name.
      rename ./images ./pictures
      Renames the 'images' directory to 'pictures'.`,
            completionType: "paths",
            validations: {
                args: {
                    exact: 2,
                    error: "Usage: rename <old_name> <new_name>"
                },
                paths: [{
                    argIndex: 0,
                    options: {
                        allowMissing: false
                    }
                }]
            },
        });
    }

    async coreLogic(context) {
        const { args, validatedPaths, dependencies } = context;
        const { FileSystemManager, ErrorHandler } = dependencies;

        const oldName = args[0];
        const newName = args[1];
        const { node: sourceNode, resolvedPath: sourcePath } = validatedPaths[0];

        // 1. Safety First! Check if newName contains a path
        if (newName.includes(FileSystemManager.config.FILESYSTEM.PATH_SEPARATOR)) {
            return ErrorHandler.createError(
                `rename: Invalid new name. Use 'mv' to move files to a different directory.`
            );
        }

        // 2. Determine the full path for the new name
        const parentPath = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '/';
        const newPath = FileSystemManager.getAbsolutePath(newName, parentPath);

        // 3. Check if a file with the new name already exists
        if (FileSystemManager.getNodeByPath(newPath)) {
            return ErrorHandler.createError(
                `rename: cannot rename '${oldName}' to '${newName}': File exists`
            );
        }

        // 4. Construct arguments for 'mv' and execute
        // We can reuse the powerful logic we already built for 'mv'!
        const mvResult = await dependencies.CommandExecutor.processSingleCommand(
            `mv "${sourcePath}" "${newPath}"`, { isInteractive: false }
        );

        if (mvResult.success) {
            return ErrorHandler.createSuccess("", { stateModified: true });
        } else {
            // Pass the error from 'mv' up to the user
            return ErrorHandler.createError(`rename: ${mvResult.error}`);
        }
    }
}
window.CommandRegistry.register(new RenameCommand());
