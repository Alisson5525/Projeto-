import { world, system, EquipmentSlot } from "@minecraft/server"
import { item_event, item_event_on, item_event_complete, item_event_on_hit } from "./const.js"



world.afterEvents.itemUse.subscribe(eventData => {
    const { itemStack, source } = eventData
    if (item_event[itemStack.typeId]) {
        item_event[itemStack.typeId].use_event(source)
    }
}
)

world.afterEvents.itemCompleteUse.subscribe(eventData => {
    const { itemStack, source } = eventData
    if (item_event_complete[itemStack.typeId]) {
        item_event_complete[itemStack.typeId].use_event(source)
    }
}
)

world.afterEvents.itemStartUseOn.subscribe(eventData => {
    const { itemStack, source, block, blockFace } = eventData
    if (item_event_on[itemStack.typeId] && item_event_on[itemStack.typeId].on_use_block == block.typeId) {
        item_event_on[itemStack.typeId].use_event(source,block)
    }
}
)

world.afterEvents.entityHitEntity.subscribe(eventData => {
    const {damagingEntity,hitEntity} = eventData
    let itemStack = damagingEntity.getComponent("minecraft:equippable").getEquipment(EquipmentSlot.Mainhand)
    if (itemStack && item_event_on_hit[itemStack.typeId] && item_event_on_hit[itemStack.typeId].filters(damagingEntity,hitEntity,itemStack)){
        item_event_on_hit[itemStack.typeId].use_event(damagingEntity,hitEntity,itemStack)
    }
})