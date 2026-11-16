import "advancements.js"
import {
    system,
    world
} from "@minecraft/server";

function pad(str, len) {
  if (str.length >= len) return str.slice(0, len);
  return str + "$".repeat(len - str.length);
}

export function sendNotification(player, message, image, soundType, background) {
    if(!background) {
        if(soundType == "fire") background = "textures/ui/toast/style_myths_fire";
        if(soundType == "air") background = "textures/ui/toast/style_myths_air";
        if(soundType == "ice") background = "textures/ui/toast/style_myths_ice";
        if(soundType == "earth") background = "textures/ui/toast/style_myths_earth";
        if(soundType == "electric") background = "textures/ui/toast/style_myths_electric";
    }
    const bg = background ? background : "textures/ui/toast/style_myths";
    player.sendMessage({
        rawtext: [
            { text: `toast.${pad(image, 150)}` },
            { text: pad(bg, 50) },
            { text: message }
        ]
    })
    //player.sendMessage(`toast.${message}${message.length < 200 ? "$".repeat(200 - message.length) : ""}${image}${image.length < 200 ? "$".repeat(200 - image.length) : ""}`)
    if (soundType !== undefined) {
        if (player && player.isValid)
            player.playSound("toast.mm." + soundType, { volume: 0.55 });
        system.runTimeout(() => {
            if (player && player.isValid)
                player.playSound("toast.mm.out", { volume: 0.36, pitch: 0.8 });
        }, 108);
    }
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (player.getDynamicProperty("mm:interact_cooldown")) {
            const cd = player.getDynamicProperty("mm:interact_cooldown")
            if (cd > 0) {
                player.setDynamicProperty("mm:interact_cooldown", cd - 1)
            }
        }
    }
})

import "./blockBehaviour/flickerwick.js"
import "./blockBehaviour/oreFortune.js"
import "./blockBehaviour/cursedTile.js"
import "./blockBehaviour/slab.js"
import "./blockBehaviour/sanctuaryVault.js"
import "./blockBehaviour/ignoreSilkTouch.js"
import "./blockBehaviour/sanctuaryKeyHolder.js"
import "./blockBehaviour/permafrostIcicle.js"
import "./blockBehaviour/chiller.js"
import "./blockBehaviour/shockweed.js"
import "./blockBehaviour/magneticPiston.js"
import "./blockBehaviour/sparklingTorch.js"
import "./blockBehaviour/brazier.js"
import "./blockBehaviour/pinkPlushie.js"
import "./blockBehaviour/fakeCactus.js"
import "./blockBehaviour/scrubelTreasure.js"
import "./blockBehaviour/unobtaniumTransporter.js"
import "./blockBehaviour/azsilvaMirror.js"
import "./blockBehaviour/lightSwitch.js"
import "./blockBehaviour/rayMaker.js"
import "./blockBehaviour/cauldron.js"
import "./blockBehaviour/palaciteVent.js"
import "./blockBehaviour/walls.js"
import "./blockBehaviour/ballista.js"
import "./blockBehaviour/paddedAlchatite.js"
import "./blockBehaviour/reforgedSpellCrafter.js"
import "./blockBehaviour/glowstoneSpike.js"
import "./blockBehaviour/fallenMeteor.js"
import "./blockBehaviour/altermoss.js"
import "./blockBehaviour/customLeaves.js"
import "./blockBehaviour/twistedMoss.js"
import "./blockBehaviour/twistedRoots.js"
import "./blockBehaviour/requiresBottomBlock.js"
import "./blockBehaviour/strippable.js"
import "./blockBehaviour/trapdoor.js"
import "./blockBehaviour/door.js"
import "./blockBehaviour/button.js"
import "./blockBehaviour/pressurePlate.js"
import "./blockBehaviour/sapling.js"
import "./blockBehaviour/fenceGate.js"
import "./blockBehaviour/expiredTorch.js"
import "./blockBehaviour/hangingMoss.js"
import "./blockBehaviour/dropFromShears.js"



import "./itemBehaviour/boozePotion.js"
import "./itemBehaviour/depleteDurability.js"
import "./itemBehaviour/popsicle.js"
import "./itemBehaviour/occuleye.js"
import "./itemBehaviour/icarusBoots.js"
import "./itemBehaviour/azsilvaCarrot.js"
import "./itemBehaviour/halberd.js"
import "./itemBehaviour/demonArmour.js"
import "./itemBehaviour/warpKey.js"
import "./itemBehaviour/alteredKey.js"
import "./itemBehaviour/fangangler.js"
import "./itemBehaviour/longshot.js"
import "./itemBehaviour/lavaCookie.js"
import "./itemBehaviour/experienceOrb.js"
import "./itemBehaviour/magicStaff.js"
import "./itemBehaviour/unobtaniumClock.js"
import "./itemBehaviour/meteorArmour.js"
import "./itemBehaviour/guardianWand.js"
import "./itemBehaviour/icicleSpear.js"
import "./itemBehaviour/flickerwick.js"


import "./magicSystem/main.js"

import "./customEffects/main.js"

import "./customEnchantments/main.js"

import "./misc/meteorShower.js"


import "./entityBehaviour/mymik.js"
import "./entityBehaviour/scrubel.js"
import "./entityBehaviour/sanctuaryKeeper.js"
import "./entityBehaviour/sacredStatue.js"
import "./entityBehaviour/flickerwick.js"
import "./entityBehaviour/booze.js"
import "./entityBehaviour/slushbuckler.js"
import "./entityBehaviour/alterbeast.js"
import "./entityBehaviour/revoid.js"
import "./entityBehaviour/sanguineSpider.js"
import "./entityBehaviour/mage.js"
import "./entityBehaviour/guardianMyth.js"
import "./entityBehaviour/tangled.js"



import "./customCommands/reloadalterrealm.js"
import "./customCommands/disablealterrealm.js"
import "./customCommands/sendLevelNoti.js"
import "./customCommands/performanceMode.js"
import "./customCommands/preventflashes.js"
import "./customCommands/meteorShower.js"


import "./musicBox/main.js"


import "./worldInitialise.js"
import "./descriptionText.js"
import "./debugInfo.js"
import "./deathMessages.js"