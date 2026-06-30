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

    const effectName = `Injury: ${injuryData.name}`;
    const effectData = createPrebuiltInjuryItemData(injuryData, categoryData, folder.id, effectName, Array.isArray(injuryData.rules) ? [...injuryData.rules] : []);

    if (actor) {
        const existingActorEffect = actor.items?.find(i => i.name === effectName && i.type === "effect" && i.flags?.["heroic-push-pf2e"]?.injuryName === injuryData.name);
        if (existingActorEffect) {
            return existingActorEffect;
        }

        const embeddedData = foundry.utils.deepClone(effectData);
        delete embeddedData.folder;

        try {
            const [embeddedItem] = await actor.createEmbeddedDocuments("Item", [embeddedData], { renderSheet: false });
            return embeddedItem;
        } catch (err) {
            console.error("Heroic Push | Failed to embed injury effect on actor:", err);
            ui.notifications.error("Failed to apply injury effect to actor. See console for details.");
        }
    }

    let worldItem = game.items.find(i => i.name === effectName && i.type === "effect" && i.folder?.id === folder.id);
    if (!worldItem) {
        try {
            if (typeof Item.createDocuments === "function") {
                const createdDocuments = await Item.createDocuments([effectData], { renderSheet: false });
                worldItem = createdDocuments?.[0] ?? null;
            } else {
                worldItem = await Item.create(effectData, { renderSheet: false });
            }
            if (worldItem) {
                console.log("Heroic Push | Created new injury effect item:", worldItem);
            }
        } catch (err) {
            console.error("Heroic Push | Failed to create injury effect item:", err);
            ui.notifications.error("Failed to create injury effect item. See console for details.");
        }
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