const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "chat-tips";

export class JsonFileSettings extends
    HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "json-file-settings",
        window: {
            title: "JSON File Sources",
            icon: "fa-solid fa-file-code",
            resizable: true
        },
        position: {
            width: 500,
            height: "auto"
        }
    };

    static PARTS = {
        main: {
            template: `modules/${MODULE_ID}/templates/json-file-settings.hbs`
        }
    };

    async _prepareContext() {
        const files = game.settings.get(
            MODULE_ID,
            "jsonFiles"
        );

        return { files };
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const html = this.element;

        html.querySelector(".add-file")
            ?.addEventListener("click", () => this._addFile());

        html.querySelectorAll(".remove-file")
            .forEach(button => {
                button.addEventListener("click", () => {
                    this._removeFile(Number(button.dataset.index));
                });
            });
    }

    async _addFile() {
        new foundry.applications.apps.FilePicker.implementation({
            type: "data",
            extensions: [".json"],

            callback: async (path) => {
                const files = [
                    ...game.settings.get(
                        MODULE_ID,
                        "jsonFiles"
                    )
                ];

                // Don't add duplicate paths
                if (files.includes(path)) {
                    ui.notifications.warn(
                        "This JSON file has already been added."
                    );
                    return;
                }

                // Add the new path
                files.push(path);

                // Save the updated array
                await game.settings.set(
                    MODULE_ID,
                    "jsonFiles",
                    files
                );

                // Refresh the application
                this.render();
            }
        }).render(true);
    }

    async _removeFile(index) {
        const files = [...game.settings.get(
            MODULE_ID,
            "jsonFiles"
        )];

        files.splice(index, 1);

        await game.settings.set(
            MODULE_ID,
            "jsonFiles",
            files
        );

        this.render();
    }
}