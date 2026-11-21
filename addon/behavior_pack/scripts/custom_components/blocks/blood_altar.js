import { world , system} from '@minecraft/server';
import {ActionFormData,ModalFormData} from "@minecraft/server-ui";

export const poderesVP = ['nightvision', 'fly', 'indetectavel', 'waterproof', 'rage', 'sunresistence', 'servantsbat', 'acrobata', 'blooddrinker', 'poucasede', 'teleport', 'icetouch', 'regeneration', 'invisibilidade',"absorption"]
export const poderesLB = ['nightvision', 'absorption', 'waterproof', 'rage', 'suntransform', 'poucafome', 'onehit', 'acrobata', 'defencive', 'sangramento', 'regeneration', 'invisibilidade'
    //'servantswolf', 

    //'indetectavel',
]

function NewSkillUnlock(player, poderes, tipo) {
    const dlg_NewSkillUnlock = new ActionFormData()
    dlg_NewSkillUnlock.title("")
    const res_NewSkillUnlock = []
    if (tipo == "vampiro") {
        poderes.forEach(poder => {
            if (player.hasTag(poder) == false) {
                dlg_NewSkillUnlock.button('gui.button.vp.UnlockSkill_' + poder, 'textures/ui/skill_' + poder + '.png');
                res_NewSkillUnlock.push(poder);
            }
        });
        dlg_NewSkillUnlock.show(player).then(result => {
            if (res_NewSkillUnlock[result.selection] == 'nightvision' || res_NewSkillUnlock[result.selection] == 'fly') {
                player.runCommand('tag @s[hasitem={item=sunrise:weak_human_heart,quantity=1..}] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem={item=sunrise:weak_human_heart,quantity=1..}] sunrise:weak_human_heart 0 1');
            } else if (res_NewSkillUnlock[result.selection] == 'rage' || res_NewSkillUnlock[result.selection] == 'servantsbat' || res_NewSkillUnlock[result.selection] == 'sunresistence') {
                player.runCommand('tag @s[hasitem=[{item=sunrise:weak_human_heart,quantity=5..},{item=sunrise:vampire_blood,quantity=5..}]] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:weak_human_heart,quantity=5..}]] sunrise:weak_human_heart 0 5');
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:vampire_blood,quantity=5..}]] sunrise:vampire_blood 0 5');
            } else if (res_NewSkillUnlock[result.selection] == 'blooddrinker' || res_NewSkillUnlock[result.selection] == 'poucasede' || res_NewSkillUnlock[result.selection] == 'acrobata') {
                player.runCommand('tag @s[hasitem=[{item=sunrise:human_heart,quantity=1..},{item=sunrise:pure_vampire_blood,quantity=1..}]] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:human_heart,quantity=1..}]] sunrise:human_heart 0 1');
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:pure_vampire_blood,quantity=1..}]] sunrise:pure_vampire_blood 0 1');
            } else if (res_NewSkillUnlock[result.selection] == 'fogremoval' || res_NewSkillUnlock[result.selection] == 'waterproof' || res_NewSkillUnlock[result.selection] == 'indetectavel') {
                player.runCommand('tag @s[hasitem=[{item=sunrise:weak_human_heart,quantity=5..},{item=sunrise:vampire_blood,quantity=5..}]] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:weak_human_heart,quantity=1..}]] sunrise:weak_human_heart 0 1');
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:vampire_blood,quantity=1..}]] sunrise:vampire_blood 0 1');
            } else if (res_NewSkillUnlock[result.selection] == 'sworddex' || res_NewSkillUnlock[result.selection] == 'defencive' || res_NewSkillUnlock[result.selection] == 'teleport') {
                player.runCommand('tag @s[hasitem=[{item=sunrise:human_heart,quantity=5..},{item=sunrise:pure_vampire_blood,quantity=5..}]] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:human_heart,quantity=5..}]] sunrise:human_heart 0 5');
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:pure_vampire_blood,quantity=5..}]] sunrise:pure_vampire_blood 0 5');
            } else if (res_NewSkillUnlock[result.selection] == 'absorption' || res_NewSkillUnlock[result.selection] == 'icetouch' || res_NewSkillUnlock[result.selection] == 'regeneration' || res_NewSkillUnlock[result.selection] == 'invisibilidade') {
                player.runCommand('tag @s[hasitem=[{item=sunrise:human_heart,quantity=10..},{item=sunrise:pure_vampire_blood,quantity=10..}]] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:human_heart,quantity=10..}]] sunrise:human_heart 0 10');
                player.runCommandAsync('clear @s[tag=' + res_NewSkillUnlock[result.selection] + ',hasitem=[{item=sunrise:pure_vampire_blood,quantity=10..}]] sunrise:pure_vampire_blood 0 10');
            }
        })
    } else if (tipo == "lobisomem") {
        poderes.forEach(poder => {
            if (player.hasTag(poder) == false) {
                dlg_NewSkillUnlock.button('gui.button.lb.UnlockSkill_' + poder, 'textures/ui/skill_' + poder + '.png');
                res_NewSkillUnlock.push(poder);
            }
        });
        dlg_NewSkillUnlock.show(player).then(result => {
            if (res_NewSkillUnlock[result.selection] == 'nightvision' || res_NewSkillUnlock[result.selection] == 'absorption') {
                player.runCommandAsync('tag @s[hasitem={item=sunrise:weak_human_heart,quantity=1..}] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[hasitem={item=sunrise:weak_human_heart,quantity=1..}] sunrise:weak_human_heart 0 1');
            } else if (res_NewSkillUnlock[result.selection] == 'fogremoval' || res_NewSkillUnlock[result.selection] == 'waterproof' || res_NewSkillUnlock[result.selection] == 'indetectavel') {
                player.runCommandAsync('tag @s[hasitem={item=sunrise:weak_human_heart,quantity=1..}] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[hasitem={item=sunrise:weak_human_heart,quantity=1..}] sunrise:weak_human_heart 0 1');
            } else if (res_NewSkillUnlock[result.selection] == 'rage' || res_NewSkillUnlock[result.selection] == 'servantswolf' || res_NewSkillUnlock[result.selection] == 'suntransform') {
                player.runCommandAsync('tag @s[tag=lbnII,hasitem={item=sunrise:weak_human_heart,quantity=5..}] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[hasitem={tag=lbnII,item=sunrise:weak_human_heart,quantity=5..}] sunrise:weak_human_heart 0 1');
            } else if (res_NewSkillUnlock[result.selection] == 'onehit' || res_NewSkillUnlock[result.selection] == 'poucafome' || res_NewSkillUnlock[result.selection] == 'acrobata') {
                player.runCommandAsync('tag @s[tag=lbnII,hasitem={item=sunrise:human_heart,quantity=1..}] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[hasitem={tag=lbnII,item=sunrise:human_heart,quantity=1..}] sunrise:human_heart 0 1');
            } else if (res_NewSkillUnlock[result.selection] == 'sworddex' || res_NewSkillUnlock[result.selection] == 'defencive' || res_NewSkillUnlock[result.selection] == 'esquiva') {
                player.runCommandAsync('tag @s[tag=lbnIII,hasitem={item=sunrise:human_heart,quantity=5..}] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[hasitem={tag=lbnIII,item=sunrise:human_heart,quantity=5..}] sunrise:human_heart 0 5');
            } else if (res_NewSkillUnlock[result.selection] == 'sangramento' || res_NewSkillUnlock[result.selection] == 'regeneration' || res_NewSkillUnlock[result.selection] == 'invisibilidade') {
                player.runCommandAsync('tag @s[tag=lbnIII,hasitem={item=sunrise:human_heart,quantity=10..}] add ' + res_NewSkillUnlock[result.selection]);
                player.runCommandAsync('clear @s[hasitem={tag=lbnIII,item=sunrise:human_heart,quantity=10..}] sunrise:human_heart 0 10');

            }
        })
    }

}

world.beforeEvents.worldInitialize.subscribe((data) => {
    data.blockComponentRegistry.registerCustomComponent('sunrise:blood_altar_component', {
        onPlayerInteract: ((onPlayerInteract) => {
            const { block, player } = onPlayerInteract;
            const lockBlock = block.location.x + ' ' + block.location.y + ' ' + block.location.z;
            const blood_level = block.permutation.getState('sunrise:blood_altar_level');
            const equipment = player.getComponent('equippable').getEquipment('Mainhand');

            if (equipment == undefined) return;

            if (blood_level <= 9) {
                player.runCommand('gamerule sendcommandfeedback false')
                if (equipment.typeId == 'sunrise:blood_bottle_4'){
                    player.runCommand('give @s glass_bottle 1')
                    player.runCommand('clear @s sunrise:blood_bottle_4 0 1')
                    block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', blood_level + 1));
                }else if (equipment.typeId == 'sunrise:liver'){
                    player.runCommand('clear @s sunrise:liver 0 1')
                    block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', blood_level + 1));
                }
                player.runCommand('gamerule sendcommandfeedback true')
            }else if(blood_level == 10){
                if (equipment.typeId == 'sunrise:vampire_tooth' && player.hasTag("vampiro")){
                    player.runCommand('gamerule sendcommandfeedback false')
                    player.runCommand('particle sunrise:magic_altar ' + lockBlock)
                    player.runCommand('clear @s sunrise:vampire_tooth 0 1')
                    block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', 8));
                    system.runTimeout(bahh =>{
                        block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', 5));
                        system.runTimeout(bahh =>{
                            block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', 0));
                            NewSkillUnlock(player, poderesVP, "vampiro")
                            player.runCommand('gamerule sendcommandfeedback true')
                        },20)
                    },40)

                }
                else if (equipment.typeId == 'sunrise:werewolf_fang' && player.hasTag("lobisomem")){
                    player.runCommand('gamerule sendcommandfeedback false')
                    player.runCommand('particle sunrise:magic_altar ' + lockBlock)
                    player.runCommand('clear @s sunrise:werewolf_fang 0 1')
                    block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', 8));
                    system.runTimeout(bahh =>{
                        block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', 5));
                        system.runTimeout(bahh =>{
                            block.setPermutation(block.permutation.withState('sunrise:blood_altar_level', 0));
                            NewSkillUnlock(player, poderesLB, "lobisomem")
                            player.runCommand('gamerule sendcommandfeedback true')
                        },20)
                    },40)
                }
            }
        })
    });

});