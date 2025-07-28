// scripts/commands/mxml2sh.js
window.Mxml2shCommand = class Mxml2shCommand extends Command {
    constructor() {
        super({
            commandName: "mxml2sh",
            // Remove jszip.min.js from this list
            dependencies: [
                "apps/mxml_converter/mxml_converter_ui.js",
                "apps/mxml_converter/mxml_converter_manager.js",
            ],
            applicationModules: ["MusicXMLConverterManager", "MusicXMLConverterUI", "App", "JSZip"],
            description: "Converts a MusicXML (.musicxml or .mxl) file into a runnable OopisOS script.",
            helpText: `Usage: mxml2sh <inputfile> [output.sh]
      Converts a MusicXML file into an oopis script that uses the 'play' command.

      DESCRIPTION
      This utility opens a graphical interface to convert standardized MusicXML
      files (.musicxml) or their compressed counterparts (.mxl) into executable scripts. 
      It parses notes, durations, and rests to generate a sequence of 'play' and 'delay' commands.

      If an output file is not specified, it will be named based on the input file.`,
            completionType: "paths",
            validations: {
                args: {
                    min: 1,
                    max: 2,
                    error: "Usage: mxml2sh <inputfile> [output.sh]"
                },
                paths: [{
                    argIndex: 0,
                    options: {
                        expectedType: 'file',
                        permissions: ['read']
                    }
                }]
            },
        });
    }

    async coreLogic(context) {
        const { args, options, validatedPaths, dependencies } = context;
        const { ErrorHandler, AppLayerManager, MusicXMLConverterManager, MusicXMLConverterUI, App, Utils } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError("mxml2sh: Can only be run in interactive mode.");
        }

        if (typeof MusicXMLConverterManager === 'undefined' || typeof MusicXMLConverterUI === 'undefined' || typeof App === 'undefined') {
            return ErrorHandler.createError("mxml2sh: The application modules are not loaded.");
        }

        const inputFileNode = validatedPaths[0].node;
        const inputFilePath = validatedPaths[0].resolvedPath;

        // Validate the file extension
        const extension = Utils.getFileExtension(inputFilePath);
        if (extension !== 'musicxml' && extension !== 'mxl' && extension !== 'xml') {
            return ErrorHandler.createError("mxml2sh: Input file must be a .musicxml, .xml, or .mxl file.");
        }

        const outputFilePath = args.length === 2 ? args[1] : null;

        AppLayerManager.show(new MusicXMLConverterManager(), {
            inputFile: {
                path: inputFilePath,
                content: inputFileNode.content,
                extension: extension
            },
            outputFile: outputFilePath,
            dependencies: dependencies
        });

        return ErrorHandler.createSuccess("");
    }
}
window.CommandRegistry.register(new Mxml2shCommand());