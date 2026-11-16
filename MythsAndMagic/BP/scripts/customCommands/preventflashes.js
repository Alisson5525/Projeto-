
import {
    world,
    system
} from "@minecraft/server";

system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const Disable = { name: "value", type: "Boolean" };
    const disableflashes = {
        name: "mm:disableflashes",
        description: "If set to true, disables camera flashes from blocks like the Raymaker. Reccomended if you have sensitivity to flashing lights.",
        cheatsRequired: true,
        permissionLevel: 0,
        mandatoryParameters: [Disable]
    }
    registry.registerCommand(disableflashes,
        (source, state) => {
            system.run(() => {
                if (state == true) source.sourceEntity.addTag("mm:disableflashes")
                if (state == false) source.sourceEntity.removeTag("mm:disableflashes")
                if (world.gameRules.sendCommandFeedback) source.sourceEntity?.sendMessage?.("Flashes set to : " + `${state}`)
            })
        }
    );
});