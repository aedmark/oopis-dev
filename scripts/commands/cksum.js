// scripts/commands/cksum.js
window.CksumCommand = class CksumCommand extends Command {
    constructor() {
        super({
            commandName: "cksum",
            description: "Print checksum and byte counts of files.",
            helpText: `Usage: cksum [FILE]...
    Calculate and print a checksum, byte count, and filename for each FILE.
    DESCRIPTION
    The cksum utility calculates and writes to standard output a 32-bit
    checksum (CRC), the total number of bytes, and the name for each
    input file.
    It is typically used to quickly compare a suspect file against a trusted
    version to ensure that the file has not been accidentally corrupted.
    If no file is specified, or if the file is '-', cksum reads from
    standard input, and no filename is printed.
    EXAMPLES
    cksum my_script.sh
    Displays the checksum and size of the script file.
    cat my_script.sh | cksum
    Calculates the checksum and size from the piped content.`,
            isInputStream: true,
            completionType: "paths",
            flagDefinitions: [],
        });
    }

    async coreLogic(context) {

        const { inputItems, inputError, dependencies } = context;
        const { ErrorHandler } = dependencies;

        if (inputError) {
            return ErrorHandler.createError(
                "cksum: No readable input provided or permission denied."
            );
        }

        if (!inputItems || inputItems.length === 0) {
            return ErrorHandler.createSuccess("");
        }

        const crc32 = (str) => {
            const table = [];
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
                }
                table[i] = c;
            }
            let crc = -1;
            for (let i = 0; i < str.length; i++) {
                crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xff];
            }
            return (crc ^ -1) >>> 0;
        };

        const outputLines = [];
        for (const item of inputItems) {
            const input = item.content || "";
            const checksum = crc32(input);
            const byteCount = input.length;
            const fileName =
                item.sourceName !== "stdin" ? ` ${item.sourceName}` : "";
            outputLines.push(`${checksum} ${byteCount}${fileName}`);
        }

        return ErrorHandler.createSuccess(outputLines.join("\n"));

    }
}
window.CommandRegistry.register(new CksumCommand());