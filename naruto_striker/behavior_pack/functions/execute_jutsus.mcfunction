execute at @e[tag=genjutsu] run particle tnt:genjutsu ~ ~ ~
execute as @e[tag=genjutsu] run effect @s slowness 3 10 true 
execute as @e[tag=genjutsu] run effect @s nausea 9 255 true
execute as @e[tag=genjutsu] run effect @s blindness 3 255 true
execute as @e[tag=genjutsu] run tag @s remove genjutsu


execute at @e[type=!item,tag=amaterasu] run particle tnt:amaterasu_1 ~ ~ ~
execute as @e[type=!item,tag=amaterasu] run effect @s fatal_poison 5 0 true
execute as @e[type=!item,tag=amaterasu] run effect @s slowness 2 1 true

execute at @e[tag=rasengan_rastro] run particle tnt:rasengan_rastro ~ ~ ~
execute at @e[tag=rasengan_atk_] run particle tnt:rasengan_atk ~ ~ ~

