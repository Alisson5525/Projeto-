scoreboard players remove @s[m=!c,tag=poucasede,tag=vampiro,scores={sangue=0..}] sangue 50
scoreboard players remove @s[m=!c,tag=!poucasede,tag=vampiro,scores={sangue=0..}] sangue 100
tag @s[tag=vampiro,scores={sangue=101..},tag=indetectavel] remove player_atacado_creeper
effect @s[tag=vampiro,scores={sangue=101..},tag=nightvision] night_vision 6000 1
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_rage] strength 60 2
tag @s[tag=vampiro,scores={sangue=101..},tag=emuso_rage] remove emuso_rage
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_regeneration] regeneration 8 2
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_regeneration] weakness 8 2
tag @s[tag=vampiro,tag=emuso_regeneration] remove emuso_regeneration
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_defencive] resistance 5 4
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_defencive] weakness 5 0
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_defencive] slowness 5 1
effect @s[tag=vampiro,scores={sangue=101..},tag=absorption] absorption 5 0
effect @s[tag=vampiro,scores={sangue=101..},tag=acrobata] speed 5 1
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_sworddex] strength 5 2
effect @s[tag=vampiro,scores={sangue=101..},tag=emuso_invisibilidade] invisibility 5 5
effect @s[tag=vampiro,scores={sangue=101..}] saturation 5 5
effect @s[tag=vampiro,scores={sangue=..-1}] clear
clear @s[hasitem=[{item=sunrise:trans_bat,location=slot.inventory}]] sunrise:trans_bat 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye1,location=slot.inventory}]] sunrise:trans_vamp_player_eye1 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye2,location=slot.inventory}]] sunrise:trans_vamp_player_eye2 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye3,location=slot.inventory}]] sunrise:trans_vamp_player_eye3 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye4,location=slot.inventory}]] sunrise:trans_vamp_player_eye4 0 1
clear @s[hasitem=[{item=sunrise:trans_bat,location=slot.hotbar}]] sunrise:trans_bat 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye1,location=slot.hotbar}]] sunrise:trans_vamp_player_eye1 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye2,location=slot.hotbar}]] sunrise:trans_vamp_player_eye2 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye3,location=slot.hotbar}]] sunrise:trans_vamp_player_eye3 0 1
clear @s[hasitem=[{item=sunrise:trans_vamp_player_eye4,location=slot.hotbar}]] sunrise:trans_vamp_player_eye4 0 1
damage @s[m=!c,tag=vampiro,scores={sangue=..-1}] 1 entity_attack entity @s
scoreboard players set @s[tag=vampiro,scores={sangue=..-1}] sangue 101
scoreboard players set @s[tag=vampiro,scores={sangue=24000..}] sangue 23999
replaceitem entity @a[hasitem=[{item=sunrise:trans_bat,location=slot.armor.head,quantity=0}],tag=vampiro,tag=eye1] slot.armor.head 0 sunrise:trans_vamp_player_eye1 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
replaceitem entity @a[hasitem=[{item=sunrise:trans_bat,location=slot.armor.head,quantity=0}],tag=vampiro,tag=eye2] slot.armor.head 0 sunrise:trans_vamp_player_eye2 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
replaceitem entity @a[hasitem=[{item=sunrise:trans_bat,location=slot.armor.head,quantity=0}],tag=vampiro,tag=eye3] slot.armor.head 0 sunrise:trans_vamp_player_eye3 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
replaceitem entity @a[hasitem=[{item=sunrise:trans_bat,location=slot.armor.head,quantity=0}],tag=vampiro,tag=eye4] slot.armor.head 0 sunrise:trans_vamp_player_eye4 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
