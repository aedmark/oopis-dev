// scripts/apps/top/top_ui.js
window.TopUI = class TopUI {
    constructor(callbacks, dependencies) {
        this.elements = {};
        this.callbacks = callbacks;
        this.dependencies = dependencies;
        this._buildLayout();
    }

    getContainer() {
        return this.elements.container;
    }

    _buildLayout() {
        const { Utils, UIComponents } = this.dependencies;

        // Create the main application window using the toolkit
        const appWindow = UIComponents.createAppWindow('OopisOS Process Viewer', this.callbacks.onExit);
        this.elements.container = appWindow.container;
        this.elements.main = appWindow.main;
        // No footer needed for this app

        this.elements.processList = Utils.createElement("tbody");
        const table = Utils.createElement("table", { className: "top-table" }, [
            Utils.createElement("thead", {},
                Utils.createElement("tr", {}, [
                    Utils.createElement("th", { textContent: "PID" }),
                    Utils.createElement("th", { textContent: "USER" }),
                    Utils.createElement("th", { textContent: "STAT" }),
                    Utils.createElement("th", { textContent: "COMMAND" }),
                ])
            ),
            this.elements.processList
        ]);

        // Place the table into the main content area provided by the toolkit
        this.elements.main.appendChild(table);
    }

    render(processes) {
        if (!this.elements.processList) return;

        // Clear existing rows more efficiently
        this.elements.processList.innerHTML = "";

        if (processes.length === 0) {
            const row = this.dependencies.Utils.createElement("tr", {},
                this.dependencies.Utils.createElement("td", {
                    colSpan: 4,
                    textContent: "No background processes running.",
                    style: { textAlign: "center", fontStyle: "italic" }
                })
            );
            this.elements.processList.appendChild(row);
            return;
        }

        const fragment = document.createDocumentFragment();
        processes.forEach(proc => {
            const row = this.dependencies.Utils.createElement("tr", {}, [
                this.dependencies.Utils.createElement("td", { textContent: proc.pid }),
                this.dependencies.Utils.createElement("td", { textContent: proc.user }),
                this.dependencies.Utils.createElement("td", { textContent: proc.status }),
                this.dependencies.Utils.createElement("td", { textContent: proc.command }),
            ]);
            fragment.appendChild(row);
        });
        this.elements.processList.appendChild(fragment);
    }

    hideAndReset() {
        if (this.elements.container) {
            this.elements.container.remove();
        }
        this.elements = {};
    }
}