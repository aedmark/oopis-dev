// scripts/commands/cp.js

/**
 * @fileoverview This file defines the 'cp' command, a utility for copying files and directories
 * within the OopisOS virtual file system, with support for recursive and interactive options.
 * @module commands/cp
 */

/**
 * Represents the 'cp' (copy) command.
 * @class CpCommand
 * @extends Command
 */
window.CpCommand = class CpCommand extends Command {
    /**
     * @constructor
     */
    constructor() {
        super({
            commandName: "cp",
            description: "Copies files and directories.",
            helpText: `Usage: cp [OPTION]... <source> <destination>
      cp [OPTION]... <source>... <directory>
      Copy files and directories.
      DESCRIPTION
      In the first form, the cp utility copies the contents of the <source>
      file to the <destination> file.
      In the second form, each <source> file is copied to the destination
      <directory>. The destination must be a directory and must exist.
      Copying a directory requires the -r or -R (recursive) option.
      OPTIONS
      -f, --force
      If a destination file cannot be opened, remove it and try
      again. Overwrites existing files without prompting.
      -i, --interactive
      Prompt before overwriting an existing file.
      -p, --preserve
      Preserve the original file's mode, owner, group, and
      modification time.
      -r, -R, --recursive
      Copy directories recursively.
      BRACE EXPANSION
      The shell supports brace expansion before passing arguments to cp:
      {a,b,c}    Comma expansion - operates on multiple files
      {1..10}    Sequence expansion - numeric ranges
      {a..z}     Sequence expansion - alphabetic ranges
      EXAMPLES
      cp file1.txt file2.txt
      Copies the content of file1.txt to file2.txt.
      cp -i notes.txt /home/Guest/docs/
      Copies 'notes.txt' to the docs directory, prompting if a
      file with the same name exists.
      cp -r project/ backup/
      Recursively copies the entire 'project' directory into the
      'backup' directory.
      cp file{,.bak}
      Creates a backup copy: expands to 'cp file file.bak'.
      cp {doc1,doc2,doc3}.txt backup/
      Copies doc1.txt, doc2.txt, and doc3.txt to backup directory.`,
            completionType: "paths",
            flagDefinitions: [
                { name: "recursive", short: "-r", long: "--recursive", aliases: ["-R"] },
                { name: "force", short: "-f", long: "--force" },
                { name: "preserve", short: "-p", long: "--preserve" },
                { name: "interactive", short: "-i", long: "--interactive" },
            ],
            argValidation: {
                min: 2,
                error:
                    "Usage: cp [OPTION]... <source> <destination> or cp [OPTION]... <source>... <directory>",
            },
        });
    }

    /**
     * Executes the core logic of the 'cp' command.
     * It prepares an operation plan, handles user confirmations for overwrites,
     * and then executes the copy operations, either for single files or recursively for directories.
     * @param {object} context - The command execution context.
     * @returns {Promise<object>} A promise that resolves with a success or error object from the ErrorHandler.
     */
    async coreLogic(context) {
        const { args, flags, currentUser, options, dependencies } = context;
        const {
            FileSystemManager,
            ErrorHandler,
            ModalManager,
            OutputManager,
            UserManager,
            Config
        } = dependencies;
        const nowISO = new Date().toISOString();
        let anyChangesMade = false;

        const destPathArg = args.pop();
        const sourcePathArgs = args;

        const planResult = await FileSystemManager.prepareFileOperation(
            sourcePathArgs,
            destPathArg,
            { isCopy: true }
        );

        if (!planResult.success) {
            return ErrorHandler.createError(`cp: ${planResult.error}`);
        }

        const operationsPlan = planResult.data;

        for (const operation of operationsPlan) {
            if (operation.sourceAbsPath === operation.destinationAbsPath) {
                continue;
            }

            if (
                operation.willOverwrite &&
                (flags.interactive || (options.isInteractive && !flags.force))
            ) {
                const confirmed = await new Promise((resolve) => {
                    ModalManager.request({
                        context: "terminal",
                        type: "confirm",
                        messageLines: [`Overwrite '${operation.destinationAbsPath}'?`],
                        onConfirm: () => resolve(true),
                        onCancel: () => resolve(false),
                        options,
                    });
                });
                if (!confirmed) {
                    continue;
                }
            }

            const destParentFullPath =
                operation.destinationAbsPath.substring(
                    0,
                    operation.destinationAbsPath.lastIndexOf("/")
                ) || "/";
            const copyResult = await _executeCopyInternal(
                operation.sourceNode,
                operation.destinationParentNode,
                operation.finalName,
                destParentFullPath
            );
            if (!copyResult.success) {
                return copyResult;
            }
            if (copyResult.data.changed) {
                anyChangesMade = true;
            }
        }

        return ErrorHandler.createSuccess("", {
            stateModified: anyChangesMade,
        });

        /**
         * The internal recursive function that performs the actual copy operation.
         * @param {object} sourceNode - The source file or directory node to copy.
         * @param {object} destinationParentNode - The node of the directory to copy into.
         * @param {string} finalName - The name for the new file or directory.
         * @param {string} destParentFullPath - The absolute path of the destination directory.
         * @returns {Promise<object>} A promise resolving to a success or error object.
         */
        async function _executeCopyInternal(
            sourceNode,
            destinationParentNode,
            finalName,
            destParentFullPath
        ) {
            if (sourceNode.type === "file") {
                const newFilePath = FileSystemManager.getAbsolutePath(
                    finalName,
                    destParentFullPath
                );

                const createResult = await FileSystemManager.createOrUpdateFile(
                    newFilePath,
                    sourceNode.content,
                    {
                        currentUser: flags.preserve ? sourceNode.owner : currentUser,
                        primaryGroup: flags.preserve
                            ? sourceNode.group
                            : UserManager.getPrimaryGroupForUser(currentUser),
                    }
                );

                if (!createResult.success) {
                    return createResult;
                }
                const newNode = FileSystemManager.getNodeByPath(newFilePath);
                if (flags.preserve) {
                    newNode.mode = sourceNode.mode;
                    newNode.mtime = sourceNode.mtime;
                }
            } else if (sourceNode.type === "directory") {
                if (!flags.recursive) {
                    return ErrorHandler.createError({
                        message: `omitting directory '${finalName}'`,
                        suggestion: "Use the -r or -R flag to copy directories.",
                    });
                }

                const newDirNode = FileSystemManager._createNewDirectoryNode(
                    flags.preserve ? sourceNode.owner : currentUser,
                    flags.preserve
                        ? sourceNode.group
                        : UserManager.getPrimaryGroupForUser(currentUser),
                    flags.preserve
                        ? sourceNode.mode
                        : Config.FILESYSTEM.DEFAULT_DIR_MODE
                );
                if (flags.preserve) newDirNode.mtime = sourceNode.mtime;
                destinationParentNode.children[finalName] = newDirNode;

                for (const childName in sourceNode.children) {
                    const childResult = await _executeCopyInternal(
                        sourceNode.children[childName],
                        newDirNode,
                        childName,
                        FileSystemManager.getAbsolutePath(finalName, destParentFullPath)
                    );
                    if (!childResult.success) return childResult;
                }
            }
            destinationParentNode.mtime = nowISO;
            return ErrorHandler.createSuccess({ changed: true });
        }
    }
}

window.CommandRegistry.register(new CpCommand());