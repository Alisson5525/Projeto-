
import {
    world,
    system
} from "@minecraft/server";

import { addCustomEffect, removeCustomEffect, effectIds } from "./main.js"


system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const effectId = { name: "mm:effect", type: "Enum" };
    registry.registerEnum("mm:effect", effectIds)
    const PlayerSelector = { name: "victim", type: "PlayerSelector" };
    const Duration = { name: "duration", type: "Integer" };
    const Amplifier = { name: "amplifier", type: "Integer" };
    const effectcustom = {
        name: "mm:effectcustom",
        description: "Apply a custom effect to a player.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [PlayerSelector, effectId],
        optionalParameters: [Duration, Amplifier]
    }
    registry.registerCommand(effectcustom,
        (source, victim, effectname, seconds, level) => {
            if (seconds == undefined) seconds = 30
            if (level == undefined) level = 0
            //if (level < 0) level = 0
            if (seconds < 1) seconds = 1
            system.run(() => {
                for (const player of victim) {
                    addCustomEffect(player, effectname, seconds * 20, level)
                    if (world.gameRules.sendCommandFeedback) source.sourceEntity.sendMessage("Gave " + effectname + " * " + level + " to " + player.name + " for " + `${seconds} Seconds`)
                }
            })
        }
    );
    const cleareffectcustom = {
        name: "mm:effectcustomclear",
        description: "Remove a custom effect from a player.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [PlayerSelector],
        optionalParameters: [effectId]
    }
    registry.registerCommand(cleareffectcustom,
        (source, victim, effectname) => {
            system.run(() => {
                for (const player of victim) {
                    if (!effectname) {
                        for (const effect of effectIds) {
                            removeCustomEffect(player, effect)
                        }
                        if (world.gameRules.sendCommandFeedback) source.sourceEntity.sendMessage("Took all effects from " + player.name)
                    } else {
                        removeCustomEffect(player, effectname)
                        if (world.gameRules.sendCommandFeedback) source.sourceEntity.sendMessage("Took " + effectname + " from " + player.name)
                    }
                }
            })
        }
    );
});