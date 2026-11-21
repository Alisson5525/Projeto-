import { world, system } from "@minecraft/server"
import { entity_die_event,entity_die_damage_event } from "./consts.js"

world.afterEvents.entityDie.subscribe(eventData => {
    if (entity_die_event[eventData.deadEntity.typeId] && entity_die_event[eventData.deadEntity.typeId]) {
        entity_die_event[eventData.deadEntity.typeId].die_event(eventData.deadEntity)
    } else if (entity_die_damage_event[eventData.deadEntity.typeId] && eventData.damageSource.cause == "entityAttack") {
        entity_die_damage_event[eventData.deadEntity.typeId].die_event(eventData.deadEntity,eventData.damageSource.damagingEntity)
    }
});