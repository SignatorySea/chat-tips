import { JsonFileSettings } from "./json-file-settings.mjs";

const MODULE_ID = "chat-tips";
const SETTING_KEY = "jsonFiles";
const DEFAULT_JSON_PATH = `modules/${MODULE_ID}/data/tips.json`;
const DEFAULT_SPEAKER = "Did you know?";


Hooks.once("init", ()=> {
    game.settings.register(MODULE_ID, SETTING_KEY, {
        name: "JSON Files",
        hint: "Path to JSON file containing array of chat tip strings.",
        scope: "world",
        config: false,
        type: Array,
        default: []
    });

    game.settings.registerMenu(MODULE_ID, "jsonFilesMenu", {
        name: "JSON File Sources",
        label: "Manage JSON Files",
        hint: "Select and manage the JSON files used by this module.",
        icon: "fa-solid fa-file-code",
        type: JsonFileSettings,
        restricted: true
    });

})

Hooks.once("ready", async () => {

    const paths = game.settings.get(MODULE_ID, SETTING_KEY);
    const jsonPaths = paths.length > 0
        ? paths
        : [DEFAULT_JSON_PATH];

    // Fetch all JSON files in parallel
    const results = await Promise.allSettled(
        jsonPaths.map(async (path) => {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
        })
    );

    // Merge all valid arrays into a single pool
    const allEntries = [];
    results.forEach((result, index) => {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
            allEntries.push(...result.value);
        } else {
            console.warn(
                `${MODULE_ID} | Could not load whisper messages from "${paths[index]}":`,
                result.reason ?? "Invalid JSON array"
            );
        }
    });

    if (allEntries.length === 0) return;

    
    const normalized = allEntries
        .map((entry) => ({
        content: typeof entry === "string" ? entry : entry?.text,
        alias: (typeof entry === "object" && entry?.speaker?.trim()) || DEFAULT_SPEAKER
        }))
        .filter((item) => Boolean(item.content));

    if (normalized.length === 0) return;

    // Find previous messages created by this feature for the current user
    const oldMessages = game.messages.filter(
        (m) => m.author?.id === game.user.id && m.getFlag(MODULE_ID, "welcomeWhisper")
      );

    // Record the content of the message(s) about to be deleted
    const previousContents = new Set(oldMessages.map((m) => m.content));

    // Delete the old messages
    if (oldMessages.length > 0) {
        await ChatMessage.deleteDocuments(oldMessages.map((m) => m.id));
    }

    // Filter out the previously shown message(s) if other options exist
    const candidates = normalized.filter((item) => !previousContents.has(item.content));
    const pool = candidates.length > 0 ? candidates : normalized;

    // Pick a random message from the filtered pool
    const picked = pool[Math.floor(Math.random() * pool.length)];

    // Create a chat message whispered only to the user who just loaded in
    await ChatMessage.create({
        content: picked.content,
        whisper: [game.user.id],
        speaker: { alias: picked.alias },
        flags: {
            [MODULE_ID]: { welcomeWhisper: true }
        }
    });
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  if (!message.getFlag(MODULE_ID, "welcomeWhisper")) return;

  html.classList.add("welcome-whisper-card");
});


