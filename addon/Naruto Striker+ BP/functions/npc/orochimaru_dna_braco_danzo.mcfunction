tellraw @s {"rawtext":[{"text":"§aBraço danzo Implantado"}]}
tellraw @s {"rawtext":[{"text":"§e+150 De Vida"}]}
tellraw @s {"rawtext":[{"text":"§e+Regeneraçao."}]}
scoreboard players add @s health_dna 150
event entity @s celula:dna_hashirama
scoreboard players set @s isanagi 0
tag @s add dna_hashirama_sh
tag @s remove dna_hashirama_sh_lock
clear @s tnt:olho_sharingan 0 7 
clear @s tnt:fragrimento_zetsu 0 128
execute at @s[tag=dna_hashirama_sh] run tag @s add dna_hashirama_v3

