import { world, system, EntityProjectileComponent } from '@minecraft/server';

function aplicarVelocidade(x, y, z, vel) {
    // Normalizando o vetor de direção para obter um vetor unitário
    const comprimento = Math.sqrt(x * x + y * y + z * z);
    const xUnitario = x / comprimento;
    const yUnitario = y / comprimento;
    const zUnitario = z / comprimento;

    // Multiplicando o vetor unitário pela velocidade para obter o vetor de velocidade
    const novoX = xUnitario * vel;
    const novoY = yUnitario * vel;
    const novoZ = zUnitario * vel;

    return { x: novoX, y: novoY, z: novoZ };
}

function getDir(x, y, z, vel) {
    // Normalizando o vetor de direção para obter um vetor unitário
    const comprimento = Math.sqrt(x * x + y * y + z * z);
    const xUnitario = x / comprimento;
    const yUnitario = y / comprimento;
    const zUnitario = z / comprimento;

    return { dirX: xUnitario, dirY: yUnitario, dirZ: zUnitario };
}

export function use_hunter_bow_I(player) {
    const { dirX, dirY, dirZ } = getDir(player.getViewDirection().x, player.getViewDirection().y, player.getViewDirection().z, 20)
    const location = { x: player.location.x + (dirX * 1.5), y: player.location.y + 1.5 + (dirY * 1.5), z: player.location.z + (dirZ * 1.5) }; // Replace with the coordinates of where you want to spawn the arrow
    const arrowSpeed = 7
    const velocity = { x: dirX * arrowSpeed, y: dirY * arrowSpeed, z: dirZ * arrowSpeed }
    const arrow = world.getDimension('overworld').spawnEntity('minecraft:arrow', location);
    arrow.triggerEvent("sunrise:hunter_arrow_lv1")
    const projectileComp = arrow.getComponent('minecraft:projectile');
    projectileComp?.shoot(velocity, {});
}