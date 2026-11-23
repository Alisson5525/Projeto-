execute as @s[scores={health_stats=..0}] run scoreboard players set @s health_stats 0
execute as @s[scores={health_stats2=..0}] run scoreboard players set @s health_stats2 0
execute as @s[scores={health_stats3=..0}] run scoreboard players set @s health_stats3 0
execute as @s[scores={health_dna=..0}] run scoreboard players set @s health_dna 0

 



execute as @s[scores={chakra_acumulado=3000..}] run scoreboard players set @s chakra_acumulado 3000
execute as @a[tag=byakugou_lock,scores={chakra_acumulado=2999..}] run function selo_byakugou




execute as @s[tag=treino_pesos] run scoreboard players remove @s pesos_guy 1
execute as @e[tag=treino_pesos] run effect @s slowness 1 2 true 
execute as @s[tag=treino_pesos,scores={pesos_guy=5..5}] run tellraw @s {"rawtext":[{"text":"§c[!]§aTempo De Treinamento Comcluida"}]}
execute as @s[scores={pesos_guy=..0}] run scoreboard players set @s pesos_guy 1



execute as @s[scores={cooldown_miss=1..}] run scoreboard players add @s cooldown_miss_tick 1
execute as @s[scores={cooldown_miss_tick=21..}] run scoreboard players set @s cooldown_miss_tick 0
execute as @s[scores={cooldown_miss_tick=20..}] run scoreboard players remove @s cooldown_miss 1

execute as @s[scores={cooldown_miss=..0}] run scoreboard players set @s cooldown_miss 0




execute as @s[scores={isanagi=8..2000}] run scoreboard players set @s isanagi 8



execute as @s[tag=status_forca_v1_lmt] run effect @s strength infinite 0 true 
execute as @s[tag=status_forca_v2_lmt] run effect @s strength infinite 1 true 
execute as @s[tag=status_forca_v3_lmt] run effect @s strength infinite 2 true 
execute as @s[tag=deus_shinobi] run effect @s strength infinite 4 true 

execute as @s[tag=status_chakra_v1_lmt,scores={chakra=100..}] run scoreboard players set @s chakra 100
execute as @s[tag=status_chakra_v2_lmt,scores={chakra=125..}] run scoreboard players set @s chakra 125
execute as @s[tag=status_chakra_v3_lmt,scores={chakra=200..}] run scoreboard players set @s chakra 200
execute as @s[tag=status_chakra_v4_lmt,scores={chakra=300..}] run scoreboard players set @s chakra 300
execute as @s[tag=deus_shinobi,scores={chakra=600..}] run scoreboard players set @s chakra 600

 
 
execute as @s[tag=!deus_shinobi,scores={chakra=..10}] run effect @s slowness 1 2 true
execute as @s[tag=!deus_shinobi,scores={chakra=..5}] run effect @s nausea 10 200 true
execute as @s[scores={chakra=..0}] run scoreboard players set @s chakra 0






execute at @s[hasitem=[{item=tnt:sinos,location=slot.hotbar,quantity=2..}]] run tellraw @s {"rawtext":[{"text":"§aMissao Completa"}]}
execute at @s[hasitem=[{item=tnt:sinos,location=slot.hotbar,quantity=2..}]] run tellraw @s {"rawtext":[{"text":"§c[!] §a170.Tp"}]}
execute at @s[hasitem=[{item=tnt:sinos,location=slot.hotbar,quantity=2..}]] run tag @s add missao_2_c
execute at @s[hasitem=[{item=tnt:sinos,location=slot.hotbar,quantity=2..}]] run scoreboard players add @s tp 170
execute at @s[hasitem=[{item=tnt:sinos,location=slot.hotbar,quantity=2..}]] run clear @s tnt:sinos 2





tellraw @s[tag=!missao_1_c,scores={gatos_miss=15..}] {"rawtext":[{"text":"§c[!] §aCapturas Comcluida"}]}
tellraw @s[tag=!missao_1_c,scores={gatos_miss=15..}] {"rawtext":[{"text":"§c[!] §a50.Tp"}]}
execute as @s[tag=!missao_1_c,scores={gatos_miss=15..}] run scoreboard players add @s tp 50
execute as @s[tag=!missao_1_c,scores={gatos_miss=15..}] run tag @s add pergaminha_ninja_lock
execute as @s[tag=!missao_1_c,scores={gatos_miss=15..}] run tag @s add missao_1_c
execute as @s[tag=missao_1_c,scores={gatos_miss=15..}] run scoreboard players set @s gatos_miss 0



execute as @s[tag=!missao_7_c,scores={bndidos_a_miss=5..,bndidos_c_miss=15..}] run function missao_7_c_complet


execute as @s[tag=!missao_6_c,scores={bndidos_c_miss=10..}] run function missao_6_c_complet



execute as @s[tag=!missao_4_c,tag=vida_status_1,tag=forca_status_1,tag=chakra_status_1,tag=all_status_dash] run tag @s add missao_4_c





















execute as @s[scores={health_stats=..-1}] run scoreboard players set @s health_stats 0
execute as @s[scores={dano_stats=..1}] run scoreboard players set @s dano_stats 1

execute as @s[tag=vip_storm,tag=!vip_storm_2] run tag @s remove vip_storm







execute as @s[tag=vip_storm_1,tag=vip_storm_2] run tag @s remove vip_storm_1
execute as @s[tag=!vip_storm_1,tag=vip_storm_2,tag=!vip_complet] run function vip_storm











