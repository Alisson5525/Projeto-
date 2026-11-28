"""Generates packs/JJK_RP/texts/pt_BR.lang and en_US.lang from one table so
both languages always have the same keys. Run: python3 -I tools/gen_lang.py"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# key: (pt_BR, en_US)
T = {
    "pack.name": ("Jujutsu Kaisen: Ilimitado", "Jujutsu Kaisen: Limitless"),
    "pack.description": ("Porte do mod My Jujutsu Kaisen para Bedrock", "Port of the My Jujutsu Kaisen mod to Bedrock"),
    "item.jjk:limitless.name": ("§bTécnica Inata: Ilimitado", "§bInnate Technique: Limitless"),
    "item.jjk:six_eyes.name": ("§dSeis Olhos", "§dSix Eyes"),
    # progress / combat
    "jjk.progress.level_up": ("§bNível Jujutsu %s §7· §a+%s pontos de atributo", "§bJujutsu Level %s §7· §a+%s stat points"),
    "jjk.progress.xp_gain": ("§b+%s XP Jujutsu §7(%s/%s)", "§b+%s Jujutsu XP §7(%s/%s)"),
    "jjk.progress.skill_level": ("§cRequer Nível Jujutsu %s", "§cRequires Jujutsu Level %s"),
    "jjk.progress.need_rct": ("§cRequer Nv. %s e a Técnica Amaldiçoada Reversa", "§cRequires Lv. %s and Reverse Cursed Technique"),
    "jjk.progress.need_red": ("§cRequer Nv. %s e o Vermelho", "§cRequires Lv. %s and Red"),
    "jjk.combat.no_energy": ("§cEnergia amaldiçoada insuficiente", "§cNot enough cursed energy"),
    "jjk.combat.cooldown": ("§7Recarregando: %s s", "§7Cooling down: %s s"),
    "jjk.combat.on": ("§bModo de combate", "§bCombat mode"),
    "jjk.combat.off": ("§7Modo de combate desligado", "§7Combat mode off"),
    "jjk.combat.need_technique": ("§cEscolha uma técnica primeiro", "§cChoose a technique first"),
    "jjk.combat.awakening_over": ("§7O Despertar terminou", "§7Awakening ended"),
    # menu
    "jjk.menu.title": ("Menu Jujutsu", "Jujutsu Menu"),
    "jjk.menu.body": (
        "§bNível %s§r  ·  XP %s/%s\n§3Energia amaldiçoada§r %s/%s\n§ePontos disponíveis: %s",
        "§bLevel %s§r  ·  XP %s/%s\n§3Cursed energy§r %s/%s\n§eAvailable points: %s",
    ),
    "jjk.menu.stats": ("Atributos", "Stats"),
    "jjk.menu.innate": ("Técnica Inata", "Innate Technique"),
    "jjk.menu.learned": ("Técnicas Aprendidas", "Learned Techniques"),
    "jjk.menu.settings": ("Configurações", "Settings"),
    "jjk.menu.combat_enter": ("Entrar no modo de combate", "Enter combat mode"),
    "jjk.menu.combat_leave": ("Sair do modo de combate", "Leave combat mode"),
    "jjk.menu.help": ("Como jogar", "How to play"),
    "jjk.menu.close": ("Fechar", "Close"),
    "jjk.menu.back": ("← Voltar", "← Back"),
    # stats
    "jjk.stats.title": ("Atributos do Feiticeiro", "Sorcerer Stats"),
    "jjk.stats.body": (
        "Nível %s · §e%s§r de %s pontos livres\n\n§cVitalidade %s§r: +%s de vida máx. · -%s%% de dano recebido\n§6Força %s§r: +%s de ataque · +%s%% de dano físico\n§bEnergia %s§r: %s de energia máx. · +%s%% de dano de técnicas\n\n§7Toque para investir 1 ponto.",
        "Level %s · §e%s§r of %s points free\n\n§cVitality %s§r: +%s max health · -%s%% damage taken\n§6Strength %s§r: +%s attack · +%s%% physical damage\n§bEnergy %s§r: %s max energy · +%s%% technique damage\n\n§7Tap to invest 1 point.",
    ),
    "jjk.stats.vit": ("Vitalidade (%s/%s)", "Vitality (%s/%s)"),
    "jjk.stats.str": ("Força (%s/%s)", "Strength (%s/%s)"),
    "jjk.stats.ce": ("Energia Amaldiçoada (%s/%s)", "Cursed Energy (%s/%s)"),
    "jjk.stats.remove": ("Remover ponto", "Remove point"),
    "jjk.stats.sliders": ("Redistribuir pontos", "Redistribute points"),
    "jjk.stats.sliders_title": ("Redistribuir pontos", "Redistribute points"),
    "jjk.stats.too_many": ("§cVocê só tem %s pontos no total", "§cYou only have %s points in total"),
    # innate
    "jjk.innate.title": ("Técnica Inata · Ilimitado", "Innate Technique · Limitless"),
    "jjk.innate.body": (
        "No modo de combate, os slots 1 a 6 da hotbar lançam as técnicas. Slot 7 esquiva, slot 8 cura com a Técnica Reversa.",
        "In combat mode, hotbar slots 1 to 6 cast the techniques. Slot 7 dodges, slot 8 heals with the Reverse Technique.",
    ),
    "jjk.innate.awakened": ("Ver técnicas do Despertar", "Show Awakening techniques"),
    "jjk.innate.normal": ("Ver técnicas normais", "Show normal techniques"),
    "jjk.innate.locked": ("§c[ Bloqueado ]", "§c[ Locked ]"),
    "jjk.innate.unlocked": ("§a[ Desbloqueado ]", "§a[ Unlocked ]"),
    "jjk.innate.six_eyes": ("Seis Olhos · sem custo · a recuperação de energia pausa enquanto ativo", "Six Eyes · no cost · energy recovery pauses while active"),
    # learned
    "jjk.learned.title": ("Técnicas Aprendidas", "Learned Techniques"),
    "jjk.learned.body": ("Treine técnicas que não dependem da sua técnica inata.", "Train techniques that do not depend on your innate technique."),
    "jjk.learned.rct": ("Técnica Amaldiçoada Reversa", "Reverse Cursed Technique"),
    "jjk.learned.rct_learned": ("§aAprendida", "§aLearned"),
    "jjk.learned.rct_available": ("§eTeste disponível", "§eTrial available"),
    "jjk.learned.rct_locked": ("§cTreino a partir do Nv. %s", "§cTraining from Lv. %s"),
    "jjk.learned.rct_info": ("Cura até %s corações por %s de energia.", "Heal up to %s hearts for %s cursed energy."),
    "jjk.learned.black_flash": ("Raio Negro", "Black Flash"),
    "jjk.learned.simple_domain": ("Domínio Simples", "Simple Domain"),
    "jjk.learned.planned": ("em desenvolvimento", "in development"),
    # trial
    "jjk.trial.start": ("Iniciar Teste de Reversão", "Start Reversal Trial"),
    "jjk.trial.body": (
        "§bTeste de Reversão:§r agache para carregar e levante na zona verde. Acerte 2 de 3 pulsos. Não se mova!",
        "§bReversal Trial:§r sneak to charge and stand up in the green zone. Land 2 of 3 pulses. Do not move!",
    ),
    "jjk.trial.pulse": ("Pulso %s / %s", "Pulse %s / %s"),
    "jjk.trial.hold": ("Agache para carregar", "Sneak to charge"),
    "jjk.trial.release": ("Levante na zona verde!", "Stand up in the green zone!"),
    "jjk.trial.hit": ("§aAcerto!", "§aHit!"),
    "jjk.trial.miss": ("§cErrou", "§cMiss"),
    "jjk.trial.passed": ("§aVocê aprendeu a Técnica Amaldiçoada Reversa!", "§aYou learned the Reverse Cursed Technique!"),
    "jjk.trial.failed": ("§cTeste falhou. Tente de novo.", "§cTrial failed. Try again."),
    "jjk.trial.interrupted": ("§cTeste interrompido", "§cTrial interrupted"),
    # settings
    "jjk.settings.title": ("Configurações", "Settings"),
    "jjk.settings.sfx": ("Efeitos sonoros", "Sound effects"),
    "jjk.settings.voice": ("Vozes", "Voices"),
    "jjk.settings.music": ("Música", "Music"),
    "jjk.settings.cam_dist": ("Distância da câmera de combate", "Combat camera distance"),
    "jjk.settings.cam_near": ("Perto", "Near"),
    "jjk.settings.cam_normal": ("Normal", "Normal"),
    "jjk.settings.cam_far": ("Longe", "Far"),
    "jjk.settings.cam_left": ("Câmera no ombro esquerdo", "Camera over the left shoulder"),
    "jjk.settings.slot_numbers": ("Números nos slots do HUD", "Slot numbers on the HUD"),
    "jjk.settings.perf": ("Desempenho (efeitos e destruição)", "Performance (effects and destruction)"),
    "jjk.settings.perf_low": ("Leve (celular fraco)", "Light (weak phone)"),
    "jjk.settings.perf_mid": ("Médio", "Medium"),
    "jjk.settings.perf_high": ("Alto (igual ao Java)", "High (same as Java)"),
    "jjk.settings.terrain": ("Destruição de terreno", "Terrain destruction"),
    "jjk.settings.terrain_off": ("Desligada", "Off"),
    "jjk.settings.terrain_light": ("Leve", "Light"),
    "jjk.settings.terrain_full": ("Completa (igual ao Java)", "Full (same as Java)"),
    "jjk.settings.world_only_op": ("§7(só operador)", "§7(operator only)"),
    "jjk.settings.saved": ("Salvar", "Save"),
    # technique choice
    "jjk.choose.title": ("Escolha sua técnica inata", "Choose your innate technique"),
    "jjk.choose.body": (
        "As cartas foram lançadas. Uma técnica amaldiçoada desperta em você.\n\n§bIlimitado§r — o controle do espaço através do infinito: Infinito, Azul, Vermelho e Roxo.",
        "The cards have been dealt. A cursed technique awakens within you.\n\n§bLimitless§r — control of space through infinity: Infinity, Blue, Red and Purple.",
    ),
    "jjk.choose.limitless": ("Ilimitado", "Limitless"),
    "jjk.choose.done": ("§bIlimitado", "§bLimitless"),
    "jjk.choose.done_sub": ("§7Use o item da técnica para entrar em combate", "§7Use the technique item to enter combat"),
    "jjk.choose.retry": ("§7A escolha da técnica será oferecida de novo em instantes.", "§7The technique choice will be offered again shortly."),
    # help
    "jjk.help.title": ("Como jogar", "How to play"),
    "jjk.help.body": (
        "§bItem Ilimitado§r\n· Toque/usar: entra e sai do modo de combate\n· Agachado + usar: abre este menu\n\n§bNo modo de combate§r\n· Slots 1-6: técnicas (toque de novo para soltar Azul, Vermelho Máximo e Azul Máximo)\n· Slot 7: esquiva na direção do joystick\n· Slot 8: liga/desliga a cura (Técnica Reversa)\n· Atacar: combo de 4 golpes\n· Agachar: defesa (bloqueia golpes de frente)\n· No Azul Máximo, empurre o joystick para frente/trás para mudar a distância\n\nGanhe XP derrotando criaturas e usando técnicas. Comando: §e/jjk:menu",
        "§bLimitless item§r\n· Tap/use: enters and leaves combat mode\n· Sneaking + use: opens this menu\n\n§bIn combat mode§r\n· Slots 1-6: techniques (tap again to release Blue, Maximum Red and Maximum Blue)\n· Slot 7: dodge toward the joystick direction\n· Slot 8: toggle healing (Reverse Technique)\n· Attack: 4-hit combo\n· Sneak: guard (blocks hits from the front)\n· During Maximum Blue, push the joystick forward/back to change its distance\n\nEarn XP by defeating mobs and using techniques. Command: §e/jjk:menu",
    ),
    # commands / items
    "jjk.cmd.level": ("Nível JJK definido para %s.", "JJK level set to %s."),
    "jjk.cmd.rct": ("Técnica Reversa concedida.", "Reverse Technique granted."),
    "jjk.cmd.reset": ("Perfil Jujutsu reiniciado.", "Jujutsu profile reset."),
    "jjk.cmd.xp": ("+%s XP Jujutsu concedido.", "+%s Jujutsu XP granted."),
    "jjk.item.technique_given": ("§7Você recebeu o item da técnica.", "§7You received the technique item."),
    "jjk.six_eyes.confirm": (
        "§cVocê vai perder toda a progressão (exceto a técnica) e renascer. Use de novo para confirmar.",
        "§cYou will lose all progression (except your technique) and be reborn. Use again to confirm.",
    ),
    "jjk.six_eyes.done": ("§dOs Seis Olhos despertaram.", "§dThe Six Eyes have awakened."),
    "jjk.six_eyes.has": ("§7Você já possui os Seis Olhos.", "§7You already have the Six Eyes."),
    # domain
    "jjk.domain.overlap": ("§cOutro domínio ocupa esta área.", "§cAnother domain occupies this area."),
    "jjk.domain.targets": ("§cAlvos demais para o domínio.", "§cToo many domain targets."),
    "jjk.domain.timeout": ("§cA chegada ao domínio expirou.", "§cDomain arrival timed out."),
    "jjk.domain.title": ("§fExpansão de Domínio", "§fDomain Expansion"),
    "jjk.domain.sub": ("§bVazio Ilimitado", "§bUnlimited Void"),
    "jjk.rct.heal_on": ("§aCura reversa ligada", "§aReverse healing on"),
    "jjk.rct.heal_off": ("§7Cura reversa desligada", "§7Reverse healing off"),
    # touch hints for the hold-to-cast variants of the Java controls
    "jjk.hint.blue_target": ("§bToque no Azul de novo para ir até o alvo", "§bTap Blue again to dash to the target"),
    "jjk.hint.blue_free": ("§bToque no Azul de novo para voar para onde mira", "§bTap Blue again to fly where you aim"),
}

SKILLS = {
    "infinity": (
        ("Infinito", "Infinity"),
        (
            "Liga ou desliga o Infinito: projéteis desaceleram e param antes de tocar você, golpes corpo a corpo e explosões externas são bloqueados. A energia não se recupera enquanto ativo.",
            "Toggle Infinity: projectiles slow down and stop before touching you, melee hits and outside explosions are blocked. Energy does not recover while active.",
        ),
        ("Energia %s para ativar · %s/s para manter", "Energy %s to activate · %s/sec to maintain"),
    ),
    "blue": (
        ("Lapso: Azul", "Lapse: Blue"),
        (
            "Puxa um alvo na mira até você. Toque de novo antes do puxão para ir até o alvo, ou voar na direção da mira se não houver alvo.",
            "Pulls a target in your aim toward you. Tap again before the pull to dash to the target, or fly toward your aim if there is no target.",
        ),
        ("Energia %s · alcance %s blocos", "Energy %s · %s block range"),
    ),
    "barrage": (
        ("Rajada", "Barrage"),
        (
            "Agarra o inimigo à frente e emenda uma sequência de socos e um chute que lança. Escala com Força.",
            "Grabs the enemy in front and follows with rapid punches and a launching kick. Scales with Strength.",
        ),
        ("Grátis · %s de dano base se todos os golpes acertarem", "Free · %s base damage if every hit connects"),
    ),
    "red": (
        ("Reversão: Vermelho", "Reversal: Red"),
        (
            "Libera uma explosão repulsiva à sua frente. Quanto mais perto do centro, mais dano e mais longe o alvo é arremessado.",
            "Releases a repulsive burst in front of you. Targets closer to the center take more damage and are knocked further.",
        ),
        ("Energia %s · %s–%s de dano base", "Energy %s · %s–%s base damage"),
    ),
    "purple": (
        ("Roxo Oco", "Hollow Purple"),
        (
            "Funde Azul e Vermelho num projétil que apaga tudo no caminho. Mire com a câmera enquanto carrega; dispara sozinho quando pronto.",
            "Fuses Blue and Red into a projectile that erases everything in its path. Aim with the camera while charging; it fires when ready.",
        ),
        ("Energia %s · %s de dano base", "Energy %s · %s base damage"),
    ),
    "awakening": (
        ("Despertar", "Awakening"),
        (
            "Libera o Azul Máximo, o Vermelho Máximo e o Roxo desperto por um tempo. Use o slot de novo para lançar o Vazio Ilimitado.",
            "Unlocks Maximum Blue, Maximum Red and the awakened Purple for a while. Use the slot again to cast Unlimited Void.",
        ),
        ("Energia %s · %s s de duração", "Energy %s · %ss duration"),
    ),
    "max_blue": (
        ("Potência Máxima: Azul", "Maximum Output: Blue"),
        (
            "Cria um campo que suga inimigos e blocos. Toque de novo para cancelar; deixe terminar para fixá-lo no lugar. Joystick para frente/trás muda a distância.",
            "Creates a field that pulls enemies and blocks in. Tap again to cancel; let it finish to leave it in place. Push the joystick forward/back to change its distance.",
        ),
        ("Energia %s · até %s de dano base por alvo", "Energy %s · up to %s base damage per target"),
    ),
    "max_red": (
        ("Potência Máxima: Vermelho", "Maximum Output: Red"),
        (
            "Carregue e mire; toque de novo para disparar um feixe devastador. Acertar o seu Azul Máximo parado cria o Roxo Próprio.",
            "Charge and aim; tap again to fire a devastating beam. Hitting your stationary Maximum Blue creates Self Purple.",
        ),
        ("Energia %s · %s de dano base", "Energy %s · %s base damage"),
    ),
    "awakened_purple": (
        ("Roxo Desperto", "Awakened Purple"),
        (
            "Um Roxo mais forte. Logo após criar o Roxo Próprio, use este slot antes da detonação para lançar o Roxo Nuclear.",
            "A stronger Purple. Right after creating Self Purple, use this slot before it detonates to trigger Nuke Purple.",
        ),
        ("Energia %s · base %s · Roxo Próprio %s de dano · Nuclear +%s de energia", "Energy %s · base %s · Self Purple %s dmg · Nuke +%s energy"),
    ),
    "void": (
        ("Vazio Ilimitado", "Unlimited Void"),
        (
            "Uma vez por Despertar: ergue a barreira e leva todos ao seu redor para o domínio. A sobrecarga de informação os paralisa.",
            "Once per Awakening: raises the barrier and takes everyone around you into the domain. Information overload paralyzes them.",
        ),
        ("Energia %s · %s s ativo lá dentro", "Energy %s · %ss active inside"),
    ),
    "dodge": (
        ("Esquiva", "Dodge"),
        (
            "Rola na direção do joystick (para trás se parado). Invulnerável durante o rolamento; também escapa de atordoamento.",
            "Rolls toward the joystick direction (back when idle). Invulnerable while rolling; also escapes stuns.",
        ),
        ("Recarga 2 s · escapar de atordoamento: 12 s", "2 s cooldown · stun escape: 12 s"),
    ),
    "rct": (
        ("Técnica Amaldiçoada Reversa", "Reverse Cursed Technique"),
        (
            "Liga ou desliga a cura: recupera vida usando energia amaldiçoada uma vez por segundo.",
            "Toggles healing: restores health using cursed energy once per second.",
        ),
        ("Cura %s corações por %s de energia", "Heals %s hearts for %s cursed energy"),
    ),
}


def entries():
    out = dict(T)
    for skill, (name, desc, stats) in SKILLS.items():
        out[f"jjk.skill.{skill}.name"] = name
        out[f"jjk.skill.{skill}.desc"] = desc
        out[f"jjk.skill.{skill}.stats"] = stats
    return out


def write(path, lang_index, data):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        for key, values in data.items():
            text = values[lang_index].replace("\n", "~LINEBREAK~")
            f.write(f"{key}={text}\n")


def main():
    data = entries()
    rp = os.path.join(ROOT, "packs", "JJK_RP", "texts")
    write(os.path.join(rp, "pt_BR.lang"), 0, data)
    write(os.path.join(rp, "en_US.lang"), 1, data)
    pack = {k: v for k, v in data.items() if k.startswith("pack.")}
    bp = os.path.join(ROOT, "packs", "JJK_BP", "texts")
    write(os.path.join(bp, "pt_BR.lang"), 0, pack)
    write(os.path.join(bp, "en_US.lang"), 1, pack)
    print(f"[lang] {len(data)} keys")


if __name__ == "__main__":
    main()
