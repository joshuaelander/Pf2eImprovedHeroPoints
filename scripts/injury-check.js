import { determineInjuryDialog } from "./determine-injury.js";
import { MODULE_ID, clampPercent, resolveDomRoot, canControlActor } from "./injury-effects.js";

/**
 * Reads the current Wounded condition value on a PF2e actor (returns 0 if not wounded).
 */
export function getActorWoundedValue(actor) {
    if (!actor) return 0;

    const condition = actor.getCondition?.("wounded")
        || actor.conditions?.get?.("wounded")
        || actor.items?.find(i => i.type === "condition" && (i.slug === "wounded" || i.system?.slug === "wounded"));

    if (!condition) return 0;

    const rawVal = condition.value ?? condition.system?.value?.value ?? 1;
    const val = Number(rawVal);
    return Number.isFinite(val) && val > 0 ? val : 1;
}

/**
 * Removes all Wounded condition items from an actor.
 */
export async function removeWoundedConditions(actor) {
    if (!actor) return false;
    let removed = false;

    try {
        if (typeof actor.decreaseCondition === "function" && actor.getCondition?.("wounded")) {
            await actor.decreaseCondition("wounded", { forceRemove: true });
            removed = true;
        }
    } catch (err) {
        console.warn("PF2e Awesome Hero Point Rework | decreaseCondition failed, falling back to item deletion:", err);
    }

    const remainingWounded = actor.items?.filter(i =>
        i.type === "condition" && (i.slug === "wounded" || i.system?.slug === "wounded")
    ) || [];

    if (remainingWounded.length > 0) {
        await actor.deleteEmbeddedDocuments("Item", remainingWounded.map(i => i.id));
        removed = true;
    }

    return removed;
}

/**
 * Shared helper that rolls 1d100 against injury thresholds, posts the result card,
 * and opens Determine Injury when an injury is sustained.
 */
export async function rollAndResolveInjuryCheck({
    actor = null,
    speaker = null,
    majorThreshold = 5,
    minorThreshold = 33,
    trigger = "attacks",
    titlePrefix = "",
    subtitle = "",
    majorText = "The hero suffered a Major Injury! Rolling for consequence...",
    minorText = "The hero suffered a Minor Injury. Rolling for consequence...",
    safeText = "The hero pushed through safely.",
    notificationText = "Injury sustained! Determining injury consequence...",
    flags = {},
    delayMs = 0,
    onAfterRoll = null
} = {}) {
    if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const injuryRoll = new Roll("1d100");
    await injuryRoll.evaluate();

    let severity = null;
    let resultTitle, resultColor, icon, bodyText;

    if (injuryRoll.total <= majorThreshold) {
        severity = "major";
        resultTitle = "Major Injury!!!";
        resultColor = "#cc0000";
        icon = "fa-skull-crossbones";
        bodyText = majorText;
    } else if (injuryRoll.total <= minorThreshold) {
        severity = "minor";
        resultTitle = "Minor Injury!";
        resultColor = "#d08000";
        icon = "fa-user-injured";
        bodyText = minorText;
    } else {
        resultTitle = "No Injury";
        resultColor = "#4a8a2a";
        icon = "fa-check-circle";
        bodyText = safeText;
    }

    const resolvedBodyText = typeof bodyText === "function" ? bodyText(injuryRoll.total) : bodyText;
    const footerHtml = onAfterRoll ? (await onAfterRoll({ roll: injuryRoll, severity })) || "" : "";
    const subtitleHtml = subtitle ? `<p style="margin: 0 0 4px 0; font-size: 0.9em; color: #555;">${subtitle}</p>` : "";

    await ChatMessage.create({
        speaker: speaker || (actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker()),
        rolls: [injuryRoll],
        flags: {
            [MODULE_ID]: { isInjuryRoll: true, severity, ...flags }
        },
        flavor: `
            <div style="background: rgba(0,0,0,0.05); border: 2px solid ${resultColor}; padding: 8px; border-radius: 5px; text-align: center; margin-bottom: 5px;">
                <h4 style="color: ${resultColor}; margin: 0 0 5px 0; font-size: 1.2em; border-bottom: 1px solid ${resultColor}; padding-bottom: 3px;">
                    <i class="fas ${icon}"></i> <strong>${titlePrefix}${resultTitle}</strong>
                </h4>
                ${subtitleHtml}
                <p style="margin: 0; font-size: 1.05em;">${resolvedBodyText}</p>
                ${footerHtml}
            </div>`
    });

    if (severity) {
        ui.notifications.info(notificationText);
        determineInjuryDialog(actor, severity, trigger);
    }

    return { roll: injuryRoll, severity };
}

/**
 * Formats a readable threshold preview string for the Injury Check dialog.
 */
function formatThresholdPreview(majorThreshold, minorThreshold) {
    const majorRange = majorThreshold > 0 ? `1–${majorThreshold} (${majorThreshold}%)` : "None (0%)";
    const minorChance = Math.max(0, minorThreshold - majorThreshold);
    const minorRange = minorChance > 0 ? `${majorThreshold + 1}–${minorThreshold} (${minorChance}%)` : "None (0%)";
    const maxInjury = Math.max(majorThreshold, minorThreshold);
    const safeRange = maxInjury < 100 ? `${maxInjury + 1}–100` : "None";
    return `Major Injury: <strong>${majorRange}</strong> | Minor Injury: <strong>${minorRange}</strong> | Safe: <strong>${safeRange}</strong>`;
}

/**
 * Opens the Injury Check dialog for a character recovering from Wounded.
 */
export async function injuryCheckDialog(preSelectedActor = null) {
    const targetActor = preSelectedActor || canvas.tokens?.controlled?.[0]?.actor || game.user.character || null;

    if (targetActor && !canControlActor(targetActor)) {
        return ui.notifications.warn("You do not have permission to perform an injury check for this character.");
    }

    const majorThreshold = clampPercent(game.settings.get(MODULE_ID, "injuryCheckMajorThreshold"), 5);
    const baseMinorThreshold = clampPercent(game.settings.get(MODULE_ID, "injuryCheckBaseMinorThreshold"), 23);
    const calcMinorLimit = (woundedVal) => Math.min(100, baseMinorThreshold + (woundedVal * 10));

    const currentWounded = getActorWoundedValue(targetActor);
    const isWounded = currentWounded > 0;
    const initialVal = isWounded ? currentWounded : 1;
    const initialMinorLimit = calcMinorLimit(isWounded ? initialVal : 0);

    const actorLine = targetActor
        ? `<p style="margin: 0 0 6px 0;"><strong>Character:</strong> ${targetActor.name}</p>`
        : `<p style="margin: 0 0 6px 0; color: #8f1d24;"><em>No token selected — rolling check only (Wounded condition won't be auto-removed).</em></p>`;

    const dialogHtml = `
    <div style="margin-bottom: 10px;">
        ${actorLine}
        <p style="margin: 0;">Roll a d100 to check for injuries upon recovering. The chance of a minor injury increases by 10% per Wounded level.</p>
    </div>
    <form>
        <div class="form-group">
            <label for="is-wounded"><strong>Wounded?</strong></label>
            <input type="checkbox" id="is-wounded" name="is-wounded" ${isWounded ? "checked" : ""} />
        </div>
        <div class="form-group" id="wounded-val-group" style="${isWounded ? "display: flex;" : "display: none;"}">
            <label for="wounded-value"><strong>Wounded Value:</strong></label>
            <input type="number" id="wounded-value" name="wounded-value" value="${initialVal}" min="1" max="10" />
        </div>
        <p id="injury-chance-preview" style="margin: 8px 0 4px 0; font-size: 0.9em; opacity: 0.85;">
            ${formatThresholdPreview(majorThreshold, initialMinorLimit)}
        </p>
    </form>
    `;

    new Dialog({
        title: "Injury Check (Wounded Recovery)",
        content: dialogHtml,
        render: (html) => {
            const root = resolveDomRoot(html);
            if (!root?.querySelector) return;

            const checkbox = root.querySelector("#is-wounded");
            const woundedGroup = root.querySelector("#wounded-val-group");
            const woundedInput = root.querySelector("#wounded-value");
            const previewEl = root.querySelector("#injury-chance-preview");

            const updateUI = () => {
                const checked = Boolean(checkbox?.checked);
                if (woundedGroup) {
                    woundedGroup.style.display = checked ? "flex" : "none";
                }
                if (previewEl) {
                    const wVal = checked ? Math.max(1, Math.min(10, parseInt(woundedInput?.value, 10) || 1)) : 0;
                    previewEl.innerHTML = formatThresholdPreview(majorThreshold, calcMinorLimit(wVal));
                }
            };

            checkbox?.addEventListener("change", updateUI);
            woundedInput?.addEventListener("input", updateUI);
        },
        buttons: {
            roll: {
                icon: '<i class="fas fa-dice-d20"></i>',
                label: "Roll Injury Check",
                callback: async (html) => {
                    const root = resolveDomRoot(html);
                    const checkboxEl = root?.querySelector ? root.querySelector("#is-wounded") : html.find?.("#is-wounded")?.[0];
                    const valueEl = root?.querySelector ? root.querySelector("#wounded-value") : html.find?.("#wounded-value")?.[0];

                    const checked = Boolean(checkboxEl?.checked);
                    const woundedLevel = checked ? Math.max(1, Math.min(10, parseInt(valueEl?.value, 10) || 1)) : 0;
                    const minorThreshold = calcMinorLimit(woundedLevel);

                    const subtitle = woundedLevel > 0
                        ? `Wounded ${woundedLevel} Check (Minor ≤ ${minorThreshold}%, Major ≤ ${majorThreshold}%)`
                        : `Recovery Check (Minor ≤ ${minorThreshold}%, Major ≤ ${majorThreshold}%)`;

                    let clearedWounded = false;

                    const { severity } = await rollAndResolveInjuryCheck({
                        actor: targetActor,
                        majorThreshold,
                        minorThreshold,
                        trigger: "woundedRecovery",
                        titlePrefix: "Injury Check: ",
                        subtitle,
                        majorText: (total) => `Rolled ${total} (≤ ${majorThreshold}%). Suffered a Major Injury from Wounded recovery!`,
                        minorText: (total) => `Rolled ${total} (≤ ${minorThreshold}%). Suffered a Minor Injury from Wounded recovery.`,
                        safeText: (total) => `Rolled ${total} (> ${minorThreshold}%). Recovered without lingering injury!`,
                        notificationText: "Injury sustained! Determining wounded recovery injury...",
                        flags: { isWoundedCheck: true },
                        onAfterRoll: async () => {
                            if (!targetActor) return "";
                            try {
                                clearedWounded = await removeWoundedConditions(targetActor);
                            } catch (err) {
                                console.error("PF2e Awesome Hero Point Rework | Failed to remove Wounded condition:", err);
                                ui.notifications.error("Could not remove Wounded condition. Check console.");
                            }
                            return clearedWounded
                                ? `<p style="margin: 4px 0 0 0; font-size: 0.9em; color: #555;"><em>Removed Wounded condition from ${targetActor.name}.</em></p>`
                                : "";
                        }
                    });

                    if (!severity && clearedWounded) {
                        ui.notifications.info(`No injury sustained! Removed Wounded condition from ${targetActor.name}.`);
                    }
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "roll"
    }).render(true);
}

window.InjuryCheckDialog = injuryCheckDialog;
