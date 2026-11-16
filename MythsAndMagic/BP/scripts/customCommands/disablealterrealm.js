
import {
    world,
    system
} from "@minecraft/server";

system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const Disable = { name: "value", type: "Boolean" };
    const disablealterrealm = {
        name: "mm:disablealterrealm",
        description: "Enable or disable players being able to enter the Alterrealm, do this if it is causing lag or crash issues for your world/server.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [Disable]
    }
    registry.registerCommand(disablealterrealm,
        (source, state) => {
            system.run(() => {
                if (world.gameRules.sendCommandFeedback) source.sourceEntity?.sendMessage?.("DisableAlterrealm set to : " + `${state}`)
                world.setDynamicProperty("mm:disablealterrealm", state)
            })
        }
    );
});