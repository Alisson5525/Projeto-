tag @s remove timerToLob
tellraw @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] {"rawtext":[{"translate":"msg_transformou"}]}
give @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] sunrise:werewolf_skill_item 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] add fraqueza_agua
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] add player_atacado_creeper
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] add lbnI
tag @s[tag=!hunter,tag=!lobisomem,tag=!vampiro] add lobisomem