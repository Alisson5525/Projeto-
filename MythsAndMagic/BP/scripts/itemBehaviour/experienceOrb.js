import {
    world,
    ItemStack,
    system
} from "@minecraft/server";



system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:experience_orb", {
        onUse(e) {
            const player = e.source;
            const item = e.itemStack;
            var xpToGive = 1
            for (const lore of item.getLore()) {
                if (!lore.includes("§e§x§p§r§5")) continue;
                var text = lore.replace(' "},{"translate":"desc.exp_orb"}]}]}', "")
                text = text.replace('{"rawtext":[{"rawtext":[{"text":"', "")
                text = text.replace("§e§x§p§r§5", "")
                text = text.substring(0, text.length - 1)
                xpToGive = parseInt(text)
            }
            if (player.getGameMode() !== "Creative") player.getComponent("equippable").setEquipment("Mainhand", undefined)
            var ticks = 20
            var currentXp = player.getTotalXp()
            if (xpToGive < ticks) ticks = xpToGive
            player.playSound("item.experience_orb.use")
            for (let i = 0; i < ticks; i++) {
                system.runTimeout(() => {
                    player.playSound("random.orb", { volume: 0.03 + i / 40, pitch: 0.1 + i / 20 })
                    player.addExperience(xpToGive / ticks)
                }, i)
            }
            system.runTimeout(() => {
                if (currentXp + xpToGive !== player.getTotalXp()) {
                    const offset = (currentXp + xpToGive) - player.getTotalXp()
                    player.addExperience(offset)
                }

            }, ticks)
        }
    })
})


system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id !== "mm:generate_exp_orb") return;
    const entity = e.sourceEntity;
    if (entity.typeId !== "minecraft:player") return;
    var exp = 1
    if (e.message) {
        exp = parseInt(e.message)
    }

    const dim = entity.dimension;
    const item = new ItemStack("mm:experience_orb", 1)
    item.setLore([{ rawtext: [{ text: "§e§x§p§r§5" + `${exp}` + " " }, { translate: "desc.exp_orb" }] }])
    dim.spawnItem(item, entity.location)
})

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    const block = e.block;
    const inventory = block.getComponent("inventory")
    if (!inventory) return;
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
        let slotItem = container.getItem(i)
        if (slotItem == undefined) continue;
        if (slotItem.typeId !== "mm:experience_orb") continue;
        const setLoreTo = setExpLore(slotItem)
        if (setLoreTo !== undefined) container.getSlot(i).setLore(setExpLore(slotItem))
    }
})

world.afterEvents.entitySpawn.subscribe((e) => {
    const entity = e.entity;
    const cause = e.cause;
    if (entity.typeId !== "minecraft:item") return;
    if (!entity.isValid) return;
    const itemComp = entity.getComponent("item")
    const item = itemComp.itemStack;
    if (item.typeId !== "mm:experience_orb") return;
    const setLoreTo = setExpLore(item)
    if (setLoreTo !== undefined) item.setLore(setLoreTo)
})

world.afterEvents.playerInventoryItemChange.subscribe((e) => {
    const item = e.itemStack;
    const player = e.player;
    if (!item || !player) return;
    if (item.typeId == "mm:experience_orb") {
        const setLoreTo = setExpLore(item)
        if (setLoreTo !== undefined) {
            var slot = e.slot
            const inventory = player.getComponent("minecraft:inventory");
            if (inventory === undefined || inventory.container === undefined) {
                return;
            }
            item.setLore(setLoreTo)
            inventory.container.setItem(slot, item);
        }
    }
})


function setExpLore(item) {
    const lore = item.getLore()
    var success = false;
    var xpMin = 0
    var xpMax = 0
    if (lore.length == 0) return [{ rawtext: [{ text: "§e§x§p§r§5" + `${1}` + " " }, { translate: "desc.exp_orb" }] }]
    for (const text of lore) {
        if (text.includes("EXP_ORB_")) {
            success = true
            var numbers = text.replace("EXP_ORB_", "").split("_")
            xpMin = parseInt(numbers[0])
            xpMax = parseInt(numbers[1])
        }
    }
    if (success == false) return undefined;
    var random = xpMin + Math.floor(Math.random() * (1 + xpMax - xpMin))
    return [{ rawtext: [{ text: "§e§x§p§r§5" + `${random}` + " " }, { translate: "desc.exp_orb" }] }]
}