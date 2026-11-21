import { world, system } from "@minecraft/server"

world.afterEvents.itemUse.subscribe(eventData => {
    let { source } = eventData
    on_bite(source)
})

function calcularDistancia(x1, y1, z1, x2, y2, z2) {
    const distancia = Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2) + Math.pow((z2 - z1), 2));
    return distancia;
}

function on_bite(source){
    if (source.hasTag("vampiro") && source.getEntitiesFromViewDirection()[0] && source.getEntitiesFromViewDirection()[0].entity){
        let entity = source.getEntitiesFromViewDirection()[0].entity
        let entity_distance = calcularDistancia(entity.location.x, entity.location.y, entity.location.z, source.location.x, source.location.y, source.location.z)
        if (entity_distance >= 3.26 || entity.runCommand("testfor @s[type=!iron_golem,family=!cacador,family=mob,family=!monster,family=!vampiro,family=!lobisomem]").successCount == 0){
            return
        }else{
            if (source.runCommand("testfor @s[hasitem={item=sunrise:blood_bottle_3}]").successCount == 1) {
                entity.runCommand("damage @s 3 none")
                source.runCommandAsync("clear @s sunrise:blood_bottle_3 0 1")
                source.runCommandAsync("give @s sunrise:blood_bottle_4 1 0")
                source.runCommandAsync("playsound mob.vampire.bite")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
            }else if (source.hasTag('emuso_blooddrinker') && source.runCommand("testfor @s[hasitem={item=sunrise:blood_bottle_2}]").successCount == 1) {
                entity.runCommand("damage @s 3 none")
                source.runCommandAsync("clear @s sunrise:blood_bottle_2 0 1")
                source.runCommandAsync("give @s sunrise:blood_bottle_4 1 0")
                source.runCommandAsync("playsound mob.vampire.bite")
                source.runCommand("scoreboard players add @p sangue 750")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
            }else if (source.hasTag('emuso_blooddrinker') && source.runCommand("testfor @s[hasitem={item=sunrise:blood_bottle_1}]").successCount == 1) {
                entity.runCommand("damage @s 3 none")
                source.runCommandAsync("clear @s sunrise:blood_bottle_1 0 1")
                source.runCommandAsync("give @s sunrise:blood_bottle_3 1 0")
                source.runCommandAsync("playsound mob.vampire.bite")
                source.runCommand("scoreboard players add @p sangue 750")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
            }else if (source.hasTag('emuso_blooddrinker') && source.runCommand("testfor @s[hasitem={item=minecraft:glass_bottle}]").successCount == 1) {
                entity.runCommand("damage @s 3 none")
                source.runCommandAsync("clear @s minecraft:glass_bottle 0 1")
                source.runCommandAsync("give @s sunrise:blood_bottle_2 1 0")
                source.runCommandAsync("playsound mob.vampire.bite")
                source.runCommand("scoreboard players add @p sangue 750")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
            }else if (source.runCommand("testfor @s[hasitem={item=sunrise:blood_bottle_2}]").successCount == 1) {
                entity.runCommand("damage @s 3 none")
                source.runCommandAsync("clear @s sunrise:blood_bottle_2 0 1")
                source.runCommandAsync("give @s sunrise:blood_bottle_3 1 0")
                source.runCommandAsync("playsound mob.vampire.bite")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
            }else if (source.runCommand("testfor @s[hasitem={item=sunrise:blood_bottle_1}]").successCount == 1) {
                entity.runCommand("damage @s 3 none")
                source.runCommandAsync("clear @s sunrise:blood_bottle_1 0 1")
                source.runCommandAsync("give @s sunrise:blood_bottle_2 1 0")
                source.runCommandAsync("playsound mob.vampire.bite")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
            }else if (source.runCommand("testfor @s[hasitem={item=minecraft:glass_bottle}]").successCount == 1) {
                entity.runCommand("damage @s 3 none")
                source.runCommandAsync("clear @s minecraft:glass_bottle 0 1")
                source.runCommandAsync("give @s sunrise:blood_bottle_1 1 0")
                source.runCommandAsync("playsound mob.vampire.bite")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
            }else{
                entity.runCommand("damage @s 3 none")
                source.runCommand("scoreboard players add @p sangue 1500")
                source.runCommandAsync("playsound mob.vampire.bite")
                entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
                if (Math.random() <= 0.5){
                    entity.runCommand("scoreboard objectives add timerToVamp dummy timerToVamp")
                    entity.runCommand("tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] add timerToVamp")
                    entity.runCommand("scoreboard players set @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] timerToVamp 6000")
                    entity.runCommand("effect @p hunger 300 0 true")
                }
            }
        }

    }
}