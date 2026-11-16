import { world, system } from "@minecraft/server";

system.runInterval(() => {
    const players = world.getAllPlayers();
    for (const player of players) {
        if (player.hasTag("mm:debug_durability")) {
            const equip = player.getComponent("equippable")
            const held = equip.getEquipment("Mainhand")
            if (!held) continue;
            const durability = held.getComponent("durability")
            if (!durability) continue;
            player.onScreenDisplay.setActionBar(`${durability.maxDurability - durability.damage} / ${durability.maxDurability}`);
        }
    }
});

system.runInterval(
    () => {
        const players = world.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (!player.hasTag('mm:debug_showstates')) continue;
            try {
                var { block, face } = player.getBlockFromViewDirection();
                if (!block) {
                    player.onScreenDisplay.setActionBar("Not looking at a Block.");
                    return;
                };
                player.onScreenDisplay.setActionBar(
                    `§rblock: §7${block.typeId}§r, face: §7${face}§r, xyz: §6${block.location.x} §r/ §6${block.location.y} §r/ §6${block.location.z}§r,\n`
                    + `data: §7${JSON.stringify(block.permutation.getAllStates(), null, 4)}`
                );
            } catch {
                player.onScreenDisplay.setActionBar("Not looking at a Block.");
            };
        };
    },
);

//SHOW STATES CODE BY KAIOGA - THANK YOU KAIOGOO

const interval = 10 //delay between check
let TPS = 20 //Use this on the rest of your codes

let lastDate = Date.now()
system.runInterval(() => {
    const currDate = Date.now()
    TPS = interval * 50 / (currDate - lastDate) * 20
    lastDate = currDate
    for (const player of world.getPlayers({ tags: ["mm:debug_data"] })) {
        player.onScreenDisplay.setActionBar("TPS:" + ` ${Math.round(TPS)}`);
    }
    for (const player of world.getPlayers({ tags: ["mm:debug_loaders"] })) {
        player.onScreenDisplay.setActionBar("Loaders:" + ` ${world.getDimension("mm:alterrealm").getEntities({ type: "mm:loader" }).length}    -    TPS:  ${Math.round(TPS)}`);
    }
}, interval)

const specailNames = [
    {
        username: "Alylicara",
        printName: "§dAlylicara"
    },
    {
        username: "G0ldenAury",
        printName: "§6G0ldenAury"
    },
    {
        username: "HoneyBee1228489",
        printName: "§eHoneyBee1228489"
    },
    {
        username: "Lemayfamily",
        printName: "§uLemayfamily"
    },
    {
        username: "Oreocat3564",
        printName: "§aOreocat3564"
    },
    {
        username: "Maxolotl3050",
        printName: "§bMaxolotl3050"
    },
    {
        username: "Star Man6044",
        printName: "§gStar Man6044"
    },
    {
        username: "Strikenators",
        printName: "§1Strikenators"
    },
    {
        username: "Bruck228",
        printName: "§2Bruck228"
    },
    {
        username: "FrostyPrince474",
        printName: "§9FrostyPrince474"
    },
    {
        username: "BlazingFurnace1",
        printName: "§qBlazingFurnace1"
    }
];

export function getDamageColour(damage) {
    if (damage < 4) return "§c"
    if (damage >= 4 && damage < 10) return "§6"
    if (damage >= 10 && damage < 20) return "§e"
    if (damage >= 20 && damage < 50) return "§a"
    if (damage >= 50 && damage < 100) return "§b"
    if (damage >= 100) return "§d"
    return ""
}

world.afterEvents.entityHurt.subscribe((e) => {
    const player = e.damageSource.damagingEntity;
    const damage = Math.round(100 * e.damage) / 100;
    const hurt = e.hurtEntity;
    if (hurt && hurt.isValid && hurt.typeId == "minecraft:player" && hurt.hasTag("mm:debug_damage") && !hurt.hasTag("dungeons:debug_damage")) {
        hurt.sendMessage("§eYou§7 took: " + getDamageColour(damage) + `${damage}§7 Damage`)
    }
    if (player) {
        if (!player.isValid) return;
        if (player.typeId !== "minecraft:player") {
            const tameable = player.getComponent("tameable")
            if (!tameable) return;
            const owner = tameable.tamedToPlayer;
            if (!owner) return;
            var nameTag = undefined
            nameTag = specailNames.find(username => username.username == owner.name)
            if (!nameTag) {
                nameTag = `§f${owner.name}`
            } else {
                nameTag = nameTag.printName
            }
            for (const entity of world.getPlayers(({ tags: ["mm:debug_damage"], excludeTags: ["dungeons:debug_damage"] }))) {
                entity.sendMessage({ rawtext: [{ text: nameTag + "\'s §f" }, { translate: player.localizationKey }, { text: "§7 Dealt: " + getDamageColour(damage) + `${damage}§7 Damage` }] })
            }
        } else {
            var nameTag = undefined
            nameTag = specailNames.find(username => username.username == player.name)
            if (!nameTag) {
                nameTag = `§f${player.name}`
            } else {
                nameTag = nameTag.printName
            }
            for (const entity of world.getPlayers(({ tags: ["mm:debug_damage"], excludeTags: ["dungeons:debug_damage"] }))) {
                entity.sendMessage(nameTag + "§7 Dealt: " + getDamageColour(damage) + `${damage}§7 Damage`)
            }
        }
    }
});