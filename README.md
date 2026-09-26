# PF2e Awesome Hero Point Rework

A more fun alternative to Hero Points for the Pathfinder 2e system. Instead of standard rerolls that can still be worse than the original roll, players can spend a Hero Point directly on a chat card to add bonus dice to their roll, with an option to push even harder at the risk of taking an injury. If an injury is triggered, the Determine Injury dialog will pop up to resolve it. Other alternatives often just add 10 to the roll, but that's boring and often a bit too powerful. This adds more risk and reward to spending hero points.

## How It Works

Right-click on any eligible check, attack roll, or saving throw chat message to spend 1 Hero Point.

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

## Game Settings

In Configure Settings > Module Settings, GMs can:
* Enable or disable Heroic Push and Reckless Push individually.
* Adjust the d100 threshold values for Minor and Major injuries to tune the injury chances for your group.

## Included Packs

* **PF2e Awesome Hero Point Items:** Built-in injury effect items and conditions.
* **PF2e Awesome Hero Point Macros:** Includes the Determine Injury macro if you want to roll injuries manually.

---

If you'd like you can help support me over on Patreon to see this and many other fun tools, maps, etc related to PF2e: https://patreon.com/AeneasPF2e

Author: Aeneas (Joshua Elander)

Disclaimer: All code here is the work of and belongs to the author. I hereby give you permission to use it by importing it into foundry vtt and using it with PF2e. However, if you wish to fork or use this code in your own code, please request permission to use this code first. The user acknowledge that all work here is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
