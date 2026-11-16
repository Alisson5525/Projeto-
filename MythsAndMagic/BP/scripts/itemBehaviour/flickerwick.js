import {
    world,
    system,
    EntityDamageCause,
    ItemStack
} from "@minecraft/server";

world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    const player = e.player;
    const item = e.itemStack;
    const entity = e.target
    if(!item || !entity || !entity.isValid || entity.typeId !== "mm:flickerwick" || !player || !player.isValid || item.typeId !== "mm:candle_holder") return;
    if(entity.getProperty("mm:wax_remaining") == 0) return;
    const newItem = new ItemStack("mm:flickerwick_candle_holder", 1)
    const type = entity.getComponent("minecraft:variant")
    const size = entity.getComponent("minecraft:skin_id")
    newItem.setDynamicProperty("mm:flickerwick_type", type.value)
    newItem.setDynamicProperty("mm:flickerwick_size", size.value)
    const hp = entity.getComponent("health").currentValue
    newItem.setDynamicProperty("mm:health", hp)
    newItem.setDynamicProperty("mm:wax", Math.min(20, 1+entity.getProperty("mm:wax_remaining")))
    const effects = entity.getEffects()
    for(const effect of effects) {
        newItem.setDynamicProperty("mm:effect<>" + effect.typeId + "<>" + `${effect.amplifier}`, effect.duration)
    }
    var loreColour = "§r"
    if(type.value == 0) loreColour += "§h"
    if(type.value == 1) loreColour += "§s"
    if(type.value == 2) loreColour += "§n"
    if(type.value == 3) loreColour += "§u"
    system.run(() => {
        if(entity.nameTag) newItem.nameTag = entity.nameTag
        newItem.setLore([{rawtext:[{text: loreColour},{translate:entity.localizationKey}]}])
            entity.dimension.playSound("mob.flickerwick.picked_up", entity.location)
        entity.dimension.spawnParticle("minecraft:ice_evaporation_emitter", entity.location)
        entity.remove()
        player.startItemCooldown(newItem.getComponent("cooldown").cooldownCategory, newItem.getComponent("cooldown").cooldownTicks)
        if(item.amount == 1 && player.getGameMode() !== "Creative") {
            player.getComponent("equippable").setEquipment("Mainhand", newItem)
        } else {
            if(player.getGameMode() !== "Creative") {
                item.amount -= 1
                player.getComponent("equippable").setEquipment("Mainhand", item)
            }
            player.dimension.spawnItem(newItem, player.location)
        }
    })
})

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:flickerwick_holder", {
        onUseOn(e) {
            const item = e.itemStack;
            const player = e.source
            const property_type = item.getDynamicProperty("mm:flickerwick_type")
            var type = property_type !== undefined ? property_type : 0
            const property_size = item.getDynamicProperty("mm:flickerwick_size")
            var size = property_size !== undefined ? property_size : 0
            var name = item.nameTag ? item.nameTag : undefined
            var wax = item.getDynamicProperty("mm:wax") ? item.getDynamicProperty("mm:wax") : 20
            var hp = item.getDynamicProperty("mm:health") ? item.getDynamicProperty("mm:health") : 20

            var spawnEvent = ""
            if (size == 0) {
                if (type == 0) spawnEvent = "mm:spawn_as_standard_flickerwick"
                if (type == 1) spawnEvent = "mm:spawn_as_soul_flickerwick"
                if (type == 2) spawnEvent = "mm:spawn_as_copper_flickerwick"
                if (type == 3) spawnEvent = "mm:spawn_as_sparkling_flickerwick"
            } else {
                if (type == 0) spawnEvent = "mm:spawn_as_tall_standard_flickerwick"
                if (type == 1) spawnEvent = "mm:spawn_as_tall_soul_flickerwick"
                if (type == 2) spawnEvent = "mm:spawn_as_tall_copper_flickerwick"
                if (type == 3) spawnEvent = "mm:spawn_as_tall_sparkling_flickerwick"
            }
            const block = e.block
            const face = e.blockFace
            const targetBlock = face == "Up" ? block.above().bottomCenter() : face == "Down" ? block.below() : face == "East" ? block.east().bottomCenter() : face == "West" ? block.west().bottomCenter() : face == "North" ? block.north().bottomCenter() : face == "South" ? block.south().bottomCenter() : block.above().bottomCenter()
            const entitySpawn = player.dimension.spawnEntity("mm:flickerwick", targetBlock)
            entitySpawn.triggerEvent(spawnEvent)
            if(name) entitySpawn.nameTag = name
            if(wax) entitySpawn.setProperty("mm:wax_remaining", wax)
            if(hp) entitySpawn.getComponent("health").setCurrentValue(hp)
            for(const propertyId of item.getDynamicPropertyIds()) {
                if(propertyId.includes("mm:effect<>")) {
                    const effectId = propertyId.split("<>")[1]
                    const amp = parseInt(propertyId.split("<>")[2])
                    const duration = item.getDynamicProperty(propertyId)
                    entitySpawn.addEffect(effectId, duration, {amplifier:amp})
                }
            }
            const tameable = entitySpawn.getComponent("tameable")
            tameable.tame(player)
            entitySpawn.dimension.playSound("mob.flickerwick.placed", entitySpawn.location)
            if(player.getGameMode() !== "Creative") {
                const newItem = new ItemStack("mm:candle_holder", 1)
                player.getComponent("equippable").setEquipment("Mainhand", newItem)
            }
        }
    })
})

