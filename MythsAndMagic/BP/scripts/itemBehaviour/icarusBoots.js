import {
    world,
    system,
    InputButton,
    ButtonState,
    GameMode
} from "@minecraft/server";

world.afterEvents.playerButtonInput.subscribe((e) => {
    const player = e.player;
    const button = e.button;
    const buttonStateNew = e.newButtonState;
    if (button !== InputButton.Jump || buttonStateNew !== ButtonState.Pressed) return;
    if (player.isClimbing || player.isGliding || player.isFlying || player.isInWater) return;
    const feet = player.getComponent("minecraft:equippable").getEquipment("Feet")
    if (feet == undefined) return;
    if (feet.typeId !== "mm:icarus_boots") return;
    if (!player.isSprinting) return;
    var jumpsLeft = world.scoreboard.getObjective("mm:icarus_jumps_left")
    if (!jumpsLeft) jumpsLeft = world.scoreboard.addObjective("mm:icarus_jumps_left", "Jumps Left")
    var jumpCd = world.scoreboard.getObjective("mm:icarus_jumps_cd")
    if (!jumpCd) jumpCd = world.scoreboard.addObjective("mm:icarus_jumps_cd", "Jumps Cooldown")
    jumpsLeft.addScore(player, 0)
    jumpCd.addScore(player, 0)
    const playerJumpsLeft = jumpsLeft.getScore(player)
    const playerJumpCd = jumpCd.getScore(player)
    if (playerJumpsLeft > 2 || playerJumpCd > 0) return;
    jumpsLeft.addScore(player, 1)
    jumpCd.setScore(player, 6)
    momentumJump(player, 0.55, playerJumpsLeft)
})

system.runInterval(() => {
    for (const player of world.getPlayers({ scoreOptions: [{ objective: 'mm:icarus_jumps_cd', minScore: 0 }] })) {
        const duration = world.scoreboard.getObjective("mm:icarus_jumps_cd")
        if (duration.getScore(player) > 0) {
            duration.addScore(player, -1)
        } else {
            duration.setScore(player, 0)
            duration.removeParticipant(player)
        }
    }
    for (const player of world.getPlayers({ scoreOptions: [{ objective: 'mm:icarus_jumps_left', minScore: 1 }] })) {
        const left = world.scoreboard.getObjective("mm:icarus_jumps_left")
        const duration = world.scoreboard.getObjective("mm:icarus_jumps_cd")
        if (player.isOnGround) {
            left.setScore(player, 0)
            left.removeParticipant(player)
            duration.setScore(player, 0)
            duration.removeParticipant(player)
        }
    }
})

function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}

function reduceHunger(entity, amount) {
    if (entity.getGameMode() == GameMode.Creative) return;
    const saturation = entity.getComponent("minecraft:player.saturation");
    if (!saturation) return;
    const hunger = entity.getComponent("minecraft:player.hunger");
    if (!hunger) return;
    if (saturation.currentValue !== 0) {
        if (saturation.currentValue - amount * 0.75 < 0) {
            saturation.setCurrentValue(0)
        } else {
            saturation.setCurrentValue(saturation.currentValue - amount * 0.75)
        }
    } else {
        if (hunger.currentValue - amount < 0) {
            hunger.setCurrentValue(0)
        } else {
            hunger.setCurrentValue(hunger.currentValue - amount)
        }
    }
}

function momentumJump(entity, value, jumpIndex) {
    if (!value) {
        console.warn('No value specified');
        value = 0.55
    }
    const velocity = entity.getVelocity();
    var hmult = 1.1;
    var vmult = 1.05;
    if (jumpIndex == 0) hmult = 0.9
    if (jumpIndex == 1) vmult = 1.1
    if (jumpIndex == 2) hmult = 1.45
    if (jumpIndex == 2) vmult = 1.4

    hmult = hmult + (Math.abs(velocity.x) + Math.abs(velocity.z)) / 2
    if (velocity.x == 0 || velocity.z == 0) { hmult = 0 }
    if (entity.getEffect("speed")) {
        hmult = hmult * (1 + (entity.getEffect("speed").amplifier * 0.05));
    }
    if (entity.getEffect("slowness")) {
        hmult = hmult * (1 - (entity.getEffect("slowness").amplifier * 0.2));
    }
    if (entity.getEffect("jump_boost")) {
        vmult = vmult * (1 + (entity.getEffect("jump_boost").amplifier * 0.15));
    }
    if (jumpIndex == 2) {
        entity.addEffect("slow_falling", 40)
    }
    entity.dimension.spawnParticle("mm:icarus_boots", entity.location)
    entity.playSound("item.icarus_boots.wings", { pitch: (1 + jumpIndex) / 2, volume: 1.5 })
    entity.dimension.playSound(`item.icarus_boots.woosh${jumpIndex + 1}`, entity.location, { volume: 0.5 })
    if (entity.hasTag("mm:super_debug")) {
        entity.sendMessage('------------------');
        entity.sendMessage(`§cX: ${velocity.x}`);
        entity.sendMessage(`§aY: ${velocity.y}`);
        entity.sendMessage(`§bZ: ${velocity.z}`);
        entity.sendMessage('------------------');
    }
    hmult = clampValue(hmult, 0, 1.5)
    const horizontalStrength = { x: clampValue((velocity.x * 4 * value * hmult), -1.2, 1.2), z: clampValue((velocity.z * 4 * value * hmult), -1.2, 1.2) }
    var verticalStrength = clampValue(((value * vmult) - (velocity.y / 2.1)), 0, 8)
    if (velocity.y < 0) verticalStrength = clampValue(((value * vmult) - (velocity.y / 2.1)) + velocity.y * -0.05, 0, 4)
    if (jumpIndex < 2) verticalStrength = clampValue(verticalStrength, 0, 2)
    if (entity.hasTag("mm:super_debug")) {
        entity.sendMessage('------------------');
        entity.sendMessage(`§eX: ${horizontalStrength.x}`);
        entity.sendMessage(`§uY: ${verticalStrength}`);
        entity.sendMessage(`§9Z: ${horizontalStrength.z}`);
        entity.sendMessage('------------------');
    }
    entity.applyKnockback(horizontalStrength, verticalStrength);
    //entity.applyImpulse({ x: horizontalStrength.x / 2, y: verticalStrength * 1.15, z: horizontalStrength.z / 2 })
    reduceHunger(entity, 0.15)
    for (let i = 0; i < 20; i++) {
        system.runTimeout(() => {
            if (entity.isOnGround) return;
            entity.dimension.spawnParticle("mm:icarus_boots_trail", entity.location)
        }, i)
    }
}

world.afterEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    if(!hurt || !hurt.isValid) return;
    if (hurt.hasTag("mm:icarus_boots")) {
        if (hurt.typeId !== "minecraft:player") return;
        const equippable = hurt.getComponent("equippable")
        if (equippable.getEquipment("Feet") == undefined) {
            hurt.removeTag("mm:icarus_boots")
            hurt.dimension.playSound("item.icarus_boots.break", hurt.location)
        }
    }
})

system.afterEvents.scriptEventReceive.subscribe((e) => {
    const id = e.id;
    if (id !== "mm:delayedtagremoval") return;
    const tag = e.message
    const entity = e.sourceEntity;
    system.runTimeout(() => {
        if (entity.isValid) entity.removeTag(tag)
    }, 2)
})