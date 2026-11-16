import {
    world,
    system
} from "@minecraft/server";

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (player.getDynamicProperty("mm:altered")) {
            const equippable = player.getComponent("minecraft:equippable")
            const main = equippable.getEquipment("Mainhand")
            const off = equippable.getEquipment("Offhand")
            if ((main && main.hasTag("mm:alterrealm_clock")) || (off && off.hasTag("mm:alterrealm_clock"))) {

                var display = "boobs"
                const alteredTime = world.scoreboard.getObjective("mm:altered_time")
                if (!alteredTime) return;
                const time = alteredTime.getScore(player)
                if (!time) return;
                display = Math.ceil(time / 20)
                var seconds = display % 60
                var minutes = Math.floor(display / 60)
                if (minutes > 0) {

                    display = `${minutes}:${seconds}`
                    if (`${seconds}`.length == 1) display = `${minutes}:0${seconds}`
                } else {
                    display = `${seconds}`
                    if (`${seconds}`.length == 1) display = `0${seconds}`
                }
                player.onScreenDisplay.setActionBar(`§c§l§o§c§r  §9§l${display} `)
            }
        }
    }
})