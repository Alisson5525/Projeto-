effect @s[tag=Skill_regenerationI,tag=!Skill_regenerationII] regeneration 5 2
effect @s[tag=Skill_regenerationII] regeneration 2 2
effect @s[tag=Skill_moredamageI,tag=!Skill_moredamageII] strength 5 0
effect @s[tag=Skill_moredamageII,tag=!Skill_moredamageIII] strength 5 1
effect @s[tag=Skill_moredamageIII] strength 5 2
clear @s[hasitem=[{item=sunrise:trans_lob,location=slot.inventory}]] sunrise:trans_lob 0 1
clear @s[hasitem=[{item=sunrise:trans_lob_blue,location=slot.inventory}]] sunrise:trans_lob_blue 0 1
clear @s[hasitem=[{item=sunrise:trans_lob_black,location=slot.inventory}]] sunrise:trans_lob_black 0 1
clear @s[hasitem=[{item=sunrise:trans_lob,location=slot.hotbar}]] sunrise:trans_lob 0 1
clear @s[hasitem=[{item=sunrise:trans_lob_blue,location=slot.hotbar}]] sunrise:trans_lob_blue 0 1
clear @s[hasitem=[{item=sunrise:trans_lob_black,location=slot.hotbar}]] sunrise:trans_lob_black 0 1
scoreboard players remove @s[tag=timerToVamp,scores={timerToVamp=1..}] timerToVamp 40
scoreboard players remove @s[tag=timerToHunter,scores={timerToHunter=1..}] timerToHunter 40
scoreboard players remove @s[tag=timerToLob,scores={timerToLob=1..}] timerToLob 40
execute as @s[tag=timerToLob,scores={timerToLob=-1000..0}] run function sunrise/translb
execute as @s[tag=timerToVamp,scores={timerToVamp=-1000..0}] run function sunrise/transvp
execute as @s[tag=timerToHunter,scores={timerToHunter=-1000..0}] run function sunrise/transhunter
execute as @s[tag=lobisomem] run function sunrise/run_all_werewolf
execute as @s[tag=vampiro] run function sunrise/run_all_vampire

effect @s[tag=hunter_skill_vital_1] health_boost infinite 0
effect @s[tag=hunter_skill_vital_2] health_boost infinite 1
effect @s[tag=hunter_skill_vital_3] health_boost infinite 2
effect @s[tag=hunter_skill_vital_4] health_boost infinite 3
effect @s[tag=hunter_skill_vital_5] health_boost infinite 4
effect @s[tag=hunter_skill_vital_6] health_boost infinite 6
effect @s[tag=hunter_skill_vital_7] health_boost infinite 7
effect @s[tag=hunter_skill_vital_8] health_boost infinite 9

effect @s[tag=hunter_skill_velo_1,tag=boost_vital] speed infinite 0
effect @s[tag=hunter_skill_velo_2,tag=boost_vital] speed infinite 1
effect @s[tag=hunter_skill_velo_3,tag=boost_vital] speed infinite 1
effect @s[tag=hunter_skill_velo_4,tag=boost_vital] speed infinite 1
effect @s[tag=hunter_skill_velo_5,tag=boost_vital] speed infinite 2
effect @s[tag=hunter_skill_velo_6,tag=boost_vital] speed infinite 2
effect @s[tag=hunter_skill_velo_7,tag=boost_vital] speed infinite 3
effect @s[tag=hunter_skill_velo_8,tag=boost_vital] speed infinite 3

effect @s[tag=hunter_skill_velo_2,tag=boost_vital] jump_boost infinite 0
effect @s[tag=hunter_skill_velo_3,tag=boost_vital] jump_boost infinite 1
effect @s[tag=hunter_skill_velo_4,tag=boost_vital] jump_boost infinite 1
effect @s[tag=hunter_skill_velo_5,tag=boost_vital] jump_boost infinite 2
effect @s[tag=hunter_skill_velo_6,tag=boost_vital] jump_boost infinite 2
effect @s[tag=hunter_skill_velo_7,tag=boost_vital] jump_boost infinite 3
effect @s[tag=hunter_skill_velo_8,tag=boost_vital] jump_boost infinite 3

effect @s[tag=hunter,tag=!boost_vital] speed infinite 0
effect @s[tag=hunter,tag=!boost_vital] jump_boost infinite 0