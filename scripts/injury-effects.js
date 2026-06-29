export async function getInjuryFolder() {
    // Find or create a dedicated folder in the Items tab for our injuries
    let folder = game.folders.find(f => f.type === "Item" && f.name === "Heroic Push Injuries");
    if (!folder) {
        folder = await Folder.create({ name: "Heroic Push Injuries", type: "Item", color: "#cc0000" });
    }
    return folder;
}

export async function getOrCreateInjuryEffect(injuryData, categoryData) {
    const folder = await getInjuryFolder();
    const durationObj = categoryData.durationRounds
        ? { value: categoryData.durationRounds, unit: "rounds", expiry: "turn-start" }
        : { value: -1, unit: "unlimited", expiry: null };

    let rules = Array.isArray(injuryData.rules) ? [...injuryData.rules] : [];

    // Special PF2e Logic: Auto-attach Persistent Bleed condition for Re-open Wound
    if (injuryData.name === "Re-open Wound") {
        rules.push({
            key: "GrantItem",
            uuid: "Compendium.pf2e.conditionitems.Item.lDVqvLKA6eF3Df60", // PF2e Persistent Damage UUID
            inMemoryOnly: true,
            alterations: [
                { mode: "override", property: "system.persistent.damageType", value: "bleed" },
                { mode: "override", property: "system.persistent.formula", value: "1d4" }
            ]
        });
    }

    const effectName = `Injury: ${injuryData.name}`;

    // Check if we've already generated this exact item in the past
    let item = game.items.find(i => i.name === effectName && i.folder?.id === folder.id);

    // If it doesn't exist, create it as a real World Item
    if (!item) {
        const effectData = {
            name: effectName,
            type: "effect",
            folder: folder.id,
            img: "icons/skills/wounds/injury-face-impact-orange.webp",
            system: {
                description: {
                    value: `<p>${injuryData.text}</p><p><em>Duration: ${categoryData.durationRounds ? categoryData.durationRounds + " rounds (10 mins out of combat)" : "Until long rest or Treat Wounds."}</em></p>`
                },
                duration: durationObj,
                rules: rules,
                tokenIcon: { show: true }
            }
        };
        item = await Item.create(effectData);
    }
    return item;
}

export async function applyInjuryEffect(actor, injuryData, effectItem) {
    if (!actor) return;

    // 1. Apply standard hardcoded conditions via PF2e API (Sickened, Doomed, etc)
    if (injuryData.conditions && injuryData.conditions.length > 0) {
        for (const cond of injuryData.conditions) {
            await actor.increaseCondition(cond.slug, { value: cond.value });
        }
    }

    // 2. Apply the newly created/fetched World Item
    if (effectItem) {
        await actor.createEmbeddedDocuments("Item", [effectItem.toObject()]);
    }
}