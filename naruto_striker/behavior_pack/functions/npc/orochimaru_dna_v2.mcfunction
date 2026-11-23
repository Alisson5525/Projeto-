execute at @s[tag=!dna_hashirama_v2,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.inventory,quantity=1..}]] run tellraw @s{"rawtext":[{"text":"§d[!]. §cOs fragmentos devem estar no slot principal."}]}
execute at @s[tag=!dna_hashirama_v2,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=0..33}]] run tellraw @s{"rawtext":[{"text":"§c[!]. §efragmentos insuficiente"}]}
execute at @s[tag=!dna_hashirama_v2,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=34..}]] run tellraw @s{"rawtext":[{"text":"§aCelulas Aprimorada"}]}
execute at @s[tag=!dna_hashirama_v2,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=34..}]] run tellraw @s{"rawtext":[{"text":"§e+70 De Vida"}]}
execute at @s[tag=!dna_hashirama_v2,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=34..}]] run tellraw @s{"rawtext":[{"text":"§e+Regeneraçao."}]}
execute at @s[tag=!dna_hashirama_v2,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=34..}]] run scoreboard players add @s health_dna 70
execute at @s[tag=!dna_hashirama_v2,hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=34..}]] run clear @s tnt:fragrimento_zetsu 0 34
execute at @s[hasitem=[{item=tnt:fragrimento_zetsu,location=slot.hotbar,quantity=34..}]] run tag @s add dna_hashirama_v2