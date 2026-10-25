# PF2e Awesome Hero Point Rework

A more fun alternative to Hero Points for the Pathfinder 2e system. Instead of standard rerolls that can still be worse than the original roll, players can spend a Hero Point directly on a chat card (or via hotbar macro) to add bonus dice to their roll, with an option to push even harder at the risk of taking an injury. If an injury is triggered, the Determine Injury dialog pops up to resolve it. Other alternatives often just add 10 to the roll, but that's boring and often a bit too powerful. This adds more risk and reward to spending hero points.

## How It Works

You can spend a Hero Point in two convenient ways:
1. **Right-Click Context Menu:** Right-click on any eligible check, attack roll, or saving throw chat message.
2. **Hotbar Macros / API:** Run the auto-generated macros or hotkey shortcuts to instantly push your last d20 roll!

### Heroic Push (+1d6)
* Adds +1d6 to the existing roll total.
* Recalculates the total and updates the degree of success against the target DC.
* Safe to use with no risk of injury.

### Reckless Push (+2d6)
* Adds +2d6 to the existing roll for when you really need a boost.
* Rolls a d100 check afterwards for injury:
  * **No Injury (34-100):** You make it through okay without injury.
  * **Minor Injury (6-33):** Applies a short-term consequence (2 rounds or 10 minutes out of combat) based on what you rolled (Attacks, Saves, Skills, Spells, Initiative, or Wounded Recovery).
  * **Major Injury (1-5):** Applies a lingering injury (like Drained, Doomed, or Wounded) that lasts longer, sometimes until the player takes a long rest.
* Sustaining an injury pops up the Determine Injury dialog pre-selected with the rolled severity so you can roll and apply the effect to the character.

## Included Macros & Module API

The module automatically creates and manages world macros in the Macro directory with Observer permissions so players can easily drag them to their hotbar:

* **Heroic Push (Last Roll):** Instantly pushes your character's last d20 roll with +1d6.
* **Reckless Push (Last Roll):** Instantly pushes your character's last d20 roll with +2d6 and rolls for injury.
* **PF2e Awesome Hero Points: Push Last Roll:** Displays a prompt showing your character's Hero Points, the last roll's score, and buttons to choose Heroic or Reckless push.
* **Determine Injury:** Opens the interactive injury rolling and effect application dialog.

### Scripting API
You can also trigger these directly in custom macros:
```javascript
// Quick Prompt Dialog
game.heroicPush.pushLastDialog();

// 1-Click Pushes
game.heroicPush.heroicPushLast();
game.heroicPush.recklessPushLast();

// Push a specific message
game.heroicPush.doHeroicPush(message, "1d6");
```

## Game Settings

In Configure Settings > Module Settings, GMs can:
* Enable or disable Heroic Push and Reckless Push individually.
* Adjust the d100 threshold values for Minor and Major injuries to tune the injury chances for your group.
* Toggle auto-creation of World macros.

## Included Packs

* **PF2e Awesome Hero Point Items:** Built-in injury effect items and conditions.
* **PF2e Awesome Hero Point Macros:** Includes the Determine Injury macro if you want to roll injuries manually.

---

If you'd like you can help support me over on Patreon to see this and many other fun tools, maps, etc related to PF2e: https://patreon.com/AeneasPF2e

Author: Aeneas (Joshua Elander)

Disclaimer: All code here is the work of and belongs to the author. I hereby give you permission to use it by importing it into foundry vtt and using it with PF2e. However, if you wish to fork or use this code in your own code, please request permission to use this code first. The user acknowledge that all work here is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
