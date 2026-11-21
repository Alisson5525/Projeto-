export const ent_hit_ent_event = {
    "minecraft:player": {
        hit_event(source, entity) {
            if (source.hasTag('emuso_icetouch')) {
                entity.runCommandAsync('effect @s slowness 2 10 true');
                entity.runCommandAsync("particle sunrise:ice_touch")
            }
            else if (source.hasTag('moreDamage1')) {
                entity.runCommandAsync('effect @s instant_damage 1 1 true');

            }
            else if (source.hasTag('moreDamage2')) {
                entity.runCommandAsync('effect @s instant_damage 2 2 true');

            }
            else if (source.hasTag('moreDamage3')) {
                entity.runCommandAsync('effect @s instant_damage 2 2 true');
                eventData.damagingEntity.runCommandAsync('damage @s 2');

            }
            else if (source.hasTag('sworddex')) {
                entity.runCommandAsync('effect @s instant_damage 1 1 true');

            }
            else if (source.hasTag('sangramento')) {
                entity.runCommandAsync('effect @s poison 2 1 true');

            }
            else if (entity.hasTag('GarlicInTheVein') && source.hasTag('vampiro')) {
                source.runCommandAsync('damage @s 1');

            }
        }
    },
    "sunrise:bat": {
        hit_event(source, entity) {
            source.runCommand("scoreboard players add \"" + source.getTags()[0] + "\" sangue 750")
            entity.runCommand("damage @s 7")
            entity.runCommand("particle sunrise:bite_blood_particle ~ ~ ~")
        }
    }
}