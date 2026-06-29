import { getOrCreateInjuryEffect, applyInjuryEffect } from "./injury-effects.js";

window.DetermineInjuryDialog = async function () {
    // Ensure we have a target to apply effects to
    const targetActor = canvas.tokens.controlled[0]?.actor || game.user.character;

    const INJURY_DATA = {
        minor: {
            initiative: {
                title: "Minor Injury: Initiative",
                durationRounds: 2,
                results: {
                    1: { name: "Pounding Ears", text: "You are deafened.", conditions: [{ slug: "deafened" }] },
                    2: { name: "Pulled Hamstring", text: "-5 foot penalty to all Speeds.", rules: [{ key: "FlatModifier", selector: "speed", value: -5, type: "status" }] },
                    3: { name: "Hyperventilation", text: "You are fatigued.", conditions: [{ slug: "fatigued" }] },
                    4: { name: "Tunnel Vision", text: "You take a -2 status penalty to Perception checks.", rules: [{ key: "FlatModifier", selector: "perception", value: -2, type: "status" }] },
                    5: { name: "Pre-combat Jitters", text: "You can't use reactions until the start of your second turn." },
                    6: { name: "Tripped Up", text: "You are clumsy 1.", conditions: [{ slug: "clumsy", value: 1 }] },
                    7: { name: "Fumbled Gear", text: "You take a -2 to the first attack roll/spell attack roll of combat." },
                    8: { name: "Strained Core", text: "You are enfeebled 1.", conditions: [{ slug: "enfeebled", value: 1 }] },
                    9: { name: "Disoriented", text: "You are off-guard (flat-footed) to the first attack against you.", conditions: [{ slug: "off-guard" }] },
                    10: { name: "Dizziness", text: "You are dazzled.", conditions: [{ slug: "dazzled" }] }
                }
            },
            attacks: {
                title: "Minor Injury: Attacks",
                durationRounds: 2,
                results: {
                    1: { name: "Sprained Wrist", text: "You are enfeebled 1.", conditions: [{ slug: "enfeebled", value: 1 }] },
                    2: { name: "Overextended", text: "You are off-guard (flat-footed).", conditions: [{ slug: "off-guard" }] },
                    3: { name: "Weapon Recoil", text: "You take [X]d6 bludgeoning damage. (X = weapon damage dice)" },
                    4: { name: "Re-open Wound", text: "You take [X]d4 persistent bleed damage. (X = weapon damage dice)" },
                    5: { name: "Jarred Nerves", text: "You are clumsy 1.", conditions: [{ slug: "clumsy", value: 1 }] },
                    6: { name: "Magical/Physical Feedback", text: "You are dazzled.", conditions: [{ slug: "dazzled" }] },
                    7: { name: "Numb Grip", text: "-2 status penalty to attack rolls with the weapon used. Can change grip for 1 action." },
                    8: { name: "Bruised Rib", text: "Taking an action with the attack trait causes 2 * [X] piercing damage. (X = weapon damage dice)" },
                    9: { name: "Thrown Off Balance", text: "You are pushed 5 feet in a random direction." },
                    10: { name: "Strained Muscles", text: "You cannot use physical actions that cost 2 or more actions during your next turn." }
                }
            },
            savingThrows: {
                title: "Minor Injury: Saving Throws",
                durationRounds: 2,
                results: {
                    1: { name: "Bile and Nausea", text: "You are sickened 1.", conditions: [{ slug: "sickened", value: 1 }] },
                    2: { name: "Wind Knocked Out", text: "You are enfeebled 1.", conditions: [{ slug: "enfeebled", value: 1 }] },
                    3: { name: "Twisted Ankle", text: "-5 foot penalty to your land Speed.", rules: [{ key: "FlatModifier", selector: "land-speed", value: -5, type: "status" }] },
                    4: { name: "Concussive Rattle", text: "You are stupefied 1.", conditions: [{ slug: "stupefied", value: 1 }] },
                    5: { name: "Emotional Damage", text: "You take 1d8 mental damage." },
                    6: { name: "Dust in the Eyes", text: "You are blinded for 1 round, then dazzled.", conditions: [{ slug: "blinded" }] },
                    7: { name: "Panic Response", text: "You are frightened 1.", conditions: [{ slug: "frightened", value: 1 }] },
                    8: { name: "Unnerved", text: "You cannot use reactions." },
                    9: { name: "Battered", text: "You gain weakness 2 to physical damage.", rules: [{ key: "Weakness", type: "physical", value: 2 }] },
                    10: { name: "Dislocated Joint", text: "You are clumsy 1.", conditions: [{ slug: "clumsy", value: 1 }] }
                }
            },
            skillChecks: {
                title: "Minor Injury: Skill Checks",
                durationRounds: 2,
                results: {
                    1: { name: "Frustration", text: "You are stupefied 1.", conditions: [{ slug: "stupefied", value: 1 }] },
                    2: { name: "Muscle Spasm", text: "You take a -2 status penalty to Strength and Dexterity skills.", rules: [{ key: "FlatModifier", selector: "str-based", value: -2, type: "status" }, { key: "FlatModifier", selector: "dex-based", value: -2, type: "status" }] },
                    3: { name: "Migraine", text: "You take a -2 status penalty to Intelligence and Wisdom skills.", rules: [{ key: "FlatModifier", selector: "int-based", value: -2, type: "status" }, { key: "FlatModifier", selector: "wis-based", value: -2, type: "status" }] },
                    4: { name: "Trembling Hands", text: "Thievery and Crafting checks require an extra action or extra time." },
                    5: { name: "Mental Exhaustion", text: "You are drained 1 for 10 minutes.", conditions: [{ slug: "drained", value: 1 }] },
                    6: { name: "Short of Breath", text: "You cannot speak above a whisper or use abilities requiring speech. (Can still cast spells though.)" },
                    7: { name: "Broken Tool", text: "A set of tools you are using takes damage or breaks entirely (GM decides)." },
                    8: { name: "Lingering Doubt", text: "You cannot critically succeed on skill checks." },
                    9: { name: "Social Faux Pas", text: "You take a -2 status penalty to Charisma skills.", rules: [{ key: "FlatModifier", selector: "cha-based", value: -2, type: "status" }] },
                    10: { name: "Distracted", text: "You are fascinated by the object of your check.", conditions: [{ slug: "fascinated" }] }
                }
            },
            spellAttacks: {
                title: "Minor Injury: Spell Attacks",
                durationRounds: 2,
                results: {
                    1: { name: "Magical Backlash", text: "You take [X]d4 force damage (no save) as the spell's energy recoils. (X = spell rank)" },
                    2: { name: "Aetheric Burn", text: "You take [X] persistent force damage. (X = spell rank)" },
                    3: { name: "Mnemonic Strain", text: "You are stupefied 1.", conditions: [{ slug: "stupefied", value: 1 }] },
                    4: { name: "Somatic Jitters", text: "You are clumsy 1.", conditions: [{ slug: "clumsy", value: 1 }] },
                    5: { name: "Overloaded Senses", text: "You are dazzled by the flash of magical energy.", conditions: [{ slug: "dazzled" }] },
                    6: { name: "Blurred Focus", text: "You take a -2 status penalty to spell attack rolls and spell DCs." },
                    7: { name: "Disoriented", text: "You are off-guard (flat-footed).", conditions: [{ slug: "off-guard" }] },
                    8: { name: "Drained Vigor", text: "The magic saps your physical strength; you are enfeebled 1.", conditions: [{ slug: "enfeebled", value: 1 }] },
                    9: { name: "Arcane Static", text: "Ringing in your ears and floating sparks give you a -2 status penalty to Perception checks.", rules: [{ key: "FlatModifier", selector: "perception", value: -2, type: "status" }] },
                    10: { name: "Grounded Energy", text: "Your magic painfully anchors you to the earth; -5 foot penalty to all Speeds.", rules: [{ key: "FlatModifier", selector: "speed", value: -5, type: "status" }] }
                }
            },
            woundedRecovery: {
                title: "Minor Injury: Wounded Recovery",
                durationRounds: null,
                dice: "1d20",
                results: {
                    1: { name: "Ringing Ears", text: "You take a -2 status penalty to Perception checks.", rules: [{ key: "FlatModifier", selector: "perception", value: -2, type: "status" }] },
                    2: { name: "Stiff Leg", text: "-5 foot penalty to your land Speed.", rules: [{ key: "FlatModifier", selector: "land-speed", value: -5, type: "status" }] },
                    3: { name: "Minor Fatigue", text: "You take a -1 status penalty to all skill checks.", rules: [{ key: "FlatModifier", selector: "skill-check", value: -1, type: "status" }] },
                    4: { name: "Sore Muscles", text: "You take a -2 status penalty to Athletics and Acrobatics checks.", rules: [{ key: "FlatModifier", selector: "athletics", value: -2, type: "status" }, { key: "FlatModifier", selector: "acrobatics", value: -2, type: "status" }] },
                    5: { name: "Jumpy", text: "You are off-guard (flat-footed) to the first attack against you in any combat." },
                    6: { name: "Trembling Grip", text: "You take a -2 penalty to the first attack roll of any combat." },
                    7: { name: "Strained Back", text: "You are enfeebled 1.", conditions: [{ slug: "enfeebled", value: 1 }] },
                    8: { name: "Twisted Joint", text: "You are clumsy 1.", conditions: [{ slug: "clumsy", value: 1 }] },
                    9: { name: "Mild Concussion", text: "You are stupefied 1.", conditions: [{ slug: "stupefied", value: 1 }] },
                    10: { name: "Bruised Rib", text: "Taking an action with the attack trait causes 1 piercing damage." },
                    11: { name: "Dazed", text: "You take a -2 status penalty to Initiative rolls.", rules: [{ key: "FlatModifier", selector: "initiative", value: -2, type: "status" }] },
                    12: { name: "Aches and Pains", text: "You gain weakness 1 to all physical damage.", rules: [{ key: "Weakness", type: "physical", value: 1 }] },
                    13: { name: "Sensitive Eyes", text: "You are dazzled in areas of bright light." },
                    14: { name: "Short of Breath", text: "You take a -1 status penalty to Fortitude saves.", rules: [{ key: "FlatModifier", selector: "fortitude", value: -1, type: "status" }] },
                    15: { name: "Slow Reflexes", text: "You take a -1 status penalty to Reflex saves.", rules: [{ key: "FlatModifier", selector: "reflex", value: -1, type: "status" }] },
                    16: { name: "Shaken", text: "You take a -1 status penalty to Will saves.", rules: [{ key: "FlatModifier", selector: "will", value: -1, type: "status" }] },
                    17: { name: "Labored Breathing", text: "Your injuries make it difficult to move quietly. You take a -2 status penalty to Stealth checks.", rules: [{ key: "FlatModifier", selector: "stealth", value: -2, type: "status" }] },
                    18: { name: "Feverish", text: "Your body runs hot as it fights off infection from your wounds. You take a -1 status penalty to saving throws against diseases and poisons.", rules: [{ key: "FlatModifier", selector: "saving-throw", value: -1, type: "status", predicate: ["poison"] }, { key: "FlatModifier", selector: "saving-throw", value: -1, type: "status", predicate: ["disease"] }] },
                    19: { name: "Numb Fingers", text: "Thievery and Crafting checks require an extra action or extra time." },
                    20: { name: "Lingering Wound", text: "Healing effects restore 2 fewer Hit Points to you (minimum 0)." }
                }
            }
        },
        major: {
            title: "Major Injury",
            durationRounds: null,
            results: {
                1: { name: "Internal Bleeding", text: "You are drained 1.", conditions: [{ slug: "drained", value: 1 }] },
                2: { name: "Shattered Resolve", text: "You are doomed 1.", conditions: [{ slug: "doomed", value: 1 }] },
                3: { name: "Lingering Trauma", text: "You are wounded 1.", conditions: [{ slug: "wounded", value: 1 }] },
                4: { name: "Fractured Limb", text: "You are enfeebled 1 until Treat Wounds or Long Rest.", conditions: [{ slug: "enfeebled", value: 1 }] },
                5: { name: "Severe Concussion", text: "You are stupefied 1 until Treat Wounds or Long Rest.", conditions: [{ slug: "stupefied", value: 1 }] },
                6: { name: "Ruptured Eardrum", text: "You are deafened.", conditions: [{ slug: "deafened" }] },
                7: { name: "Damaged Eye", text: "You are dazzled.", conditions: [{ slug: "dazzled" }] },
                8: { name: "Deep Laceration", text: "You take 1d6 persistent bleed damage that ignores the flat check until Treat Wounds is used." },
                9: { name: "Torn Tendon", text: "You are clumsy 1 until Treat Wounds or Long Rest.", conditions: [{ slug: "clumsy", value: 1 }] },
                10: { name: "System Shock", text: "You are slowed 1 until the end of combat.", conditions: [{ slug: "slowed", value: 1 }] }
            }
        }
    };

    const dialogHtml = `
    <div style="margin-bottom: 10px;">
        <p>Select the severity and trigger to determine the injury. Requires a selected token to apply effects automatically.</p>
    </div>
    <form>
        <div class="form-group">
            <label for="severity"><strong>Severity:</strong></label>
            <select id="severity" name="severity">
                <option value="minor">Minor Injury</option>
                <option value="major">Major Injury</option>
            </select>
        </div>
        <div class="form-group" id="trigger-container">
            <label for="trigger"><strong>Trigger:</strong></label>
            <select id="trigger" name="trigger">
                <option value="initiative">Initiative</option>
                <option value="attacks">Attacks</option>
                <option value="savingThrows">Saving Throws</option>
                <option value="skillChecks">Skill Checks</option>
                <option value="spellAttacks">Spell Attacks</option>
                <option value="woundedRecovery">Wounded Recovery (d20)</option>
            </select>
        </div>
    </form>
    `;

    async function sendChatCard(roll, injuryResult, categoryTitle, actor, effectItem) {
        const actorName = actor ? actor.name : "An unknown creature";
        const durationText = categoryTitle.includes("Minor") ? "2 Rounds (or 10 mins out of combat)" : "Until Long Rest / Treat Wounds";

        // Highlight variables like [X] for visual clarity
        const formattedText = injuryResult.text.replace(/\[X\]/g, '<strong><span style="color: red; font-size: 1.1em;">X</span></strong>');
        const effectSummary = effectItem ? `<p style="margin: 5px 0; font-size: 0.9em;"><em>Effect prepared for ${actorName}: ${effectItem.name}</em></p>` : "";

        const content = `
            <div class="pf2e chat-card" style="border: 1px solid #191813; border-radius: 4px; padding: 5px;">
                <header class="card-header flexrow" style="background: rgba(0, 0, 0, 0.1); padding: 5px; border-bottom: 1px solid #191813; margin-bottom: 5px;">
                    <img src="icons/skills/wounds/injury-face-impact-orange.webp" title="Injury" width="36" height="36" style="border: none; margin-right: 5px;"/>
                    <h3 style="margin: 0; line-height: 36px; font-family: 'Modesto Condensed', sans-serif; font-size: 1.5em;">${categoryTitle}</h3>
                </header>
                <div class="card-content" style="padding: 5px;">
                    <p><strong>Target:</strong> ${actorName}</p>
                    <p><strong>Rolled:</strong> ${roll.total}</p>
                    <hr>
                    <h4 style="font-family: 'Modesto Condensed', sans-serif; font-size: 1.3em; margin: 5px 0;">${injuryResult.name}</h4>
                    <p style="margin: 5px 0;">${formattedText}</p>
                    <p style="margin: 5px 0; font-size: 0.9em; color: #555;"><em>Duration: ${durationText}</em></p>
                    ${effectSummary}
                </div>
            </div>
        `;

        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: content,
            sound: CONFIG.sounds.dice
        });
    }

    new Dialog({
        title: "Determine Injury",
        content: dialogHtml,
        render: (html) => {
            // Securely attach the hide/show logic without using inline scripts
            const severitySelect = html[0].querySelector("#severity");
            const triggerContainer = html[0].querySelector("#trigger-container");

            if (severitySelect && triggerContainer) {
                severitySelect.addEventListener("change", function () {
                    if (this.value === "major") {
                        triggerContainer.style.display = "none";
                    } else {
                        triggerContainer.style.display = "flex";
                    }
                });
            }
        },
        buttons: {
            roll: {
                icon: '<i class="fas fa-dice-d20"></i>',
                label: "Roll Injury",
                callback: async (html) => {
                    const severity = html.find("#severity").val();
                    const trigger = html.find("#trigger").val();

                    let categoryData;
                    if (severity === "major") {
                        categoryData = INJURY_DATA.major;
                    } else {
                        categoryData = INJURY_DATA.minor[trigger];
                    }

                    const diceType = categoryData.dice || "1d10";
                    const roll = new Roll(diceType);
                    roll.evaluateSync();

                    const resultRow = categoryData.results[roll.total];

                    let createdEffectItem = null;
                    try {
                        createdEffectItem = await getOrCreateInjuryEffect(resultRow, categoryData, targetActor);
                    } catch (error) {
                        console.error("Error creating injury item in World:", error);
                    }

                    if (!targetActor) {
                        ui.notifications.warn("No token selected. Rolling injury to chat only. You can drag and drop the effect from chat.");
                    } else {
                        try {
                            // 2. Apply it to the token if one is selected
                            await applyInjuryEffect(targetActor, resultRow, createdEffectItem);
                            ui.notifications.info(`Applied injury: ${resultRow.name} to ${targetActor.name}.`);
                        } catch (error) {
                            console.error("Error applying injury effect:", error);
                            ui.notifications.error("Failed to fully apply injury effects. Check console.");
                        }
                    }

                    // Output formatted chat (including the link to the item)
                    await sendChatCard(roll, resultRow, categoryData.title, targetActor, createdEffectItem);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "roll"
    }).render(true);
};