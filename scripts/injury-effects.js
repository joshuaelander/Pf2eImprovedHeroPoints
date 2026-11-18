import { createPrebuiltInjuryItemData } from "../data/injury-items.js";

export const MODULE_ID = "heroic-push-pf2e";

export function clampPercent(value, fallback) {
    const num = Number(value);
    return Math.min(Math.max(Number.isFinite(num) ? num : fallback, 0), 100);
}

export function resolveDomRoot(target) {
    if (!target) return null;
    return target instanceof HTMLElement ? target : (target?.[0] || target);
}

export function canControlActor(actor, user = game.user) {
    if (!actor || !user) return false;
    return Boolean(user.isGM || actor.isOwner || user.character?.id === actor.id);
}

/**
 * Extracts the number of weapon damage dice from a PF2e attack message/item, or null if unavailable.
 */
export function getWeaponDamageDice(message, actor = null) {
    let item = message?.item || null;
    if (!item && message?.flags?.pf2e?.origin?.uuid) {
        try {
            item = fromUuidSync(message.flags.pf2e.origin.uuid) || null;
        } catch (_) {}
    }
    if (!item && actor && message?.flags?.pf2e?.context?.options) {
        const idOpt = message.flags.pf2e.context.options.find(o => String(o).startsWith("item:id:"));
        if (idOpt) {
            item = actor.items?.get(String(idOpt).slice("item:id:".length)) || null;
        }
    }

    if (item) {
        const pcDice = Number(item.system?.damage?.dice);
        if (Number.isFinite(pcDice) && pcDice > 0) return pcDice;

        if (item.type === "melee" && item.system?.damageRolls) {
            const firstRoll = Object.values(item.system.damageRolls)[0];
            const match = String(firstRoll?.damage || "").match(/^(\d+)d/i);
            if (match) return Number(match[1]);
        }
    }

    const options = message?.flags?.pf2e?.context?.options || [];
    for (const opt of options) {
        const match = String(opt).match(/^(?:weapon|item):damage:dice:(\d+)$/i);
        if (match) return Number(match[1]);
    }

    return null;
}

/**
 * Extracts the cast spell rank from a PF2e spell attack message, or null if unavailable.
 */
export function getSpellRank(message) {
    const rawRank = message?.flags?.pf2e?.origin?.castRank
        ?? message?.flags?.pf2e?.context?.castRank
        ?? message?.item?.rank
        ?? message?.item?.system?.level?.value;
    const rank = Number(rawRank);
    if (Number.isFinite(rank) && rank > 0) return rank;

    const options = message?.flags?.pf2e?.context?.options || [];
    for (const opt of options) {
        const match = String(opt).match(/^(?:spell|item):rank:(\d+)$/i);
        if (match) return Number(match[1]);
    }

    return null;
}

export async function getInjuryFolder() {
    // Find or create a dedicated folder in the Items tab for our injuries
    let folder = game.folders.find(f => f.type === "Item" && (f.name === "PF2e Awesome Hero Point Injuries" || f.name === "Heroic Push Injuries"));
    if (!folder && game.user.isGM) {
        try {
            folder = await Folder.create({ name: "PF2e Awesome Hero Point Injuries", type: "Item", color: "#cc0000" });
        } catch (err) {
            console.error("PF2e Awesome Hero Point Rework | Failed to create injury folder:", err);
            return null;
        }
    }
    return folder || null;
}

export async function getOrCreateInjuryEffect(injuryData, categoryData, actor = null) {
    let folder = await getInjuryFolder();

    // Players might not have permission to create folders, so folder might be null.
    // That's OK! We can still create the embedded item on their actor.

    const effectName = `Injury: ${injuryData.name}`;
    const effectData = createPrebuiltInjuryItemData(injuryData, categoryData, folder ? folder.id : null, effectName, Array.isArray(injuryData.rules) ? [...injuryData.rules] : []);

    let embeddedItem = null;
    if (actor) {
        const existingActorEffect = actor.items?.find(i => i.name === effectName && i.type === "effect" && i.flags?.[MODULE_ID]?.injuryName === injuryData.name);
        if (existingActorEffect) {
            embeddedItem = existingActorEffect;
            if (Array.isArray(injuryData.rules) && injuryData.rules.length > 0) {
                try {
                    await existingActorEffect.update({
                        "system.rules": effectData.system.rules,
                        "system.description.value": effectData.system.description.value
                    });
                } catch (err) {
                    console.warn("PF2e Awesome Hero Point Rework | Could not refresh dynamic injury effect:", err);
                }
            }
        } else {
            const embeddedData = foundry.utils.deepClone(effectData);
            delete embeddedData.folder; // Embedded items don't go in sidebar folders
            try {
                const [created] = await actor.createEmbeddedDocuments("Item", [embeddedData], { renderSheet: false });
                embeddedItem = created;
            } catch (err) {
                console.error("PF2e Awesome Hero Point Rework | Failed to embed injury effect on actor:", err);
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
                console.error("PF2e Awesome Hero Point Rework | Failed to create injury effect world item:", err);
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
                console.warn(`PF2e Awesome Hero Point Rework | Could not apply condition ${cond.slug}:`, err);
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
                console.error("PF2e Awesome Hero Point Rework | Failed to embed injury effect on actor:", err);
                ui.notifications.error("Failed to apply injury effect to actor. See console for details.");
            }
        }
    }
}