playsound item.icarus_boots.equip @a[hasitem={item=mm:icarus_boots,location=slot.armor.feet},tag=!mm:icarus_boots]
tag @a[hasitem={item=mm:icarus_boots,location=slot.armor.feet},tag=!mm:icarus_boots] add mm:icarus_boots
execute as @a[hasitem={item=mm:icarus_boots,location=slot.armor.feet,quantity=0},tag=mm:icarus_boots] run scriptevent mm:delayedtagremoval mm:icarus_boots 

playsound item.demon_armour.equip @a[hasitem={item=mm:demon_boots,location=slot.armor.feet},tag=!mm:demon_boots]
tag @a[hasitem={item=mm:demon_boots,location=slot.armor.feet},tag=!mm:demon_boots] add mm:demon_boots
tag @a[hasitem={item=mm:demon_boots,location=slot.armor.feet,quantity=0},tag=mm:demon_boots] remove mm:demon_boots 
playsound item.demon_armour.equip @a[hasitem={item=mm:demon_leggings,location=slot.armor.legs},tag=!mm:demon_leggings]
tag @a[hasitem={item=mm:demon_leggings,location=slot.armor.legs},tag=!mm:demon_leggings] add mm:demon_leggings
tag @a[hasitem={item=mm:demon_leggings,location=slot.armor.legs,quantity=0},tag=mm:demon_leggings] remove mm:demon_leggings 
playsound item.demon_armour.equip @a[hasitem={item=mm:demon_chestplate,location=slot.armor.chest},tag=!mm:demon_chestplate]
tag @a[hasitem={item=mm:demon_chestplate,location=slot.armor.chest},tag=!mm:demon_chestplate] add mm:demon_chestplate
tag @a[hasitem={item=mm:demon_chestplate,location=slot.armor.chest,quantity=0},tag=mm:demon_chestplate] remove mm:demon_chestplate 
playsound item.demon_armour.equip @a[hasitem={item=mm:demon_helmet,location=slot.armor.head},tag=!mm:demon_helmet]
tag @a[hasitem={item=mm:demon_helmet,location=slot.armor.head},tag=!mm:demon_helmet] add mm:demon_helmet
tag @a[hasitem={item=mm:demon_helmet,location=slot.armor.head,quantity=0},tag=mm:demon_helmet] remove mm:demon_helmet 

playsound chime.amethyst_block @a[hasitem={item=mm:pink_plushie,location=slot.armor.head},tag=!mm:pink_plushie] 
playsound item.pink_plushie.blep @a[hasitem={item=mm:pink_plushie,location=slot.armor.head},tag=!mm:pink_plushie]
tag @a[hasitem={item=mm:pink_plushie,location=slot.armor.head},tag=!mm:pink_plushie] add mm:pink_plushie
tag @a[hasitem={item=mm:pink_plushie,location=slot.armor.head,quantity=0},tag=mm:pink_plushie] remove mm:pink_plushie


playsound item.equip.sparkling_amulet @a[hasitem={item=mm:sparkling_amulet,location=slot.weapon.offhand},tag=!mm:sparkling_amulet]
tag @a[hasitem={item=mm:sparkling_amulet,location=slot.weapon.offhand},tag=!mm:sparkling_amulet] add mm:sparkling_amulet
tag @a[hasitem={item=mm:sparkling_amulet,location=slot.weapon.offhand,quantity=0},tag=mm:sparkling_amulet] remove mm:sparkling_amulet

playsound item.equip.blazing_amulet @a[hasitem={item=mm:blazing_amulet,location=slot.weapon.offhand},tag=!mm:blazing_amulet]
tag @a[hasitem={item=mm:blazing_amulet,location=slot.weapon.offhand},tag=!mm:blazing_amulet] add mm:blazing_amulet
tag @a[hasitem={item=mm:blazing_amulet,location=slot.weapon.offhand,quantity=0},tag=mm:blazing_amulet] remove mm:blazing_amulet

playsound item.equip.shivering_amulet @a[hasitem={item=mm:shivering_amulet,location=slot.weapon.offhand},tag=!mm:shivering_amulet]
tag @a[hasitem={item=mm:shivering_amulet,location=slot.weapon.offhand},tag=!mm:shivering_amulet] add mm:shivering_amulet
tag @a[hasitem={item=mm:shivering_amulet,location=slot.weapon.offhand,quantity=0},tag=mm:shivering_amulet] remove mm:shivering_amulet

playsound item.equip.altered_amulet @a[hasitem={item=mm:altered_amulet,location=slot.weapon.offhand},tag=!mm:altered_amulet]
tag @a[hasitem={item=mm:altered_amulet,location=slot.weapon.offhand},tag=!mm:altered_amulet] add mm:altered_amulet
tag @a[hasitem={item=mm:altered_amulet,location=slot.weapon.offhand,quantity=0},tag=mm:altered_amulet] remove mm:altered_amulet

playsound item.equip.resonance_amulet @a[hasitem={item=mm:resonance_amulet,location=slot.weapon.offhand},tag=!mm:resonance_amulet]
tag @a[hasitem={item=mm:resonance_amulet,location=slot.weapon.offhand},tag=!mm:resonance_amulet] add mm:resonance_amulet
tag @a[hasitem={item=mm:resonance_amulet,location=slot.weapon.offhand,quantity=0},tag=mm:resonance_amulet] remove mm:resonance_amulet
