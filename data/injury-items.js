const PRESET_RULES = {
    "Re-open Wound": [
        {
            key: "Note",
            selector: "damage",
            title: "Re-open Wound",
            text: "Injury: You take persistent bleed damage equal to {item|flags.heroic-push-pf2e.weaponDice}d4 for 2 rounds. (Number of weapon damage dice × 1d4)"
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
    "Numb Grip": [
        { key: "FlatModifier", selector: "attack", value: -2, type: "status" },
        { key: "Note", selector: "attack", title: "Numb Grip", text: "You have a -2 status penalty to attack rolls with the weapon used. You can change grip as a 1-action activity to end this penalty." }
    ],
    "Bruised Rib": [
        {
            key: "Note",
            selector: "attack",
            title: "Bruised Rib",
            text: "Injury: Taking an action with the attack trait causes piercing damage equal to 2 × the number of weapon damage dice."
        }
    ],
    "Thrown Off Balance": [
        {
            key: "Note",
            selector: "check",
            title: "Thrown Off Balance",
            text: "Injury: You are pushed 5 feet in a random direction."
        }
    ],
    "Strained Muscles": [
        {
            key: "Note",
            selector: "check",
            title: "Strained Muscles",
            text: "Injury: You cannot use physical actions that cost 2 or more actions during your next turn."
        }
    ],
    "Bile and Nausea": [],
    "Wind Knocked Out": [],
    "Twisted Ankle": [
        { key: "FlatModifier", selector: "land-speed", value: -5, type: "status" }
    ],
    "Concussive Rattle": [],
    "Emotional Damage": [
        {
            key: "Note",
            selector: "check",
            title: "Emotional Damage",
            text: "Injury: You take [[/r 1d8 #mental]]{1d8 mental damage}."
        }
    ],
    "Dust in the Eyes": [],
    "Panic Response": [],
    "Unnerved": [
        {
            key: "Note",
            selector: "check",
            title: "Unnerved",
            text: "Injury: You cannot use reactions."
        }
    ],
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
    "Broken Tool": [
        {
            key: "Note",
            selector: "check",
            title: "Broken Tool",
            text: "Injury: A random set of tools you are using becomes broken (GM decides which)."
        }
    ],
    "Lingering Doubt": [
        {
            key: "AdjustDegreeOfSuccess",
            selector: "skill-check",
            adjustment: { criticalSuccess: "success" }
        },
        {
            key: "Note",
            selector: "skill-check",
            title: "Lingering Doubt",
            text: "Injury: You cannot critically succeed on skill checks. Critical successes are reduced to successes."
        }
    ],
    "Social Faux Pas": [
        { key: "FlatModifier", selector: "cha-based", value: -2, type: "status" }
    ],
    "Distracted": [],
    "Magical Backlash": [
        {
            key: "Note",
            selector: "spell-attack",
            title: "Magical Backlash",
            text: "Injury: You take flat force damage equal to the spell rank (no save) as the spell's energy recoils. (Spell Rank × 1d4)"
        }
    ],
    "Aetheric Burn": [
        {
            key: "Note",
            selector: "spell-attack",
            title: "Aetheric Burn",
            text: "Injury: You take persistent force damage equal to the spell rank. (X = spell rank)"
        }
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
        { key: "FlatModifier", selector: "off-guard", value: 1, type: "condition" }
    ],
    "Trembling Grip": [
        { key: "FlatModifier", selector: "attack", value: -2, type: "status" }
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
    "Numb Fingers": [],
    "Lingering Wound": [
        { key: "Resistance", type: "vitality", value: 2 }
    ],
    "Internal Bleeding": [],
    "Shattered Resolve": [],
    "Lingering Trauma": [],
    "Fractured Limb": [],
    "Severe Concussion": [],
    "Ruptured Eardrum": [],
    "Damaged Eye": [],
    "Deep Laceration": [
        {
            key: "GrantItem",
            uuid: "Compendium.pf2e.conditionitems.Item.lDVqvLKA6eF3Df60",
            inMemoryOnly: true,
            alterations: [
                { mode: "override", property: "system.persistent.damageType", value: "bleed" },
                { mode: "override", property: "system.persistent.formula", value: "1d6" },
                { mode: "override", property: "system.persistent.dc", value: 20 }
            ]
        },
        {
            key: "Note",
            selector: "check",
            title: "Deep Laceration",
            text: "Injury: 1d6 persistent bleed damage. The flat check DC is set to 20 (effectively ignored) until Treat Wounds is used. Out of combat this lasts 5 minutes."
        }
    ],
    "Torn Tendon": [],
    "System Shock": [],
    "Fumbled Gear": [
        { key: "FlatModifier", selector: "attack", value: -2, type: "status" }
    ],
    "Weapon Recoil": [
        {
            key: "Note",
            selector: "attack",
            title: "Weapon Recoil",
            text: "Injury: You take bludgeoning damage equal to the number of weapon damage dice × [[/r 1d6]]{1d6}. (Number of weapon damage dice × 1d6)"
        }
    ],
    "Shortness of Breath": [
        {
            key: "Note",
            selector: "check",
            title: "Shortness of Breath",
            text: "Injury: You cannot speak above a whisper or use abilities requiring speech. You can still cast spells. (Same effect as Silence)"
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
            slug: effectName.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
        }
    };
}
