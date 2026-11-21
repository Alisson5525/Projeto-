import { world, system } from "@minecraft/server"

function calcularDistancia(x1, y1, z1, x2, y2, z2) {
    const distancia = Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2) + Math.pow((z2 - z1), 2));
    return distancia;
}

system.runInterval(() => {
    const allPlayers = world.getAllPlayers();
    allPlayers.forEach(player => {
        let biteDisplay = "";
        let show_blood_thist = "";
        let show_rage = "";
        let show_sun_burn = "";
        let is_for_show_sun_burn = false;
        player.runCommandAsync('execute in overworld as @a[tag=vampiro] at @s if block ~~1~ air if block ~~2~ air if block ~~3~ air if block ~~4~ air if block ~~5~ air if block ~~6~ air if block ~~7~ air if block ~~8~ air if block ~~9~ air if block ~~10~ air if block ~~11~ air if block ~~12~ air if block ~~13~ air if block ~~14~ air if block ~~15~ air if block ~~16~ air if block ~~17~ air if block ~~18~ air if block ~~19~ air if block ~~20~ air if block ~~21~ air if block ~~22~ air if block ~~23~ air if block ~~24~ air if block ~~25~ air if block ~~26~ air if block ~~27~ air if block ~~28~ air if block ~~29~ air if block ~~30~ air if block ~~31~ air if block ~~32~ air if block ~~33~ air if block ~~34~ air if block ~~35~ air if block ~~36~ air if block ~~37~ air if block ~~38~ air if block ~~39~ air if block ~~40~ air if block ~~41~ air if block ~~42~ air if block ~~43~ air if block ~~47~ air if block ~~49~ air if block ~~45~ air if block ~~50~ air if block ~~51~ air if block ~~52~ air if block ~~53~ air if block ~~57~ air if block ~~59~ air if block ~~44~ air if block ~~54~ air if block ~~56~ air if block ~~46~ air if block ~~48~ air if block ~~58~ air if block ~~60~ air run testfor @s').then(event => {
            if (event.successCount == 1) {
                is_for_show_sun_burn = true
            }
        }
        )
        if (player.hasTag('vampiro')) {
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=..750}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_0" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=750..1000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_1" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=1000..2000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_2" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=2000..3000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_3" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=3000..4000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_4" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=4000..5000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_5" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=5000..6000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_6" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=6000..7000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_7" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=7000..8000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_8" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=8000..9000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_9" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=9000..10000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x0" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=10000..11000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x1" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=11000..12000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x2" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=12000..13000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x3" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=13000..14000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x4" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=14000..16000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x5" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=16000..17000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x6" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=17000..18000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x7" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=18000..20000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x8" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=20000..21000}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_x9" : show_blood_thist
            player.runCommand("testfor @s[m=!c,tag=vampiro,scores={sangue=21000..}]").successCount == 1 ? show_blood_thist = "_display_blood_thist_xx0" : show_blood_thist
            const entityInView = player.getEntitiesFromViewDirection()[0]?.entity;
            if (entityInView) {
                const successCountEntity = entityInView.runCommand("testfor @s[type=!iron_golem,family=!cacador,family=mob,family=!monster,family=!vamp,family=!lob]").successCount;
                const distance = calcularDistancia(entityInView.location.x, entityInView.location.y, entityInView.location.z, player.location.x, player.location.y, player.location.z);
                if (successCountEntity === 1 && distance <= 3.25) {
                    biteDisplay = "bite_display";
                } else if (entityInView.typeId == "minecraft:player" && distance <= 3.25 && entityInView.runCommand("testfor @s[type=!iron_golem,tag=!cacador,tag=!vampiro,tag=!lobisomem]").successCount == 1) {
                    biteDisplay = "bite_display";
                }
            }
        } else if (!player.hasTag('vampiro')) {
            show_blood_thist = '_not_display_blood_thist'
        }
        if (player.hasTag('emuso_rage')) {
            show_rage == "_in_rage"
        }
        const timeOfDay = world.getTimeOfDay();
        if (timeOfDay <= 12000 && timeOfDay >= 23500 && is_for_show_sun_burn) {
            show_sun_burn == "_display_sunburn_effect"
        }
        player.runCommandAsync("title @s times 0 0 0");
        player.runCommandAsync(`title @s title ${biteDisplay} ${show_blood_thist} ${show_sun_burn} ${show_rage} x`);
        if (!biteDisplay == "") {
            player.runCommandAsync("hud @s hide crosshair");
        } else {
            player.runCommandAsync("hud @s reset crosshair");
        }
    });
}, 2);