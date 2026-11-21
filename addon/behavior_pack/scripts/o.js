import { world, system} from "@minecraft/server"
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import "./fly_API/main.js"
import "./custom_components/main.js"
import "./hud_elements/main.js"
import "./on_entity_die/main.js"
import "./on_entity_hit/main.js"
import "./on_use_item/main.js"
import "./on_vamp_bite/main.js"

system.runInterval(() => {
    world.getAllPlayers().forEach(player => {
        player.runCommandAsync("function sunrise/run_for_all")
        player.runCommandAsync("execute as @s[tag=!recebeuLivro] run give @s sunrise:vampire_craft_book");
        player.runCommandAsync("execute as @s[hasitem=[{item=sunrise:vampire_craft_book}],tag=!recebeuLivro] run tag @s add recebeuLivro");
        if (player.isInWater && player.hasTag('vampiro') && !player.hasTag('waterproof')) {
            player.runCommandAsync("damage @s 1 drowning");
        }
    });

    const timeOfDay = world.getTimeOfDay();
    if (timeOfDay >= 12000 && timeOfDay <= 23500) {
        world.getDimension("overworld").runCommandAsync("function sunrise/setnight");
        if (world.getMoonPhase() === 0) {
            world.getDimension("overworld").runCommandAsync("function sunrise/red_moon");
        }
    } else {
        world.getDimension("overworld").runCommandAsync("function sunrise/setday");
        world.getDimension("overworld").runCommandAsync("execute in overworld as @a[tag=vampiro,tag=!sunresistence] at @s if block ~~1~ air if block ~~2~ air if block ~~3~ air if block ~~4~ air if block ~~5~ air if block ~~6~ air if block ~~7~ air if block ~~8~ air if block ~~9~ air if block ~~10~ air if block ~~11~ air if block ~~12~ air if block ~~13~ air if block ~~14~ air if block ~~15~ air if block ~~16~ air if block ~~17~ air if block ~~18~ air if block ~~19~ air if block ~~20~ air if block ~~21~ air if block ~~22~ air if block ~~23~ air if block ~~24~ air if block ~~25~ air if block ~~26~ air if block ~~27~ air if block ~~28~ air if block ~~29~ air if block ~~30~ air if block ~~31~ air if block ~~32~ air if block ~~33~ air if block ~~34~ air if block ~~35~ air if block ~~36~ air if block ~~37~ air if block ~~38~ air if block ~~39~ air if block ~~40~ air if block ~~41~ air if block ~~42~ air if block ~~43~ air if block ~~47~ air if block ~~49~ air if block ~~45~ air if block ~~50~ air if block ~~51~ air if block ~~52~ air if block ~~53~ air if block ~~57~ air if block ~~59~ air if block ~~44~ air if block ~~54~ air if block ~~56~ air if block ~~46~ air if block ~~48~ air if block ~~58~ air if block ~~60~ air run damage @s 1 entity_attack entity @s");
        world.getDimension("overworld").runCommandAsync("execute in overworld as @a[tag=vampiro,tag=!sunresistence] at @s if block ~~1~ air if block ~~2~ air if block ~~3~ air if block ~~4~ air if block ~~5~ air if block ~~6~ air if block ~~7~ air if block ~~8~ air if block ~~9~ air if block ~~10~ air if block ~~11~ air if block ~~12~ air if block ~~13~ air if block ~~14~ air if block ~~15~ air if block ~~16~ air if block ~~17~ air if block ~~18~ air if block ~~19~ air if block ~~20~ air if block ~~21~ air if block ~~22~ air if block ~~23~ air if block ~~24~ air if block ~~25~ air if block ~~26~ air if block ~~27~ air if block ~~28~ air if block ~~29~ air if block ~~30~ air if block ~~31~ air if block ~~32~ air if block ~~33~ air if block ~~34~ air if block ~~35~ air if block ~~36~ air if block ~~37~ air if block ~~38~ air if block ~~39~ air if block ~~40~ air if block ~~41~ air if block ~~42~ air if block ~~43~ air if block ~~47~ air if block ~~49~ air if block ~~45~ air if block ~~50~ air if block ~~51~ air if block ~~52~ air if block ~~53~ air if block ~~57~ air if block ~~59~ air if block ~~44~ air if block ~~54~ air if block ~~56~ air if block ~~46~ air if block ~~48~ air if block ~~58~ air if block ~~60~ air run particle sunrise:burn_smoke ~~~");
        world.getDimension("overworld").runCommandAsync("tag @a[tag=red_moon_msg] remove red_moon_msg");
    }
}, 40);

system.runInterval(()=>{
    let players = world.getPlayers({tags:["Skill_protecao_divina"]})
    players.forEach(player => {
        player.runCommandAsync("execute as @e[r=4,family=monster] run damage @s 2 entity_attack entity @p[tag=Skill_protecao_divina]")
        player.runCommandAsync("execute at @e[r=4,family=monster] run particle sunrise:holy_a ~ ~ ~")
    })
},7)