const PERSISTENT_DAMAGE_UUID = "Compendium.pf2e.conditionitems.Item.lDVqvLKA6eF3Df60";

export function createPersistentDamageRule(formula, damageType, dc = 15) {
    return {
        key: "GrantItem",
        uuid: PERSISTENT_DAMAGE_UUID,
        inMemoryOnly: true,
        alterations: [
            {
                mode: "override",
                property: "persistent-damage",
                value: {
                    formula: String(formula),
                    damageType,
                    dc
                }
            }
        ]
    };
}

const PRESET_RULES = {
    "Re-open Wound": [
        createPersistentDamageRule("1d4", "bleed", 15)
    ],
    "Pounding Ears": [],
    "Pulled Hamstring": [
        { key: "FlatModifier", selector: "speed", value: -5, type: "status" }
    ],
    "Hyperventilation": [],
    "Tunnel Vision": [
        { key: "FlatModifier", selector: "perception", value: -2, type: "status" }
    ],
    "Pre-combat Jitters": [],
    "Tripped Up": [],
    "Strained Core": [],
    "Disoriented": [],
    "Dizziness": [],
    "Sprained Wrist": [],
    "Overextended": [],
    "Jarred Nerves": [],
    "Magical/Physical Feedback": [],
    "Numb Grip": [
        { key: "FlatModifier", selector: "attack", value: -2, type: "status" }
    ],
    "Bruised Rib": [
        {
            key: "Note",
            selector: "attack-roll",
            title: "Bruised Rib",
            text: "Injury: Taking an action with the attack trait deals piercing damage equal to 2 × weapon damage dice."
        }
    ],
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
    "Trembling Hands": [
        {
            key: "Note",
            selector: "thievery",
            title: "Trembling Hands",
            text: "Injury: This check requires an extra action or extra time due to trembling hands."
        },
        {
            key: "Note",
            selector: "crafting",
            title: "Trembling Hands",
            text: "Injury: This check requires an extra action or extra time due to trembling hands."
        }
    ],
    "Mental Exhaustion": [],
    "Short of Breath": [
        { key: "FlatModifier", selector: "fortitude", value: -1, type: "status" }
    ],
    "Shortness of Breath": [
        {
            key: "Note",
            selector: ["diplomacy", "intimidation", "deception", "performance"],
            title: "Shortness of Breath",
            text: "Injury: You cannot speak above a whisper or use abilities requiring speech."
        }
    ],
    "Broken Tool": [],
    "Lingering Doubt": [
        {
            key: "AdjustDegreeOfSuccess",
            selector: "skill-check",
            adjustment: { criticalSuccess: "success" }
        }
    ],
    "Social Faux Pas": [
        { key: "FlatModifier", selector: "cha-based", value: -2, type: "status" }
    ],
    "Distracted": [],
    "Magical Backlash": [],
    "Aetheric Burn": [
        createPersistentDamageRule("1", "force", 15)
    ],
    "Mnemonic Strain": [],
    "Somatic Jitters": [],
    "Overloaded Senses": [],
    "Blurred Focus": [
        { key: "FlatModifier", selector: "spell-attack", value: -2, type: "status" },
        { key: "FlatModifier", selector: "spell-dc", value: -2, type: "status" }
    ],
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
    "Jumpy": [
        {
            key: "Note",
            selector: "initiative",
            title: "Jumpy",
            text: "Injury: You are @UUID[Compendium.pf2e.conditionitems.Item.AJh5ex99aV6VTggg]{Off-Guard} to the first attack against you in this combat."
        }
    ],
    "Trembling Grip": [
        {
            key: "RollOption",
            domain: "all",
            option: "trembling-grip-first-attack",
            toggleable: true,
            value: true,
            label: "Trembling Grip (First Attack)"
        },
        {
            key: "FlatModifier",
            selector: "attack",
            value: -2,
            type: "status",
            predicate: ["trembling-grip-first-attack"]
        }
    ],
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
    "Numb Fingers": [
        {
            key: "Note",
            selector: "thievery",
            title: "Numb Fingers",
            text: "Injury: This check requires an extra action or extra time due to numb fingers."
        },
        {
            key: "Note",
            selector: "crafting",
            title: "Numb Fingers",
            text: "Injury: This check requires an extra action or extra time due to numb fingers."
        }
    ],
    "Lingering Wound": [
        { key: "FlatModifier", selector: "healing-received", value: -2, type: "status" }
    ],
    "Internal Bleeding": [],
    "Shattered Resolve": [],
    "Lingering Trauma": [],
    "Fractured Limb": [],
    "Severe Concussion": [],
    "Ruptured Eardrum": [],
    "Damaged Eye": [],
    "Deep Laceration": [
        createPersistentDamageRule("1d6", "bleed", 20)
    ],
    "Torn Tendon": [],
    "System Shock": [],
    "Fumbled Gear": [
        { key: "FlatModifier", selector: "attack", value: -2, type: "status" }
    ],
    "Weapon Recoil": []
};

export function createPrebuiltInjuryItemData(injuryData, categoryData, folderId, effectName, overrideRules = []) {
    const durationObj = categoryData.durationRounds
        ? { value: categoryData.durationRounds, unit: "rounds", expiry: "turn-start" }
        : { value: -1, unit: "unlimited", expiry: null };

    const presetRules = PRESET_RULES[injuryData.name] || [];
    const rules = overrideRules.length > 0 ? [...overrideRules] : foundry.utils.deepClone(presetRules);

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
            slug: effectName.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
        }
    };
}
