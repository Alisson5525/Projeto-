export const entity_die_event = {
    "minecraft:player":{
        die_event(source){
            if (source.hasTag("vampiro")) {
                source.runCommand("scoreboard players set @s sangue 22000")
            }
        }
    }
} 

export const entity_die_damage_event = {
    "sunrise:black_werewolf":{
        die_event(source,hit_entity){
            if (hit_entity.hasTag("lobisomem") && hit_entity.typeId == "minecraft:player" && Math.random() <= 0.7) {
                if (hit_entity.hasTag("lbnI")){
                    hit_entity.removeTag("lbnI")
                    hit_entity.addTag("lbnII")
                }else if (hit_entity.hasTag("lbnII")){
                    hit_entity.removeTag("lbnII")
                    hit_entity.addTag("lbnIII")
                }
            }
        }
    },
    "sunrise:werewolf":{
        die_event(source,hit_entity){
            if (hit_entity.hasTag("lobisomem") && hit_entity.typeId == "minecraft:player" && Math.random() <= 0.5) {
                if (hit_entity.hasTag("lbnI")){
                    hit_entity.removeTag("lbnI")
                    hit_entity.addTag("lbnII")
                }
            }
        }
    },
    "sunrise:weak_werewolf":{
        die_event(source,hit_entity){
            if (hit_entity.hasTag("lobisomem") && hit_entity.typeId == "minecraft:player" && Math.random() <= 0.35) {
                if (hit_entity.hasTag("lbnI")){
                    hit_entity.removeTag("lbnI")
                    hit_entity.addTag("lbnII")
                }
            }
        }
    }
} 