execute as @s[tag=on_to_fly] at @s run particle sunrise:transform_smoke ~~~
tag @s remove emuso_fly
tag @s remove emuso_rage
tag @s remove emuso_onehit
tag @s remove emuso_sangramento
tag @s remove emuso_servantswolf
tag @s remove emuso_poucafome
tag @s remove emuso_suntransform
tag @s remove emuso_esquiva
tag @s remove emuso_blooddrinker
tag @s remove emuso_fogremoval
tag @s remove emuso_swordDex
tag @s remove emuso_icetouch
tag @s remove emuso_nightvision
tag @s remove emuso_servantsbat
tag @s remove emuso_poucasede
tag @s remove emuso_waterproof
tag @s remove emuso_defencive
tag @s remove emuso_regeneration
tag @s remove emuso_absorption
tag @s remove emuso_sunresistence
tag @s remove emuso_acrobata
tag @s remove emuso_indetectavel
tag @s remove emuso_teleport
tag @s remove emuso_invisibilidade
tag @s remove on_to_fly
tag @s remove emuso_NoSkill
tag @s remove emuso_undefined
gamerule sendCommandFeedback false
effect @s clear
clear @s sunrise:trans_bat
function sunrise/removeFly
effect @s[tag=vampiro,scores={sangue=101..},tag=nightvision] night_vision 6000 1
effect @s[tag=emuso_lobisomem] night_vision 6000 1
gamerule sendCommandFeedback true