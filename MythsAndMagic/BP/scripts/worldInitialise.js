import {
    world,
    system
} from "@minecraft/server";

const allScores = [
    "mm:altered_time",
    "mm:revoid_scream",
    "mm:stun_time"
];

function spawnLoader(dim, loc, i) {
    try {

        dim.spawnEntity("mm:loader", loc)
    } catch {
        system.runTimeout(() => {

            spawnLoader(dim, loc, i + 1)
        }, 20)
    }
}

world.afterEvents.worldLoad.subscribe(e => {
    if (world.getDynamicProperty("mm:disablealterrealm") !== true && world.getDynamicProperty("mm:disablealterrealm") !== false) {
        world.setDynamicProperty("mm:disablealterrealm", false)
    }
    if (world.getDynamicProperty("mm:disablealterrealm") == false) {
        const theEnd = world.getDimension("mm:alterrealm")
        theEnd.runCommand("tickingarea remove mm:alterrealm_1")
        theEnd.runCommand("tickingarea remove mm:alterrealm_2")
        theEnd.runCommand("tickingarea remove mm:alterrealm_3")
        theEnd.runCommand("tickingarea remove mm:alterrealm_4")
        theEnd.runCommand("tickingarea remove mm:alterrealm_5")

        system.runTimeout(() => {
            theEnd.runCommand(`tickingarea add circle 166666 65 166666 4 mm:alterrealm_5 true`)
        }, 100)
        system.runTimeout(() => {
            const loader = theEnd.getEntities({ type: "mm:loader" })
            if (loader.length == 0) spawnLoader(theEnd, { x: 166666, y: 128, z: 166666 }, 0)
        }, 150)
    }
    world.gameRules.showTags = false
    for (const score of allScores) {
        if (!world.scoreboard.getObjective(score)) {
            world.scoreboard.addObjective(score)
        }
    }
});

world.afterEvents.playerSpawn.subscribe(e => {
    let player = e.player;
    if (e.initialSpawn === false) return;
    if (player.getDynamicProperty("mm:altered") == undefined) player.setDynamicProperty("mm:altered", false)
    system.runTimeout(() => {
        if (player.getDynamicProperty("mm:altered") == true) {
            const dimToTp = player.getDynamicProperty("mm:alter_dim").toString().replace("minecraft:", "")
            const loc = player.getDynamicProperty("mm:alter_loc")
            player.runCommand("execute in " + dimToTp + " as @s run tp " + `${loc.x} ${loc.y} ${loc.z}`)
            world.scoreboard.getObjective("mm:altered_time").setScore(player, -1)

            player.setDynamicProperty("mm:alter_loc", null)
            player.setDynamicProperty("mm:alter_dim", null)
            player.setDynamicProperty("mm:altered", false)
        }
    }, 50)
    for (const score of allScores) {
        world.scoreboard.getObjective(score).addScore(player, 0);
    }
    player.removeTag("mm:shockweed_cooldown")
    player.removeTag("mm:red_mana_bar")
    world.scoreboard.getObjective("mm:altered_time").setScore(player, -1)
    system.runTimeout(() => {
        player.addTag('aly:mm_enabled');
    }, 10);
    // Aly advancements compatibility 
});
