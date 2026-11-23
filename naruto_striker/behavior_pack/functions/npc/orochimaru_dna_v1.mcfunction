execute at @s[tag=!dna_hashirama_v1,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.inventory,quantity=1..}]] run tellraw @s{"rawtext":[{"text":"§d[!]. §cOs fragmentos devem estar no slot principal."}]}
execute at @s[tag=!dna_hashirama_v1,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=0..9}]] run tellraw @s{"rawtext":[{"text":"§c[!]. §efragmentos insuficiente"}]}
execute at @s[tag=!dna_hashirama_v1,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=10..}]] run tellraw @s{"rawtext":[{"text":"§aCelulas Implantada"}]}
execute at @s[tag=!dna_hashirama_v1,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=10..}]] run tellraw @s{"rawtext":[{"text":"§a+30 De Vida"}]}
execute at @s[tag=!dna_hashirama_v1,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=10..}]] run scoreboard players add @s health_dna 30
execute at @s[tag=!dna_hashirama_v1,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=10..}]] run clear @s tnt:fragrimento_zetsu 0 10
execute at @s[hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=10..}]] run tag @s add dna_hashirama_v1