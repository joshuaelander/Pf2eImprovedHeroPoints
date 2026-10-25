import { determineInjuryDialog } from "./determine-injury.js";

Hooks.once("init", () => {
    console.log("PF2e Awesome Hero Point Rework | Initializing module v1.4.0");

    game.settings.register("heroic-push-pf2e", "enableHeroicPush", {
        name: "Enable Heroic Push (+1d6)",
        hint: "Shows the Heroic Push option in the right-click menu for chat messages.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("heroic-push-pf2e", "enableRecklessPush", {
        name: "Enable Reckless Push (+2d6)",
        hint: "Shows the Reckless Push option in the right-click menu for chat messages.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("heroic-push-pf2e", "autoCreateMacros", {
        name: "Auto-Create World Macros for Players",
        hint: "Automatically ensures Heroic Push, Reckless Push, and Push Prompt macros exist in the World Macros directory for easy hotbar dragging.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register("heroic-push-pf2e", "minorInjuryThreshold", {
        name: "Minor Injury Threshold (%)",
        hint: "The maximum d100 roll that results in an injury. Rolls between (Major Injury Threshold + 1) and this value result in a Minor Injury. Rolls above this value result in No Injury. (Default: 33, giving a 33% overall injury chance).",
        scope: "world",
        config: true,
        type: Number,
        default: 33
    });

    game.settings.register("heroic-push-pf2e", "majorInjuryThreshold", {
        name: "Major Injury Threshold (%)",
        hint: "The maximum d100 roll that results in a Major Injury. Rolls from 1 up to this value result in a Major Injury. (Default: 5, giving a 5% chance).",
        scope: "world",
        config: true,
        type: Number,
        default: 5
    });

    // Expose public API
    const api = {
        doHeroicPush,
        findLastPushableMessage,
        pushLastRoll,
        heroicPushLast,
        recklessPushLast,
        pushLastDialog,
        openDetermineInjury: (actor, severity, trigger) => determineInjuryDialog(actor, severity, trigger),
        getMessageActor,
        hasD20Roll,
        isPushableMessage,
        detectInjuryTrigger,
        getCheckDisplayName,
        getMacroFolder
    };

    game.modules.get("heroic-push-pf2e").api = api;
    game.heroicPush = api;
    window.HeroicPush = api;

    // Register Context Menu Options
    Hooks.on("getChatMessageContextOptions", (app, options) => {
        injectMenuOptions(options);
    });
});

Hooks.once("ready", async () => {
    if (game.user.isGM && game.settings.get("heroic-push-pf2e", "autoCreateMacros")) {
        await ensureModuleMacros();
    }
});

/**
 * Universal helper to extract a ChatMessage from any DOM element (including inner children)
 */
export function getMessageFromElement(li) {
    const element = li instanceof HTMLElement ? li : (li?.[0] || li);
    if (!element) return null;
    const targetEl = element.closest ? (element.closest("[data-message-id], [data-entry-id], [data-document-id], .chat-message, .message") || element) : element;
    const id = targetEl.dataset?.messageId 
        || targetEl.dataset?.entryId 
        || targetEl.dataset?.documentId 
        || targetEl.getAttribute?.("data-message-id")
        || targetEl.getAttribute?.("data-entry-id")
        || targetEl.getAttribute?.("data-document-id");
    return game.messages.get(id) || null;
}

/**
 * Robust actor resolver across world actors, tokens, synthetic actors, and flags
 */
export function getMessageActor(message) {
    if (!message) return null;
    if (message.actor) return message.actor;

    // Check PF2e context actor UUID
    if (message.flags?.pf2e?.context?.actor) {
        try {
            const actor = fromUuidSync(message.flags.pf2e.context.actor);
            if (actor) return actor;
        } catch (_) {}
    }

    // Check message speaker
    if (message.speaker) {
        const speakerActor = ChatMessage.getSpeakerActor(message.speaker);
        if (speakerActor) return speakerActor;

        if (message.speaker.actor) {
            const worldActor = game.actors.get(message.speaker.actor);
            if (worldActor) return worldActor;
        }

        if (message.speaker.scene && message.speaker.token) {
            const scene = game.scenes.get(message.speaker.scene);
            const token = scene?.tokens?.get(message.speaker.token);
            if (token?.actor) return token.actor;
        }
    }

    // Fallback: If current user created this message, fallback to their controlled token or character
    if (message.author?.id === game.user.id) {
        if (canvas?.tokens?.controlled?.[0]?.actor) return canvas.tokens.controlled[0].actor;
        if (game.user.character) return game.user.character;
    }

    return null;
}

/**
 * Verifies if a message contains at least one d20 roll
 */
export function hasD20Roll(message) {
    if (!message?.rolls?.length) return false;
    return message.rolls.some(roll => {
        if (roll.dice?.some(d => d.faces === 20)) return true;
        if (roll.terms?.some(t => t.faces === 20 || (t.rolls && t.rolls.some(r => r.faces === 20)))) return true;
        return false;
    });
}

/**
 * Checks if a chat message is eligible for pushing
 */
export function isPushableMessage(message, user = game.user) {
    try {
        if (!message) return false;
        if (!hasD20Roll(message)) return false;
        if (message.flags?.pf2e?.context?.type?.includes("damage")) return false;
        if (message.flags?.["heroic-push-pf2e"]?.isInjuryRoll) return false;

        const actor = getMessageActor(message);
        if (!actor) return false;

        const isOwner = user.isGM || actor.isOwner || (user.character?.id === actor.id);
        return Boolean(isOwner);
    } catch (err) {
        console.error("PF2e Awesome Hero Point Rework | Error evaluating pushable message:", err);
        return false;
    }
}

/**
 * Context menu injection
 */
function injectMenuOptions(options) {
    const canPush = (li) => {
        const msg = getMessageFromElement(li);
        return isPushableMessage(msg, game.user);
    };

    const newOptions = [];

    if (game.settings.get("heroic-push-pf2e", "enableHeroicPush")) {
        newOptions.push({
            name: "Reroll with Heroic Push (+1d6)",
            icon: '<i class="fas fa-dice-d6" style="color: #4a8a2a;"></i>',
            condition: canPush,
            callback: li => doHeroicPush(getMessageFromElement(li), "1d6")
        });
    }

    if (game.settings.get("heroic-push-pf2e", "enableRecklessPush")) {
        newOptions.push({
            name: "Reroll with Reckless Push (+2d6)",
            icon: '<i class="fas fa-biohazard" style="color: #cc0000;"></i>',
            condition: canPush,
            callback: li => doHeroicPush(getMessageFromElement(li), "2d6")
        });
    }

    if (newOptions.length > 0) {
        options.unshift(...newOptions);
    }
}

/**
 * Extracts a clean, descriptive display name for the check (never returns generic "All")
 */
export function getCheckDisplayName(message) {
    if (!message) return "Roll";

    // 1. Try to extract from chat message flavor/header HTML
    if (message.flavor) {
        try {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = message.flavor;
            const header = tempDiv.querySelector("h3, h4, .title, header");
            if (header?.textContent?.trim()) {
                const cleanTitle = header.textContent.trim().replace(/\s+/g, " ");
                if (!cleanTitle.includes("Heroic Push") && !cleanTitle.includes("Reckless Push") && cleanTitle.length > 1) {
                    return cleanTitle;
                }
            }
        } catch (_) {}
    }

    // 2. Check item name (e.g. "Arcane Spell Attack", "Strike: Longsword", "Produce Flame")
    if (message.item?.name) {
        return message.item.name;
    }

    const context = message.flags?.pf2e?.context;

    // 3. Check specific domains (excluding generic domains like "all", "check", "roll")
    if (context?.domains?.length) {
        const specificDomain = context.domains.find(d => !["all", "check", "roll", "d20"].includes(String(d).toLowerCase()));
        if (specificDomain) {
            return String(specificDomain).replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    // 4. Check context type
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

    // 1. Spell Attacks
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

    // 2. Wounded Recovery
    if (domains.some(d => d.includes("recovery"))
        || options.some(o => o.includes("recovery"))
        || flavor.includes("recovery check")
        || content.includes("recovery check")) {
        return "woundedRecovery";
    }

    // 3. Initiative
    if (type === "initiative"
        || domains.includes("initiative")
        || message.flags?.core?.initiativeRoll
        || flavor.includes("initiative")
        || content.includes("initiative")) {
        return "initiative";
    }

    // 4. Saving Throws
    if (type === "saving-throw"
        || domains.some(d => ["saving-throw", "fortitude", "reflex", "will"].includes(d))
        || flavor.includes("saving throw")
        || flavor.includes("save vs")
        || content.includes("saving throw")) {
        return "savingThrows";
    }

    // 5. Skill Checks & Perception
    if (type === "skill-check"
        || type === "perception-check"
        || domains.some(d => d.includes("skill") || d.includes("perception"))
        || flavor.includes("skill check")
        || flavor.includes("perception")) {
        return "skillChecks";
    }

    // 6. Regular Attacks / Strikes (default fallback for attack rolls)
    if (type === "attack-roll"
        || domains.some(d => d.includes("attack"))
        || flavor.includes("strike")
        || flavor.includes("attack")
        || content.includes("strike")) {
        return "attacks";
    }

    return "attacks";
}

/**
 * Searches chat history backwards to find the most recent pushable d20 roll
 */
export function findLastPushableMessage(options = {}) {
    const user = options.user || game.user;
    let targetActor = options.actor || null;

    if (!targetActor) {
        targetActor = canvas?.tokens?.controlled?.[0]?.actor || user.character || null;
    }

    const messages = game.messages.contents;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (!hasD20Roll(msg)) continue;
        if (msg.flags?.pf2e?.context?.type?.includes("damage")) continue;
        if (msg.flags?.["heroic-push-pf2e"]?.isInjuryRoll) continue;

        const msgActor = getMessageActor(msg);
        if (!msgActor) continue;

        if (targetActor) {
            if (msgActor.id !== targetActor.id) continue;
        } else if (!user.isGM) {
            const isOwner = msgActor.isOwner || (user.character?.id === msgActor.id);
            if (!isOwner) continue;
        }

        return msg;
    }

    // Fallback if targetActor had no recent roll: check any character the player owns
    if (targetActor && !user.isGM) {
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (!hasD20Roll(msg)) continue;
            if (msg.flags?.pf2e?.context?.type?.includes("damage")) continue;
            if (msg.flags?.["heroic-push-pf2e"]?.isInjuryRoll) continue;

            const msgActor = getMessageActor(msg);
            if (!msgActor) continue;

            if (msgActor.isOwner || (user.character?.id === msgActor.id)) {
                return msg;
            }
        }
    }

    return null;
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
    let targetActor = options.actor || canvas?.tokens?.controlled?.[0]?.actor || game.user.character || null;
    const lastMsg = findLastPushableMessage({ actor: targetActor });

    if (!lastMsg) {
        return ui.notifications.warn("No recent eligible d20 roll found to push!");
    }

    const rollActor = getMessageActor(lastMsg) || targetActor;
    if (!rollActor) {
        return ui.notifications.error("Could not determine an actor for that roll.");
    }

    const canControl = game.user.isGM || rollActor.isOwner || (game.user.character?.id === rollActor.id);
    if (!canControl) {
        return ui.notifications.warn("You do not have permission to push this character's rolls.");
    }

    const hp = rollActor.system?.resources?.heroPoints?.value ?? 0;
    const oldRoll = lastMsg.rolls?.[0];
    const rollTotal = oldRoll?.total ?? "?";

    const checkName = getCheckDisplayName(lastMsg);

    const context = lastMsg.flags?.pf2e?.context;
    const dcValue = Number(context?.dc?.value ?? context?.dc ?? oldRoll?.options?.dc?.value ?? oldRoll?.options?.dc);
    const dcText = Number.isFinite(dcValue) ? ` <span style="color: #cbd5e1; font-weight: 500;">(vs DC <strong style="color: #fbbf24;">${dcValue}</strong>)</span>` : "";

    const hpBadge = hp > 0
        ? `<span style="color: #fbbf24; font-weight: bold;"><i class="fas fa-star" style="color: #f59e0b;"></i> Hero Points: <span style="color: #ffffff; background: #b45309; padding: 2px 8px; border-radius: 10px; font-weight: 800; font-size: 0.95em;">${hp}</span></span>`
        : `<span style="color: #fca5a5; font-weight: bold;"><i class="far fa-star" style="color: #ef4444;"></i> Hero Points: <span style="color: #ffffff; background: #991b1b; padding: 2px 8px; border-radius: 10px; font-weight: 800; font-size: 0.95em;">0</span> <em style="font-size: 0.85em; color: #fecaca; font-weight: normal;">(Need 1 to push)</em></span>`;

    const content = `
    <div class="pf2e-heroic-push-dialog">
        <div class="push-info-card" style="display: flex; gap: 14px; align-items: center; background: #1a1e2b; border: 2px solid #3d4663; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            <img src="${rollActor.img || 'icons/svg/mystery-man.svg'}" width="54" height="54" style="border: 2px solid #d4af37; border-radius: 6px; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.4);" />
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
                callback: async () => {
                    await doHeroicPush(lastMsg, "1d6");
                }
            },
            reckless: {
                icon: '<i class="fas fa-biohazard" style="color: #cc0000;"></i>',
                label: "Reckless Push (+2d6)",
                callback: async () => {
                    await doHeroicPush(lastMsg, "2d6");
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "heroic"
    }).render(true);
}

/**
 * Helper to update Degree of Success badge inside HTML strings
 */
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

    const canControl = game.user.isGM || msgActor.isOwner || (game.user.character?.id === msgActor.id);
    if (!canControl) return ui.notifications.warn("You do not have permission to push this character's rolls.");

    const hp = msgActor.system?.resources?.heroPoints?.value ?? 0;
    if (hp < 1) return ui.notifications.warn(`${msgActor.name} does not have enough Hero Points!`);

    // Deduct 1 Hero Point
    await msgActor.update({ "system.resources.heroPoints.value": hp - 1 });

    const oldRoll = message.rolls?.[0];
    if (!oldRoll) return ui.notifications.error("The message did not contain a valid roll to push.");

    // Clean formula of any trailing comments (# ...)
    let formula = oldRoll.formula;
    let comment = "";
    if (formula.includes("#")) {
        const parts = formula.split("#");
        formula = parts[0].trim();
        comment = ` # ${parts.slice(1).join("#").trim()}`;
    }

    const newFormula = `${formula} + ${diceString}[Heroic Push]${comment}`;

    // Clean roll options to prevent stale degrees of success
    const rollOptions = foundry.utils.deepClone(oldRoll.options || {});
    delete rollOptions.degreeOfSuccess;
    delete rollOptions.total;
    rollOptions.isReroll = true;

    const RollClass = CONFIG.Dice.rolls.find(r => r.name === oldRoll.constructor?.name) || oldRoll.constructor || Roll;
    const newRoll = new RollClass(newFormula, oldRoll.data, rollOptions);
    await newRoll.evaluate();

    const pushFlavor = diceString === "1d6" ? "(No Injury)" : "(Chance of Injury)";
    const pushTitle = diceString === "1d6" ? "Heroic Push (+1d6)!" : "Reckless Push (+2d6)!";

    const flavorPrefix = `
        <div class="pf2e chat-card heroic-push-card">
            <header class="card-header flexrow" style="align-items: center; padding-bottom: 5px;">
                <img src="${msgActor.img || 'icons/svg/mystery-man.svg'}" title="${msgActor.name}" width="36" height="36" style="border: none; margin-right: 8px;"/>
                <h3 style="margin: 0; line-height: normal;">${pushTitle} <br><span style="font-size: 0.8em; color: #555;">${pushFlavor}</span></h3>
            </header>
            <div class="card-content" style="margin-top: 5px; margin-bottom: 5px;">
                <p style="margin: 0 0 5px 0;"><strong>${msgActor.name}</strong> spent 1 Hero Point to push their roll!</p>
            </div>
        </div>`;

    const msgData = message.toObject();
    delete msgData._id;
    delete msgData.timestamp;

    msgData.rolls = [newRoll];

    let originalFlavor = msgData.flavor || "";
    const context = msgData.flags?.pf2e?.context;
    const rawDc = context?.dc?.value ?? context?.dc ?? oldRoll.options?.dc?.value ?? oldRoll.options?.dc;
    const dcValue = Number(rawDc);

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

        // Update badge in both flavor and content
        originalFlavor = updateDegreeOfSuccessBadge(originalFlavor, newOutcome, newLabel);
        if (msgData.content) {
            msgData.content = updateDegreeOfSuccessBadge(msgData.content, newOutcome, newLabel);
        }
    }

    // Update rendered dice totals in content if present
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
    foundry.utils.setProperty(msgData.flags, "heroic-push-pf2e.isPushedRoll", true);
    foundry.utils.setProperty(msgData.flags, "heroic-push-pf2e.pushType", diceString);
    foundry.utils.setProperty(msgData.flags, "heroic-push-pf2e.originalMessageId", message.id);

    await ChatMessage.create(msgData);

    // Reckless Push injury roll
    if (diceString === "2d6") {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const injuryRoll = new Roll("1d100");
        await injuryRoll.evaluate();

        const rawMinor = Number(game.settings.get("heroic-push-pf2e", "minorInjuryThreshold"));
        const rawMajor = Number(game.settings.get("heroic-push-pf2e", "majorInjuryThreshold"));
        const minorThreshold = Math.min(Math.max(Number.isFinite(rawMinor) ? rawMinor : 33, 0), 100);
        const majorThreshold = Math.min(Math.max(Number.isFinite(rawMajor) ? rawMajor : 5, 0), 100);

        let resultTitle, resultColor, tableRollText, icon;
        let severity = null;

        if (injuryRoll.total <= majorThreshold) {
            severity = "major";
            resultTitle = "Major Injury!!!";
            resultColor = "#cc0000";
            icon = "fa-skull-crossbones";
            tableRollText = "The hero suffered a Major Injury! Rolling for consequence...";
        } else if (injuryRoll.total <= minorThreshold) {
            severity = "minor";
            resultTitle = "Minor Injury!";
            resultColor = "#d08000";
            icon = "fa-user-injured";
            tableRollText = "The hero suffered a Minor Injury. Rolling for consequence...";
        } else {
            resultTitle = "No Injury";
            resultColor = "#4a8a2a";
            icon = "fa-check-circle";
            tableRollText = "The hero pushed through safely.";
        }

        await ChatMessage.create({
            speaker: message.speaker,
            rolls: [injuryRoll],
            flags: {
                "heroic-push-pf2e": { isInjuryRoll: true, severity }
            },
            flavor: `
                <div style="background: rgba(0,0,0,0.05); border: 2px solid ${resultColor}; padding: 8px; border-radius: 5px; text-align: center; margin-bottom: 5px;">
                    <h4 style="color: ${resultColor}; margin: 0 0 5px 0; font-size: 1.2em; border-bottom: 1px solid ${resultColor}; padding-bottom: 3px;">
                        <i class="fas ${icon}"></i> <strong>${resultTitle}</strong>
                    </h4>
                    <p style="margin: 0; font-size: 1.1em;">${tableRollText}</p>
                </div>`
        });

        if (severity) {
            const detectedTrigger = detectInjuryTrigger(message);
            if (typeof determineInjuryDialog === "function") {
                ui.notifications.info(`Injury sustained! Determining injury consequence...`);
                determineInjuryDialog(msgActor, severity, detectedTrigger);
            } else if (typeof window.DetermineInjuryDialog === "function") {
                ui.notifications.info(`Injury sustained! Determining injury consequence...`);
                window.DetermineInjuryDialog(msgActor, severity, detectedTrigger);
            } else {
                ui.notifications.warn(`Could not find the function or macro to determine injury.`);
            }
        }
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
    return folder;
}

/**
 * Automatically creates and keeps world macros synchronized in their own dedicated folder
 */
async function ensureModuleMacros() {
    if (!game.user.isGM) return;

    const folder = await getMacroFolder();
    const folderId = folder ? folder.id : null;

    const macrosToManage = [
        {
            name: "Heroic Push (Last Roll)",
            command: `game.modules.get("heroic-push-pf2e")?.api?.heroicPushLast();`,
            img: "icons/sundries/gaming/dice-pair-white-green.webp",
            type: "script"
        },
        {
            name: "Reckless Push (Last Roll)",
            command: `game.modules.get("heroic-push-pf2e")?.api?.recklessPushLast();`,
            img: "icons/magic/fire/flame-burning-skull-orange.webp",
            type: "script"
        },
        {
            name: "PF2e Awesome Hero Points: Push Last Roll",
            command: `game.modules.get("heroic-push-pf2e")?.api?.pushLastDialog();`,
            img: "icons/commodities/currency/coin-embossed-star-gold.webp",
            type: "script"
        },
        {
            name: "Determine Injury",
            command: `window.DetermineInjuryDialog ? window.DetermineInjuryDialog() : game.modules.get("heroic-push-pf2e")?.api?.openDetermineInjury();`,
            img: "icons/skills/wounds/injury-face-impact-orange.webp",
            type: "script"
        }
    ];

    for (const macroData of macrosToManage) {
        let existing = game.macros.find(m => m.name === macroData.name);
        if (!existing) {
            try {
                await Macro.create({
                    ...macroData,
                    folder: folderId,
                    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
                    flags: { "heroic-push-pf2e": { isManaged: true } }
                });
                console.log(`PF2e Awesome Hero Point Rework | Auto-created macro: ${macroData.name}`);
            } catch (err) {
                console.warn(`PF2e Awesome Hero Point Rework | Could not create macro ${macroData.name}:`, err);
            }
        } else {
            // Update image, command, and ensure folder membership
            const updates = {};
            if (existing.command !== macroData.command) updates.command = macroData.command;
            if (existing.img !== macroData.img) updates.img = macroData.img;
            if (folderId && existing.folder?.id !== folderId) updates.folder = folderId;
            if (!existing.flags?.["heroic-push-pf2e"]?.isManaged) {
                foundry.utils.setProperty(updates, "flags.heroic-push-pf2e.isManaged", true);
            }
            if (Object.keys(updates).length > 0) {
                await existing.update(updates);
                console.log(`PF2e Awesome Hero Point Rework | Updated macro: ${macroData.name}`);
            }
        }
    }
}