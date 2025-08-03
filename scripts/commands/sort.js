/**
 * @fileoverview This file defines the 'sort' command, a utility for sorting
 * lines of text from files or standard input alphabetically or numerically.
 * @module commands/sort
 */

/**
 * Represents the 'sort' command.
 * @class SortCommand
 * @extends Command
 */
window.SortCommand = class SortCommand extends Command {
    /**
     * @constructor
     */
    constructor() {
        super({
            commandName: "sort",
            description: "Sorts lines of text from a file or standard input.",
            helpText: `Usage: sort [OPTION]... [FILE]...
      Sort lines of text.
      DESCRIPTION
      Writes a sorted concatenation of all FILE(s) to standard output.
      With no FILE, or when FILE is -, read standard input.
      OPTIONS
      -r, --reverse
      Reverse the result of comparisons.
      -n, --numeric-sort
      Compare according to string numerical value.
      -u, --unique
      Output only unique lines.
      EXAMPLES
      sort data.txt
      Displays the lines of data.txt in alphabetical order.
      ls | sort -r
      Displays the contents of the current directory in reverse
      alphabetical order.`,
            completionType: "paths",
            isInputStream: true,
            flagDefinitions: [
                { name: "reverse", short: "-r", long: "--reverse" },
                { name: "numeric", short: "-n", long: "--numeric-sort" },
                { name: "unique", short: "-u", long: "--unique" },
            ],
        });
    }

    /**
     * Executes the core logic of the 'sort' command. It takes lines from an
     * input stream, sorts them based on the provided flags (numeric, reverse, unique),
     * and returns the sorted string.
     * @param {object} context - The command execution context.
     * @returns {Promise<object>} A promise that resolves with a success or error object from the ErrorHandler.
     */
    async coreLogic(context) {
        const { flags, inputItems, inputError, dependencies } = context;
        const { ErrorHandler } = dependencies;

        if (inputError) {
            return ErrorHandler.createError({ message: "sort: No readable input provided or permission denied." });
        }

        if (!inputItems || inputItems.length === 0) {
            return ErrorHandler.createSuccess("");
        }

        const input = inputItems.map((item) => item.content).join("\n");
        let lines = input.split("\n");

        if (lines.length > 0 && lines.at(-1) === "") {
            lines.pop();
        }

        if (flags.numeric) {
            lines.sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (isNaN(numA) && isNaN(numB)) return a.localeCompare(b);
                if (isNaN(numA)) return 1;
                if (isNaN(numB)) return -1;
                return numA - numB;
            });
        } else {
            lines.sort((a, b) => a.localeCompare(b));
        }

        if (flags.reverse) {
            lines.reverse();
        }

        if (flags.unique) {
            const uniqueLines = [...new Set(lines)];
            if (flags.numeric) {
                uniqueLines.sort((a, b) => parseFloat(a) - parseFloat(b));
            }
            if (flags.reverse) {
                uniqueLines.reverse();
            }
            lines = uniqueLines;
        }

        return ErrorHandler.createSuccess(lines.join("\n"));
    }
}

window.CommandRegistry.register(new SortCommand());