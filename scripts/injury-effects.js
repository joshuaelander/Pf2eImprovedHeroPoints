function buildInjuryEffectData(injuryData, categoryData, folderId, rules, effectName) {
    const durationObj = categoryData.durationRounds
        ? { value: categoryData.durationRounds, unit: "rounds", expiry: "turn-start" }
        : { value: -1, unit: "unlimited", expiry: null };

    return {
        name: effectName,
        type: "effect",
        folder: folderId,
        img: "icons/skills/wounds/injury-face-impact-orange.webp",
        flags: {
            "heroic-push-pf2e": {
                injuryName: injuryData.name,
                category: categoryData.title
            }
        },
        system: {
            description: {
                value: `<p>${injuryData.text}</p><p><em>Duration: ${categoryData.durationRounds ? categoryData.durationRounds + " rounds (10 mins out of combat)" : "Until long rest or Treat Wounds."}</em></p>`
            },
            duration: durationObj,
            rules,
            level: { value: 0 },
            traits: { value: [] },
            tokenIcon: { show: true },
            slug: foundry.utils.slugify(effectName)
        }
    };
}

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

    let rules = Array.isArray(injuryData.rules) ? [...injuryData.rules] : [];

    // Special PF2e Logic: Auto-attach Persistent Bleed condition for Re-open Wound
    if (injuryData.name === "Re-open Wound") {
        rules.push({
            key: "GrantItem",
            uuid: "Compendium.pf2e.conditionitems.Item.lDVqvLKA6eF3Df60",
            inMemoryOnly: true,
            alterations: [
                { mode: "override", property: "system.persistent.damageType", value: "bleed" },
                { mode: "override", property: "system.persistent.formula", value: "1d4" }
            ]
        });
    }

    const effectName = `Injury: ${injuryData.name}`;
    const effectData = buildInjuryEffectData(injuryData, categoryData, folder.id, rules, effectName);

    let worldItem = game.items.find(i => i.name === effectName && i.type === "effect" && i.folder === folder.id);

    if (!worldItem) {
        try {
            worldItem = await Item.create(effectData, { renderSheet: false });
            console.log("Heroic Push | Created new injury effect item:", worldItem);
        } catch (err) {
            console.error("Heroic Push | Failed to create injury effect item:", err);
            ui.notifications.error("Failed to create injury effect item. See console for details.");
            return null;
        }
    }

    if (actor) {
        const existingActorEffect = actor.items?.find(i => i.name === effectName && i.type === "effect" && i.flags?.["heroic-push-pf2e"]?.injuryName === injuryData.name);
        if (existingActorEffect) {
            return existingActorEffect;
        }

        const embeddedData = foundry.utils.deepClone(worldItem.toObject());
        delete embeddedData._id;
        delete embeddedData.folder;
        delete embeddedData.sort;

        try {
            const [embeddedItem] = await actor.createEmbeddedDocuments("Item", [embeddedData]);
            return embeddedItem;
        } catch (err) {
            console.error("Heroic Push | Failed to embed injury effect on actor:", err);
            ui.notifications.error("Failed to apply injury effect to actor. See console for details.");
            return worldItem;
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
                await actor.createEmbeddedDocuments("Item", [effectData]);
            } catch (err) {
                console.error("Heroic Push | Failed to embed injury effect on actor:", err);
                ui.notifications.error("Failed to apply injury effect to actor. See console for details.");
            }
        }
    }
}