
import {
    world,
    system
} from "@minecraft/server";


function spawnLoader(dim, loc, i, player) {
    try {

        dim.spawnEntity("mm:loader", loc)
        player.sendMessage("Alterrealm reloaded with " + i / 20 + "s delay")

    } catch {
        system.runTimeout(() => {

            spawnLoader(dim, loc, i + 1, player)
        }, 20)
    }
}

system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const disablealterrealm = {
        name: "mm:reloadalterrealm",
        description: "Reload the alterrealm if you are having issues entering.",
        cheatsRequired: true,
        permissionLevel: 1
    }
    registry.registerCommand(disablealterrealm,
        (source) => {
            system.run(() => {
                const theEnd = world.getDimension("mm:alterrealm")
                const loader = theEnd.getEntities({ type: "mm:loader" })
                for (const load of loader) {
                    load.remove()
                }
                spawnLoader(theEnd, { x: 166666, y: 128, z: 166666 }, 0, source.sourceEntity)
            })
        }
    );
});