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
    ],
    "Pounding Ears": [],
    "Pulled Hamstring": [
        { key: "FlatModifier", selector: "speed", value: -5, type: "status" }
    ],
    "Hyperventilation": [],
    "Tunnel Vision": [
        { key: "FlatModifier", selector: "perception", value: -2, type: "status" }
    ],
    "Tripped Up": [],
    "Strained Core": [],
    "Disoriented": [],
    "Dizziness": [],
    "Sprained Wrist": [],
    "Overextended": [],
    "Jarred Nerves": [],
    "Magical/Physical Feedback": [],
    "Numb Grip": [],
    "Bruised Rib": [],
    "Thrown Off Balance": [],
    "Strained Muscles": [],
    "Bile and Nausea": [],
    "Wind Knocked Out": [],
    "Twisted Ankle": [
        { key: "FlatModifier", selector: "land-speed", value: -5, type: "status" }
    ],
    "Concussive Rattle": [],
    "Emotional Damage": [],
    "Dust in the Eyes": [],
    "Panic Response": [],
    "Unnerved": [],
    "Battered": [
        { key: "Weakness", type: "physical", value: 2 }
    ],
    "Dislocated Joint": [],
    "Frustration": [],
    "Muscle Spasm": [
        { key: "FlatModifier", selector: "str-based", value: -2, type: "status" },
        { key: "FlatModifier", selector: "dex-based", value: -2, type: "status" }
    ],
    "Migraine": [
        { key: "FlatModifier", selector: "int-based", value: -2, type: "status" },
        { key: "FlatModifier", selector: "wis-based", value: -2, type: "status" }
    ],
    "Trembling Hands": [],
    "Mental Exhaustion": [],
    "Short of Breath": [
        { key: "FlatModifier", selector: "fortitude", value: -1, type: "status" }
    ],
    "Broken Tool": [],
    "Lingering Doubt": [],
    "Social Faux Pas": [
        { key: "FlatModifier", selector: "cha-based", value: -2, type: "status" }
    ],
    "Distracted": [],
    "Magical Backlash": [],
    "Aetheric Burn": [],
    "Mnemonic Strain": [],
    "Somatic Jitters": [],
    "Overloaded Senses": [],
    "Blurred Focus": [],
    "Drained Vigor": [],
    "Arcane Static": [
        { key: "FlatModifier", selector: "perception", value: -2, type: "status" }
    ],
    "Grounded Energy": [
        { key: "FlatModifier", selector: "speed", value: -5, type: "status" }
    ],
    "Ringing Ears": [
        { key: "FlatModifier", selector: "perception", value: -2, type: "status" }
    ],
    "Stiff Leg": [
        { key: "FlatModifier", selector: "land-speed", value: -5, type: "status" }
    ],
    "Minor Fatigue": [
        { key: "FlatModifier", selector: "skill-check", value: -1, type: "status" }
    ],
    "Sore Muscles": [
        { key: "FlatModifier", selector: "athletics", value: -2, type: "status" },
        { key: "FlatModifier", selector: "acrobatics", value: -2, type: "status" }
    ],
    "Jumpy": [],
    "Trembling Grip": [],
    "Strained Back": [],
    "Twisted Joint": [],
    "Mild Concussion": [],
    "Dazed": [
        { key: "FlatModifier", selector: "initiative", value: -2, type: "status" }
    ],
    "Aches and Pains": [
        { key: "Weakness", type: "physical", value: 1 }
    ],
    "Sensitive Eyes": [],
    "Slow Reflexes": [
        { key: "FlatModifier", selector: "reflex", value: -1, type: "status" }
    ],
    "Shaken": [
        { key: "FlatModifier", selector: "will", value: -1, type: "status" }
    ],
    "Labored Breathing": [
        { key: "FlatModifier", selector: "stealth", value: -2, type: "status" }
    ],
    "Feverish": [
        { key: "FlatModifier", selector: "saving-throw", value: -1, type: "status", predicate: ["poison"] },
        { key: "FlatModifier", selector: "saving-throw", value: -1, type: "status", predicate: ["disease"] }
    ],
    "Numb Fingers": [],
    "Lingering Wound": [],
    "Internal Bleeding": [],
    "Shattered Resolve": [],
    "Lingering Trauma": [],
    "Fractured Limb": [],
    "Severe Concussion": [],
    "Ruptured Eardrum": [],
    "Damaged Eye": [],
    "Deep Laceration": [],
    "Torn Tendon": [],
    "System Shock": []
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
