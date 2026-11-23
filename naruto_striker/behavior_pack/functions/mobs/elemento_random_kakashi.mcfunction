scoreboard objectives add elementoRandom dummy
scoreboard players random @s elementoRandom 1 3

execute at @s[tag=!elementorandom,scores={elementoRandom=1}] run tag @s add elemento_agua
execute at @s[tag=!elementorandom,scores={elementoRandom=2}] run tag @s add elemento_fogo
execute at @s[tag=!elementorandom,scores={elementoRandom=3}] run tag @s add elemento_raio


tag @s add elementorandom