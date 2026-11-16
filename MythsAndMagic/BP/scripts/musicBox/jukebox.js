import {
    world,
    system
} from "@minecraft/server";

const namespace = "mm"

world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const block = event.block;
    if (block.type.id === "minecraft:jukebox") {

        const record = block.getComponent("minecraft:record_player")
        if (!record) return;
        if (!record.getRecord()) return;
        const recordId = record.getRecord().typeId
        if (recordId.includes(namespace) == false) return;
        system.run(() => {
            event.player.runCommand("/stopsound @a[r=64] " + recordId.replace(namespace + ":music_disc_", "record."))

        })
    }
});

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const block = e.block;
    const isFirst = e.isFirstEvent;
    const item = e.itemStack;
    const player = e.player;
    const dim = block.dimension;
    if (isFirst == false) return;
    if (player.isSneaking) return;
    const record = block.getComponent("minecraft:record_player")
    if (!record) return;
    if (record.getRecord()) {
        const recordId = record.getRecord().typeId
        system.run(() => {
            player.runCommand("/stopsound @a[r=64] " + recordId.replace(namespace + ":music_disc_", "record."))
        })
    } else if (item && item.typeId.includes(namespace + ":music_disc_")) {
        system.run(() => {
            dim.playSound(item.typeId.replace(namespace + ":music_disc_", "record."), block.center())
            const players = dim.getPlayers({ maxDistance: 32, location: block.location })
            for (const target of players) {

                target.onScreenDisplay.setActionBar([{ text: "§c" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                system.runTimeout(() => {
                    target.onScreenDisplay.setActionBar([{ text: "§e" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                }, 5)
                system.runTimeout(() => {
                    target.onScreenDisplay.setActionBar([{ text: "§a" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                }, 10)
                system.runTimeout(() => {

                    target.onScreenDisplay.setActionBar([{ text: "§b" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                }, 15)

                system.runTimeout(() => {

                    target.onScreenDisplay.setActionBar([{ text: "§d" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                }, 20)

                system.runTimeout(() => {
                    target.onScreenDisplay.setActionBar([{ text: "§c" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                    system.runTimeout(() => {
                        target.onScreenDisplay.setActionBar([{ text: "§e" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                    }, 5)
                    system.runTimeout(() => {
                        target.onScreenDisplay.setActionBar([{ text: "§a" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                    }, 10)
                    system.runTimeout(() => {

                        target.onScreenDisplay.setActionBar([{ text: "§b" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                    }, 15)

                    system.runTimeout(() => {

                        target.onScreenDisplay.setActionBar([{ text: "§d" }, { translate: namespace + ".nowPlaying" }, { translate: item.typeId.replace(namespace + ":", "playing.").replace("music_disc_", "") }])
                    }, 20)
                }, 25)
            }
        })
    }
})
