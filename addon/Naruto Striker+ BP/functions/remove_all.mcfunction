effect @s resistance 3 2 true


tag @s remove modo_ativado_2
tag @s remove kurama_cooldown
tag @s remove marca_cooldown
tag @s remove sennin_sapo_cooldown
tag @s remove portoes_cooldown
tag @s remove tenseigan_cooldown
tag @s remove rasengan_rastro
tag @s remove combo3
tag @s remove susanoo_cooldown
tag @s remove rinnegan_cooldown
tag @s remove mgk_cooldown
tag @s remove sh_cooldown
tag @s remove skill_selados
tag @s remove skill_selados_skill
tag @s remove modo_ativado
tag @s remove sh_cooldown
tag @s remove mgk_cooldown
tag @s remove susanoo_cooldown
tag @s remove rasengan_atk
tag @s remove rasengan_atk_
tag @s remove kamui_intangivel
tag @s remove jutsu_absover
tag @s remove shinra_tensei
tag @s remove chibaku_tensei
tag @s remove previsao_sharingan

event entity @s desativar_slot_1
event entity @s desativar_slot_2
event entity @s kurama:desativar_manto
event entity @s uchiha:desativar
event entity @s tnt:restore_gravity
event entity @s hyuga:desativar

replaceitem entity @s slot.hotbar 0 tnt:item_lock 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} 
replaceitem entity @s slot.hotbar 1 tnt:item_lock 1 0 {"minecraft:keep_on_death":{},"item_lock":{"mode":"lock_in_slot"}} 


scoreboard players set @s skill_selados_timer 0
scoreboard players set @s dano_stats 1

