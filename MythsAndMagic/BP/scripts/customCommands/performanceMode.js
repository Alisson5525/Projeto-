
import {
    world,
    system
} from "@minecraft/server";

//will try to leave a list here of all that performance mode effects:
/*
- Raymakers produce less particles
*/

system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const Disable = { name: "value", type: "Boolean" };
    const performancemode = {
        name: "mm:performancemode",
        description: "If set to true, disables or alters certain visual effects that may cause lag in high quantities (eg: Raymakers)",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [Disable]
    }
    registry.registerCommand(performancemode,
        (source, state) => {
            system.run(() => {
                if (world.gameRules.sendCommandFeedback) source.sourceEntity?.sendMessage?.("PerformanceMode set to : " + `${state}`)
                world.setDynamicProperty("mm:performancemode", state)
            })
        }
    );
});