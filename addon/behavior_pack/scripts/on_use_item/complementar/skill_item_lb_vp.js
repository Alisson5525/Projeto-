import {ActionFormData} from "@minecraft/server-ui";
import {system} from '@minecraft/server';

export const poderesVP = ['nightvision', 'fly', 'indetectavel', 'waterproof', 'rage', 'sunresistence', 'servantsbat', 'acrobata', 'blooddrinker', 'poucasede', 'teleport', 'icetouch', 'regeneration', 'invisibilidade',"absorption"]
export const poderesLB = ['nightvision', 'absorption', 'waterproof', 'rage', 'suntransform', 'poucafome', 'onehit', 'acrobata', 'defencive', 'sangramento', 'regeneration', 'invisibilidade'
    //'servantswolf', 

    //'indetectavel',
]

var playerSkillsCooldown = []
var playerSkillsTick = []

function calcularDistancia(x1, y1, z1, x2, y2, z2) {
    const distancia = Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2) + Math.pow((z2 - z1), 2));
    return distancia;
}

export function UseSkill(player, tipo) {
    const dlg_UseSkill = new ActionFormData();
    const res_UseSkill = [];
    dlg_UseSkill.title("SkillScreen");
    dlg_UseSkill.button('gui.button.UseSkill_none',
        'textures/ui/skill0.png');
    res_UseSkill.push('gui.button.UseSkill_none');
    if (tipo == "vampiro") {
        poderesVP.forEach(poder => {
            if (poder == 'nightvision' || poder == 'sunresistence' || poder == 'fogremoval' || poder == 'waterproof' || poder == 'indetectavel' || poder == 'acrobata' || poder == 'poucasede' || poder == 'absorption') { } else {
                if (player.hasTag(poder) == true) {
                    if (playerSkillsCooldown.includes(player.nameTag + poder)){
                        dlg_UseSkill.button('gui.button.UseSkill_cooldown', 'textures/ui/skill_' + poder + '.png');
                        res_UseSkill.push("none");
                    }else{
                        dlg_UseSkill.button('gui.button.UseSkill_' + poder, 'textures/ui/skill_' + poder + '.png');
                        res_UseSkill.push(poder);
                    }
                }
            }
        });
        dlg_UseSkill.show(player).then(result => {
            player.runCommand('function sunrise/resetemuso');
            apllySkillAndCooldown(player,res_UseSkill[result.selection])
        })
    } else if (tipo == "lobisomem") {
        poderesLB.forEach(poder => {
            if (poder == "poucafome" || poder == 'nightvision' || poder == 'suntransform' || poder == 'fogremoval' || poder == 'waterproof' || poder == 'indetectavel' || poder == 'acrobata') { } else {
                if (player.hasTag(poder) == true) {
                    dlg_UseSkill.button('gui.button.UseSkill_' + poder, 'textures/ui/skill_' + poder + '.png');
                    res_UseSkill.push(poder);
                }
            }
        });
        dlg_UseSkill.show(player).then(result => {
            player.runCommand('function sunrise/resetemuso');
            player.runCommandAsync('tag @s add emuso_' + res_UseSkill[result.selection]);
            if (res_UseSkill[result.selection] == 'suntransform') {
                player.runCommand('event entity @s lobisomem_skin');
            }
        })
    }
}

function apllySkillAndCooldown(player, skill_name) {
    const skillKey = player.nameTag + skill_name;
    if (!playerSkillsCooldown.includes(skillKey)) {
        playerSkillsCooldown.push(skillKey);
        playerSkillsTick.push(system.currentTick);
        player.runCommandAsync('tag @s add emuso_' + skill_name);

        // Obter dados de localização e direção uma vez
        const viewBlock = player.getBlockFromViewDirection().block;
        const distance = calcularDistancia(player.location.x, player.location.y, player.location.z, viewBlock.x, viewBlock.y, viewBlock.z);

        if (skill_name == 'fly') {
            player.runCommandAsync('gamerule sendCommandFeedback false');
            player.runCommandAsync('particle sunrise:transform_smoke ~~~');
            player.runCommandAsync('tag @s[tag=vampiro,scores={sangue=101..}] add on_to_fly');
            player.runCommandAsync('ability @s[tag=vampiro,scores={sangue=101..}] mayfly true');
            player.runCommandAsync('effect @s[tag=vampiro,scores={sangue=101..}] invisibility 99999 1 true')
            player.runCommandAsync('replaceitem entity @s[tag=vampiro,scores={sangue=101..}] slot.armor.head 0 sunrise:trans_bat 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}');
            player.runCommandAsync('gamerule sendCommandFeedback true');
        } else if (skill_name == 'teleport' && distance <= 240) {
            player.runCommandAsync("tag @s remove emuso_teleport")
            player.runCommandAsync("playsound mob.shulker.teleport")
            player.runCommandAsync('particle sunrise:teleport '+ player.location.x + " " + (1 + player.location.y) + " " + player.location.z);
            player.runCommandAsync('gamerule sendCommandFeedback false')
            player.runCommandAsync("tp @s " + viewBlock.x + " " + (1 + viewBlock.y) + " " + viewBlock.z)
            player.runCommandAsync('gamerule sendCommandFeedback true');
            player.runCommandAsync('particle sunrise:teleport ~~~');
        } else if (skill_name == 'rage' && distance <= 25) {
            player.runCommandAsync('effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_rage] strength 60 2');
            player.runCommandAsync('scoreboard players remove @s sangue 1000')
            player.runCommandAsync("playanimation @s animation.skill.player.rage false 0.3")
            server.system.runTimeout(event=>{
                player.runCommand("tag @s remove emuso_rage")
            },1200)
        } else if (skill_name == 'servantsbat') {
            const bat1 = world.getDimension("overworld").spawnEntity("sunrise:servantsbat", player.location);
            const bat2 = world.getDimension("overworld").spawnEntity("sunrise:servantsbat", player.location);
            player.runCommandAsync("playanimation @s animation.skill.player.servantsbat false 0.3")
            player.runCommandAsync('particle sunrise:transform_smoke ~~~')
            player.runCommandAsync('playsound mob.bat.idle @s ~~~ 0.7 1 0')
            bat1.runCommandAsync("tag @s add " + player.nameTag);
            bat2.runCommandAsync("tag @s add " + player.nameTag);
            system.runTimeout(event => {
                bat1.runCommand("kill @s");
                bat2.runCommand("kill @s");
            }, 300);
            player.runCommandAsync('scoreboard players remove @s sangue 1000');
        }
    }
}

system.runInterval(()=>{
    playerSkillsTick.forEach(bolo => {
        if (bolo + 400 <= system.currentTick){
            let index = playerSkillsTick.indexOf(bolo)
            playerSkillsCooldown.splice(index, 1);
            playerSkillsTick.splice(index, 1);
        }
    })
},10)