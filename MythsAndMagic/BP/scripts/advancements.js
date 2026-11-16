import { world, system, ItemTypes } from "@minecraft/server";

var advancementsEnabled = false
system.runTimeout(() => {
    for (const type of ItemTypes.getAll()) if (type.id == "adv:alyadvancementsareon") advancementsEnabled = true
})
export { advancementsEnabled }

export function grantAdvancement(player, advancement) {
    if (player.isValid) player.runCommand(`scriptevent alylicasadvancements:grant ${advancement}`)
}

world.afterEvents.playerSpawn.subscribe((e) => {
    let player = e.player;
    if (e.initialSpawn === false) return;
    system.runTimeout(() => {
        player.addTag("aly:mm_enabled");
    }, 10);
    // Aly advancements compatibility
});

import "advancements/bigShot.js"
import "advancements/brewingBuddies.js"
import "advancements/crashBangBoom.js"
import "advancements/doubleTrouble.js"
import "advancements/iceToMeetYou.js"
import "advancements/iDontLikeThis.js"
import "advancements/itemInventory.js"
import "advancements/itsAlive.js"
import "advancements/keyKeeper.js"
import "advancements/lifeInsurance.js"
import "advancements/magic101.js"
import "advancements/magic103.js"
import "advancements/makeshiftWizardry.js"
import "advancements/mythsAndMagic.js"
import "advancements/recooling.js"
import "advancements/strangerThings.js"
import "advancements/studyWell.js"
import "advancements/underSnowAndIce.js"
import "advancements/violentAlarmClock.js"
import "advancements/youShallNotPass.js"
import "advancements/designDetail.js"
import "advancements/flashFire.js"
import "advancements/thwip.js"
import "advancements/prismatic.js"
import "advancements/repeatedHistory.js"
import "advancements/terminalVelocity.js"
import "advancements/instantTransmission.js"
import "advancements/magicReversion.js"
import "advancements/magneticRail.js"