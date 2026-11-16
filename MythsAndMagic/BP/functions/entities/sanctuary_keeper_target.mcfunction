tag @e remove mm:sanctuary_keeper_target
tag @e[hasitem={item=mm:sanctuary_key}] add mm:sanctuary_keeper_target
tag @e[hasitem={item=mm:sanctuary_key,location=slot.weapon.mainhand}] add mm:sanctuary_keeper_target

damage @e[type=!player,family=!mob,family=!monster,tag=mm:sanctuary_keeper_target] 1 magic
execute as @e[type=!player,family=!mob,family=!monster,tag=mm:sanctuary_keeper_target] at @s run particle mm:sanctuary_keeper_aura
