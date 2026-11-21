# -*- coding: utf-8 -*-
"""All Vampire Craft 5 texts: key -> (pt_BR, en_US, es)."""

L = {}


def t(key, pt, en, es):
    L[key] = (pt, en, es)


# --- Names: items -------------------------------------------------------------
ITEMS = {
    "blood_bottle_1": ("Frasco de Sangue [1/4]", "Blood Bottle [1/4]", "Frasco de Sangre [1/4]"),
    "blood_bottle_2": ("Frasco de Sangue [2/4]", "Blood Bottle [2/4]", "Frasco de Sangre [2/4]"),
    "blood_bottle_3": ("Frasco de Sangue [3/4]", "Blood Bottle [3/4]", "Frasco de Sangre [3/4]"),
    "blood_bottle_4": ("§cFrasco de Sangue [4/4]", "§cBlood Bottle [4/4]", "§cFrasco de Sangre [4/4]"),
    "change_stone": ("§ePedra da Mudança", "§eStone of Change", "§ePiedra del Cambio"),
    "eclipse_armor_boots": ("Botas do Eclipse", "Eclipse Boots", "Botas del Eclipse"),
    "eclipse_armor_helmet": ("Elmo do Eclipse", "Eclipse Helmet", "Casco del Eclipse"),
    "eclipse_ingot": ("§dLingote do Eclipse", "§dEclipse Ingot", "§dLingote del Eclipse"),
    "garlic": ("Alho", "Garlic", "Ajo"),
    "garlic_syringe": ("§eSeringa de Alho", "§eGarlic Syringe", "§eJeringa de Ajo"),
    "human_heart": ("Coração Humano", "Human Heart", "Corazón Humano"),
    "hunter_bow": ("§6Arco do Caçador", "§6Hunter's Bow", "§6Arco del Cazador"),
    "hunter_skill_item": ("§eInsígnia do Caçador", "§eHunter's Insignia", "§eInsignia del Cazador"),
    "liver": ("Fígado de Lobisomem", "Werewolf Liver", "Hígado de Hombre Lobo"),
    "moon_eclipse_armor_chestplate": ("Peitoral do Eclipse Lunar", "Lunar Eclipse Chestplate", "Peto del Eclipse Lunar"),
    "moon_eclipse_armor_leggings": ("Calças do Eclipse Lunar", "Lunar Eclipse Leggings", "Grebas del Eclipse Lunar"),
    "moon_stone_ingot": ("Lingote de Pedra da Lua", "Moonstone Ingot", "Lingote de Piedra Lunar"),
    "moon_stone_ore": ("Fragmento de Pedra da Lua", "Moonstone Shard", "Fragmento de Piedra Lunar"),
    "philosopher_stone": ("§bPedra Filosofal", "§bPhilosopher's Stone", "§bPiedra Filosofal"),
    "philosopher_water": ("§bÁgua Filosofal", "§bPhilosopher's Water", "§bAgua Filosofal"),
    "pure_vampire_blood": ("§eSangue Puro de Vampiro", "§ePure Vampire Blood", "§eSangre Pura de Vampiro"),
    "sun_eclipse_armor_chestplate": ("Peitoral do Eclipse Solar", "Solar Eclipse Chestplate", "Peto del Eclipse Solar"),
    "sun_eclipse_armor_leggings": ("Calças do Eclipse Solar", "Solar Eclipse Leggings", "Grebas del Eclipse Solar"),
    "sun_stone_ingot": ("Lingote de Pedra do Sol", "Sunstone Ingot", "Lingote de Piedra Solar"),
    "sun_stone_ore": ("Fragmento de Pedra do Sol", "Sunstone Shard", "Fragmento de Piedra Solar"),
    "syringe": ("Seringa", "Syringe", "Jeringa"),
    "vampire_blood": ("Sangue de Vampiro", "Vampire Blood", "Sangre de Vampiro"),
    "vampire_craft_book": ("§4Codex Vampire Craft", "§4Vampire Craft Codex", "§4Códice Vampire Craft"),
    "vampire_cure": ("§dCura do Vampirismo", "§dVampirism Cure", "§dCura del Vampirismo"),
    "vampire_skill_item": ("§4Cálice de Sangue §7[Habilidades]", "§4Blood Chalice §7[Skills]", "§4Cáliz de Sangre §7[Habilidades]"),
    "vampire_sword": ("§dEspada Vampírica", "§dVampiric Sword", "§dEspada Vampírica"),
    "vampire_sword_m": ("§dEspada Vampírica §7(sedenta)", "§dVampiric Sword §7(thirsty)", "§dEspada Vampírica §7(sedienta)"),
    "vampire_sword_e": ("§dEspada Vampírica §8(seca)", "§dVampiric Sword §8(drained)", "§dEspada Vampírica §8(seca)"),
    "vampire_tooth": ("Presa de Vampiro", "Vampire Fang", "Colmillo de Vampiro"),
    "weak_human_heart": ("Coração Humano Fraco", "Weak Human Heart", "Corazón Humano Débil"),
    "werewolf_claws": ("§6Garras de Lobisomem", "§6Werewolf Claws", "§6Garras de Hombre Lobo"),
    "werewolf_claws_m": ("§6Garras de Lobisomem §7(gastas)", "§6Werewolf Claws §7(worn)", "§6Garras de Hombre Lobo §7(gastadas)"),
    "werewolf_claws_e": ("§6Garras de Lobisomem §8(cegas)", "§6Werewolf Claws §8(blunt)", "§6Garras de Hombre Lobo §8(romas)"),
    "werewolf_cure": ("§dCura da Licantropia", "§dLycanthropy Cure", "§dCura de la Licantropía"),
    "werewolf_fang": ("Presa de Lobisomem", "Werewolf Fang", "Colmillo de Hombre Lobo"),
    "werewolf_skill_item": ("§6Totem da Lua §7[Habilidades]", "§6Moon Totem §7[Skills]", "§6Tótem Lunar §7[Habilidades]"),
    "witchcraft_guide": ("Guia de Bruxaria", "Witchcraft Guide", "Guía de Brujería"),
    "dont_use": ("§8[Item cosmético]", "§8[Cosmetic item]", "§8[Objeto cosmético]"),
}
for k, v in ITEMS.items():
    t(f"item.sunrise:{k}.name", *v)

BLOCKS = {
    "moon_stone_ore_block": ("Minério de Pedra da Lua", "Moonstone Ore", "Mena de Piedra Lunar"),
    "sun_stone_ore_block": ("Minério de Pedra do Sol", "Sunstone Ore", "Mena de Piedra Solar"),
    "caixao_oak": ("Caixão de Carvalho", "Oak Coffin", "Ataúd de Roble"),
    "caixao_spruce": ("Caixão de Pinheiro", "Spruce Coffin", "Ataúd de Abeto"),
    "caixao_birch": ("Caixão de Bétula", "Birch Coffin", "Ataúd de Abedul"),
    "caixao_jungle": ("Caixão da Selva", "Jungle Coffin", "Ataúd de Jungla"),
    "caixao_acacia": ("Caixão de Acácia", "Acacia Coffin", "Ataúd de Acacia"),
    "caixao_crimson": ("Caixão Carmesim", "Crimson Coffin", "Ataúd Carmesí"),
    "caixao_warped": ("Caixão Distorcido", "Warped Coffin", "Ataúd Distorsionado"),
    "caixao_up_collision": ("Caixão", "Coffin", "Ataúd"),
    "meat_grinder": ("Moedor de Carne", "Meat Grinder", "Picadora de Carne"),
    "eclipse_sun_stone_bricks": ("Tijolos do Eclipse", "Eclipse Bricks", "Ladrillos del Eclipse"),
    "cracked_eclipse_sun_stone_bricks": ("Tijolos do Eclipse Rachados", "Cracked Eclipse Bricks", "Ladrillos del Eclipse Agrietados"),
    "blood_altar": ("§4Altar de Sangue", "§4Blood Altar", "§4Altar de Sangre"),
    "hunter_campfire": ("Fogueira dos Caçadores", "Hunters' Campfire", "Hoguera de Cazadores"),
    "recharging_altar": ("§5Altar de Recarga", "§5Recharging Altar", "§5Altar de Recarga"),
}
for k, v in BLOCKS.items():
    t(f"tile.sunrise:{k}.name", *v)
t("tile.thini:garlic_crop.name", "Plantação de Alho", "Garlic Crop", "Cultivo de Ajo")

ENTITIES = {
    "vampire": ("Vampiro", "Vampire", "Vampiro"),
    "weak_vampire": ("Vampiro Recém-Nascido", "Fledgling Vampire", "Vampiro Neófito"),
    "vampire_witch": ("Bruxa Vampira", "Vampire Witch", "Bruja Vampira"),
    "werewolf": ("Lobisomem", "Werewolf", "Hombre Lobo"),
    "weak_werewolf": ("Lobisomem Jovem", "Young Werewolf", "Hombre Lobo Joven"),
    "black_werewolf": ("§8Lobisomem Alfa", "§8Alpha Werewolf", "§8Hombre Lobo Alfa"),
    "hunter": ("Caçador", "Hunter", "Cazador"),
    "hunter_treiner": ("§eMestre Caçador", "§eHunter Master", "§eMaestro Cazador"),
    "bat_minion": ("Morcego Servo", "Bat Minion", "Murciélago Sirviente"),
    "servantsbat": ("Morcego Servo", "Servant Bat", "Murciélago Sirviente"),
    "chicken_vampiro": ("Galinha Vampira", "Vampire Chicken", "Gallina Vampira"),
    "bullet_queen": ("Magia", "Magic Bolt", "Magia"),
}
for k, (pt, en, es) in ENTITIES.items():
    t(f"entity.sunrise:{k}.name", pt, en, es)
    t(f"item.spawn_egg.entity.sunrise:{k}.name", f"Gerar {pt}", f"Spawn {en}", f"Generar {es}")

# --- Factions / generic UI ------------------------------------------------------
t("vc.faction.human", "Humano", "Human", "Humano")
t("vc.faction.vampire", "Vampiro", "Vampire", "Vampiro")
t("vc.faction.werewolf", "Lobisomem", "Werewolf", "Hombre Lobo")
t("vc.faction.hunter", "Caçador", "Hunter", "Cazador")
t("vc.ui.back", "« Voltar", "« Back", "« Volver")
t("vc.ui.close", "Fechar", "Close", "Cerrar")
t("vc.ui.unlock", "§aDesbloquear", "§aUnlock", "§aDesbloquear")
t("vc.hud.lvl", "Nv.", "Lv.", "Nv.")
t("vc.hud.rank", "Pat.", "Rank", "Rango")
t("vc.hud.infect.vampire", "Vampirismo", "Vampirism", "Vampirismo")
t("vc.hud.infect.werewolf", "Licantropia", "Lycanthropy", "Licantropía")
t("vc.hud.infect.hunter", "Juramento", "Oath", "Juramento")
t("vc.welcome", "§7Bem-vindo ao §4Vampire Craft 5§7! Leia o §4Codex§7 que está no seu inventário.",
  "§7Welcome to §4Vampire Craft 5§7! Read the §4Codex§7 in your inventory.",
  "§7¡Bienvenido a §4Vampire Craft 5§7! Lee el §4Códice§7 de tu inventario.")

# --- Become / cure / level ---------------------------------------------------
t("vc.become.vampire.title", "§4Vampiro", "§4Vampire", "§4Vampiro")
t("vc.become.vampire.sub", "§7A sede começou...", "§7The thirst has begun...", "§7La sed ha comenzado...")
t("vc.become.vampire.tip", "§cVocê agora é um vampiro. §7Agache e ataque uma criatura para §cmorder§7. Fuja do sol! Use o §4Cálice de Sangue§7 para suas habilidades.",
  "§cYou are now a vampire. §7Sneak and attack a creature to §cbite§7 it. Avoid the sun! Use the §4Blood Chalice§7 for your skills.",
  "§cAhora eres un vampiro. §7Agáchate y ataca a una criatura para §cmorder§7. ¡Evita el sol! Usa el §4Cáliz de Sangre§7 para tus habilidades.")
t("vc.become.werewolf.title", "§6Lobisomem", "§6Werewolf", "§6Hombre Lobo")
t("vc.become.werewolf.sub", "§7A lua agora te chama...", "§7The moon calls you now...", "§7La luna ahora te llama...")
t("vc.become.werewolf.tip", "§6Você agora é um lobisomem. §7À noite você se transforma. Caçe para subir de nível e evoluir sua fera. Use o §6Totem da Lua§7.",
  "§6You are now a werewolf. §7You transform at night. Hunt to level up and evolve your beast. Use the §6Moon Totem§7.",
  "§6Ahora eres un hombre lobo. §7Te transformas de noche. Caza para subir de nivel y evolucionar tu bestia. Usa el §6Tótem Lunar§7.")
t("vc.become.hunter.title", "§eCaçador", "§eHunter", "§eCazador")
t("vc.become.hunter.sub", "§7Você jurou caçar as trevas", "§7You swore to hunt the darkness", "§7Juraste cazar la oscuridad")
t("vc.become.hunter.tip", "§eVocê agora é um caçador. §7Use a §eInsígnia§7 para ver missões e treinar. Seu sangue com alho queima vampiros!",
  "§eYou are now a hunter. §7Use the §eInsignia§7 to see missions and train. Your garlic blood burns vampires!",
  "§eAhora eres un cazador. §7Usa la §eInsignia§7 para ver misiones y entrenar. ¡Tu sangre con ajo quema a los vampiros!")
t("vc.cure.title", "§aCurado", "§aCured", "§aCurado")
t("vc.cure.sub", "§7Você é humano novamente", "§7You are human again", "§7Vuelves a ser humano")
t("vc.cure.nothing", "§7Nada aconteceu... você não precisa desta cura.", "§7Nothing happened... you don't need this cure.", "§7No pasó nada... no necesitas esta cura.")
t("vc.levelup.title", "§bNível acima!", "§bLevel up!", "§b¡Subes de nivel!")
t("vc.levelup.sub", "§7Agora você é nível §f%s", "§7You are now level §f%s", "§7Ahora eres nivel §f%s")
t("vc.levelup.new_skills", "§d%s nova(s) habilidade(s) disponível(is) no Altar de Sangue!", "§d%s new skill(s) available at the Blood Altar!", "§d¡%s nueva(s) habilidad(es) en el Altar de Sangre!")
t("vc.levelup.max", "§6Você alcançou o nível máximo!", "§6You reached the maximum level!", "§6¡Alcanzaste el nivel máximo!")

# --- Infection ----------------------------------------------------------------
t("vc.infect.vampire.start", "§4Algo frio corre em suas veias... §7(beba §fleite§7 para impedir a transformação)",
  "§4Something cold runs through your veins... §7(drink §fmilk§7 to stop the change)", "§4Algo frío corre por tus venas... §7(bebe §fleche§7 para detener el cambio)")
t("vc.infect.werewolf.start", "§6Você sente a lua dentro de você... §7(beba §fleite§7 para impedir a transformação)",
  "§6You feel the moon inside you... §7(drink §fmilk§7 to stop the change)", "§6Sientes la luna dentro de ti... §7(bebe §fleche§7 para detener el cambio)")
t("vc.infect.hunter.start", "§eO alho queima em seu sangue. Seu juramento se completará em breve.",
  "§eGarlic burns in your blood. Your oath will soon be complete.", "§eEl ajo arde en tu sangre. Tu juramento pronto se completará.")
t("vc.infect.not_human", "§cSó humanos podem usar isso.", "§cOnly humans can use this.", "§cSolo los humanos pueden usar esto.")
t("vc.infect.already", "§cVocê já está passando por uma transformação.", "§cYou are already transforming.", "§cYa te estás transformando.")
t("vc.infect.cured_milk", "§aO leite limpou seu sangue. A transformação parou.", "§aThe milk cleansed your blood. The change stopped.", "§aLa leche limpió tu sangre. El cambio se detuvo.")

# --- Skills: generic ---------------------------------------------------------------
t("vc.skill.unknown", "§cHabilidade desconhecida.", "§cUnknown skill.", "§cHabilidad desconocida.")
t("vc.skill.already", "§7Você já possui esta habilidade.", "§7You already have this skill.", "§7Ya tienes esta habilidad.")
t("vc.skill.need_level", "§cVocê precisa ser nível §f%s§c.", "§cYou need to be level §f%s§c.", "§cNecesitas ser nivel §f%s§c.")
t("vc.skill.need_items", "§cVocê não tem os itens necessários.", "§cYou don't have the required items.", "§cNo tienes los objetos necesarios.")
t("vc.skill.unlocked", "§aHabilidade desbloqueada!", "§aSkill unlocked!", "§a¡Habilidad desbloqueada!")
t("vc.skill.cooldown", "§7Recarregando... §f%ss", "§7Recharging... §f%ss", "§7Recargando... §f%ss")
t("vc.skill.no_blood", "§cSangue insuficiente!", "§cNot enough blood!", "§c¡Sangre insuficiente!")
t("vc.skill.no_target", "§7Nenhum alvo à sua frente.", "§7No target in front of you.", "§7No hay objetivo delante de ti.")
t("vc.skill.none_selected", "§7Nenhuma habilidade selecionada. Use o item sem agachar para escolher.", "§7No skill selected. Use the item without sneaking to pick one.", "§7Ninguna habilidad seleccionada. Usa el objeto sin agacharte para elegir.")
t("vc.skill.fly.on", "§7Forma de morcego! §fSegure pular§7 para voar. Use de novo para sair.", "§7Bat form! §fHold jump§7 to fly. Use again to leave.", "§7¡Forma de murciélago! §fMantén saltar§7 para volar. Úsala de nuevo para salir.")
t("vc.skill.teleport.blocked", "§cNão há espaço para se teleportar ali.", "§cThere's no room to teleport there.", "§cNo hay espacio para teletransportarse allí.")
t("vc.skill.icetouch.on", "§bSeus golpes congelam por 30s.", "§bYour hits freeze for 30s.", "§bTus golpes congelan durante 30s.")
t("vc.skill.onehit.on", "§6Seu próximo golpe será devastador!", "§6Your next hit will be devastating!", "§6¡Tu próximo golpe será devastador!")
t("vc.skill.hunter_sense.on", "§eSeus sentidos revelam as criaturas da noite...", "§eYour senses reveal the creatures of the night...", "§eTus sentidos revelan a las criaturas de la noche...")
t("vc.skills.title", "Habilidades", "Skills", "Habilidades")
t("vc.skills.body", "§7Toque para usar. §fDica:§7 agache + use o item para lançar a habilidade selecionada (§a»§7) sem abrir o menu.",
  "§7Tap to cast. §fTip:§7 sneak + use the item to cast the selected skill (§a»§7) without opening this menu.",
  "§7Toca para usar. §fConsejo:§7 agáchate + usa el objeto para lanzar la habilidad seleccionada (§a»§7) sin abrir el menú.")
t("vc.skills.passives", "Passivas", "Passives", "Pasivas")
t("vc.form.helmet_full", "§cSeu inventário está cheio — não há onde guardar o capacete.", "§cYour inventory is full — no room for your helmet.", "§cTu inventario está lleno — no hay sitio para tu casco.")
t("vc.item.wrong_faction", "§7Este item não reage a você.", "§7This item doesn't respond to you.", "§7Este objeto no reacciona a ti.")

SKILL_TEXT = {
    "vampire": {
        "nightvision": (("Visão Noturna", "Enxergue no escuro enquanto tiver sangue."), ("Night Vision", "See in the dark while you have blood."), ("Visión Nocturna", "Ve en la oscuridad mientras tengas sangre.")),
        "fly": (("Forma de Morcego", "Vire um morcego e voe (segure pular). Gasta sangue."), ("Bat Form", "Turn into a bat and fly (hold jump). Drains blood."), ("Forma de Murciélago", "Conviértete en murciélago y vuela (mantén saltar). Gasta sangre.")),
        "blooddrinker": (("Bebedor de Sangue", "Mordidas rendem mais sangue e enchem frascos mais rápido."), ("Blood Drinker", "Bites yield more blood and fill bottles faster."), ("Bebedor de Sangre", "Los mordiscos dan más sangre y llenan frascos más rápido.")),
        "rage": (("Fúria Sanguínea", "Força II e Velocidade II por 30s."), ("Blood Rage", "Strength II and Speed II for 30s."), ("Furia Sanguínea", "Fuerza II y Velocidad II durante 30s.")),
        "waterproof": (("Pele Impermeável", "A água não te machuca mais."), ("Waterproof Skin", "Water no longer hurts you."), ("Piel Impermeable", "El agua ya no te hace daño.")),
        "indetectavel": (("Indetectável", "Creepers e golens deixam de te perceber."), ("Undetectable", "Creepers and golems stop noticing you."), ("Indetectable", "Los creepers y gólems dejan de notarte.")),
        "servantsbat": (("Morcegos Servos", "Invoque morcegos que atacam inimigos e te trazem sangue."), ("Servant Bats", "Summon bats that attack enemies and bring you blood."), ("Murciélagos Sirvientes", "Invoca murciélagos que atacan y te traen sangre.")),
        "poucasede": (("Sede Contida", "Seu sangue se esgota na metade da velocidade."), ("Restrained Thirst", "Your blood drains at half speed."), ("Sed Contenida", "Tu sangre se agota a la mitad de velocidad.")),
        "acrobata": (("Acrobata", "Velocidade e pulo aprimorados permanentemente."), ("Acrobat", "Permanently improved speed and jump."), ("Acróbata", "Velocidad y salto mejorados permanentemente.")),
        "teleport": (("Passo Sombrio", "Teleporte-se para onde estiver olhando."), ("Shadow Step", "Teleport to where you are looking."), ("Paso Sombrío", "Teletranspórtate a donde estés mirando.")),
        "sunresistence": (("Resistência Solar", "O sol não te queima mais, apenas te enfraquece."), ("Sun Resistance", "The sun no longer burns you, it only weakens you."), ("Resistencia Solar", "El sol ya no te quema, solo te debilita.")),
        "icetouch": (("Toque Gélido", "Por 30s seus golpes congelam os inimigos."), ("Frost Touch", "For 30s your hits freeze enemies."), ("Toque Gélido", "Durante 30s tus golpes congelan a los enemigos.")),
        "regeneration": (("Regeneração", "Regeneração III por 8s."), ("Regeneration", "Regeneration III for 8s."), ("Regeneración", "Regeneración III durante 8s.")),
        "absorption": (("Pele de Pedra", "Absorção constante enquanto tiver sangue."), ("Stone Skin", "Constant absorption while you have blood."), ("Piel de Piedra", "Absorción constante mientras tengas sangre.")),
        "invisibilidade": (("Forma de Névoa", "Fique invisível e mais rápido por 20s."), ("Mist Form", "Become invisible and faster for 20s."), ("Forma de Niebla", "Vuélvete invisible y más rápido durante 20s.")),
        "hypnosis": (("Hipnose", "Paralisa e enfraquece quem estiver à sua frente."), ("Hypnosis", "Paralyses and weakens whoever is in front of you."), ("Hipnosis", "Paraliza y debilita a quien esté delante de ti.")),
        "blood_nova": (("Explosão de Sangue", "Explosão que fere tudo ao redor e te cura."), ("Blood Nova", "A blast that hurts everything around and heals you."), ("Explosión de Sangre", "Explosión que hiere todo alrededor y te cura.")),
    },
    "werewolf": {
        "transform": (("Transformação", "Assuma ou abandone a forma de fera (à noite)."), ("Transformation", "Take or leave your beast form (at night)."), ("Transformación", "Toma o abandona tu forma de bestia (de noche).")),
        "nightvision": (("Olhos da Fera", "Visão noturna permanente."), ("Beast Eyes", "Permanent night vision."), ("Ojos de Bestia", "Visión nocturna permanente.")),
        "absorption": (("Couro Grosso", "Absorção constante."), ("Thick Hide", "Constant absorption."), ("Cuero Grueso", "Absorción constante.")),
        "waterproof": (("Pelagem Seca", "A água não te atrasa."), ("Dry Fur", "Water doesn't slow you."), ("Pelaje Seco", "El agua no te frena.")),
        "rage": (("Fúria Lunar", "Força III e Pressa II por 30s."), ("Lunar Rage", "Strength III and Haste II for 30s."), ("Furia Lunar", "Fuerza III y Prisa II durante 30s.")),
        "howl": (("Uivo", "Aliados ficam mais fortes, inimigos ficam lentos e fracos."), ("Howl", "Allies grow stronger, enemies become slow and weak."), ("Aullido", "Los aliados se fortalecen; los enemigos se ralentizan y debilitan.")),
        "poucafome": (("Fome Contida", "A forma de fera não te dá fome."), ("Restrained Hunger", "The beast form doesn't make you hungry."), ("Hambre Contenida", "La forma de bestia no te da hambre.")),
        "acrobata": (("Caçador Ágil", "Velocidade e pulo aprimorados."), ("Agile Hunter", "Improved speed and jump."), ("Cazador Ágil", "Velocidad y salto mejorados.")),
        "onehit": (("Golpe Brutal", "Seu próximo golpe causa dano massivo."), ("Brutal Blow", "Your next hit deals massive damage."), ("Golpe Brutal", "Tu próximo golpe causa daño masivo.")),
        "suntransform": (("Fera Diurna", "Pode se transformar também durante o dia."), ("Daywalker Beast", "You can transform during the day too."), ("Bestia Diurna", "Puedes transformarte también de día.")),
        "defencive": (("Postura Defensiva", "Resistência IV por 8s."), ("Defensive Stance", "Resistance IV for 8s."), ("Postura Defensiva", "Resistencia IV durante 8s.")),
        "lunge": (("Investida", "Avance rasgando tudo no caminho."), ("Lunge", "Dash forward tearing through enemies."), ("Embestida", "Avanza desgarrando todo a tu paso.")),
        "sangramento": (("Sangramento", "Seus golpes podem fazer o alvo sangrar."), ("Bleeding", "Your hits may make the target bleed."), ("Sangrado", "Tus golpes pueden hacer sangrar al objetivo.")),
        "regeneration": (("Regeneração", "Regeneração III por 8s."), ("Regeneration", "Regeneration III for 8s."), ("Regeneración", "Regeneración III durante 8s.")),
        "invisibilidade": (("Sombra da Lua", "Invisibilidade total por 20s."), ("Moon Shadow", "Total invisibility for 20s."), ("Sombra Lunar", "Invisibilidad total durante 20s.")),
    },
    "hunter": {
        "hunter_sense": (("Sentido do Caçador", "Marca vampiros e lobisomens num raio de 40 blocos."), ("Hunter's Sense", "Marks vampires and werewolves within 40 blocks."), ("Sentido del Cazador", "Marca vampiros y hombres lobo en 40 bloques.")),
        "divine": (("Proteção Divina", "Aura sagrada que fere monstros próximos."), ("Divine Protection", "Holy aura that hurts nearby monsters."), ("Protección Divina", "Aura sagrada que hiere a monstruos cercanos.")),
        "holy_burst": (("Explosão Sagrada", "Queima criaturas sobrenaturais ao seu redor."), ("Holy Burst", "Burns supernatural creatures around you."), ("Explosión Sagrada", "Quema a las criaturas sobrenaturales a tu alrededor.")),
    },
}
for fac, skills in SKILL_TEXT.items():
    for sid, langs in skills.items():
        t(f"vc.skill.{fac}.{sid}.name", langs[0][0], langs[1][0], langs[2][0])
        t(f"vc.skill.{fac}.{sid}.desc", langs[0][1], langs[1][1], langs[2][1])

# --- Altar / blocks ------------------------------------------------------------------
t("vc.altar.title", "Altar de Sangue", "Blood Altar", "Altar de Sangre")
t("vc.altar.body", "§7Seu nível: §f%s§7. Escolha um poder para despertar. Itens em §avermelho/verde§7 mostram se você os possui.",
  "§7Your level: §f%s§7. Choose a power to awaken. §aGreen§7/§cred§7 amounts show whether you own them.",
  "§7Tu nivel: §f%s§7. Elige un poder para despertar. Las cantidades en §averde§7/§crojo§7 indican si las tienes.")
t("vc.altar.req_level", "§8Requer nível %s", "§8Requires level %s", "§8Requiere nivel %s")
t("vc.altar.confirm", "§7Nível necessário: §f%s§7. Os itens serão consumidos.", "§7Required level: §f%s§7. The items will be consumed.", "§7Nivel requerido: §f%s§7. Los objetos se consumirán.")
t("vc.altar.fill", "§7O altar tem §c%s/%s§7 de sangue. Use §cfrascos de sangue cheios§7 ou §cfígados§7 nele.",
  "§7The altar holds §c%s/%s§7 blood. Use §cfull blood bottles§7 or §clivers§7 on it.", "§7El altar tiene §c%s/%s§7 de sangre. Usa §cfrascos llenos§7 o §chígados§7 en él.")
t("vc.altar.need_tooth", "§7O altar está cheio. Ofereça uma §fPresa de Vampiro§7.", "§7The altar is full. Offer a §fVampire Fang§7.", "§7El altar está lleno. Ofrece un §fColmillo de Vampiro§7.")
t("vc.altar.need_fang", "§7O altar está cheio. Ofereça uma §fPresa de Lobisomem§7.", "§7The altar is full. Offer a §fWerewolf Fang§7.", "§7El altar está lleno. Ofrece un §fColmillo de Hombre Lobo§7.")
t("vc.altar.not_supernatural", "§7O altar ignora você. Apenas vampiros e lobisomens podem usá-lo.", "§7The altar ignores you. Only vampires and werewolves can use it.", "§7El altar te ignora. Solo vampiros y hombres lobo pueden usarlo.")
t("vc.altar.all_unlocked", "§aVocê já despertou todos os poderes!", "§aYou have awakened every power!", "§a¡Ya despertaste todos los poderes!")
t("vc.recharge.hint", "§7Segure uma §dEspada Vampírica§7 ou §6Garras§7 desgastadas e toque no altar.", "§7Hold a drained §dVampiric Sword§7 or worn §6Claws§7 and tap the altar.", "§7Sostén una §dEspada Vampírica§7 o §6Garras§7 gastadas y toca el altar.")
t("vc.recharge.need_fuel", "§cPrecisa de 4 frascos de sangue cheios ou 4 fígados.", "§cNeeds 4 full blood bottles or 4 livers.", "§cNecesita 4 frascos de sangre llenos o 4 hígados.")
t("vc.weapon.drained", "§7Sua arma está perdendo poder. Recarregue-a no §5Altar de Recarga§7.", "§7Your weapon is losing power. Recharge it at the §5Recharging Altar§7.", "§7Tu arma pierde poder. Recárgala en el §5Altar de Recarga§7.")
t("vc.grinder.hint", "§7Precisa de §f4 carnes cruas§7 do mesmo tipo e §f1 garrafa de vidro§7.", "§7Needs §f4 raw meat§7 of the same kind and §f1 glass bottle§7.", "§7Necesita §f4 carnes crudas§7 del mismo tipo y §f1 botella de vidrio§7.")
t("vc.coffin.human", "§7Deitar num caixão? Melhor não...", "§7Lie down in a coffin? Better not...", "§7¿Acostarte en un ataúd? Mejor no...")
t("vc.coffin.spawn", "§7Ponto de renascimento definido.", "§7Respawn point set.", "§7Punto de reaparición establecido.")
t("vc.coffin.slept", "§7Você dormiu durante o dia. A noite chegou.", "§7You slept through the day. Night has come.", "§7Dormiste durante el día. Llegó la noche.")
t("vc.bite.garlic", "§cSangue com alho! Isso queima!", "§cGarlic blood! It burns!", "§c¡Sangre con ajo! ¡Quema!")
t("vc.blood.low", "§cSua sede está insuportável... morda alguém!", "§cYour thirst is unbearable... bite someone!", "§cTu sed es insoportable... ¡muerde a alguien!")
t("vc.bottle.human", "§7Eca... isso é sangue.", "§7Ugh... that's blood.", "§7Puaj... eso es sangre.")

# --- Werewolf ------------------------------------------------------------------------
t("vc.werewolf.forced", "§6A lua desperta a fera!", "§6The moon awakens the beast!", "§6¡La luna despierta a la bestia!")
t("vc.werewolf.full_moon_lock", "§6Na lua cheia a fera não pode ser contida!", "§6Under the full moon the beast can't be held back!", "§6¡Bajo la luna llena la bestia no puede contenerse!")
t("vc.werewolf.need_night", "§7Você só pode se transformar à noite.", "§7You can only transform at night.", "§7Solo puedes transformarte de noche.")
t("vc.werewolf.tier_up", "§6Sua fera evoluiu! Nova forma desbloqueada.", "§6Your beast evolved! New form unlocked.", "§6¡Tu bestia evolucionó! Nueva forma desbloqueada.")

# --- Hunter --------------------------------------------------------------------------
t("vc.hunter.menu.title", "Guilda dos Caçadores", "Hunters' Guild", "Gremio de Cazadores")
t("vc.hunter.menu.body", "§7Patente: §f%s§7   Pontos: §a%s", "§7Rank: §f%s§7   Points: §a%s", "§7Rango: §f%s§7   Puntos: §a%s")
t("vc.hunter.menu.deliver", "Entregar missão", "Turn in mission", "Entregar misión")
t("vc.hunter.menu.train", "Treinamento", "Training", "Entrenamiento")
t("vc.hunter.train.body", "§7Pontos disponíveis: §a%s§7. Cada missão concluída dá 1 ponto.", "§7Available points: §a%s§7. Every completed mission grants 1 point.", "§7Puntos disponibles: §a%s§7. Cada misión completada da 1 punto.")
t("vc.hunter.mission.current", "§eMissão:§f", "§eMission:§f", "§eMisión:§f")
t("vc.hunter.mission.deliver", "Entregue %s", "Deliver %s", "Entrega %s")
t("vc.hunter.mission.0", "Mate 3 vampiros", "Kill 3 vampires", "Mata 3 vampiros")
t("vc.hunter.mission.2", "Mate 3 lobisomens", "Kill 3 werewolves", "Mata 3 hombres lobo")
t("vc.hunter.mission.4", "Mate 5 vampiros adultos", "Kill 5 adult vampires", "Mata 5 vampiros adultos")
t("vc.hunter.mission.6", "Derrote um Lobisomem Alfa", "Defeat an Alpha Werewolf", "Derrota a un Hombre Lobo Alfa")
t("vc.hunter.mission.8", "Derrote uma Bruxa Vampira", "Defeat a Vampire Witch", "Derrota a una Bruja Vampira")
t("vc.hunter.mission.9", "Elimine 10 criaturas sobrenaturais", "Eliminate 10 supernatural creatures", "Elimina 10 criaturas sobrenaturales")
t("vc.hunter.mission_done.title", "§eMissão cumprida!", "§eMission complete!", "§e¡Misión cumplida!")
t("vc.hunter.mission_done.sub", "§7Patente §f%s§7 — +1 ponto de treino", "§7Rank §f%s§7 — +1 training point", "§7Rango §f%s§7 — +1 punto de entrenamiento")
t("vc.hunter.all_done", "§6Você completou todas as missões. Lenda viva!", "§6You completed every mission. A living legend!", "§6Completaste todas las misiones. ¡Una leyenda viva!")
t("vc.hunter.is_kill_mission", "§7Esta missão é de caça — ela se completa sozinha.", "§7This is a hunting mission — it completes by itself.", "§7Esta misión es de caza — se completa sola.")
t("vc.hunter.missing_items", "§cVocê ainda não tem os itens da missão.", "§cYou don't have the mission items yet.", "§cAún no tienes los objetos de la misión.")
t("vc.hunter.delivered", "§aEntrega aceita!", "§aDelivery accepted!", "§a¡Entrega aceptada!")
t("vc.hunter.progress", "§eMissão: §f%s/%s", "§eMission: §f%s/%s", "§eMisión: §f%s/%s")
t("vc.hunter.no_points", "§cSem pontos de treino. Complete missões!", "§cNo training points. Complete missions!", "§cSin puntos de entrenamiento. ¡Completa misiones!")
t("vc.hunter.stat_max", "§7Este atributo já está no máximo.", "§7This attribute is already maxed.", "§7Este atributo ya está al máximo.")
t("vc.hunter.stat_up", "§aAtributo melhorado!", "§aAttribute improved!", "§a¡Atributo mejorado!")
t("vc.hunter.stat.vital", "Vitalidade", "Vitality", "Vitalidad")
t("vc.hunter.stat.agility", "Agilidade", "Agility", "Agilidad")
t("vc.hunter.stat.combat", "Combate", "Combat", "Combate")
t("vc.hunter.stat.vital.desc", "+2 corações por ponto", "+2 hearts per point", "+2 corazones por punto")
t("vc.hunter.stat.agility.desc", "Mais velocidade e pulo", "More speed and jump", "Más velocidad y salto")
t("vc.hunter.stat.combat.desc", "+1 de dano contra sobrenaturais", "+1 damage against supernaturals", "+1 de daño contra sobrenaturales")
t("vc.hunter.only_hunters", "§7Só caçadores sabem usar este arco.", "§7Only hunters know how to use this bow.", "§7Solo los cazadores saben usar este arco.")
t("vc.hunter.no_arrows", "§cVocê não tem flechas.", "§cYou have no arrows.", "§cNo tienes flechas.")
t("vc.trainer.human", "§e[Mestre]§f Quer caçar monstros? Injete uma §eSeringa de Alho§f e volte a falar comigo.",
  "§e[Master]§f Want to hunt monsters? Inject a §eGarlic Syringe§f and talk to me again.",
  "§e[Maestro]§f ¿Quieres cazar monstruos? Inyéctate una §eJeringa de Ajo§f y vuelve a hablarme.")
t("vc.trainer.monster", "§e[Mestre]§f Afaste-se, criatura!", "§e[Master]§f Stay back, creature!", "§e[Maestro]§f ¡Atrás, criatura!")

# --- Blood moon ------------------------------------------------------------------------
t("vc.bloodmoon.title", "§4LUA DE SANGUE", "§4BLOOD MOON", "§4LUNA DE SANGRE")
t("vc.bloodmoon.sub", "§cAs criaturas da noite estão mais fortes...", "§cThe creatures of the night grow stronger...", "§cLas criaturas de la noche se fortalecen...")
t("vc.bloodmoon.end", "§7A Lua de Sangue se pôs.", "§7The Blood Moon has set.", "§7La Luna de Sangre se ha puesto.")
t("vc.bloodmoon.ambush", "§cVampiros sentiram seu cheiro!", "§cVampires caught your scent!", "§c¡Los vampiros olieron tu rastro!")

# --- Eyes / settings / admin --------------------------------------------------------------
t("vc.eyes.title", "Olhos Vampíricos", "Vampire Eyes", "Ojos Vampíricos")
t("vc.eyes.body", "§7Escolha a cor dos seus olhos.", "§7Choose your eye colour.", "§7Elige el color de tus ojos.")
t("vc.eyes.1", "Carmesim", "Crimson", "Carmesí")
t("vc.eyes.2", "Dourado", "Golden", "Dorado")
t("vc.eyes.3", "Violeta", "Violet", "Violeta")
t("vc.eyes.4", "Sangue", "Blood", "Sangre")
t("vc.eyes.none", "Sem brilho", "No glow", "Sin brillo")
t("vc.settings.title", "Configurações", "Settings", "Ajustes")
t("vc.settings.hud", "Mostrar HUD do Vampire Craft", "Show Vampire Craft HUD", "Mostrar HUD de Vampire Craft")
t("vc.settings.saved", "§aConfigurações salvas.", "§aSettings saved.", "§aAjustes guardados.")
t("vc.admin.title", "Configurações do Mundo", "World Settings", "Ajustes del Mundo")
t("vc.admin.sun", "Sol queima vampiros", "Sun burns vampires", "El sol quema a los vampiros")
t("vc.admin.infection", "Chance de infecção por mordida (%)", "Bite infection chance (%)", "Probabilidad de infección por mordisco (%)")
t("vc.admin.bloodmoon", "Lua de Sangue", "Blood Moon", "Luna de Sangre")
t("vc.admin.bloodmoon_chance", "Chance da lua cheia virar Lua de Sangue (%)", "Chance a full moon becomes a Blood Moon (%)", "Probabilidad de que la luna llena sea de Sangre (%)")
t("vc.admin.ambush", "Emboscadas de vampiros à noite", "Vampire ambushes at night", "Emboscadas de vampiros de noche")
t("vc.admin.book", "Dar o Codex aos novos jogadores", "Give the Codex to new players", "Dar el Códice a jugadores nuevos")
t("vc.admin.done", "§7Comando §f%s§7 executado (%s, nível %s).", "§7Command §f%s§7 done (%s, level %s).", "§7Comando §f%s§7 ejecutado (%s, nivel %s).")

# --- Status ---------------------------------------------------------------------------------
t("vc.status.faction", "§7Raça:", "§7Race:", "§7Raza:")
t("vc.status.level", "§7Nível:", "§7Level:", "§7Nivel:")
t("vc.status.xp", "§7Experiência:", "§7Experience:", "§7Experiencia:")
t("vc.status.blood", "§7Sangue:", "§7Blood:", "§7Sangre:")
t("vc.status.tier", "§7Forma:", "§7Form:", "§7Forma:")
t("vc.status.points", "§7Pontos de treino:", "§7Training points:", "§7Puntos de entrenamiento:")
t("vc.status.skills", "§7Habilidades:", "§7Skills:", "§7Habilidades:")

# --- Codex ----------------------------------------------------------------------------------
t("vc.codex.title", "§4Codex Vampire Craft", "§4Vampire Craft Codex", "§4Códice Vampire Craft")
t("vc.codex.intro", "§7Tudo que você precisa saber sobre vampiros, lobisomens e caçadores.", "§7Everything you need to know about vampires, werewolves and hunters.", "§7Todo lo que necesitas saber sobre vampiros, hombres lobo y cazadores.")
t("vc.codex.version", "§8Versão %s", "§8Version %s", "§8Versión %s")
for k, v in {"status": ("Meu Status", "My Status", "Mi Estado"), "vampire": ("Vampiros", "Vampires", "Vampiros"), "werewolf": ("Lobisomens", "Werewolves", "Hombres Lobo"),
             "hunter": ("Caçadores", "Hunters", "Cazadores"), "items": ("Itens e Blocos", "Items & Blocks", "Objetos y Bloques"), "world": ("O Mundo", "The World", "El Mundo"),
             "settings": ("Configurações", "Settings", "Ajustes"), "admin": ("§cAdministração", "§cAdministration", "§cAdministración")}.items():
    t(f"vc.codex.page.{k}", *v)


def page(topic, sub, title, p1, p2):
    t(f"vc.codex.{topic}.{sub}.title", *title)
    t(f"vc.codex.{topic}.{sub}.1", *p1)
    t(f"vc.codex.{topic}.{sub}.2", *p2)


t("vc.codex.vampire.intro", "§7Criaturas imortais da noite, movidas por sangue.", "§7Immortal creatures of the night, driven by blood.", "§7Criaturas inmortales de la noche, movidas por la sangre.")
page("vampire", "become", ("Como virar vampiro", "Becoming a vampire", "Cómo ser vampiro"),
     ("Use uma §fPresa de Vampiro§r (dropada por vampiros) ou seja mordido por um jogador vampiro.", "Use a §fVampire Fang§r (dropped by vampires) or get bitten by a vampire player.", "Usa un §fColmillo de Vampiro§r (lo sueltan los vampiros) o deja que un jugador vampiro te muerda."),
     ("A transformação leva 5 minutos e traz fome e fraqueza. Beba §fleite§r para cancelar.", "The change takes 5 minutes and brings hunger and weakness. Drink §fmilk§r to cancel.", "El cambio tarda 5 minutos y trae hambre y debilidad. Bebe §fleche§r para cancelarlo."))
page("vampire", "blood", ("Sangue", "Blood", "Sangre"),
     ("Vampiros não sentem fome: eles precisam de §csangue§r (gotas na barra de status). Com sangue alto você regenera; com sangue baixo fica lento e fraco.", "Vampires don't get hungry: they need §cblood§r (drops in the status bar). High blood regenerates you; low blood makes you slow and weak.", "Los vampiros no tienen hambre: necesitan §csangre§r (gotas en la barra). Con mucha sangre te regeneras; con poca te vuelves lento y débil."),
     ("Sem sangue você começa a morrer. Beba §cFrascos de Sangue§r ou morda criaturas.", "With no blood you start dying. Drink §cBlood Bottles§r or bite creatures.", "Sin sangre empiezas a morir. Bebe §cFrascos de Sangre§r o muerde criaturas."))
page("vampire", "bite", ("Morder", "Biting", "Morder"),
     ("§fAgache e ataque§r um animal, aldeão ou humano para mordê-lo. O ícone de presas aparece no HUD quando o alvo está ao alcance.", "§fSneak and attack§r an animal, villager or human to bite it. A fangs icon appears on the HUD when a target is in range.", "§fAgáchate y ataca§r a un animal, aldeano o humano para morderlo. Un icono de colmillos aparece en el HUD cuando hay objetivo."),
     ("Segurando uma §fgarrafa de vidro§r, a mordida enche frascos em vez de beber. Cuidado: caçadores têm alho no sangue!", "Holding a §fglass bottle§r, bites fill bottles instead of drinking. Careful: hunters have garlic in their blood!", "Con una §fbotella de vidrio§r, el mordisco llena frascos en vez de beber. ¡Cuidado: los cazadores tienen ajo en la sangre!"))
page("vampire", "sun", ("Sol e água", "Sun and water", "Sol y agua"),
     ("Sob o sol direto você queima. Vampiros jovens sofrem mais; anciões resistem. Um capacete, a chuva ou um teto te protegem.", "Under direct sunlight you burn. Young vampires suffer more; elders resist. A helmet, rain or a roof protects you.", "Bajo el sol directo te quemas. Los vampiros jóvenes sufren más; los ancianos resisten. Un casco, la lluvia o un techo te protegen."),
     ("A água corrente te fere, a menos que você tenha §fPele Impermeável§r. Durma num §fcaixão§r para pular o dia.", "Running water hurts you unless you have §fWaterproof Skin§r. Sleep in a §fcoffin§r to skip the day.", "El agua te hiere salvo que tengas §fPiel Impermeable§r. Duerme en un §fataúd§r para saltarte el día."))
page("vampire", "skills", ("Habilidades", "Skills", "Habilidades"),
     ("Desperte poderes no §4Altar de Sangue§r: encha-o com 10 frascos cheios (ou fígados) e ofereça uma Presa de Vampiro.", "Awaken powers at the §4Blood Altar§r: fill it with 10 full bottles (or livers) and offer a Vampire Fang.", "Despierta poderes en el §4Altar de Sangre§r: llénalo con 10 frascos llenos (o hígados) y ofrece un Colmillo de Vampiro."),
     ("Use o §4Cálice de Sangue§r para lançar. §fAgache + use§r lança a habilidade selecionada instantaneamente — ideal no celular.", "Use the §4Blood Chalice§r to cast. §fSneak + use§r casts the selected skill instantly — great on mobile.", "Usa el §4Cáliz de Sangre§r para lanzar. §fAgáchate + usa§r lanza la habilidad seleccionada al instante — ideal en móvil."))
page("vampire", "level", ("Níveis", "Levels", "Niveles"),
     ("Você ganha experiência ao morder. São 10 níveis; cada um libera novos poderes no altar e fortalece seu corpo.", "You earn experience by biting. There are 10 levels; each unlocks new powers at the altar and strengthens your body.", "Ganas experiencia al morder. Hay 10 niveles; cada uno desbloquea poderes en el altar y fortalece tu cuerpo."),
     ("Nível 3: velocidade. Nível 4: força à noite. Nível 5: mais vida. Nível 8: força II à noite. Nível 9: vida extra. Nível 10: o sol só te incendeia, sem dano extra.", "Level 3: speed. Level 4: strength at night. Level 5: more health. Level 8: strength II at night. Level 9: extra health. Level 10: the sun only sets you on fire, no extra damage.", "Nivel 3: velocidad. Nivel 4: fuerza de noche. Nivel 5: más vida. Nivel 8: fuerza II de noche. Nivel 9: vida extra. Nivel 10: el sol solo te prende fuego, sin daño extra."))

t("vc.codex.werewolf.intro", "§7Humanos amaldiçoados pela lua.", "§7Humans cursed by the moon.", "§7Humanos malditos por la luna.")
page("werewolf", "become", ("Como virar lobisomem", "Becoming a werewolf", "Cómo ser hombre lobo"),
     ("Use uma §fPresa de Lobisomem§r (dropada por lobisomens). A transformação leva 5 minutos — leite cancela.", "Use a §fWerewolf Fang§r (dropped by werewolves). The change takes 5 minutes — milk cancels it.", "Usa un §fColmillo de Hombre Lobo§r (lo sueltan los hombres lobo). El cambio tarda 5 minutos — la leche lo cancela."),
     ("Como lobisomem você continua precisando de comida, e na forma de fera a fome aumenta.", "As a werewolf you still need food, and the beast form makes you hungrier.", "Como hombre lobo sigues necesitando comida, y la forma de bestia te da más hambre."))
page("werewolf", "form", ("A forma de fera", "The beast form", "La forma de bestia"),
     ("Ao anoitecer você se transforma. Use §fTransformação§r no Totem da Lua para alternar. Na §flua cheia§r a fera não pode ser contida.", "At dusk you transform. Use §fTransformation§r on the Moon Totem to toggle. Under a §ffull moon§r the beast can't be held back.", "Al anochecer te transformas. Usa §fTransformación§r en el Tótem Lunar para alternar. Con §fluna llena§r la bestia no se contiene."),
     ("Na forma de fera você é rápido, salta alto, bate forte e enxerga no escuro. Ao amanhecer volta a ser humano.", "In beast form you're fast, jump high, hit hard and see in the dark. At dawn you return to human.", "En forma de bestia eres rápido, saltas alto, golpeas fuerte y ves en la oscuridad. Al amanecer vuelves a ser humano."))
page("werewolf", "tiers", ("Evolução da fera", "Beast evolution", "Evolución de la bestia"),
     ("Sua fera tem 3 formas (I, II, III), liberadas nos níveis 1, 4 e 8. Cada forma muda sua aparência e poder.", "Your beast has 3 forms (I, II, III), unlocked at levels 1, 4 and 8. Each form changes your look and power.", "Tu bestia tiene 3 formas (I, II, III), desbloqueadas en los niveles 1, 4 y 8. Cada forma cambia tu aspecto y poder."),
     ("Derrotar lobisomens mais fortes pode despertar a próxima forma antes da hora.", "Defeating stronger werewolves may awaken the next form early.", "Derrotar hombres lobo más fuertes puede despertar la siguiente forma antes."))
page("werewolf", "skills", ("Habilidades", "Skills", "Habilidades"),
     ("Encha o §4Altar de Sangue§r e ofereça uma Presa de Lobisomem para despertar poderes como Uivo, Investida e Golpe Brutal.", "Fill the §4Blood Altar§r and offer a Werewolf Fang to awaken powers like Howl, Lunge and Brutal Blow.", "Llena el §4Altar de Sangre§r y ofrece un Colmillo de Hombre Lobo para despertar poderes como Aullido, Embestida y Golpe Brutal."),
     ("§fAgache + use§r o Totem da Lua lança a habilidade selecionada sem abrir o menu.", "§fSneak + use§r the Moon Totem to cast the selected skill without the menu.", "§fAgáchate + usa§r el Tótem Lunar para lanzar la habilidad seleccionada sin menú."))
page("werewolf", "level", ("Níveis", "Levels", "Niveles"),
     ("Ganhe experiência caçando — muito mais na forma de fera. Criaturas sobrenaturais valem mais.", "Earn experience by hunting — much more in beast form. Supernatural creatures are worth more.", "Gana experiencia cazando — mucho más en forma de bestia. Las criaturas sobrenaturales valen más."),
     ("A partir do nível 3 você fica mais rápido à noite mesmo na forma humana.", "From level 3 you are faster at night even in human form.", "Desde el nivel 3 eres más rápido de noche incluso en forma humana."))

t("vc.codex.hunter.intro", "§7Humanos que juraram limpar o mundo das trevas.", "§7Humans sworn to cleanse the world of darkness.", "§7Humanos que juraron limpiar el mundo de la oscuridad.")
page("hunter", "become", ("Como virar caçador", "Becoming a hunter", "Cómo ser cazador"),
     ("Fabrique uma §fSeringa§r (vidro + ferro) e combine com §fAlho§r para criar a §eSeringa de Alho§r. Use-a para fazer o juramento.", "Craft a §fSyringe§r (glass + iron) and combine it with §fGarlic§r to make a §eGarlic Syringe§r. Use it to take the oath.", "Fabrica una §fJeringa§r (vidrio + hierro) y combínala con §fAjo§r para crear la §eJeringa de Ajo§r. Úsala para jurar."),
     ("Alho cresce em plantações (plante em terra arada) e aparece em baús de vilas e masmorras.", "Garlic grows on farmland and is found in village and dungeon chests.", "El ajo crece en tierra arada y aparece en cofres de aldeas y mazmorras."))
page("hunter", "missions", ("Missões", "Missions", "Misiones"),
     ("Cada patente exige uma missão: caçar criaturas ou entregar relíquias. Missões de caça se completam sozinhas.", "Each rank requires a mission: hunt creatures or deliver relics. Hunting missions complete by themselves.", "Cada rango exige una misión: cazar criaturas o entregar reliquias. Las de caza se completan solas."),
     ("Fale com o §eMestre Caçador§r ou use a Insígnia para entregar relíquias. Cada missão dá recompensas e 1 ponto de treino.", "Talk to the §eHunter Master§r or use the Insignia to deliver relics. Every mission gives rewards and 1 training point.", "Habla con el §eMaestro Cazador§r o usa la Insignia para entregar reliquias. Cada misión da recompensas y 1 punto."))
page("hunter", "stats", ("Treinamento", "Training", "Entrenamiento"),
     ("§fVitalidade§r aumenta a vida, §fAgilidade§r a velocidade e o pulo e §fCombate§r o dano contra vampiros e lobisomens.", "§fVitality§r raises health, §fAgility§r speed and jump, and §fCombat§r damage against vampires and werewolves.", "§fVitalidad§r aumenta la vida, §fAgilidad§r la velocidad y el salto, y §fCombate§r el daño contra vampiros y hombres lobo."),
     ("Cada atributo vai até 8. Escolha bem: são 10 missões no total.", "Each attribute goes up to 8. Choose wisely: there are 10 missions in total.", "Cada atributo llega a 8. Elige bien: hay 10 misiones en total."))
page("hunter", "bow", ("Arco do Caçador", "Hunter's Bow", "Arco del Cazador"),
     ("Atira flechas abençoadas rápidas (gasta flechas normais). Elas queimam criaturas sobrenaturais.", "Shoots fast blessed arrows (uses normal arrows). They burn supernatural creatures.", "Dispara flechas benditas rápidas (usa flechas normales). Queman a las criaturas sobrenaturales."),
     ("Só caçadores sabem usá-lo. Toque e segure para atirar.", "Only hunters can use it. Tap and hold to shoot.", "Solo los cazadores saben usarlo. Mantén pulsado para disparar."))
page("hunter", "skills", ("Habilidades", "Skills", "Habilidades"),
     ("§fSentido do Caçador§r (patente 2) revela sobrenaturais próximos. §fProteção Divina§r (patente 5) cria uma aura sagrada.", "§fHunter's Sense§r (rank 2) reveals nearby supernaturals. §fDivine Protection§r (rank 5) creates a holy aura.", "§fSentido del Cazador§r (rango 2) revela sobrenaturales cercanos. §fProtección Divina§r (rango 5) crea un aura sagrada."),
     ("§fExplosão Sagrada§r (patente 8) queima tudo que é sobrenatural ao redor.", "§fHoly Burst§r (rank 8) burns everything supernatural around you.", "§fExplosión Sagrada§r (rango 8) quema todo lo sobrenatural a tu alrededor."))

t("vc.codex.items.intro", "§7Ferramentas, armas e blocos.", "§7Tools, weapons and blocks.", "§7Herramientas, armas y bloques.")
page("items", "altar", ("Altar de Sangue", "Blood Altar", "Altar de Sangre"),
     ("Enche-se com 10 frascos de sangue cheios ou fígados de lobisomem. Cheio, aceite a oferenda da sua raça.", "Fills up with 10 full blood bottles or werewolf livers. When full, it accepts your race's offering.", "Se llena con 10 frascos llenos o hígados de hombre lobo. Lleno, acepta la ofrenda de tu raza."),
     ("Cada skill custa corações humanos e sangue de vampiro (dropados por caçadores e vampiros) e exige um nível mínimo.", "Each skill costs human hearts and vampire blood (dropped by hunters and vampires) and requires a minimum level.", "Cada habilidad cuesta corazones humanos y sangre de vampiro (de cazadores y vampiros) y exige un nivel mínimo."))
page("items", "recharge", ("Armas de sangue", "Blood weapons", "Armas de sangre"),
     ("A §dEspada Vampírica§r e as §6Garras§r perdem força com o uso (sedenta → seca).", "The §dVampiric Sword§r and the §6Claws§r lose power with use (thirsty → drained).", "La §dEspada Vampírica§r y las §6Garras§r pierden fuerza con el uso (sedienta → seca)."),
     ("Recarregue no §5Altar de Recarga§r com 4 frascos cheios ou 4 fígados. Encantamentos e nomes são mantidos.", "Recharge at the §5Recharging Altar§r with 4 full bottles or 4 livers. Enchantments and names are kept.", "Recárgalas en el §5Altar de Recarga§r con 4 frascos llenos o 4 hígados. Se conservan encantamientos y nombres."))
page("items", "grinder", ("Moedor de Carne", "Meat Grinder", "Picadora de Carne"),
     ("4 carnes cruas iguais + 1 garrafa de vidro = 1 frasco de sangue cheio.", "4 identical raw meats + 1 glass bottle = 1 full blood bottle.", "4 carnes crudas iguales + 1 botella de vidrio = 1 frasco lleno."),
     ("Uma forma pacífica de se alimentar sem caçar.", "A peaceful way to feed without hunting.", "Una forma pacífica de alimentarse sin cazar."))
page("items", "coffin", ("Caixão", "Coffin", "Ataúd"),
     ("Vampiros e lobisomens podem usá-lo como cama: define seu ponto de renascimento.", "Vampires and werewolves can use it as a bed: it sets your respawn point.", "Vampiros y hombres lobo pueden usarlo como cama: fija tu punto de reaparición."),
     ("Usado durante o dia, você dorme até a noite.", "Used during the day, you sleep until night.", "Si lo usas de día, duermes hasta la noche."))
page("items", "cures", ("Curas", "Cures", "Curas"),
     ("§dCura do Vampirismo§r e §dCura da Licantropia§r devolvem sua humanidade (você perde nível e habilidades).", "§dVampirism Cure§r and §dLycanthropy Cure§r restore your humanity (you lose levels and skills).", "La §dCura del Vampirismo§r y la §dCura de la Licantropía§r te devuelven la humanidad (pierdes niveles y habilidades)."),
     ("A §bÁgua Filosofal§r (Pedra Filosofal + poção no suporte de poções) cura qualquer condição.", "§bPhilosopher's Water§r (Philosopher's Stone + potion in a brewing stand) cures any condition.", "El §bAgua Filosofal§r (Piedra Filosofal + poción en el soporte) cura cualquier condición."))
page("items", "armor", ("Armadura do Eclipse", "Eclipse Armor", "Armadura del Eclipse"),
     ("Feita com lingotes de Pedra do Sol e da Lua, minérios encontrados no subsolo.", "Made from Sunstone and Moonstone ingots, ores found underground.", "Hecha con lingotes de Piedra Solar y Lunar, menas del subsuelo."),
     ("Vampiros com capacete sofrem bem menos com o sol.", "Vampires wearing a helmet suffer much less from the sun.", "Los vampiros con casco sufren mucho menos el sol."))

t("vc.codex.world.intro", "§7Eventos, lugares e criaturas.", "§7Events, places and creatures.", "§7Eventos, lugares y criaturas.")
page("world", "bloodmoon", ("Lua de Sangue", "Blood Moon", "Luna de Sangre"),
     ("Algumas luas cheias se tornam §4Luas de Sangue§r: o céu fica vermelho, monstros ficam mais fortes e vampiros emboscam humanos.", "Some full moons become §4Blood Moons§r: the sky turns red, monsters get stronger and vampires ambush humans.", "Algunas lunas llenas se vuelven §4Lunas de Sangre§r: el cielo se tiñe de rojo, los monstruos se fortalecen y los vampiros emboscan."),
     ("Vampiros e lobisomens ficam muito mais poderosos durante o evento.", "Vampires and werewolves become much stronger during the event.", "Vampiros y hombres lobo se vuelven mucho más fuertes durante el evento."))
page("world", "structures", ("Estruturas", "Structures", "Estructuras"),
     ("Procure §ftorres vampíricas§r, §facampamentos e casas de caçadores§r e §fcemitérios§r pelo mundo.", "Look for §fvampire towers§r, §fhunter camps and houses§r and §fgraveyards§r across the world.", "Busca §ftorres vampíricas§r, §fcampamentos y casas de cazadores§r y §fcementerios§r por el mundo."),
     ("Elas guardam baús com relíquias raras.", "They hold chests with rare relics.", "Guardan cofres con reliquias raras."))
page("world", "mobs", ("Criaturas", "Creatures", "Criaturas"),
     ("Vampiros queimam no sol e, feridos, viram morcegos para fugir. Lobisomens caçam à noite e somem ao amanhecer.", "Vampires burn in the sun and, when wounded, turn into bats to escape. Werewolves hunt at night and vanish at dawn.", "Los vampiros arden al sol y, heridos, se convierten en murciélagos para huir. Los hombres lobo cazan de noche y desaparecen al amanecer."),
     ("Mortos-vivos ignoram vampiros e lobisomens. Golens de ferro os atacam.", "Undead ignore vampires and werewolves. Iron golems attack them.", "Los no-muertos ignoran a vampiros y hombres lobo. Los gólems de hierro los atacan."))
page("world", "commands", ("Comandos", "Commands", "Comandos"),
     ("/function sunrise/transvp, /translb, /transhunter — transformam. /function sunrise/removevp — cura. /function sunrise/bloodmoon — Lua de Sangue.", "/function sunrise/transvp, /translb, /transhunter — transform. /function sunrise/removevp — cure. /function sunrise/bloodmoon — Blood Moon.", "/function sunrise/transvp, /translb, /transhunter — transforman. /function sunrise/removevp — cura. /function sunrise/bloodmoon — Luna de Sangre."),
     ("Avançado: /scriptevent vc:level 10, vc:blood 20, vc:skills all, vc:infect vampire. Dê a tag §fvc_admin§r para acessar a Administração.", "Advanced: /scriptevent vc:level 10, vc:blood 20, vc:skills all, vc:infect vampire. Give the §fvc_admin§r tag to access Administration.", "Avanzado: /scriptevent vc:level 10, vc:blood 20, vc:skills all, vc:infect vampire. Da la etiqueta §fvc_admin§r para acceder a Administración."))
