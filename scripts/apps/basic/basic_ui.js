// scripts/apps/basic/basic_ui.js
window.BasicUI = class BasicUI {
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
    const appWindow = UIComponents.createAppWindow('Oopis BASIC v1.0', this.callbacks.onExit);
    this.elements.container = appWindow.container;
    this.elements.main = appWindow.main;
    // We don't use the footer in this app, but it's there for consistency!

    // Add a specific class for theming
    this.elements.container.classList.add("basic-app__container");

    this.elements.output = Utils.createElement("div", {
      id: "basic-app-output",
      className: "basic-app__output",
    });

    this.elements.input = Utils.createElement("input", {
      id: "basic-app-input",
      className: "basic-app__input",
      type: "text",
      spellcheck: "false",
      autocapitalize: "none",
    });

    const inputContainer = Utils.createElement(
        "div",
        { className: "basic-app__input-line" },
        Utils.createElement("span", { textContent: ">" }),
        this.elements.input
    );

    // Append the app-specific elements to the main area provided by the toolkit
    this.elements.main.append(this.elements.output, inputContainer);

    // Add event listeners
    this.elements.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const command = this.elements.input.value;
        this.elements.input.value = "";
        this.callbacks.onInput(command);
      }
    });
    // The exit button in the header is already handled by createAppWindow
  }

  write(text) {
    if (this.elements.output) {
      this.elements.output.textContent += text;
      this.elements.output.scrollTop = this.elements.output.scrollHeight;
    }
  }

  writeln(text) {
    if (this.elements.output) {
      this.elements.output.textContent += text + "\n";
      this.elements.output.scrollTop = this.elements.output.scrollHeight;
    }
  }

  focusInput() {
    if (this.elements.input) {
      this.elements.input.focus();
    }
  }

  reset() {
    this.elements = {};
    this.callbacks = {};
    this.dependencies = {};
  }
}