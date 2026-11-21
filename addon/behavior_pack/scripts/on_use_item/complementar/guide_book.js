import {ActionFormData} from "@minecraft/server-ui";

const indexBook = new ActionFormData()
    .title("BookScreen")
    .body("")
    .button("gui.button.vampire")
    .button("gui.button.werewolf")
    .button("gui.button.hunter")
    .button("commands")

const indexVampireBook = new ActionFormData()
    .title("BookScreen")
    .body("")
    .button("gui.button.HowTurnVampire")
    .button("gui.button.drinkBlood")
    .button("gui.button.unlockSkillVPLB")

const indexWerewolfBook = new ActionFormData()
    .title("BookScreen")
    .body("")
    .button("gui.button.HowTurnWerewolf")
    .button("gui.button.unlockSkillVPLB")
    .button("gui.button.niveisLB")

const indexHunterBook = new ActionFormData()
    .title("BookScreen")
    .body("")
    .button("gui.button.HowTurnHunter")
    .button("gui.button.howUpLevel")
    .button("gui.button.hunterAtributes")

export function indexBookExe(player) {
    indexBook.show(player).then(result => {
        switch (result.selection) {
            case 0:
                indexVampireBookExe(player);
                break;
            case 1:
                indexWerewolfBookExe(player);
                break;
            case 2:
                indexHunterBookExe(player);
                break;
            case 3:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.commands.funcVP"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.commands.funcLB"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.commands.funcHU"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.commands.removeHU"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.commands.removeVP"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.commands.removeLB"}]}');
                break;
        }
    });
}

function indexVampireBookExe(player) {
    indexVampireBook.show(player).then(result => {
        switch (result.selection) {
            case 0:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.HowTurnVampire1"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.HowTurnVampire2"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.HowTurnVampire3"}]}');
                break;
            case 1:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.drinkBlood1"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.drinkBlood2"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.drinkBlood3"}]}');
                break;
            case 2:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.unlockSkillVP1"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.unlockSkillVP2"}]}');
                break;
        }
    });
}

function indexWerewolfBookExe(player) {
    indexWerewolfBook.show(player).then(result => {
        switch (result.selection) {
            case 0:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.HowTurnWerewolf1"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.HowTurnWerewolf2"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.HowTurnWerewolf3"}]}');
                break;
            case 1:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.unlockSkillLB1"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.unlockSkillLB2"}]}');
                break;
            case 2:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.niveisLB1"}]}');
                break;
        }
    });
}

function indexHunterBookExe(player) {
    indexHunterBook.show(player).then(result => {
        switch (result.selection) {
            case 0:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.HowTurnHunter1"}]}');
                break;
            case 1:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.howUpLevel1"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"vampire_craft_book.howUpLevel2"}]}');
                break;
            case 2:
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.textsepare"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"hunter_book.info1"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"hunter_book.info2"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"hunter_book.info3"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"line.breaker"}]}');
                player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"hunter_book.info4"}]}');
                break;
        }
    });
}