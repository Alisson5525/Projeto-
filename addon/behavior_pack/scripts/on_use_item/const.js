import { indexBookExe } from "./complementar/guide_book.js"
import { use_hunter_bow_I } from "./complementar/hunter_bows.js"
import { UseSkill } from "./complementar/skill_item_lb_vp.js"
import { change_stone } from "./complementar/change_stone.js"

//ON USE ITEM
export const item_event = {
    "sunrise:vampire_craft_book": {
        use_event(source) {
            indexBookExe(source)
        }
    },
    "sunrise:hunter_bow": {
        use_event(source) {
            use_hunter_bow_I(source)
        }
    },
    "sunrise:vampire_skill_item": {
        use_event(source) {
            if (source.hasTag("vampiro")) {
                UseSkill(source, "vampiro")
            }
        }
    },
    "sunrise:werewolf_skill_item": {
        use_event(source) {
            if (source.hasTag("lobisomem")) {
                UseSkill(source, "lobisomem")
            }
        }
    },
    "sunrise:change_stone": {
        use_event(source) {
            change_stone(source)
        }
    },
    "sunrise:vampire_tooth": {
        use_event(source) {
            if (!source.hasTag("vampiro") && !source.hasTag("lobisomem") && !source.hasTag("hunter") && !source.hasTag("timerToVamp") && !source.hasTag("timerToLob") && !source.hasTag("timerToHunter")) {
                source.runCommandAsync("clear @s sunrise:vampire_tooth 0 1")
                source.runCommandAsync("scoreboard objectives add timerToVamp dummy timerToVamp")
                source.runCommandAsync("scoreboard players set @s timerToVamp 6000")
                source.runCommandAsync("effect @s hunger 300 0 true")
                source.runCommandAsync("tag @s add timerToVamp")
            }
        }
    },
    "sunrise:werewolf_fang": {
        use_event(source) {
            if (!source.hasTag("vampiro") && !source.hasTag("lobisomem") && !source.hasTag("hunter") && !source.hasTag("timerToVamp") && !source.hasTag("timerToLob") && !source.hasTag("timerToHunter")) {
                source.runCommandAsync("clear @s sunrise:werewolf_fang 0 1")
                source.runCommandAsync("scoreboard objectives add timerToLob dummy timerToLob")
                source.runCommandAsync("effect @s hunger 300 0 true")
                source.runCommandAsync("scoreboard players set @s timerToLob 6000")
                source.runCommandAsync("tag @s add timerToLob")
            }
        }
    },
    "sunrise:garlic_syringe": {
        use_event(source) {
            if (!source.hasTag("vampiro") && !source.hasTag("lobisomem") && !source.hasTag("hunter") && !source.hasTag("timerToVamp") && !source.hasTag("timerToLob") && !source.hasTag("timerToHunter")) {
                source.runCommandAsync("clear @s sunrise:garlic_syringe 0 1")
                source.runCommandAsync("scoreboard objectives add timerToHunter dummy timerToHunter")
                source.runCommandAsync("effect @s hunger 300 0 true")
                source.runCommandAsync("scoreboard players set @s  timerToHunter 6000")
                source.runCommandAsync("tag @s add timerToHunter")
            }
        }
    }
}

//ON USE ITEM COMPLETE
export const item_event_complete = {
    "minecraft:milk_bucket": {
        use_event(source) {
            source.runCommandAsync("function sunrise/trans_stop")
        }
    },
    "sunrise:blood_bottle_4": {
        use_event(source) {
            source.runCommandAsync("scoreboard players add @p sangue 10000")
        }
    },
    "sunrise:blood_bottle_3": {
        use_event(source) {
            source.runCommandAsync("scoreboard players add @p sangue 7000")
        }
    },
    "sunrise:blood_bottle_2": {
        use_event(source) {
            source.runCommandAsync("scoreboard players add @p sangue 6000")
        }
    },
    "sunrise:blood_bottle_1": {
        use_event(source) {
            source.runCommandAsync("scoreboard players add @p sangue 3000")
        }
    },
    "sunrise:vampire_cure": {
        use_event(source) {
            source.runCommandAsync("function sunrise/removevp")
        }
    },
    "sunrise:werewolf_cure": {
        use_event(source) {
            source.runCommandAsync("function sunrise/removelb")
        }
    },
    "sunrise:philosopher_water": {
        use_event(source) {
            source.runCommandAsync("function sunrise/removehu")
        }
    }
}

//ON ENTITY HIT WITH ITEM
export const item_event_on_hit = {
    "sunrise:vampire_sword_m": {
        filters(source, entity, itemStack) {
            return true
        },
        use_event(source, entity, itemStack) {
            if (itemStack.getComponent("durability").damage >= 90) {
                source.runCommandAsync("replaceitem entity @s slot.weapon.mainhand 0 sunrise:vampire_sword_e")
            }
        }
    },
    "sunrise:vampire_sword": {
        filters(source, entity, itemStack) {
            return true
        },
        use_event(source, entity, itemStack) {
            if (itemStack.getComponent("durability").damage >= 90) {
                source.runCommandAsync("replaceitem entity @s slot.weapon.mainhand 0 sunrise:vampire_sword_m")
            }
        }
    },
    "sunrise:werewolf_claws_m": {
        filters(source, entity, itemStack) {
            return true
        },
        use_event(source, entity, itemStack) {
            if (itemStack.getComponent("durability").damage >= 90) {
                source.runCommandAsync("replaceitem entity @s slot.weapon.mainhand 0 sunrise:werewolf_claws_e")
            }
        }
    },
    "sunrise:werewolf_claws": {
        filters(source, entity, itemStack) {
            return true
        },
        use_event(source, entity, itemStack) {
            if (itemStack.getComponent("durability").damage >= 90) {
                source.runCommandAsync("replaceitem entity @s slot.weapon.mainhand 0 sunrise:werewolf_claws_m")
            }
        }
    },
}

//ON USE ITEM IN BLOCK
export const item_event_on = {
    "sunrise:vampire_sword_m": {
        on_use_block: "sunrise:recharging_altar",
        use_event(source, block) {
            if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:blood_bottle_4,quantity=4..}] slot.weapon.mainhand 0 sunrise:vampire_sword`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:blood_bottle_4,quantity=4..}] sunrise:blood_bottle_4 0 4`)
                source.runCommandAsync("playsound hit.copper")
            } else if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:liver,quantity=4..}] slot.weapon.mainhand 0 sunrise:vampire_sword`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:liver,quantity=4..}] sunrise:liver 0 4`)
                source.runCommandAsync("playsound hit.copper")
            }
        }
    },
    "sunrise:vampire_sword_e": {
        on_use_block: "sunrise:recharging_altar",
        use_event(source, block) {
            if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:blood_bottle_4,quantity=4..}] slot.weapon.mainhand 0 sunrise:vampire_sword`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:blood_bottle_4,quantity=4..}] sunrise:blood_bottle_4 0 4`)
                source.runCommandAsync("playsound hit.copper")
            } else if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:liver,quantity=4..}] slot.weapon.mainhand 0 sunrise:vampire_sword`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:liver,quantity=4..}] sunrise:liver 0 4`)
                source.runCommandAsync("playsound hit.copper")
            }
        }
    },
    "sunrise:werewolf_claws_m": {
        on_use_block: "sunrise:recharging_altar",
        use_event(source, block) {
            if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:blood_bottle_4,quantity=4..}] slot.weapon.mainhand 0 sunrise:werewolf_claws`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:blood_bottle_4,quantity=4..}] sunrise:blood_bottle_4 0 4`)
                source.runCommandAsync("playsound hit.copper")
            } else if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:liver,quantity=4..}] slot.weapon.mainhand 0 sunrise:werewolf_claws`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:liver,quantity=4..}] sunrise:liver 0 4`)
                source.runCommandAsync("playsound hit.copper")
            }
        }
    },
    "sunrise:werewolf_claws_e": {
        on_use_block: "sunrise:recharging_altar",
        use_event(source, block) {
            if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:blood_bottle_4,quantity=4..}] slot.weapon.mainhand 0 sunrise:werewolf_claws`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:blood_bottle_4,quantity=4..}] sunrise:blood_bottle_4 0 4`)
                source.runCommandAsync("playsound hit.copper")
            } else if (source.runCommand(`execute if block ${block.location.x} ${block.location.y} ${block.location.z} sunrise:recharging_altar run replaceitem entity @s[hasitem={item=sunrise:liver,quantity=4..}] slot.weapon.mainhand 0 sunrise:werewolf_claws`).successCount == 1) {
                source.runCommand(`clear @s[m=!c,hasitem={item=sunrise:liver,quantity=4..}] sunrise:liver 0 4`)
                source.runCommandAsync("playsound hit.copper")
            }
        }
    }
}