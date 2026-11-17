import { determineInjuryDialog } from "./determine-injury.js";

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
        if (typeof actor.decreaseCondition === "function") {
            const existing = actor.getCondition?.("wounded");
            if (existing) {
                await actor.decreaseCondition("wounded", { forceRemove: true });
                removed = true;
            }
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
 * Opens the Injury Check dialog for a character recovering from Wounded.
 */
export async function injuryCheckDialog(preSelectedActor = null) {
    const targetActor = preSelectedActor || canvas.tokens?.controlled?.[0]?.actor || game.user.character || null;

    if (targetActor && !(game.user.isGM || targetActor.isOwner || game.user.character?.id === targetActor.id)) {
        return ui.notifications.warn("You do not have permission to perform an injury check for this character.");
    }

    const currentWounded = getActorWoundedValue(targetActor);
    const isWounded = currentWounded > 0;
    const initialVal = isWounded ? currentWounded : 1;
    const majorChance = 5;

    const calcMinorLimit = (woundedVal) => Math.min(100, 23 + (woundedVal * 10));
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
            Major Injury: <strong>1–${majorChance}</strong> (5%) | Minor Injury: <strong>${majorChance + 1}–${initialMinorLimit}</strong> (${Math.max(0, initialMinorLimit - majorChance)}%) | Safe: <strong>${initialMinorLimit < 100 ? `${initialMinorLimit + 1}–100` : "None"}</strong>
        </p>
    </form>
    `;

    new Dialog({
        title: "Injury Check (Wounded Recovery)",
        content: dialogHtml,
        render: (html) => {
            const root = html instanceof HTMLElement ? html : (html?.[0] || html);
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
                    const minorMax = calcMinorLimit(wVal);
                    const safeText = minorMax < 100 ? `${minorMax + 1}–100` : "None";
                    previewEl.innerHTML = `Major Injury: <strong>1–${majorChance}</strong> (5%) | Minor Injury: <strong>${majorChance + 1}–${minorMax}</strong> (${Math.max(0, minorMax - majorChance)}%) | Safe: <strong>${safeText}</strong>`;
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
                    const root = html instanceof HTMLElement ? html : (html?.[0] || html);
                    const checkboxEl = root?.querySelector ? root.querySelector("#is-wounded") : html.find?.("#is-wounded")?.[0];
                    const valueEl = root?.querySelector ? root.querySelector("#wounded-value") : html.find?.("#wounded-value")?.[0];

                    const checked = Boolean(checkboxEl?.checked);
                    const woundedLevel = checked ? Math.max(1, Math.min(10, parseInt(valueEl?.value, 10) || 1)) : 0;

                    const majorThreshold = 5;
                    const minorThreshold = calcMinorLimit(woundedLevel);

                    const injuryRoll = new Roll("1d100");
                    await injuryRoll.evaluate();

                    let severity = null;
                    let resultTitle, resultColor, icon, tableRollText;

                    if (injuryRoll.total <= majorThreshold) {
                        severity = "major";
                        resultTitle = "Major Injury!!!";
                        resultColor = "#cc0000";
                        icon = "fa-skull-crossbones";
                        tableRollText = `Rolled ${injuryRoll.total} (≤ ${majorThreshold}%). Suffered a Major Injury from Wounded recovery!`;
                    } else if (injuryRoll.total <= minorThreshold) {
                        severity = "minor";
                        resultTitle = "Minor Injury!";
                        resultColor = "#d08000";
                        icon = "fa-user-injured";
                        tableRollText = `Rolled ${injuryRoll.total} (≤ ${minorThreshold}%). Suffered a Minor Injury from Wounded recovery.`;
                    } else {
                        resultTitle = "No Injury";
                        resultColor = "#4a8a2a";
                        icon = "fa-check-circle";
                        tableRollText = `Rolled ${injuryRoll.total} (> ${minorThreshold}%). Recovered without lingering injury!`;
                    }

                    // Remove Wounded condition(s) after the check
                    let clearedWounded = false;
                    if (targetActor) {
                        try {
                            clearedWounded = await removeWoundedConditions(targetActor);
                        } catch (err) {
                            console.error("PF2e Awesome Hero Point Rework | Failed to remove Wounded condition:", err);
                            ui.notifications.error("Could not remove Wounded condition. Check console.");
                        }
                    }

                    const woundedNote = woundedLevel > 0
                        ? `Wounded ${woundedLevel} Check (Minor ≤ ${minorThreshold}%, Major ≤ ${majorThreshold}%)`
                        : `Recovery Check (Minor ≤ ${minorThreshold}%, Major ≤ ${majorThreshold}%)`;

                    const clearedNote = clearedWounded
                        ? `<p style="margin: 4px 0 0 0; font-size: 0.9em; color: #555;"><em>Removed Wounded condition from ${targetActor.name}.</em></p>`
                        : "";

                    await ChatMessage.create({
                        speaker: targetActor ? ChatMessage.getSpeaker({ actor: targetActor }) : ChatMessage.getSpeaker(),
                        rolls: [injuryRoll],
                        flags: {
                            "heroic-push-pf2e": { isInjuryRoll: true, isWoundedCheck: true, severity }
                        },
                        flavor: `
                            <div style="background: rgba(0,0,0,0.05); border: 2px solid ${resultColor}; padding: 8px; border-radius: 5px; text-align: center; margin-bottom: 5px;">
                                <h4 style="color: ${resultColor}; margin: 0 0 5px 0; font-size: 1.2em; border-bottom: 1px solid ${resultColor}; padding-bottom: 3px;">
                                    <i class="fas ${icon}"></i> <strong>Injury Check: ${resultTitle}</strong>
                                </h4>
                                <p style="margin: 0 0 4px 0; font-size: 0.9em; color: #555;">${woundedNote}</p>
                                <p style="margin: 0; font-size: 1.05em;">${tableRollText}</p>
                                ${clearedNote}
                            </div>`
                    });

                    if (severity) {
                        if (typeof determineInjuryDialog === "function") {
                            ui.notifications.info(`Injury sustained! Determining wounded recovery injury...`);
                            determineInjuryDialog(targetActor, severity, "woundedRecovery");
                        } else if (typeof window.DetermineInjuryDialog === "function") {
                            ui.notifications.info(`Injury sustained! Determining wounded recovery injury...`);
                            window.DetermineInjuryDialog(targetActor, severity, "woundedRecovery");
                        }
                    } else if (clearedWounded) {
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
