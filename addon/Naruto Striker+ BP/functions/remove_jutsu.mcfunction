# Rinnegan (Caminho Preta): absorve os jutsus proximos ao ativar a absorcao de chakra.
# (Antes este arquivo nao existia e a habilidade gerava erro "function not found".)
kill @e[r=8,family=jutsu]
kill @e[r=8,family=jutsu_comum]
kill @e[r=8,family=jutsu_incomum]
playsound mob.evocation_illager.cast_spell @a[r=12] ~ ~ ~ 1 0.6
