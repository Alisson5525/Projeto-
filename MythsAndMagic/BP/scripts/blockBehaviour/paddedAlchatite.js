import {
    world,
    system,
    ItemStack,
    MolangVariableMap
} from "@minecraft/server";

const colours = [
    {
        colour: "white",
        rgb: [255, 255, 255]
    },
    {
        colour: "red",
        rgb: [174, 45, 37]
    },
    {
        colour: "orange",
        rgb: [247, 139, 39]
    },
    {
        colour: "yellow",
        rgb: [251, 212, 62]
    },
    {
        colour: "green",
        rgb: [92, 114, 23]
    },
    {
        colour: "lime",
        rgb: [144, 208, 46]
    },
    {
        colour: "cyan",
        rgb: [39, 159, 159]
    },
    {
        colour: "light_blue",
        rgb: [62, 175, 212]
    },
    {
        colour: "blue",
        rgb: [64, 66, 165]
    },
    {
        colour: "magenta",
        rgb: [191, 70, 176]
    },
    {
        colour: "purple",
        rgb: [141, 54, 188]
    },
    {
        colour: "pink",
        rgb: [240, 133, 164]
    },
    {
        colour: "black",
        rgb: [27, 24, 27]
    },
    {
        colour: "brown",
        rgb: [129, 81, 48]
    },
    {
        colour: "gray",
        rgb: [87, 90, 92]
    },
    {
        colour: "light_gray",
        rgb: [130, 126, 119]
    }
]

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const block = e.block;
    const isFirst = e.isFirstEvent;
    const item = e.itemStack;
    const player = e.player;
    const dim = block.dimension;
    if (isFirst == false) return;
    if (player.isSneaking) return;
    if (block.typeId.includes("_padded_alchatite") == false || block.typeId.includes("mm:") == false) return;
    if (!item) return;
    if (item.typeId.includes("dye") == false) return;
    var colour = block.typeId.split("_")[0].replace("mm:", "")
    var dyeToColour = item.typeId.split("_")[0].replace("minecraft:", "")
    if (item.typeId.includes("light_blue")) dyeToColour = "light_blue"
    if (item.typeId.includes("light_gray")) dyeToColour = "light_gray"
    if (block.typeId.includes("light_blue")) colour = "light_blue"
    if (block.typeId.includes("light_gray")) colour = "light_gray"
    if (dyeToColour == colour) return;
    var rgbMap = new MolangVariableMap()
    rgbMap.setColorRGB("variable.color", { red: 1, green: 1, blue: 1 })
    var hasParticle = false
    for (const checkColour of colours) {
        if (checkColour.colour == dyeToColour) {
            hasParticle = true
            rgbMap.setColorRGB("variable.color", { red: checkColour.rgb[0] / 255, green: checkColour.rgb[1] / 255, blue: checkColour.rgb[2] / 255 })
        }
    }
    system.run(() => {
        try {

            block.setType(block.typeId.replace(colour, dyeToColour))
            if (hasParticle) dim.spawnParticle("mm:dyed_padded_alchatite", block.bottomCenter(), rgbMap)
            dim.playSound("sign.dye.use", block.center())
            if (player.getGameMode() !== "Creative") {
                if (item.amount > 1) {
                    item.amount -= 1
                    player.getComponent("equippable").setEquipment("Mainhand", item)
                } else {
                    player.getComponent("equippable").setEquipment("Mainhand", undefined)

                }
            }
        } catch {
            return;
        }
    })
})
