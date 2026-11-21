tag @s remove timerToVamp
tellraw @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] {"rawtext":[{"translate":"msg_transformou"}]}
give @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] sunrise:vampire_skill_item 1 0  {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
scoreboard objectives add vp_skill dummy vp_skill
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro]  add fraqueza_agua
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro]  add player_atacado_creeper
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro]  add burn_vamp
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro]  add drink_sangue
scoreboard objectives add sangue dummy sangue
scoreboard players set @s[tag=!hunter,tag=!lobisomem,tag=!vampiro]  sangue 250000
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] add eye4
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] add vampiro