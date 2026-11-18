import { determineInjuryDialog } from "./determine-injury.js";
import { MODULE_ID, clampPercent, resolveDomRoot, canControlActor, getWeaponDamageDice } from "./injury-effects.js";
import {
    injuryCheckDialog,
    getActorWoundedValue,
    removeWoundedConditions,
    rollAndResolveInjuryCheck
} from "./injury-check.js";

Hooks.once("init", () => {
    console.log("PF2e Awesome Hero Point Rework | Initializing module v1.5.0");

    game.settings.register(MODULE_ID, "enableHeroicPush", {
        name: "Enable Heroic Push (+1d6)",
        hint: "Shows the Heroic Push option in the right-click menu for chat messages and the combat tracker.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "enableRecklessPush", {
        name: "Enable Reckless Push (+2d6)",
        hint: "Shows the Reckless Push option in the right-click menu for chat messages and the combat tracker.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "autoCreateMacros", {
        name: "Auto-Create World Macros for Players",
        hint: "Automatically ensures Hero Point Last Roll, Injury Check, and Determine Injury macros exist in the World Macros directory for easy hotbar dragging.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "minorInjuryThreshold", {
        name: "Reckless Push: Minor Injury Threshold (%)",
        hint: "The maximum d100 roll that results in an injury on a Reckless Push. Rolls between (Major Threshold + 1) and this value result in a Minor Injury. (Default: 33).",
        scope: "world",
        config: true,
        type: Number,
        default: 33
    });

    game.settings.register(MODULE_ID, "majorInjuryThreshold", {
        name: "Reckless Push: Major Injury Threshold (%)",
        hint: "The maximum d100 roll that results in a Major Injury on a Reckless Push. Rolls from 1 up to this value result in a Major Injury. (Default: 5).",
        scope: "world",
        config: true,
        type: Number,
        default: 5
    });

    game.settings.register(MODULE_ID, "injuryCheckBaseMinorThreshold", {
        name: "Injury Check: Base Minor Injury Threshold (%)",
        hint: "Base maximum d100 roll for an injury on the Wounded Recovery Injury Check before adding +10% per Wounded level. (Default: 23, so Wounded 1 = 33%, Wounded 2 = 43%).",
        scope: "world",
        config: true,
        type: Number,
        default: 23
    });

    game.settings.register(MODULE_ID, "injuryCheckMajorThreshold", {
        name: "Injury Check: Major Injury Threshold (%)",
        hint: "Maximum d100 roll that results in a Major Injury on the Wounded Recovery Injury Check. (Default: 5).",
        scope: "world",
        config: true,
        type: Number,
        default: 5
    });

    const api = {
        doHeroicPush,
        doHeroicPushCombatant,
        findLastPushableMessage,
        findInitiativeMessage,
        pushLastRoll,
        heroicPushLast,
        recklessPushLast,
        pushLastDialog,
        injuryCheck: (actor) => injuryCheckDialog(actor),
        openDetermineInjury: (actor, severity, trigger, sourceMessage) => determineInjuryDialog(actor, severity, trigger, sourceMessage),
        getActorWoundedValue,
        removeWoundedConditions,
        getMessageActor,
        hasD20Roll,
        isPushableMessage,
        detectInjuryTrigger,
        getCheckDisplayName,
        getMacroFolder,
        updateCombatantInitiative,
        getCombatantFromElement
    };

    game.modules.get(MODULE_ID).api = api;
    game.heroicPush = api;
    window.HeroicPush = api;

    Hooks.on("getChatMessageContextOptions", (app, options) => {
        buildPushMenuOptions(
            options,
            (li) => isPushableMessage(getMessageFromElement(li), game.user),
            (li, dice) => doHeroicPush(getMessageFromElement(li), dice)
        );
    });

    Hooks.on("getCombatTrackerEntryContext", (appOrHtml, entryOptions) => {
        const options = Array.isArray(entryOptions) ? entryOptions : (Array.isArray(appOrHtml) ? appOrHtml : null);
        if (!options) return;

        buildPushMenuOptions(
            options,
            (li) => {
                const combatant = getCombatantFromElement(li);
                return Boolean(combatant && Number.isFinite(combatant.initiative) && canControlActor(combatant.actor));
            },
            (li, dice) => doHeroicPushCombatant(li, dice)
        );
    });
});

Hooks.once("ready", async () => {
    // Socket listener for player-triggered initiative updates handled on GM client
    game.socket.on(`module.${MODULE_ID}`, async (data) => {
        if (!game.user.isGM) return;
        if (data?.action === "updateInitiative" && data.combatantId) {
            const combatant = findCombatantById(data.combatantId);
            if (combatant) {
                await combatant.update({ initiative: data.initiative });
            }
        }
    });

    if (game.user.isGM && game.settings.get(MODULE_ID, "autoCreateMacros")) {
        await ensureModuleMacros();
    }
});

Hooks.on("createChatMessage", async (message) => {
    if (message.author?.id !== game.user.id) return;
    if (message.flags?.[MODULE_ID]?.isInjuryRoll || message.flags?.[MODULE_ID]?.isBruisedRibDamage || message.flags?.[MODULE_ID]?.isPushedRoll) return;

    const context = message.flags?.pf2e?.context;
    const type = String(context?.type || "").toLowerCase();
    if (!context || type.includes("damage")) return;

    const actor = getMessageActor(message);
    if (!actor || !canControlActor(actor)) return;

    const isAttackRoll = type === "attack-roll" || type === "spell-attack-roll";
    const traits = (context.traits || []).map(t => String(t).toLowerCase());
    const options = (context.options || []).map(o => String(o).toLowerCase());
    const hasAttackTrait = isAttackRoll
        || traits.includes("attack")
        || options.some(o => o === "item:trait:attack" || o === "action:trait:attack" || o === "self:action:trait:attack");

    if (hasAttackTrait) {
        const bruisedRib = actor.items?.find(i => i.type === "effect" && i.flags?.[MODULE_ID]?.injuryName === "Bruised Rib");
        if (bruisedRib) {
            const isRecoveryVersion = bruisedRib.flags?.[MODULE_ID]?.category === "Minor Injury: Wounded Recovery";
            const weaponDice = isRecoveryVersion ? null : getWeaponDamageDice(message, actor);
            const damageAmount = isRecoveryVersion ? 1 : (weaponDice ?? 1) * 2;
            const scaleHint = isRecoveryVersion
                ? "Wounded Recovery injury"
                : (weaponDice ? `2 × ${weaponDice} weapon ${weaponDice === 1 ? "die" : "dice"}` : "2 × weapon dice");

            const rawHtml = `
                <div class="pf2e chat-card" style="border: 1px solid #8f1d24; border-radius: 4px; padding: 6px; background: rgba(143, 29, 36, 0.08);">
                    <p style="margin: 0;"><strong>Bruised Rib (${actor.name}):</strong> Taking an attack-trait action deals @Damage[${damageAmount}[piercing]] piercing damage <em>(${scaleHint})</em>.</p>
                </div>`;
            const textEditor = foundry?.applications?.ux?.TextEditor?.implementation ?? TextEditor;
            const enriched = await textEditor.enrichHTML(rawHtml, { async: true, rollData: actor.getRollData?.() });
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor }),
                content: enriched,
                flags: { [MODULE_ID]: { isBruisedRibDamage: true } }
            });
        }
    }

    if (isAttackRoll) {
        const fumbledGear = actor.items?.find(i => i.type === "effect" && i.flags?.[MODULE_ID]?.injuryName === "Fumbled Gear");
        if (fumbledGear) {
            try {
                await fumbledGear.delete();
            } catch (err) {
                console.warn("PF2e Awesome Hero Point Rework | Could not clear Fumbled Gear after first attack:", err);
            }
        }

        const tremblingGrip = actor.items?.find(i => i.type === "effect" && i.flags?.[MODULE_ID]?.injuryName === "Trembling Grip");
        if (tremblingGrip?.system?.rules?.length) {
            const rules = foundry.utils.deepClone(tremblingGrip.system.rules);
            const toggleRule = rules.find(r => r.key === "RollOption" && r.option === "trembling-grip-first-attack" && r.value === true);
            if (toggleRule) {
                toggleRule.value = false;
                try {
                    await tremblingGrip.update({ "system.rules": rules });
                } catch (err) {
                    console.warn("PF2e Awesome Hero Point Rework | Could not toggle Trembling Grip after first attack:", err);
                }
            }
        }
    }
});

Hooks.on("combatStart", async (combat) => {
    if (!game.user.isGM || !combat?.combatants) return;
    for (const combatant of combat.combatants) {
        const actor = combatant.actor;
        const tremblingGrip = actor?.items?.find(i => i.type === "effect" && i.flags?.[MODULE_ID]?.injuryName === "Trembling Grip");
        if (!tremblingGrip?.system?.rules?.length) continue;

        const rules = foundry.utils.deepClone(tremblingGrip.system.rules);
        const toggleRule = rules.find(r => r.key === "RollOption" && r.option === "trembling-grip-first-attack" && r.value === false);
        if (toggleRule) {
            toggleRule.value = true;
            try {
                await tremblingGrip.update({ "system.rules": rules });
            } catch (err) {
                console.warn("PF2e Awesome Hero Point Rework | Could not reset Trembling Grip on combat start:", err);
            }
        }
    }
});

function buildPushMenuOptions(options, conditionFn, onPushFn) {
    const newOptions = [];

    if (game.settings.get(MODULE_ID, "enableHeroicPush")) {
        newOptions.push({
            name: "Reroll with Heroic Push (+1d6)",
            icon: '<i class="fas fa-dice-d6" style="color: #4a8a2a;"></i>',
            condition: conditionFn,
            callback: (li) => onPushFn(li, "1d6")
        });
    }

    if (game.settings.get(MODULE_ID, "enableRecklessPush")) {
        newOptions.push({
            name: "Reroll with Reckless Push (+2d6)",
            icon: '<i class="fas fa-biohazard" style="color: #cc0000;"></i>',
            condition: conditionFn,
            callback: (li) => onPushFn(li, "2d6")
        });
    }

    if (newOptions.length > 0) {
        options.unshift(...newOptions);
    }
}

function findCombatantById(combatantId) {
    if (!combatantId) return null;
    if (game.combat?.combatants.has(combatantId)) {
        return game.combat.combatants.get(combatantId);
    }
    for (const combat of game.combats ?? []) {
        if (combat.combatants.has(combatantId)) {
            return combat.combatants.get(combatantId);
        }
    }
    return null;
}

function findCombatantForActor(actor, tokenId = null) {
    if (!actor) return null;
    const matcher = (c) => (tokenId && c.tokenId === tokenId) || c.actorId === actor.id;

    if (game.combat) {
        const activeMatch = game.combat.combatants.find(matcher);
        if (activeMatch) return activeMatch;
    }
    for (const combat of game.combats ?? []) {
        const match = combat.combatants.find(matcher);
        if (match) return match;
    }
    return null;
}

/**
 * Universal helper to extract a ChatMessage from any DOM element (including inner children)
 */
export function getMessageFromElement(li) {
    const element = resolveDomRoot(li);
    if (!element) return null;
    const targetEl = element.closest
        ? (element.closest("[data-message-id], [data-entry-id], [data-document-id], .chat-message, .message") || element)
        : element;
    const id = targetEl.dataset?.messageId
        || targetEl.dataset?.entryId
        || targetEl.dataset?.documentId
        || targetEl.getAttribute?.("data-message-id")
        || targetEl.getAttribute?.("data-entry-id")
        || targetEl.getAttribute?.("data-document-id");
    return game.messages.get(id) || null;
}

/**
 * Universal helper to extract a Combatant from a Combat Tracker DOM element
 */
export function getCombatantFromElement(li) {
    const element = resolveDomRoot(li);
    if (!element) return null;
    const targetEl = element.closest ? (element.closest("[data-combatant-id], .combatant") || element) : element;
    const id = targetEl.dataset?.combatantId
        || targetEl.getAttribute?.("data-combatant-id")
        || targetEl.dataset?.entryId
        || targetEl.dataset?.documentId;
    return findCombatantById(id);
}

/**
 * Robust actor resolver across world actors, tokens, synthetic actors, and flags
 */
export function getMessageActor(message) {
    if (!message) return null;
    if (message.actor) return message.actor;

    if (message.flags?.pf2e?.context?.actor) {
        try {
            const actor = fromUuidSync(message.flags.pf2e.context.actor);
            if (actor) return actor;
        } catch (_) {}
    }

    if (message.speaker) {
        const speakerActor = ChatMessage.getSpeakerActor(message.speaker);
        if (speakerActor) return speakerActor;

        if (message.speaker.actor) {
            const worldActor = game.actors.get(message.speaker.actor);
            if (worldActor) return worldActor;
        }

        if (message.speaker.scene && message.speaker.token) {
            const token = game.scenes.get(message.speaker.scene)?.tokens?.get(message.speaker.token);
            if (token?.actor) return token.actor;
        }
    }

    if (message.author?.id === game.user.id) {
        return canvas?.tokens?.controlled?.[0]?.actor || game.user.character || null;
    }

    return null;
}

/**
 * Verifies if a message contains at least one d20 roll
 */
export function hasD20Roll(message) {
    if (!message?.rolls?.length) return false;
    return message.rolls.some(roll =>
        roll.dice?.some(d => d.faces === 20)
        || roll.terms?.some(t => t.faces === 20 || t.rolls?.some(r => r.faces === 20))
    );
}

function isEligibleD20Message(message) {
    if (!message || !hasD20Roll(message)) return false;
    if (message.flags?.pf2e?.context?.type?.includes("damage")) return false;
    if (message.flags?.[MODULE_ID]?.isInjuryRoll) return false;
    return true;
}

function isInitiativeMessage(message) {
    if (!message) return false;
    return Boolean(
        message.flags?.core?.initiativeRoll
        || message.flags?.pf2e?.context?.type === "initiative"
        || message.flags?.pf2e?.context?.domains?.includes("initiative")
        || message.flavor?.toLowerCase().includes("initiative")
    );
}

/**
 * Checks if a chat message is eligible for pushing
 */
export function isPushableMessage(message, user = game.user) {
    try {
        if (!isEligibleD20Message(message)) return false;
        const actor = getMessageActor(message);
        return canControlActor(actor, user);
    } catch (err) {
        console.error("PF2e Awesome Hero Point Rework | Error evaluating pushable message:", err);
        return false;
    }
}

/**
 * Extracts a clean, descriptive display name for the check (never returns generic "All")
 */
export function getCheckDisplayName(message) {
    if (!message) return "Roll";

    if (message.flavor) {
        try {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = message.flavor;
            const header = tempDiv.querySelector("h3, h4, .title, header");
            const cleanTitle = header?.textContent?.trim().replace(/\s+/g, " ");
            if (cleanTitle && cleanTitle.length > 1 && !cleanTitle.includes("Heroic Push") && !cleanTitle.includes("Reckless Push")) {
                return cleanTitle;
            }
        } catch (_) {}
    }

    if (message.item?.name) return message.item.name;

    const context = message.flags?.pf2e?.context;
    if (context?.domains?.length) {
        const specificDomain = context.domains.find(d => !["all", "check", "roll", "d20"].includes(String(d).toLowerCase()));
        if (specificDomain) {
            return String(specificDomain).replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    if (context?.type) {
        return String(context.type).replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }

    return "Check";
}

/**
 * Analyzes a roll message to determine the appropriate injury trigger category
 */
export function detectInjuryTrigger(message) {
    if (!message) return "attacks";

    const context = message.flags?.pf2e?.context;
    const type = String(context?.type || "").toLowerCase();
    const domains = (context?.domains || []).map(d => String(d).toLowerCase());
    const options = (context?.options || []).map(o => String(o).toLowerCase());
    const traits = (context?.traits || []).map(t => String(t).toLowerCase());
    const flavor = String(message.flavor || "").toLowerCase();
    const content = String(message.content || "").toLowerCase();

    if (type === "spell-attack-roll"
        || domains.some(d => d.includes("spell-attack"))
        || options.some(o => o.includes("spell-attack") || o === "spell")
        || (traits.includes("magical") && traits.includes("attack"))
        || message.item?.type === "spell"
        || message.flags?.pf2e?.origin?.type === "spell"
        || flavor.includes("spell attack")
        || content.includes("spell attack")) {
        return "spellAttacks";
    }

    if (domains.some(d => d.includes("recovery"))
        || options.some(o => o.includes("recovery"))
        || flavor.includes("recovery check")
        || content.includes("recovery check")) {
        return "woundedRecovery";
    }

    if (isInitiativeMessage(message) || content.includes("initiative")) {
        return "initiative";
    }

    if (type === "saving-throw"
        || domains.some(d => ["saving-throw", "fortitude", "reflex", "will"].includes(d))
        || flavor.includes("saving throw")
        || flavor.includes("save vs")
        || content.includes("saving throw")) {
        return "savingThrows";
    }

    if (type === "skill-check"
        || type === "perception-check"
        || domains.some(d => d.includes("skill") || d.includes("perception"))
        || flavor.includes("skill check")
        || flavor.includes("perception")) {
        return "skillChecks";
    }

    return "attacks";
}

/**
 * Searches chat history backwards to find the most recent pushable d20 roll
 */
export function findLastPushableMessage(options = {}) {
    const user = options.user || game.user;
    const targetActor = options.actor || canvas?.tokens?.controlled?.[0]?.actor || user.character || null;

    const messages = game.messages.contents;
    let ownedFallback = null;

    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (!isEligibleD20Message(msg)) continue;

        const msgActor = getMessageActor(msg);
        if (!msgActor) continue;

        if (targetActor) {
            if (msgActor.id === targetActor.id) return msg;
            if (!ownedFallback && !user.isGM && canControlActor(msgActor, user)) {
                ownedFallback = msg;
            }
        } else if (canControlActor(msgActor, user)) {
            return msg;
        }
    }

    return ownedFallback;
}

/**
 * Searches chat history backwards to find the most recent initiative roll for an actor
 */
export function findInitiativeMessage(actor) {
    if (!actor) return null;
    const messages = game.messages.contents;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (!isEligibleD20Message(msg) || !isInitiativeMessage(msg)) continue;
        if (getMessageActor(msg)?.id === actor.id) return msg;
    }
    return null;
}

/**
 * Safely updates a combatant's initiative score, using socket delegation if caller lacks permission
 */
export async function updateCombatantInitiative(combatant, newTotal) {
    if (!combatant) return;

    // Preserve PF2e tie-breaker decimal modifier if present
    const oldInit = combatant.initiative;
    let finalInitiative = newTotal;
    if (Number.isFinite(oldInit) && (oldInit % 1 !== 0) && Number.isInteger(newTotal)) {
        const decimal = oldInit % 1;
        finalInitiative = Number((newTotal + decimal).toFixed(2));
    }

    if (game.user.isGM) {
        await combatant.update({ initiative: finalInitiative });
        return;
    }

    try {
        await combatant.update({ initiative: finalInitiative });
    } catch (_) {
        game.socket.emit(`module.${MODULE_ID}`, {
            action: "updateInitiative",
            combatantId: combatant.id,
            initiative: finalInitiative
        });
    }
}

async function runRecklessInjuryCheck(actor, speaker, trigger, sourceMessage = null) {
    const minorThreshold = clampPercent(game.settings.get(MODULE_ID, "minorInjuryThreshold"), 33);
    const majorThreshold = clampPercent(game.settings.get(MODULE_ID, "majorInjuryThreshold"), 5);

    return rollAndResolveInjuryCheck({
        actor,
        speaker,
        majorThreshold,
        minorThreshold,
        trigger,
        sourceMessage,
        delayMs: 2000
    });
}

function buildPushCardHeader(actor, diceString, summaryText) {
    const pushFlavor = diceString === "1d6" ? "(No Injury)" : "(Chance of Injury)";
    const pushTitle = diceString === "1d6" ? "Heroic Push (+1d6)!" : "Reckless Push (+2d6)!";

    return `
        <div class="pf2e chat-card heroic-push-card">
            <header class="card-header flexrow" style="align-items: center; padding-bottom: 5px;">
                <img src="${actor.img || "icons/svg/mystery-man.svg"}" title="${actor.name}" width="36" height="36" style="border: none; margin-right: 8px;"/>
                <h3 style="margin: 0; line-height: normal;">${pushTitle} <br><span style="font-size: 0.8em; color: #555;">${pushFlavor}</span></h3>
            </header>
            <div class="card-content" style="margin-top: 5px; margin-bottom: 5px;">
                <p style="margin: 0 0 5px 0;">${summaryText}</p>
            </div>
        </div>`;
}

/**
 * Pushes initiative directly from the Combat Tracker context menu
 */
export async function doHeroicPushCombatant(li, diceString = "1d6") {
    const combatant = getCombatantFromElement(li);
    if (!combatant) return ui.notifications.error("Could not find the combatant in the tracker.");

    const actor = combatant.actor;
    if (!actor) return ui.notifications.error("No actor linked to that combatant.");
    if (!canControlActor(actor)) return ui.notifications.warn("You do not have permission to push this character's rolls.");

    const hp = actor.system?.resources?.heroPoints?.value ?? 0;
    if (hp < 1) return ui.notifications.warn(`${actor.name} does not have enough Hero Points!`);

    const initMsg = findInitiativeMessage(actor);
    if (initMsg) {
        return doHeroicPush(initMsg, diceString);
    }

    // Fallback if no initiative chat message exists in history
    await actor.update({ "system.resources.heroPoints.value": hp - 1 });

    const pushRoll = new Roll(`1d20 + ${diceString}[Heroic Push]`);
    await pushRoll.evaluate();

    await updateCombatantInitiative(combatant, pushRoll.total);
    ui.notifications.info(`Updated ${actor.name}'s initiative to ${pushRoll.total}!`);

    const speaker = ChatMessage.getSpeaker({ actor, token: combatant.token });
    await ChatMessage.create({
        speaker,
        rolls: [pushRoll],
        flags: {
            core: { initiativeRoll: true },
            pf2e: { context: { type: "initiative" } },
            [MODULE_ID]: { isPushedRoll: true, pushType: diceString }
        },
        flavor: buildPushCardHeader(
            actor,
            diceString,
            `<strong>${actor.name}</strong> spent 1 Hero Point to push Initiative to <strong>${pushRoll.total}</strong>!`
        )
    });

    if (diceString === "2d6") {
        await runRecklessInjuryCheck(actor, speaker, "initiative");
    }
}

/**
 * Macro helper: Pushes the most recent eligible d20 roll
 */
export async function pushLastRoll(diceString = "1d6", options = {}) {
    const msg = findLastPushableMessage(options);
    if (!msg) {
        ui.notifications.warn("No recent eligible d20 roll found to push!");
        return null;
    }
    return doHeroicPush(msg, diceString);
}

/**
 * Macro helper: Heroic push (+1d6) on last roll
 */
export async function heroicPushLast(options = {}) {
    return pushLastRoll("1d6", options);
}

/**
 * Macro helper: Reckless push (+2d6) on last roll
 */
export async function recklessPushLast(options = {}) {
    return pushLastRoll("2d6", options);
}

/**
 * Macro helper: Displays an interactive dialog letting the user push their last roll with high-contrast UI
 */
export async function pushLastDialog(options = {}) {
    const targetActor = options.actor || canvas?.tokens?.controlled?.[0]?.actor || game.user.character || null;
    const lastMsg = findLastPushableMessage({ actor: targetActor });

    if (!lastMsg) {
        return ui.notifications.warn("No recent eligible d20 roll found to push!");
    }

    const rollActor = getMessageActor(lastMsg) || targetActor;
    if (!rollActor) {
        return ui.notifications.error("Could not determine an actor for that roll.");
    }
    if (!canControlActor(rollActor)) {
        return ui.notifications.warn("You do not have permission to push this character's rolls.");
    }

    const hp = rollActor.system?.resources?.heroPoints?.value ?? 0;
    const oldRoll = lastMsg.rolls?.[0];
    const rollTotal = oldRoll?.total ?? "?";
    const checkName = getCheckDisplayName(lastMsg);

    const context = lastMsg.flags?.pf2e?.context;
    const dcValue = Number(context?.dc?.value ?? context?.dc ?? oldRoll?.options?.dc?.value ?? oldRoll?.options?.dc);
    const dcText = Number.isFinite(dcValue)
        ? ` <span style="color: #cbd5e1; font-weight: 500;">(vs DC <strong style="color: #fbbf24;">${dcValue}</strong>)</span>`
        : "";

    const hpBadge = hp > 0
        ? `<span style="color: #fbbf24; font-weight: bold;"><i class="fas fa-star" style="color: #f59e0b;"></i> Hero Points: <span style="color: #ffffff; background: #b45309; padding: 2px 8px; border-radius: 10px; font-weight: 800; font-size: 0.95em;">${hp}</span></span>`
        : `<span style="color: #fca5a5; font-weight: bold;"><i class="far fa-star" style="color: #ef4444;"></i> Hero Points: <span style="color: #ffffff; background: #991b1b; padding: 2px 8px; border-radius: 10px; font-weight: 800; font-size: 0.95em;">0</span> <em style="font-size: 0.85em; color: #fecaca; font-weight: normal;">(Need 1 to push)</em></span>`;

    const content = `
    <div class="pf2e-heroic-push-dialog">
        <div class="push-info-card" style="display: flex; gap: 14px; align-items: center; background: #1a1e2b; border: 2px solid #3d4663; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            <img src="${rollActor.img || "icons/svg/mystery-man.svg"}" width="54" height="54" style="border: 2px solid #d4af37; border-radius: 6px; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.4);" />
            <div style="flex: 1;">
                <div style="font-size: 1.25em; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${rollActor.name}</div>
                <div style="margin-top: 3px;">${hpBadge}</div>
                <div style="font-size: 0.95em; color: #e2e8f0; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.15); display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                    <span>Last Roll: <strong style="color: #93c5fd; background: rgba(59, 130, 246, 0.25); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(147, 197, 253, 0.4);">${checkName}</strong></span>
                    <span style="color: #64748b;">•</span>
                    <span>Total: <strong style="color: #4ade80; font-size: 1.15em; font-weight: 800; text-shadow: 0 0 4px rgba(74, 222, 128, 0.4);">${rollTotal}</strong>${dcText}</span>
                </div>
            </div>
        </div>
        <p style="margin: 0 0 12px 0; color: #191813; font-size: 1.05em; font-weight: 700; text-align: center;">
            Spend <strong style="color: #8f1d24;">1 Hero Point</strong> to push your luck on this roll:
        </p>
    </div>`;

    new Dialog({
        title: "Push Last Roll — Hero Points",
        content,
        buttons: {
            heroic: {
                icon: '<i class="fas fa-dice-d6" style="color: #4a8a2a;"></i>',
                label: "Heroic Push (+1d6)",
                callback: () => doHeroicPush(lastMsg, "1d6")
            },
            reckless: {
                icon: '<i class="fas fa-biohazard" style="color: #cc0000;"></i>',
                label: "Reckless Push (+2d6)",
                callback: () => doHeroicPush(lastMsg, "2d6")
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "heroic"
    }).render(true);
}

function updateDegreeOfSuccessBadge(htmlString, newOutcome, outcomeLabel) {
    if (!htmlString) return htmlString;
    const outcomes = ["criticalFailure", "failure", "success", "criticalSuccess"];
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;
    const badge = tempDiv.querySelector(".degree-of-success");
    if (badge) {
        outcomes.forEach(o => badge.classList.remove(o));
        badge.classList.add(newOutcome);
        badge.innerHTML = outcomeLabel;
        return tempDiv.innerHTML;
    }
    return htmlString;
}

/**
 * Core push execution function
 */
export async function doHeroicPush(message, diceString = "1d6") {
    if (!message) {
        message = findLastPushableMessage();
        if (!message) {
            ui.notifications.warn("No recent d20 roll found to push.");
            return;
        }
    }

    const msgActor = getMessageActor(message);
    if (!msgActor) return ui.notifications.error("Could not find an actor associated with that roll.");
    if (!canControlActor(msgActor)) return ui.notifications.warn("You do not have permission to push this character's rolls.");

    const hp = msgActor.system?.resources?.heroPoints?.value ?? 0;
    if (hp < 1) return ui.notifications.warn(`${msgActor.name} does not have enough Hero Points!`);

    await msgActor.update({ "system.resources.heroPoints.value": hp - 1 });

    const oldRoll = message.rolls?.[0];
    if (!oldRoll) return ui.notifications.error("The message did not contain a valid roll to push.");

    // Preserve trailing formula comments (# ...) after appending push dice
    let formula = oldRoll.formula;
    let comment = "";
    if (formula.includes("#")) {
        const parts = formula.split("#");
        formula = parts[0].trim();
        comment = ` # ${parts.slice(1).join("#").trim()}`;
    }

    const newFormula = `${formula} + ${diceString}[Heroic Push]${comment}`;

    const rollOptions = foundry.utils.deepClone(oldRoll.options || {});
    delete rollOptions.degreeOfSuccess;
    delete rollOptions.total;
    rollOptions.isReroll = true;

    const RollClass = CONFIG.Dice.rolls.find(r => r.name === oldRoll.constructor?.name) || oldRoll.constructor || Roll;
    const newRoll = new RollClass(newFormula, oldRoll.data, rollOptions);
    await newRoll.evaluate();

    const flavorPrefix = buildPushCardHeader(
        msgActor,
        diceString,
        `<strong>${msgActor.name}</strong> spent 1 Hero Point to push their roll!`
    );

    const msgData = message.toObject();
    delete msgData._id;
    delete msgData.timestamp;
    msgData.rolls = [newRoll];

    let originalFlavor = msgData.flavor || "";
    const context = msgData.flags?.pf2e?.context;
    const dcValue = Number(context?.dc?.value ?? context?.dc ?? oldRoll.options?.dc?.value ?? oldRoll.options?.dc);

    if (Number.isFinite(dcValue)) {
        const total = newRoll.total;
        const d20Roll = newRoll.dice.find(d => d.faces === 20) || newRoll.terms?.find(t => t.faces === 20);
        const d20Result = d20Roll ? (d20Roll.results ? d20Roll.results.find(r => r.active)?.result : d20Roll.total) : null;

        let degree = 0;
        if (total >= dcValue + 10) degree = 3;
        else if (total >= dcValue) degree = 2;
        else if (total <= dcValue - 10) degree = 0;
        else degree = 1;

        if (d20Result === 20) degree = Math.min(3, degree + 1);
        if (d20Result === 1) degree = Math.max(0, degree - 1);

        const outcomes = ["criticalFailure", "failure", "success", "criticalSuccess"];
        const outcomeLabels = ["Critical Failure", "Failure", "Success", "Critical Success"];
        const newOutcome = outcomes[degree];
        const newLabel = outcomeLabels[degree];

        if (context) {
            context.outcome = newOutcome;
            if (context.unadjustedOutcome) context.unadjustedOutcome = newOutcome;
        }

        originalFlavor = updateDegreeOfSuccessBadge(originalFlavor, newOutcome, newLabel);
        if (msgData.content) {
            msgData.content = updateDegreeOfSuccessBadge(msgData.content, newOutcome, newLabel);
        }
    }

    if (msgData.content) {
        const tempContent = document.createElement("div");
        tempContent.innerHTML = msgData.content;
        const totalEl = tempContent.querySelector(".dice-total");
        if (totalEl) totalEl.textContent = String(newRoll.total);
        const formulaEl = tempContent.querySelector(".dice-formula");
        if (formulaEl) formulaEl.textContent = newFormula;
        msgData.content = tempContent.innerHTML;
    }

    msgData.flavor = flavorPrefix + originalFlavor;

    msgData.flags = foundry.utils.deepClone(msgData.flags || {});
    foundry.utils.setProperty(msgData.flags, `${MODULE_ID}.isPushedRoll`, true);
    foundry.utils.setProperty(msgData.flags, `${MODULE_ID}.pushType`, diceString);
    foundry.utils.setProperty(msgData.flags, `${MODULE_ID}.originalMessageId`, message.id);

    await ChatMessage.create(msgData);

    if (isInitiativeMessage(message)) {
        const combatant = findCombatantForActor(msgActor, message.speaker?.token);
        if (combatant) {
            await updateCombatantInitiative(combatant, newRoll.total);
            ui.notifications.info(`Updated ${msgActor.name}'s initiative to ${newRoll.total}!`);
        }
    }

    if (diceString === "2d6") {
        await runRecklessInjuryCheck(msgActor, message.speaker, detectInjuryTrigger(message), message);
    }
}

/**
 * Finds or creates the dedicated folder for module macros
 */
export async function getMacroFolder() {
    let folder = game.folders.find(f => f.type === "Macro" && f.name === "PF2e Awesome Hero Point Rework");
    if (!folder && game.user.isGM) {
        try {
            folder = await Folder.create({
                name: "PF2e Awesome Hero Point Rework",
                type: "Macro",
                color: "#8f1d24"
            });
        } catch (err) {
            console.warn("PF2e Awesome Hero Point Rework | Could not create macro folder:", err);
            return null;
        }
    }
    return folder || null;
}

/**
 * Automatically creates and keeps world macros synchronized in their own dedicated folder
 */
async function ensureModuleMacros() {
    if (!game.user.isGM) return;

    const folder = await getMacroFolder();
    const folderId = folder ? folder.id : null;

    const deprecatedNames = ["Heroic Push (Last Roll)", "Reckless Push (Last Roll)"];
    for (const oldName of deprecatedNames) {
        const deprecated = game.macros.find(m => m.name === oldName && m.flags?.[MODULE_ID]?.isManaged);
        if (deprecated) {
            try {
                await deprecated.delete();
                console.log(`PF2e Awesome Hero Point Rework | Removed deprecated macro: ${oldName}`);
            } catch (err) {
                console.warn(`PF2e Awesome Hero Point Rework | Could not remove deprecated macro ${oldName}:`, err);
            }
        }
    }

    const macrosToManage = [
        {
            name: "Hero Point Last Roll",
            legacyNames: ["PF2e Awesome Hero Points: Push Last Roll"],
            command: `game.modules.get("${MODULE_ID}")?.api?.pushLastDialog();`,
            img: "icons/commodities/currency/coin-embossed-star-gold.webp",
            type: "script"
        },
        {
            name: "Injury Check",
            command: `game.modules.get("${MODULE_ID}")?.api?.injuryCheck();`,
            img: "icons/skills/wounds/injury-stitched-flesh-red.webp",
            type: "script"
        },
        {
            name: "Determine Injury",
            command: `window.DetermineInjuryDialog ? window.DetermineInjuryDialog() : game.modules.get("${MODULE_ID}")?.api?.openDetermineInjury();`,
            img: "icons/skills/wounds/injury-face-impact-orange.webp",
            type: "script"
        }
    ];

    for (const macroData of macrosToManage) {
        const { legacyNames = [], ...createData } = macroData;
        let existing = game.macros.find(m => m.name === macroData.name);

        if (!existing && legacyNames.length > 0) {
            existing = game.macros.find(m => legacyNames.includes(m.name) && m.flags?.[MODULE_ID]?.isManaged);
        }

        if (!existing) {
            try {
                await Macro.create({
                    ...createData,
                    folder: folderId,
                    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
                    flags: { [MODULE_ID]: { isManaged: true } }
                });
                console.log(`PF2e Awesome Hero Point Rework | Auto-created macro: ${macroData.name}`);
            } catch (err) {
                console.warn(`PF2e Awesome Hero Point Rework | Could not create macro ${macroData.name}:`, err);
            }
        } else {
            const updates = {};
            if (existing.name !== macroData.name) updates.name = macroData.name;
            if (existing.command !== macroData.command) updates.command = macroData.command;
            if (existing.img !== macroData.img) updates.img = macroData.img;
            if (folderId && existing.folder?.id !== folderId) updates.folder = folderId;
            if (!existing.flags?.[MODULE_ID]?.isManaged) {
                foundry.utils.setProperty(updates, `flags.${MODULE_ID}.isManaged`, true);
            }
            if (Object.keys(updates).length > 0) {
                await existing.update(updates);
                console.log(`PF2e Awesome Hero Point Rework | Updated macro: ${macroData.name}`);
            }

            for (const oldName of legacyNames) {
                const leftover = game.macros.find(m => m.name === oldName && m.id !== existing.id && m.flags?.[MODULE_ID]?.isManaged);
                if (leftover) {
                    try {
                        await leftover.delete();
                    } catch (err) {
                        console.warn(`PF2e Awesome Hero Point Rework | Could not remove legacy macro ${oldName}:`, err);
                    }
                }
            }
        }
    }
}
