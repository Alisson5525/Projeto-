
import {
    world,
    system
} from "@minecraft/server";


// so this is all lifted from dragons, its only used for demon armour atm but i wanted to make it here so i can use it in future
// its not a proper custom effect tho so....

//stun shock
system.afterEvents.scriptEventReceive.subscribe((event) => {
    const id = event.id;
    const entity = event.sourceEntity;
    const message = event.message;
    if (id === 'mm:stun') {
        const value = parseFloat(message);
        if (!value) {
            console.warn('No value specified');
            return;
        }

        if (entity.typeId !== "minecraft:player") {
            entity.addEffect("slowness", value * 20, { amplifier: 10, showParticles: false })
            return;
        }

        if (world.scoreboard.getObjective("mm:stun_time").getScore(entity) == undefined) {
            world.scoreboard.getObjective("mm:stun_time").addScore(entity, 0)

        }
        if (world.scoreboard.getObjective("mm:stun_time").getScore(entity) > 1) return;

        world.scoreboard.getObjective("mm:stun_time").addScore(entity, Math.ceil(value * 20))
        if (entity.typeId !== "minecraft:player") entity.addEffect("slowness", value * 20, { amplifier: 10, showParticles: false })


    }
    if (id === 'mm:stun_add') {
        const value = parseFloat(message);
        if (!value) {
            console.warn('No value specified');
            return;
        }

        if (entity.typeId !== "minecraft:player") {
            entity.addEffect("slowness", value * 20, { amplifier: 10, showParticles: false })
            return;
        }

        if (world.scoreboard.getObjective("mm:stun_time").getScore(entity) == undefined) {
            world.scoreboard.getObjective("mm:stun_time").addScore(entity, 0)

        }
        world.scoreboard.getObjective("mm:stun_time").addScore(entity, Math.ceil(value * 20))

    }
});

system.runInterval(() => {
    for (const player of world.getPlayers({
        scoreOptions: [{
            objective: "mm:stun_time",
            minScore: 1
        }]
    })) {
        var stunTime = world.scoreboard.getObjective("mm:stun_time")
        if (!stunTime) {
            world.scoreboard.addObjective("mm:stun_time");
            stunTime = world.scoreboard.getObjective("mm:stun_time")
        }
        let stunT = stunTime.getScore(player);
        if (stunT == 1) {
            player.inputPermissions.setPermissionCategory(1, true)
            player.inputPermissions.setPermissionCategory(2, true)
        } else {
            player.inputPermissions.setPermissionCategory(1, false)
            player.inputPermissions.setPermissionCategory(2, false)
        }
        if (player.hasTag("mm:demon_armour")) player.dimension.spawnParticle("mm:demon_armour_idle", player.location)
        player.addEffect("weakness", 5, { amplifier: 2, showParticles: false })

        if (stunT % 10 == 0) {
            player.runCommand('camerashake add @s 0.6 0.3 positional');
            player.playAnimation("animation.player.stun_mm")
        }
        stunTime.addScore(player, -1)
    }
});

