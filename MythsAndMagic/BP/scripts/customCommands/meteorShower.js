
import {
    world,
    system
} from "@minecraft/server";


system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const Chance = { name: "value", type: "Integer" };
    const meteorshowerchance = {
        name: "mm:meteorshowerchance",
        description: "Sets the chance of a meteor shower happening this night",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [Chance]
    }
    registry.registerCommand(meteorshowerchance,
        (source, chance) => {
            system.run(() => {
                if (chance < 0) {
                    source.sourceEntity?.sendMessage?.(`§c Value of ${chance} is too low! Chance must be 0-100`)
                }
                if (chance > 100) {
                    source.sourceEntity?.sendMessage?.(`§c Value of ${chance} is too high! Chance must be 0-100`)
                }
                if (chance > 100 || chance < 0) return;
                if (world.gameRules.sendCommandFeedback) source.sourceEntity?.sendMessage?.(`${chance}% Of a Meteor Shower next nighttime (from ${world.getDynamicProperty("mm:meteor_chance")})`)
                world.setDynamicProperty("mm:meteor_chance", chance)
            })
        }
    );
});