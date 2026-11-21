import { world } from '@minecraft/server';
import { ActionFormData } from "@minecraft/server-ui";


export function change_stone(player) {
    player.runCommandAsync("clear @s sunrise:change_stone 0 1")
    const vampire_player_eyes = new ActionFormData()
        .title("")
        .body("")
        .button("gui.button.vampire_player.eyes")
    const vampire_eyes = new ActionFormData()
        .title("")
        .body("")
        .button("1", "textures/entity/player_vampire_eye/eye1.png")
        .button("2", "textures/entity/player_vampire_eye/eye2.png")
        .button("3", "textures/entity/player_vampire_eye/eye3.png")
        .button("4", "textures/entity/player_vampire_eye/eye4.png")
    vampire_player_eyes.show(player).then(result => {
        switch (result.selection) {
            case 0:
                vampire_eyes.show(player).then(result => {
                    switch (result.selection) {
                        case 0:
                            player.addTag("eye1")
                            player.removeTag("eye2")
                            player.removeTag("eye3")
                            player.removeTag("eye4")
                            break;
                        case 1:
                            player.addTag("eye2")
                            player.removeTag("eye1")
                            player.removeTag("eye3")
                            player.removeTag("eye4")
                            break;
                        case 2:
                            player.addTag("eye3")
                            player.removeTag("eye1")
                            player.removeTag("eye2")
                            player.removeTag("eye4")
                            break;
                        case 3:
                            player.addTag("eye4")
                            player.removeTag("eye1")
                            player.removeTag("eye2")
                            player.removeTag("eye3")
                            break;
                    }
                });
                break;
        }
    });
}