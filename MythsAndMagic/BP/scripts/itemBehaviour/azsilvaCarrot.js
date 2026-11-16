import {
    world,
    system
} from "@minecraft/server";

function getMaxMana(player) {
    return player.getDynamicProperty("mm:max_mana")
}
function getCurrentMana(player) {
    return player.getDynamicProperty("mm:mana")
}
function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:restore_mana_on_consume", {
        onConsume({ source }, p) {
            const amount = p.params.amount;
            const maxMana = getMaxMana(source)
            const newMana = clampValue(getCurrentMana(source) + amount, 0, maxMana)
            source.setDynamicProperty("mm:mana", newMana)
            source.onScreenDisplay.setActionBar(`§m§n§a§r §d§l${Math.round(newMana * 100) / 100} `)
        }
    })
})