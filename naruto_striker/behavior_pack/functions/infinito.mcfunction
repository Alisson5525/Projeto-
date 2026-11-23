execute as @s[scores={health_stats=..0}] run scoreboard players set @s health_stats 0
execute as @s[scores={health_stats2=..0}] run scoreboard players set @s health_stats2 0
execute as @s[scores={health_stats3=..0}] run scoreboard players set @s health_stats3 0
execute as @s[scores={health_dna=..0}] run scoreboard players set @s health_dna 0

 



execute as @s[scores={chakra_acumulado=3000..}] run scoreboard players set @s chakra_acumulado 3000
execute as @a[tag=byakugou_lock,scores={chakra_acumulado=2999..}] run function selo_byakugou




execute as @s[tag=treino_pesos] run scoreboard players remove @s pesos_guy 1
execute as @e [tag=treino_pesos] run effect @s slowness 1 2 true 
execute as @s[tag=treino_pesos,scores={pesos_guy=5..5}] run tellraw @s {"rawtext":[{"text":"§c[!]§aTempo De Treinamento Comcluida"}]}
execute as @s[scores={pesos_guy=..0}] run scoreboard players set @s pesos_guy 1



execute as @s[scores={cooldown_miss=1..}] run scoreboard players add @s cooldown_miss_tick 1
execute as @s[scores={cooldown_miss_tick=21..}] run scoreboard players set @s cooldown_miss_tick 0
execute as @s[scores={cooldown_miss_tick=20..}] run scoreboard players remove @s cooldown_miss 1

execute as @s[scores={cooldown_miss=..0}] run scoreboard players set @s cooldown_miss 0




execute as @s[scores={isanagi=0..0}] run event entity @s celula:dna_hashirama_isanagi
execute as @s[scores={isanagi=1..1}] run event entity @s 7:dna_hashirama_isanagi
execute as @s[scores={isanagi=2..2}] run event entity @s 6:dna_hashirama_isanagi
execute as @s[scores={isanagi=3..3}] run event entity @s 5:dna_hashirama_isanagi
execute as @s[scores={isanagi=4..4}] run event entity @s 4:dna_hashirama_isanagi
execute as @s[scores={isanagi=5..5}] run event entity @s 3:dna_hashirama_isanagi
execute as @s[scores={isanagi=6..6}] run event entity @s 2:dna_hashirama_isanagi
execute as @s[scores={isanagi=7..7}] run event entity @s 1:dna_hashirama_isanagi
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

execute as @s run event entity @s[scores={dano_stats=1}] tnt:dano.1
execute as @s run event entity @s[scores={dano_stats=2}] tnt:dano.2
execute as @s run event entity @s[scores={dano_stats=3}] tnt:dano.3
execute as @s run event entity @s[scores={dano_stats=4}] tnt:dano.4
execute as @s run event entity @s[scores={dano_stats=5}] tnt:dano.5
execute as @s run event entity @s[scores={dano_stats=6}] tnt:dano.6
execute as @s run event entity @s[scores={dano_stats=7}] tnt:dano.7
execute as @s run event entity @s[scores={dano_stats=8}] tnt:dano.8
execute as @s run event entity @s[scores={dano_stats=9}] tnt:dano.9
execute as @s run event entity @s[scores={dano_stats=10}] tnt:dano.10
execute as @s run event entity @s[scores={dano_stats=11}] tnt:dano.11
execute as @s run event entity @s[scores={dano_stats=12}] tnt:dano.12
execute as @s run event entity @s[scores={dano_stats=13}] tnt:dano.13
execute as @s run event entity @s[scores={dano_stats=14}] tnt:dano.14
execute as @s run event entity @s[scores={dano_stats=15}] tnt:dano.15
execute as @s run event entity @s[scores={dano_stats=16}] tnt:dano.16
execute as @s run event entity @s[scores={dano_stats=17}] tnt:dano.17
execute as @s run event entity @s[scores={dano_stats=18}] tnt:dano.18
execute as @s run event entity @s[scores={dano_stats=19}] tnt:dano.19
execute as @s run event entity @s[scores={dano_stats=20}] tnt:dano.20
execute as @s run event entity @s[scores={dano_stats=21}] tnt:dano.21
execute as @s run event entity @s[scores={dano_stats=22}] tnt:dano.22
execute as @s run event entity @s[scores={dano_stats=23}] tnt:dano.23
execute as @s run event entity @s[scores={dano_stats=24}] tnt:dano.24
execute as @s run event entity @s[scores={dano_stats=25}] tnt:dano.25
execute as @s run event entity @s[scores={dano_stats=26}] tnt:dano.26
execute as @s run event entity @s[scores={dano_stats=27}] tnt:dano.27
execute as @s run event entity @s[scores={dano_stats=28}] tnt:dano.28
execute as @s run event entity @s[scores={dano_stats=29}] tnt:dano.29
execute as @s run event entity @s[scores={dano_stats=30}] tnt:dano.30
execute as @s run event entity @s[scores={dano_stats=31}] tnt:dano.31
execute as @s run event entity @s[scores={dano_stats=32}] tnt:dano.32
execute as @s run event entity @s[scores={dano_stats=33}] tnt:dano.33
execute as @s run event entity @s[scores={dano_stats=34}] tnt:dano.34
execute as @s run event entity @s[scores={dano_stats=35}] tnt:dano.35
execute as @s run event entity @s[scores={dano_stats=36}] tnt:dano.36
execute as @s run event entity @s[scores={dano_stats=37}] tnt:dano.37
execute as @s run event entity @s[scores={dano_stats=38}] tnt:dano.38
execute as @s run event entity @s[scores={dano_stats=39}] tnt:dano.39
execute as @s run event entity @s[scores={dano_stats=40}] tnt:dano.40
execute as @s run event entity @s[scores={dano_stats=41}] tnt:dano.41
execute as @s run event entity @s[scores={dano_stats=42}] tnt:dano.42
execute as @s run event entity @s[scores={dano_stats=43}] tnt:dano.43
execute as @s run event entity @s[scores={dano_stats=44}] tnt:dano.44
execute as @s run event entity @s[scores={dano_stats=45}] tnt:dano.45
execute as @s run event entity @s[scores={dano_stats=46}] tnt:dano.46
execute as @s run event entity @s[scores={dano_stats=47}] tnt:dano.47
execute as @s run event entity @s[scores={dano_stats=48}] tnt:dano.48
execute as @s run event entity @s[scores={dano_stats=49}] tnt:dano.49
execute as @s run event entity @s[scores={dano_stats=50}] tnt:dano.50
execute as @s[tag=vip_storm,tag=!vip_storm_2] run tag @s remove vip_storm
execute as @s run event entity @s[scores={dano_stats=51}] tnt:dano.51
execute as @s run event entity @s[scores={dano_stats=52}] tnt:dano.52
execute as @s run event entity @s[scores={dano_stats=53}] tnt:dano.53
execute as @s run event entity @s[scores={dano_stats=54}] tnt:dano.54
execute as @s run event entity @s[scores={dano_stats=55}] tnt:dano.55
execute as @s run event entity @s[scores={dano_stats=56}] tnt:dano.56
execute as @s run event entity @s[scores={dano_stats=57}] tnt:dano.57
execute as @s run event entity @s[scores={dano_stats=58}] tnt:dano.58
execute as @s run event entity @s[scores={dano_stats=59}] tnt:dano.59
execute as @s run event entity @s[scores={dano_stats=60}] tnt:dano.60
execute as @s run event entity @s[scores={dano_stats=61}] tnt:dano.61
execute as @s run event entity @s[scores={dano_stats=62}] tnt:dano.62
execute as @s run event entity @s[scores={dano_stats=63}] tnt:dano.63
execute as @s run event entity @s[scores={dano_stats=64}] tnt:dano.64
execute as @s run event entity @s[scores={dano_stats=65}] tnt:dano.65
execute as @s run event entity @s[scores={dano_stats=66}] tnt:dano.66
execute as @s run event entity @s[scores={dano_stats=67}] tnt:dano.67
execute as @s run event entity @s[scores={dano_stats=68}] tnt:dano.68
execute as @s run event entity @s[scores={dano_stats=69}] tnt:dano.69
execute as @s run event entity @s[scores={dano_stats=70}] tnt:dano.70
execute as @s run event entity @s[scores={dano_stats=71}] tnt:dano.71
execute as @s run event entity @s[scores={dano_stats=72}] tnt:dano.72
execute as @s run event entity @s[scores={dano_stats=73}] tnt:dano.73
execute as @s run event entity @s[scores={dano_stats=74}] tnt:dano.74
execute as @s run event entity @s[scores={dano_stats=75}] tnt:dano.75
execute as @s run event entity @s[scores={dano_stats=76}] tnt:dano.76
execute as @s run event entity @s[scores={dano_stats=77}] tnt:dano.77
execute as @s run event entity @s[scores={dano_stats=78}] tnt:dano.78
execute as @s run event entity @s[scores={dano_stats=79}] tnt:dano.79
execute as @s run event entity @s[scores={dano_stats=80}] tnt:dano.80
execute as @s run event entity @s[scores={dano_stats=81}] tnt:dano.81
execute as @s run event entity @s[scores={dano_stats=82}] tnt:dano.82
execute as @s run event entity @s[scores={dano_stats=83}] tnt:dano.83
execute as @s run event entity @s[scores={dano_stats=84}] tnt:dano.84
execute as @s run event entity @s[scores={dano_stats=85}] tnt:dano.85
execute as @s run event entity @s[scores={dano_stats=86}] tnt:dano.86
execute as @s run event entity @s[scores={dano_stats=87}] tnt:dano.87
execute as @s run event entity @s[scores={dano_stats=88}] tnt:dano.88
execute as @s run event entity @s[scores={dano_stats=89}] tnt:dano.89
execute as @s run event entity @s[scores={dano_stats=90}] tnt:dano.90
execute as @s run event entity @s[scores={dano_stats=91}] tnt:dano.91
execute as @s run event entity @s[scores={dano_stats=92}] tnt:dano.92
execute as @s run event entity @s[scores={dano_stats=93}] tnt:dano.93
execute as @s run event entity @s[scores={dano_stats=94}] tnt:dano.94
execute as @s run event entity @s[scores={dano_stats=95}] tnt:dano.95
execute as @s run event entity @s[scores={dano_stats=96}] tnt:dano.96
execute as @s run event entity @s[scores={dano_stats=97}] tnt:dano.97
execute as @s run event entity @s[scores={dano_stats=98}] tnt:dano.98
execute as @s run event entity @s[scores={dano_stats=99}] tnt:dano.99
execute as @s run event entity @s[scores={dano_stats=100}] tnt:dano.100







execute as @s[tag=vip_storm_1,tag=vip_storm_2] run tag @s remove vip_storm_1
execute as @s[tag=!vip_storm_1,tag=vip_storm_2,tag=!vip_complet] run function vip_storm











