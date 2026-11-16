import { world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    if(!advancementsEnabled) return;
    const entity = e.entity;
    if (entity.typeId !== "mm:mymik" && entity.typeId !== "mm:dyzgise") return;
    const id = e.eventId;
    if (id !== "mm:open") return;
    const players = entity.dimension.getPlayers({ location: entity.location, maxDistance: 12, excludeGameModes: ["Spectator"], excludeTags: ["adv:mm:violent_alarm_clock"], tags: ["aly:mm_enabled"] })
    for (const player of players) grantAdvancement(player, "mm:violent_alarm_clock")
})