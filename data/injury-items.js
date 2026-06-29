const PRESET_RULES = {
    "Re-open Wound": [
        {
            key: "GrantItem",
            uuid: "Compendium.pf2e.conditionitems.Item.lDVqvLKA6eF3Df60",
            inMemoryOnly: true,
            alterations: [
                { mode: "override", property: "system.persistent.damageType", value: "bleed" },
                { mode: "override", property: "system.persistent.formula", value: "1d4" }
            ]
        }
    ]
};

export function createPrebuiltInjuryItemData(injuryData, categoryData, folderId, effectName, extraRules = []) {
    const durationObj = categoryData.durationRounds
        ? { value: categoryData.durationRounds, unit: "rounds", expiry: "turn-start" }
        : { value: -1, unit: "unlimited", expiry: null };

    const presetRules = PRESET_RULES[injuryData.name] || [];
    const rules = [...presetRules, ...extraRules];

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
