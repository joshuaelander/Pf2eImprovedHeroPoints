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
    let folder = await getInjuryFolder();
    
    // Players might not have permission to create folders, so folder might be null.
    // That's OK! We can still create the embedded item on their actor.
    
    const effectName = `Injury: ${injuryData.name}`;
    const effectData = createPrebuiltInjuryItemData(injuryData, categoryData, folder ? folder.id : null, effectName, Array.isArray(injuryData.rules) ? [...injuryData.rules] : []);

    let embeddedItem = null;
    if (actor) {
        const existingActorEffect = actor.items?.find(i => i.name === effectName && i.type === "effect" && i.flags?.["heroic-push-pf2e"]?.injuryName === injuryData.name);
        if (existingActorEffect) {
            embeddedItem = existingActorEffect;
        } else {
            const embeddedData = foundry.utils.deepClone(effectData);
            delete embeddedData.folder; // Embedded items don't go in sidebar folders
            try {
                const [created] = await actor.createEmbeddedDocuments("Item", [embeddedData], { renderSheet: false });
                embeddedItem = created;
            } catch (err) {
                console.error("Heroic Push | Failed to embed injury effect on actor:", err);
                ui.notifications.error("Failed to apply injury effect to actor. See console for details.");
            }
        }
    }

    // Try to get or create a World Item so the chat link is universally draggable, even if the actor deletes the effect.
    let worldItem = null;
    if (game.user.isGM) {
        worldItem = game.items.find(i => i.name === effectName && i.type === "effect" && i.folder?.id === folder?.id);
        if (!worldItem) {
            try {
                if (typeof Item.createDocuments === "function") {
                    const createdDocuments = await Item.createDocuments([effectData], { renderSheet: false });
                    worldItem = createdDocuments?.[0] ?? null;
                } else {
                    worldItem = await Item.create(effectData, { renderSheet: false });
                }
            } catch (err) {
                console.error("Heroic Push | Failed to create injury effect world item:", err);
            }
        }
    } else {
        // If they are a player, they might still be able to find an existing world item created previously by the GM.
        worldItem = game.items.find(i => i.name === effectName && i.type === "effect");
    }

    // Return the world item if available (better for dragging), otherwise the embedded item.
    return worldItem || embeddedItem;
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