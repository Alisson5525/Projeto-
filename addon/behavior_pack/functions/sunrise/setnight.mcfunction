execute as @a[hasitem=[{item=sunrise:trans_lob,location=slot.armor.head,quantity=0}],tag=lobisomem,tag=lbnI] at @s run particle sunrise:transform_smoke ~~~
execute as @a[hasitem=[{item=sunrise:trans_lob_blue,location=slot.armor.head,quantity=0}],tag=lobisomem,tag=lbnII] at @s run particle sunrise:transform_smoke ~~~
execute as @a[hasitem=[{item=sunrise:trans_lob_black,location=slot.armor.head,quantity=0}],tag=lobisomem,tag=lbnIII] at @s run particle sunrise:transform_smoke ~~~
replaceitem entity @a[hasitem=[{item=sunrise:trans_lob,location=slot.armor.head,quantity=0}],tag=lobisomem,tag=lbnI] slot.armor.head 0 sunrise:trans_lob 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
replaceitem entity @a[hasitem=[{item=sunrise:trans_lob_blue,location=slot.armor.head,quantity=0}],tag=lobisomem,tag=lbnII] slot.armor.head 0 sunrise:trans_lob_blue 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
replaceitem entity @a[hasitem=[{item=sunrise:trans_lob_black,location=slot.armor.head,quantity=0}],tag=lobisomem,tag=lbnIII] slot.armor.head 0 sunrise:trans_lob_black 1 0 {"item_lock":{"mode":"lock_in_inventory"},"keep_on_death":{}}
effect @a[tag=lobisomem] invisibility 5 5 true
clear @a[tag=!lobisomem] sunrise:trans_lob
clear @a[tag=!lobisomem] sunrise:trans_lob_blue
clear @a[tag=!lobisomem] sunrise:trans_lob_black