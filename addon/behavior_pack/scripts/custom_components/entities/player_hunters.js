import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

function getSkillMax(player, skill) {
    if (player.hasTag('hunter_skill_' + skill + '_1')) {
        return 1
    } else if (player.hasTag('hunter_skill_' + skill + '_2')) {
        return 2
    } else if (player.hasTag('hunter_skill_' + skill + '_3')) {
        return 3
    } else if (player.hasTag('hunter_skill_' + skill + '_4')) {
        return 4
    } else if (player.hasTag('hunter_skill_' + skill + '_5')) {
        return 5
    } else if (player.hasTag('hunter_skill_' + skill + '_6')) {
        return 6
    } else if (player.hasTag('hunter_skill_' + skill + '_7')) {
        return 7
    } else if (player.hasTag('hunter_skill_' + skill + '_8')) {
        return 8
    } else if (player.hasTag('hunter_skill_' + skill + '_9')) {
        return 9
    } else if (player.hasTag('hunter_skill_' + skill + '_10')) {
        return 10
    } else if (player.hasTag('hunter_skill_' + skill + '_11')) {
        return 11
    } else {
        return 99
    }
}

function _unlockSkill(player) {
    var form = new ActionFormData
    var veloMax = getSkillMax(player, "velo")
    var vitalMax = getSkillMax(player, "vital")
    var manaMax = getSkillMax(player, "mana")
    var habMax = getSkillMax(player, "hab")
    form.title('BookScreen')
    if (player.hasTag("avaliable_new_skill")){
        if (manaMax != 99){form.button({ translate: "gui.hunter_skillvelo.select" })}
        if (vitalMax != 99){form.button({ translate: "gui.hunter_skillvital.select" })}
        //if (veloMax != 99){form.button({ translate: "gui.hunter_skillmana.select" })}
        if (habMax != 99){form.button({ translate: "gui.hunter_skillhab.select" })}
        if ((habMax + manaMax + vitalMax + veloMax) <= 7) {
            form.show(player).then(result => {
                switch (result.selection) {
                    case 0:
                        player.runCommandAsync('tag @s remove hunter_skill_velo_' + veloMax)
                        player.runCommandAsync('tag @s add hunter_skill_velo_' + (veloMax + 1))
                        break;
                    case 1:
                        player.runCommandAsync('tag @s remove hunter_skill_vital_' + vitalMax)
                        player.runCommandAsync('tag @s add hunter_skill_vital_' + (vitalMax + 1))
                        break;
                    //case 2:
                    //    player.runCommandAsync('tag @s remove hunter_skill_mana_' + manaMax)
                    //    player.runCommandAsync('tag @s add hunter_skill_mana_' + (manaMax + 1))
                    //    break;
                    case 2:
                        player.runCommandAsync('tag @s remove hunter_skill_hab_' + habMax)
                        player.runCommandAsync('tag @s add hunter_skill_hab_' + (habMax + 1))
                        break;
                }
                player.runCommandAsync('tag @s remove avaliable_new_skill')
            })
        }
    }else{
        form.button({ translate: "gui.hunter_noneskillpoint.text" })
        form.button({ translate: "gui.hunter_mission_status.text" })
        form.show(player).then(result => {
            switch (result.selection) {
                case 0:
                    break;
                case 1:
                    get_mission_status(player)
                    break;
            }
        })
    }
}

function get_mission_status(player){
    if (player.hasTag("mission_vampire_tooth")) {
        if (player.runCommand("testfor @s[hasitem=[{item=sunrise:vampire_tooth,quantity=5..}]]").successCount == 1) {
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.book.mission_completed"}]}')
        }else{
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.five_vamp_tooth.curent_mission"}]}')
        }
    } else if (player.hasTag("mission_vampire_blood")) {
        if (player.runCommand("testfor @s[hasitem=[{item=sunrise:vampire_blood,quantity=5..}]]").successCount == 1) {
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.book.mission_completed"}]}')
        }else{
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.vampire_blood.curent_mission"}]}')
        }
    } else if (player.hasTag("mission_pure_vampire_blood")) {
        if (player.runCommand("testfor @s[hasitem=[{item=sunrise:pure_vampire_blood,quantity=1..}]]").successCount == 1) {
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.book.mission_completed"}]}')
        }else{
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.pure_vampire_blood.curent_mission"}]}')
        }
    } else if (player.hasTag("mission_philosopher_stone")) {
        if (player.runCommand("testfor @s[hasitem=[{item=sunrise:philosopher_stone,quantity=1..}]]").successCount == 1) {
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.book.mission_completed"}]}')
        }else{
            entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.philosopher_stone.curent_mission"}]}')
        }
    }
}

world.afterEvents.itemUse.subscribe(eventData => {
    if (eventData.itemStack.typeId == 'sunrise:hunter_skill_item') {
        _unlockSkill(eventData.source);
    }
})

world.afterEvents.entityHitBlock.subscribe(eventData => {
    let player = eventData.damagingEntity
    let block_loc = eventData.hitBlock.location
    player.getViewDirection()
    if (player.getViewDirection().y <= -0.9 && !player.hasTag("boost_vital")){
        player.addTag("boost_vital")
    } else if (player.getViewDirection().y <= -0.9 && player.hasTag("boost_vital")){
        player.removeTag("boost_vital")
        player.removeEffect("speed")
        player.removeEffect("jump_boost")
    }
})

world.afterEvents.entityHurt.subscribe(eventData=>{
    if (eventData.damageSource.damagingEntity.typeId == "minecraft:player"){
        let player = eventData.damageSource.damagingEntity
        let entity = eventData.hurtEntity
        let new_damage = eventData.damage
        if (player.hasTag("hunter")){
            system.runTimeout(c=>{
                entity.applyDamage((4*getSkillMax(player,"hab")),{damagingEntity:player,cause:"entity_attack"})
            },1)
        }
    }
})

world.afterEvents.playerInteractWithEntity.subscribe(eventData => {
    let player = eventData.player
    let entity = eventData.target
    if (player.hasTag("hunter")) {
        if (player.hasTag("has_mission")) {
            if (player.hasTag("mission_vampire_tooth")) {
                if (player.runCommand("testfor @s[hasitem=[{item=sunrise:vampire_tooth,quantity=5..}]]").successCount == 1) {
                    player.removeTag("has_mission")
                    player.removeTag("mission_vampire_tooth")
                    player.addTag("avaliable_new_skill")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.mission_completed"}]}')
                }else{
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.five_vamp_tooth.curent_mission"}]}')
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.non_completed_mission"}]}')
                }
            } else if (player.hasTag("mission_vampire_blood")) {
                if (player.runCommand("testfor @s[hasitem=[{item=sunrise:vampire_blood,quantity=5..}]]").successCount == 1) {
                    player.removeTag("has_mission")
                    player.removeTag("mission_vampire_blood")
                    player.addTag("avaliable_new_skill")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.mission_completed"}]}')
                    player.runCommandAsync('clear @s sunrise:vampire_blood 0 5')
                }else{
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.vampire_blood.curent_mission"}]}')
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.non_completed_mission"}]}')
                }
            } else if (player.hasTag("mission_pure_vampire_blood")) {
                if (player.runCommand("testfor @s[hasitem=[{item=sunrise:pure_vampire_blood,quantity=1..}]]").successCount == 1) {
                    player.removeTag("has_mission")
                    player.removeTag("mission_pure_vampire_blood")
                    player.addTag("avaliable_new_skill")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.mission_completed"}]}')
                    player.runCommandAsync('clear @s sunrise:pure_vampire_blood 0 1')
                }else{
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.pure_vampire_blood.curent_mission"}]}')
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.non_completed_mission"}]}')
                }
            } else if (player.hasTag("mission_philosopher_stone")) {
                if (player.runCommand("testfor @s[hasitem=[{item=sunrise:philosopher_stone,quantity=1..}]]").successCount == 1) {
                    player.removeTag("has_mission")
                    player.removeTag("mission_philosopher_stone")
                    player.addTag("avaliable_new_skill")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.mission_completed"}]}')
                    player.runCommandAsync('clear @s sunrise:philosopher_stone 0 1')
                }else{
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.philosopher_stone.curent_mission"}]}')
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.non_completed_mission"}]}')
                }
            }
        } else if (player.hasTag("avaliable_new_skill") == false) {
            let veloMax = getSkillMax(player, "velo")
            let vitalMax = getSkillMax(player, "vital")
            let manaMax = getSkillMax(player, "mana")
            let habMax = getSkillMax(player, "hab")
            if ((habMax + manaMax + vitalMax + veloMax) <= 7) {
                if ((habMax + manaMax + vitalMax + veloMax) <= 3) {
                    player.addTag("has_mission")
                    player.addTag("mission_vampire_tooth")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.five_vamp_tooth.mission"}]}')
                } else if ((habMax + manaMax + vitalMax + veloMax) <= 4) {
                    player.addTag("has_mission")
                    player.addTag("mission_vampire_tooth")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.five_vamp_tooth.mission"}]}')
                } else if ((habMax + manaMax + vitalMax + veloMax) <= 5) {
                    player.addTag("has_mission")
                    player.addTag("mission_vampire_blood")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.vampire_blood.mission"}]}')
                } else if ((habMax + manaMax + vitalMax + veloMax) <= 6) {
                    player.addTag("has_mission")
                    player.addTag("mission_pure_vampire_blood")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.pure_vampire_blood.mission"}]}')
                } else if ((habMax + manaMax + vitalMax + veloMax) <= 7) {
                    player.addTag("has_mission")
                    player.addTag("mission_philosopher_stone")
                    entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.philosopher_stone.mission"}]}')
                } else if ((habMax + manaMax + vitalMax + veloMax) <= 8) {

                } else if ((habMax + manaMax + vitalMax + veloMax) <= 9) {

                } else if ((habMax + manaMax + vitalMax + veloMax) <= 10) {

                } else if ((habMax + manaMax + vitalMax + veloMax) <= 11) {

                }
            } else {
                entity.runCommandAsync('tellraw @p {"rawtext":[{"translate":"hunter.dialog.have_avaliable_new_skill"}]}')
                entity.runCommandAsync('tellraw @p limit reached')
            }
        }else{

        }
    }
})