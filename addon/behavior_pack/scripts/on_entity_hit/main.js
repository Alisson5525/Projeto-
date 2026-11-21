import { world, system } from "@minecraft/server"
import { ent_hit_ent_event } from "./consts.js"

world.afterEvents.entityHitEntity.subscribe(eventData => {
    if (ent_hit_ent_event[eventData.damagingEntity.typeId]){
        ent_hit_ent_event[eventData.damagingEntity.typeId].hit_event(eventData.damagingEntity,eventData.hitEntity)
    }
})