// scripts/commands/base64.js
window.Base64Command = class Base64Command extends Command {
  constructor() {
    super({
      commandName: "base64",
      description: "Encode or decode data and print to standard output.",
      helpText: `Usage: base64 [OPTION]... [FILE]

Base64 encode or decode FILE, or standard input, to standard output.

DESCRIPTION
       The base64 command encodes or decodes data using the Base64 standard.
       This is useful for safely transmitting binary data through text-based channels.
       With no FILE, or when FILE is -, it reads from standard input.

OPTIONS
       -d, --decode
              Decode data.

EXAMPLES
       base64 my_script.sh
              Encodes the script and prints the Base64 string to the terminal.

       base64 my_script.sh > encoded.txt
              Encodes the script and saves the output to a new file.

       cat encoded.txt | base64 -d
              Decodes the content of 'encoded.txt' and prints the original script.`,
      isInputStream: true,
      completionType: "paths",
      flagDefinitions: [{ name: "decode", short: "-d", long: "--decode" }],
    });
  }

  async coreLogic(context) {
    const { flags, inputItems, inputError, dependencies } = context;
    const { ErrorHandler } = dependencies;

    if (inputError) {
      return ErrorHandler.createError(
          "base64: No readable input provided or permission denied."
      );
    }

    if (!inputItems || inputItems.length === 0) {
      return ErrorHandler.createSuccess("");
    }

    const inputData = inputItems.map((item) => item.content).join("\n");

    try {
      if (flags.decode) {
        // The 'atob' function in browsers correctly handles whitespace.
        const decodedData = atob(inputData);
        return ErrorHandler.createSuccess(decodedData);
      } else {
        const encodedData = btoa(inputData);
        // Standard base64 output is often wrapped at 76 characters, but 64 is also common.
        return ErrorHandler.createSuccess(
            encodedData.replace(/(.{64})/g, "$1\n")
        );
      }
    } catch (e) {
      // This specifically catches errors from atob() on invalid input.
      if (e instanceof DOMException && e.name === "InvalidCharacterError") {
        return ErrorHandler.createError("base64: invalid input");
      }
      // Re-throw any other unexpected errors.
      throw e;
    }
  }
}