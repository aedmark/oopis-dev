// scripts/apps/mxml_converter/mxml_converter_manager.js
window.MusicXMLConverterManager = class MusicXMLConverterManager extends App {
    constructor() {
        super();
        this.dependencies = {};
        this.callbacks = {};
        this.ui = null;
        this.state = {};
    }

    enter(appLayer, options = {}) {
        this.dependencies = options.dependencies;
        this.callbacks = this._createCallbacks();
        this.state = {
            inputFile: options.inputFile,
            outputFile: options.outputFile,
            status: "Ready",
        };
        this.isActive = true;

        this.ui = new this.dependencies.MusicXMLConverterUI(this.state, this.callbacks, this.dependencies);
        this.container = this.ui.getContainer();
        appLayer.appendChild(this.container);
    }

    exit() {
        if (!this.isActive) return;
        if (this.ui) {
            this.ui.hideAndReset();
        }
        this.dependencies.AppLayerManager.hide(this);
        this.isActive = false;
        this.state = {};
    }

    _createCallbacks() {
        return {
            onExit: this.exit.bind(this),
            onConvert: this._convert.bind(this),
        };
    }

    _parseMusicXML(xmlString) {
        const notes = [];
        let divisions = 1;

        const divisionsMatch = xmlString.match(/<divisions>(\d+)<\/divisions>/);
        if (divisionsMatch) {
            divisions = parseInt(divisionsMatch[1], 10);
        }

        const noteRegex = /<note>([\s\S]*?)<\/note>/g;
        let match;
        while ((match = noteRegex.exec(xmlString)) !== null) {
            const noteData = match[1];
            const isRest = /<rest\/>/.test(noteData);
            const durationMatch = noteData.match(/<duration>(\d+)<\/duration>/);
            const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;
            const isChord = /<chord\/>/.test(noteData);

            if (isRest) {
                notes.push({ type: 'rest', duration });
            } else {
                const stepMatch = noteData.match(/<step>([A-G])<\/step>/);
                const alterMatch = noteData.match(/<alter>(-1|1)<\/alter>/);
                const octaveMatch = noteData.match(/<octave>(\d+)<\/octave>/);

                if (stepMatch && octaveMatch) {
                    let noteName = stepMatch[1];
                    if (alterMatch) {
                        noteName += alterMatch[1] === '1' ? '#' : 'b';
                    }
                    notes.push({
                        type: 'note',
                        pitch: `${noteName}${octaveMatch[1]}`,
                        duration,
                        isChord
                    });
                }
            }
        }

        return { notes, divisions };
    }

    _durationToToneJS(duration, divisions) {
        const quarterNoteDuration = duration / divisions;
        if (quarterNoteDuration >= 4) return "1n";
        if (quarterNoteDuration >= 2) return "2n";
        if (quarterNoteDuration >= 1) return "4n";
        if (quarterNoteDuration >= 0.5) return "8n";
        if (quarterNoteDuration >= 0.25) return "16n";
        if (quarterNoteDuration >= 0.125) return "32n";
        return "64n"; // Smallest supported duration
    }

    async _getXMLContent() {
        const { JSZip } = this.dependencies;
        if (this.state.inputFile.extension === 'mxl') {
            this.ui.updateStatus("Decompressing .mxl file...");
            try {
                // Corrected line: Removed { base64: true }
                const zip = await JSZip.loadAsync(this.state.inputFile.content);
                const mainXmlFile = Object.keys(zip.files).find(name => !name.startsWith('META-INF') && (name.endsWith('.musicxml') || name.endsWith('.xml')));
                if (mainXmlFile) {
                    return await zip.file(mainXmlFile).async("string");
                } else {
                    throw new Error("No valid .musicxml file found in the archive.");
                }
            } catch (e) {
                this.ui.updateStatus(`Error: Failed to decompress .mxl file. ${e.message}`);
                return null;
            }
        }
        return this.state.inputFile.content;
    }

    async _convert() {
        const { FileSystemManager, UserManager } = this.dependencies;

        const xmlContent = await this._getXMLContent();
        if (xmlContent === null) return;

        this.ui.updateStatus("Parsing MusicXML...");
        const { notes, divisions } = this._parseMusicXML(xmlContent);

        if (notes.length === 0) {
            this.ui.updateStatus("Error: No notes found in the file.");
            return;
        }

        this.ui.updateStatus("Generating script...");
        const scriptLines = ["#!/bin/oopis_shell", "# Converted from MusicXML by mxml2sh"];
        let totalDurationMs = 0;

        for (const note of notes) {
            const toneDuration = this._durationToToneJS(note.duration, divisions);
            const durationInSeconds = new Tone.Time(toneDuration).toSeconds();

            // Only add to total duration and delay for non-chord notes
            if (!note.isChord) {
                totalDurationMs += durationInSeconds * 1000;
            }

            if (note.type === 'note') {
                scriptLines.push(`play ${note.pitch} ${toneDuration}`);
            } else { // rest
                scriptLines.push(`delay ${Math.round(durationInSeconds * 1000)}`);
            }
        }

        const scriptContent = scriptLines.join('\n');
        const outputFilename = this.state.outputFile || this.state.inputFile.path.replace(/\.(musicxml|mxl|xml)$/, '.sh');

        const currentUser = UserManager.getCurrentUser().name;
        const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);

        this.ui.updateStatus(`Saving to ${outputFilename}...`);
        const saveResult = await FileSystemManager.createOrUpdateFile(
            outputFilename,
            scriptContent,
            { currentUser, primaryGroup }
        );

        if (saveResult.success) {
            await FileSystemManager.save();
            const chmodResult = await this.dependencies.CommandExecutor.processSingleCommand(`chmod 755 "${outputFilename}"`, { isInteractive: false });
            if (chmodResult.success) {
                this.ui.updateStatus(`Success! Script saved and made executable. Total playtime: ${(totalDurationMs / 1000).toFixed(2)}s.`);
            } else {
                this.ui.updateStatus(`Warning: Script saved, but failed to make it executable.`);
            }

        } else {
            this.ui.updateStatus(`Error: ${saveResult.error}`);
        }
    }
}