// Initialize module
Hooks.once('init', () => {
    console.log("Heroic Push PF2e | Initializing module");
});

// Wrap the hook inside "ready" to ensure we load AFTER the PF2e system and other modules.
Hooks.once('ready', () => {
    console.log("Heroic Push PF2e | Registering Chat Context Menu Hook");

    // Inject into the Chat Context Menu natively
    Hooks.on("getChatLogEntryContext", (html, options) => {

        // Helper to safely get the message document
        const getMsg = (li) => {
            const element = li.length ? li[0] : li;
            const id = element.dataset?.messageId || element.getAttribute("data-message-id");
            return game.messages.get(id);
        };

        // Deep Debugging Condition Check - Watch the F12 Console when you right-click!
        const canPush = (li) => {
            const msg = getMsg(li);
            if (!msg) return false;

            // Broadened check to catch all PF2e custom roll types (Attacks, Saves, Damage, etc.)
            const isRoll = msg.isRoll || (msg.rolls && msg.rolls.length > 0) || msg.flags?.pf2e?.context?.type;

            const msgActor = msg.actor || game.actors.get(msg.speaker?.actor);
            const hp = msgActor?.system?.resources?.heroPoints?.value || 0;
            const isOwner = msgActor?.isOwner;

            // ---- CONSOLE LOGGING ----
            // This will print every time you right-click a message. 
            // If you don't see the buttons, this will tell you exactly why!
            console.groupCollapsed(`Heroic Push Check: ${msgActor?.name || "Unknown Actor"}`);
            console.log("1. Is it recognized as a Roll?", !!isRoll);
            console.log("2. Is an Actor linked?", !!msgActor);
            console.log("3. Do you own this Actor?", !!isOwner);
            console.log("4. Does Actor have Hero Points?", hp > 0, `(Current HP: ${hp})`);
            console.groupEnd();
            // --------------------------

            return isRoll && msgActor && isOwner && (hp > 0);
        };

        // We use unshift to put our options at the TOP of the right-click menu
        options.unshift(
            {
                name: "Heroic Push (+1d6)",
                icon: '<i class="fas fa-dice-d6" style="color: #4a8a2a;"></i>',
                condition: canPush,
                callback: li => doHeroicPush(getMsg(li), "1d6")
            },
            {
                name: "Reckless Push (+2d6)",
                icon: '<i class="fas fa-biohazard" style="color: #cc0000;"></i>',
                condition: canPush,
                callback: li => doHeroicPush(getMsg(li), "2d6")
            }
        );
    });
});

// The core pushing logic
async function doHeroicPush(message, diceString) {
    if (!message) return;

    // Safely get actor
    const msgActor = message.actor || game.actors.get(message.speaker?.actor);
    if (!msgActor) return ui.notifications.error("Could not find an actor associated with that roll.");
    if (!msgActor.isOwner) return ui.notifications.warn("You do not have permission to push this character's rolls.");

    const hp = msgActor.system?.resources?.heroPoints?.value || 0;
    if (hp < 1) return ui.notifications.warn(`${msgActor.name} does not have enough Hero Points!`);

    // Deduct 1 Hero Point
    await msgActor.update({ "system.resources.heroPoints.value": hp - 1 });

    const oldRoll = message.rolls[0];
    if (!oldRoll) return ui.notifications.error("The message did not contain a valid roll to push.");

    // Construct and evaluate new roll
    const baseFormula = oldRoll.formula;
    const newFormula = `${baseFormula} + ${diceString}[Heroic Push]`;
    const RollClass = oldRoll.constructor;
    const newRoll = await new RollClass(newFormula, oldRoll.data, oldRoll.options).evaluate();

    const pushFlavor = diceString === "1d6" ? "(No Injury)" : "(Chance of Injury)";
    const flavorPrefix = `
        <div class="pf2e chat-card">
            <header class="card-header flexrow" style="align-items: center; padding-bottom: 5px;">
                <img src="${msgActor.img}" title="${msgActor.name}" width="36" height="36" style="border: none; margin-right: 8px;"/>
                <h3 style="margin: 0; line-height: normal;">Heroic Push! <br><span style="font-size: 0.8em; color: #555;">${pushFlavor}</span></h3>
            </header>
            <div class="card-content" style="margin-top: 5px; margin-bottom: 5px;">
                <p style="margin: 0 0 5px 0;"><strong>${msgActor.name}</strong> spent 1 Hero Point to push their luck!</p>
            </div>
        </div>`;

    // Clone message data
    const msgData = message.toObject();
    delete msgData._id;
    delete msgData.timestamp;

    msgData.rolls = [newRoll.toJSON()];
    msgData.flavor = flavorPrefix + (msgData.flavor || "");

    await ChatMessage.create(msgData);

    // Automated Injury Roll Logic
    if (diceString === "2d6") {
        const injuryRoll = await new Roll("1d100").evaluate();
        let resultTitle, resultColor, tableRollText, icon;

        if (injuryRoll.total >= 34) {
            resultTitle = "No Injury";
            resultColor = "#4a8a2a"; // Green
            icon = "fa-check-circle";
            tableRollText = "The hero pushed through safely.";
        } else if (injuryRoll.total >= 6) {
            resultTitle = "Minor Injury!";
            resultColor = "#d08000"; // Orange
            icon = "fa-user-injured";
            tableRollText = `The hero suffered a Minor Injury. Rolling for consequence...`;
        } else {
            resultTitle = "Major Injury!!!";
            resultColor = "#cc0000"; // Red
            icon = "fa-skull-crossbones";
            tableRollText = `The hero suffered a Major Injury! Rolling for consequence...`;
        }

        // Post the automated injury result to chat for everyone to see
        await ChatMessage.create({
            speaker: message.speaker,
            rolls: [injuryRoll.toJSON()],
            type: CONST.CHAT_MESSAGE_TYPES?.ROLL || 5, // Fallback for v12+ roll types
            flavor: `
                <div style="background: rgba(0,0,0,0.05); border: 2px solid ${resultColor}; padding: 8px; border-radius: 5px; text-align: center; margin-bottom: 5px;">
                    <h4 style="color: ${resultColor}; margin: 0 0 5px 0; font-size: 1.2em; border-bottom: 1px solid ${resultColor}; padding-bottom: 3px;">
                        <i class="fas ${icon}"></i> <strong>${resultTitle}</strong>
                    </h4>
                    <p style="margin: 0; font-size: 1.1em;">${tableRollText}</p>
                </div>`
        });

        // Trigger macro or bundled function if an injury occurred
        if (injuryRoll.total < 34) {
            const macroName = "Determine Injury";
            const injuryMacro = game.macros.getName(macroName);

            if (injuryMacro) {
                ui.notifications.info(`Injury sustained! Time to ${macroName}...`);
                injuryMacro.execute();
            } else if (typeof window.DetermineInjuryDialog === "function") {
                ui.notifications.info(`Injury sustained! Time to determine injury...`);
                window.DetermineInjuryDialog();
            } else {
                ui.notifications.warn(`Could not find the macro named "${macroName}". Please run it manually to apply the injury.`);
            }
        }
    }
}