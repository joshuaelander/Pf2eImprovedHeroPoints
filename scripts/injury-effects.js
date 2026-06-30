import { createPrebuiltInjuryItemData } from "../data/injury-items.js";

export async function getInjuryFolder() {
    // Find or create a dedicated folder in the Items tab for our injuries
    let folder = game.folders.find(f => f.type === "Item" && f.name === "Heroic Push Injuries");
    if (!folder) {
        try {
            folder = await Folder.create({ name: "Heroic Push Injuries", type: "Item", color: "#cc0000" });
        } catch (err) {
            console.error("Heroic Push | Failed to create injury folder:", err);
            return null;
        }
    }
    return folder;
}

export async function getOrCreateInjuryEffect(injuryData, categoryData, actor = null) {
    const folder = await getInjuryFolder();
    if (!folder) {
        ui.notifications.error("Could not find or create the Heroic Push Injuries folder.");
        return null;
    }

    console.log("Heroic Push | Folder found/created:", folder.id, folder.name);

    const effectName = `Injury: ${injuryData.name}`;
    const effectData = createPrebuiltInjuryItemData(injuryData, categoryData, folder.id, effectName, Array.isArray(injuryData.rules) ? [...injuryData.rules] : []);

    console.log("Heroic Push | Effect data created:", effectData);

    // Always create/find the world item first so drag links remain valid
    let worldItem = game.items.find(i => i.name === effectName && i.type === "effect" && i.folder?.id === folder.id);
    console.log("Heroic Push | Searching for existing world item:", effectName, "Found:", !!worldItem);

    if (!worldItem) {
        try {
            console.log("Heroic Push | Creating new world item...");
            if (typeof Item.createDocuments === "function") {
                console.log("Heroic Push | Using Item.createDocuments");
                const createdDocuments = await Item.createDocuments([effectData], { renderSheet: false });
                worldItem = createdDocuments?.[0] ?? null;
            } else {
                console.log("Heroic Push | Using Item.create");
                worldItem = await Item.create(effectData, { renderSheet: false });
            }
            if (worldItem) {
                console.log("Heroic Push | Successfully created new injury effect item:", worldItem.id, worldItem.name);
            } else {
                console.warn("Heroic Push | Item creation returned null");
            }
        } catch (err) {
            console.error("Heroic Push | Failed to create injury effect item:", err);
            ui.notifications.error("Failed to create injury effect item. See console for details.");
        }
    }

    // If an actor is provided, also embed a copy on the actor
    if (actor && worldItem) {
        const existingActorEffect = actor.items?.find(i => i.name === effectName && i.type === "effect" && i.flags?.["heroic-push-pf2e"]?.injuryName === injuryData.name);
        if (!existingActorEffect) {
            const embeddedData = foundry.utils.deepClone(effectData);
            delete embeddedData.folder;

            try {
                await actor.createEmbeddedDocuments("Item", [embeddedData], { renderSheet: false });
            } catch (err) {
                console.error("Heroic Push | Failed to embed injury effect on actor:", err);
            }
        }
    }

    return worldItem;
}

    return worldItem;
}

export async function applyInjuryEffect(actor, injuryData, effectItem) {
    if (!actor) return;

    if (injuryData.conditions?.length) {
        for (const cond of injuryData.conditions) {
            try {
                await actor.increaseCondition(cond.slug, { value: cond.value });
            } catch (err) {
                console.warn(`Heroic Push | Could not apply condition ${cond.slug}:`, err);
            }
        }
    }

    if (effectItem) {
        const existingEffect = actor.items?.find(i => i.name === effectItem.name && i.type === "effect");
        if (!existingEffect) {
            const effectData = foundry.utils.deepClone(effectItem.toObject());
            delete effectData._id;
            delete effectData.folder;
            delete effectData.sort;
            try {
                await actor.createEmbeddedDocuments("Item", [effectData], { renderSheet: false });
            } catch (err) {
                console.error("Heroic Push | Failed to embed injury effect on actor:", err);
                ui.notifications.error("Failed to apply injury effect to actor. See console for details.");
            }
        }
    }
}