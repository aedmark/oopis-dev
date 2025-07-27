// gem/scripts/commands/patch.js
window.PatchCommand = class PatchCommand extends Command {
    constructor() {
        super({
            commandName: "patch",
            description: "Applies a diff file to a target file.",
            helpText: `Usage: patch <target_file> <patch_file>
      Applies a patch to a file.
      DESCRIPTION
      The patch command takes a patch file (usually created with the
      'diff' command) and applies the changes to a target file.
      It's a powerful tool for applying updates to text-based files
      without having to replace the entire file.
      WARNING
      This command directly modifies the target file. It is recommended
      to have a backup of the target file before applying a patch.`,
            completionType: "paths",
            validations: {
                args: {
                    exact: 2,
                    error: "Usage: patch <target_file> <patch_file>"
                },
                paths: [{
                    argIndex: 0,
                    options: {
                        expectedType: 'file',
                        permissions: ['read', 'write']
                    }
                }, {
                    argIndex: 1,
                    options: {
                        expectedType: 'file',
                        permissions: ['read']
                    }
                }]
            },
        });
    }

    /**
     * Parses a unified diff format string into an array of hunk objects.
     * Each hunk object contains information about a specific change.
     * This is designed to be compatible with a standard patch utility.
     * @param {string} patchContent The string content of the patch file.
     * @returns {Array<Object>} An array of hunk objects.
     * @throws {Error} If the patch format is invalid.
     */
    _parsePatch(patchContent) {
        // This function now parses the standard unified diff format,
        // which looks like this:
        // --- a/original_file.txt
        // +++ b/modified_file.txt
        // @@ -old_start,old_lines +new_start,new_lines @@
        //  context line (unchanged)
        // -line to be removed
        // +line to be added

        const lines = patchContent.split('\n');
        const hunks = [];
        let currentHunk = null;

        // This powerful regular expression is our star player! It captures all
        // the numbers from the hunk header '@@ -a,b +c,d @@'.
        const hunkHeaderRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

        for (const line of lines) {
            // Ignore the file header lines, we get all we need from the hunks.
            if (line.startsWith('---') || line.startsWith('+++')) {
                continue;
            }

            if (line.startsWith('@@')) {
                // When we find a hunk header, we save the previous hunk.
                if (currentHunk) {
                    hunks.push(currentHunk);
                }

                const match = line.match(hunkHeaderRegex);
                if (!match) {
                    throw new Error(`Invalid hunk header: ${line}`);
                }

                // Start a new hunk object! It's like a new initiative for Pawnee!
                currentHunk = {
                    oldStart: parseInt(match[1], 10),
                    // If the line count isn't specified, it defaults to 1.
                    oldLines: match[2] ? parseInt(match[2], 10) : 1,
                    newStart: parseInt(match[4], 10),
                    newLines: match[5] ? parseInt(match[5], 10) : 1,
                    lines: [],
                };
            } else if (currentHunk) {
                // If we are inside a hunk, add the line to it.
                // We only care about lines that are part of the change set.
                if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
                    currentHunk.lines.push(line);
                }
            }
        }

        // Don't forget to save the very last hunk! No initiative left behind!
        if (currentHunk) {
            hunks.push(currentHunk);
        }

        if (hunks.length === 0 && patchContent.trim() !== "") {
            throw new Error("Patch file contains no valid hunks.");
        }

        return hunks;
    }

    async coreLogic(context) {
        const { args, validatedPaths, currentUser, dependencies } = context;
        const { FileSystemManager, UserManager, ErrorHandler, PatchUtils } = dependencies;

        if (!PatchUtils || !PatchUtils.applyPatch) {
            return ErrorHandler.createError("patch: Patch utility is not available.");
        }

        const targetFileNode = validatedPaths[0].node;
        const targetFilePath = validatedPaths[0].resolvedPath;
        const patchFileNode = validatedPaths[1].node;

        const targetContent = targetFileNode.content || "";
        const patchContent = patchFileNode.content || "";

        try {
            // Now this calls our new, brilliant parser!
            const patchObject = this._parsePatch(patchContent);

            // If the patch is empty, there's nothing to do! Job's done!
            if (patchObject.length === 0) {
                return ErrorHandler.createSuccess(`'${args[0]}' is already up to date.`, { stateModified: false });
            }

            const patchedContent = PatchUtils.applyPatch(targetContent, patchObject);

            const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);
            const saveResult = await FileSystemManager.createOrUpdateFile(
                targetFilePath,
                patchedContent,
                { currentUser, primaryGroup }
            );

            if (!saveResult.success) {
                return ErrorHandler.createError(`patch: ${saveResult.error}`);
            }

            return ErrorHandler.createSuccess(`Successfully patched '${args[0]}'.`, { stateModified: true });
        } catch (e) {
            // Our improved parser will throw specific errors for bad formats!
            return ErrorHandler.createError(`patch: Failed to apply patch. Error: ${e.message}`);
        }
    }
};
window.CommandRegistry.register(new PatchCommand());