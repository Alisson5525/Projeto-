import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

import { getElement, getLore } from "./main.js"
import { sendNotification } from "main.js"

const unlockables = [
    "mm:dash",
    "mm:launch",
    "mm:supersonic",
    "mm:retrieval",
    "mm:burst",
    "mm:cauterise",
    "mm:overheat",
    //"mm:hellfire",
    "mm:snowflake",
    "mm:glaciate",
    "mm:chilling",
    //"mm:icicle",
    "mm:snowball",
    "mm:quake",
    "mm:terraform",
    "mm:toxic",
    "mm:roots",
    "mm:bolt",
    "mm:thunderbolt",
    "mm:spark",
    "mm:overclock",
    "mm:siphoning",
    "mm:purify",
    "mm:shadow",
    "mm:teleport",
    "mm:swap",
    //"mm:imprison",
    "mm:hurricane",
    "mm:snowball",
    "mm:guardian",
    "mm:meteor",
    "mm:entangle",
    "mm:cloudsurf",
    "mm:cluster"
]

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:ancient_texts", {
        onUse(e) {
            const source = e.source;
            var chosenSpell = ""
            var optionsArray = []
            for (const spell of unlockables) {
                if (!source.hasTag(spell + "_recipe_unlocked")) {
                    optionsArray.push(spell)
                }
            }
            if (optionsArray.length == 0) {
                source.sendMessage({ translate: "ancient_texts.all_known" })
                source.dimension.playSound("close.bamboo_wood_trapdoor", source.location, { volume: 1, pitch: 0.5 })
                return;
            }
            let rand = Math.floor(Math.random() * optionsArray.length);
            chosenSpell = optionsArray[rand];
            if (!source.hasTag(chosenSpell + "_recipe_unlocked")) {
                if (source.getGameMode() !== "Creative") {
                    const equippable = source.getComponent("equippable")
                    equippable.setEquipment("Mainhand", undefined)
                }
                source.dimension.spawnParticle("minecraft:witchspell_emitter", source.location)
                source.playSound("block.enchanting_table.use", { pitch: 0.5 })
                source.addTag(chosenSpell + "_recipe_unlocked")
                sendNotification(source, `§dNew Recipe\n§r${getLore((chosenSpell))}`, "textures/ui/form/spell/spell_" + chosenSpell.replace("mm:", ""), getElement(chosenSpell))
            }
        }
    })
})