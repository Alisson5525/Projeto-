#!/usr/bin/env python3
"""Fonte única dos textos do Zênite: gera RP/texts/pt_BR.lang e en_US.lang.

Cada chave tem (português, inglês). Valores de linha única; os scripts juntam
parágrafos com quebras de linha. Rode depois de editar:
    python3 ferramentas/textos.py
"""
from __future__ import annotations

from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

TECNICAS = {
    "veu": ("Véu Assintótico", "Asymptotic Veil",
            "Uma barreira onde tudo se aproxima de você, mas nunca chega. Projéteis congelam no ar e nenhum golpe te alcança. Liga e desliga; consome Éter enquanto estiver ativo.",
            "A barrier where everything approaches you but never arrives. Projectiles freeze in mid-air and no blow can reach you. Toggles on and off; drains Ether while active."),
    "poco": ("Poço Gravitacional", "Gravity Well",
             "Lança uma esfera ciano até onde você mira. Ela suga criaturas, itens e até blocos, esmagando o que chega ao centro.",
             "Sends a cyan sphere to where you aim. It pulls in creatures, items and even blocks, crushing whatever reaches its core."),
    "nova": ("Supernova", "Supernova",
             "Dispara um projétil carmesim que explode numa onda de choque e arremessa tudo para longe.",
             "Fires a crimson projectile that bursts into a shockwave, hurling everything away."),
    "passo": ("Passo Espacial", "Spatial Step",
              "Dobra o espaço e te leva instantaneamente até onde você mira. Mire numa criatura para surgir nas costas dela.",
              "Folds space and takes you instantly to where you aim. Aim at a creature to appear right behind it."),
    "reversao": ("Reversão Vital", "Vital Reversal",
                 "Inverte o fluxo do Éter dentro do corpo: cura ferimentos, apaga o fogo e purifica efeitos negativos.",
                 "Reverses the flow of Ether inside your body: heals wounds, puts out fire and cleanses negative effects."),
    "horizonte": ("Horizonte de Eventos", "Event Horizon",
                  "Funde atração e repulsão numa esfera violeta que apaga tudo em seu caminho. Exige 2 segundos de concentração.",
                  "Fuses attraction and repulsion into a violet sphere that erases everything in its path. Takes 2 seconds of focus."),
    "abobada": ("Abóbada Celeste", "Celestial Vault",
                "A técnica suprema: ergue um céu estrelado ao seu redor. Os inimigos lá dentro congelam diante do cosmos, enquanto você fica mais forte e suas técnicas não custam Éter.",
                "The supreme technique: raises a starry sky around you. Enemies inside freeze before the cosmos, while you grow stronger and your techniques cost no Ether."),
}

T: dict[str, tuple[str, str]] = {
    # ------------------------------------------------------------- itens
    "item.zenite.astrolabio.name": ("§bAstrolábio do Zênite", "§bZenith Astrolabe"),
    "item.zenite.codice.name": ("§eCódice do Zênite", "§eZenith Codex"),
    "item.zenite.poeira_estelar.name": ("Poeira Estelar", "Stardust"),
    "item.zenite.selo_eclipse.name": ("§5Selo do Eclipse", "§5Eclipse Seal"),
    "item.zenite.coracao_firmamento.name": ("§dCoração do Firmamento", "§dHeart of the Firmament"),
    "item.zenite.diadema.name": ("Diadema do Zênite", "Zenith Diadem"),
    "item.zenite.manto.name": ("Manto do Zênite", "Zenith Mantle"),
    "item.zenite.perneiras.name": ("Perneiras do Zênite", "Zenith Greaves"),
    "item.zenite.botas.name": ("Botas do Zênite", "Zenith Boots"),
    "tile.zenite:firmamento.name": ("Firmamento", "Firmament"),
    "entity.zenite:arconte.name": ("§5Arconte do Eclipse", "§5Eclipse Archon"),
    "item.spawn_egg.entity.zenite:arconte.name": ("Gerar Arconte do Eclipse", "Spawn Eclipse Archon"),
    # ------------------------------------------------------------- HUD
    "zenite.hud.eter": ("Éter", "Ether"),
    "zenite.hud.criativo": ("(criativo)", "(creative)"),
    "zenite.hud.pronta": ("pronta", "ready"),
    "zenite.hud.veu": ("VÉU ATIVO", "VEIL ACTIVE"),
    "zenite.hud.abobada": ("ABÓBADA", "VAULT"),
    "zenite.hud.canalizando": ("CANALIZANDO", "CHANNELING"),
    # ------------------------------------------------------------- mensagens
    "zenite.msg.sem_eter": ("§cÉter insuficiente.", "§cNot enough Ether."),
    "zenite.msg.recarga": ("§7Ainda recarregando:", "§7Still recharging:"),
    "zenite.msg.requer_nivel": ("§7Requer maestria nível", "§7Requires mastery level"),
    "zenite.msg.requer_coracao": ("§7Requer o §dCoração do Firmamento§7 — derrote o Arconte do Eclipse.", "§7Requires the §dHeart of the Firmament§7 — defeat the Eclipse Archon."),
    "zenite.msg.requer_cheio": ("§7A Abóbada Celeste exige o Éter cheio.", "§7The Celestial Vault requires full Ether."),
    "zenite.msg.selecionada": ("§7Técnica selecionada:", "§7Selected technique:"),
    "zenite.msg.nova_tecnica": ("§dNova técnica liberada:", "§dNew technique unlocked:"),
    "zenite.msg.abobada_liberada": ("§5O céu se abriu para você: a Abóbada Celeste foi liberada!", "§5The sky opened for you: the Celestial Vault is unlocked!"),
    "zenite.msg.coracao_repetido": ("§7O Coração já pulsa em você. §b+500 de maestria.", "§7The Heart already beats within you. §b+500 mastery."),
    "zenite.msg.boas_vindas": ("§bO céu responde ao seu chamado. §7Abra o §eCódice do Zênite§7 para começar.", "§bThe sky answers your call. §7Open the §eZenith Codex§7 to begin."),
    "zenite.msg.kit": ("§aKit do Zênite entregue.", "§aZenith kit delivered."),
    "zenite.msg.sigilos": ("§aSigilos entregues. Coloque-os na barra rápida para lançar técnicas direto.", "§aSigils delivered. Put them on your hotbar to cast techniques directly."),
    "zenite.msg.inventario_cheio": ("§cInventário cheio: alguns itens caíram no chão.", "§cInventory full: some items dropped on the ground."),
    "zenite.msg.limpo": ("§aCúpulas removidas:", "§aVaults removed:"),
    "zenite.msg.nivel_definido": ("§aMaestria definida para o nível", "§aMastery set to level"),
    "zenite.msg.so_operador": ("§cSó operadores podem mudar as configurações do mundo.", "§cOnly operators can change world settings."),
    "zenite.msg.passo_falhou": ("§7Não há espaço para o Passo Espacial ali.", "§7There is no room to step there."),
    "zenite.msg.salvo": ("§aConfigurações salvas.", "§aSettings saved."),
    "zenite.msg.ritual_ocupado": ("§7Um ritual já está em andamento.", "§7A ritual is already under way."),
    "zenite.msg.arconte_existe": ("§7O Arconte do Eclipse já caminha por este mundo.", "§7The Eclipse Archon already walks this world."),
    "zenite.msg.nivel_subiu": ("§bSua maestria subiu para o nível", "§bYour mastery rose to level"),
    # ------------------------------------------------------------- títulos
    "zenite.titulo.abobada": ("§5§lABÓBADA CELESTE", "§5§lCELESTIAL VAULT"),
    "zenite.titulo.abobada_sub": ("§dO firmamento se fecha sobre você.", "§dThe firmament closes in around you."),
    "zenite.titulo.preso": ("§5✦ §dO cosmos inteiro te observa §5✦", "§5✦ §dThe whole cosmos is watching you §5✦"),
    "zenite.titulo.horizonte": ("§d§lHORIZONTE DE EVENTOS", "§d§lEVENT HORIZON"),
    "zenite.titulo.nivel": ("§b§lMAESTRIA", "§b§lMASTERY"),
    "zenite.titulo.arconte": ("§5§lO ARCONTE DESPERTOU", "§5§lTHE ARCHON AWAKENS"),
    "zenite.titulo.arconte_sub": ("§7O eclipse cobre o céu...", "§7The eclipse covers the sky..."),
    "zenite.titulo.vitoria": ("§6§lARCONTE DERROTADO", "§6§lARCHON DEFEATED"),
    "zenite.titulo.vitoria_sub": ("§eO Coração do Firmamento é seu.", "§eThe Heart of the Firmament is yours."),
    "zenite.titulo.coracao": ("§d§lO CÉU SE ABRIU", "§d§lTHE SKY OPENED"),
    # ------------------------------------------------------------- Arconte
    "zenite.arconte.inicio": ("§5[Arconte] §dQuem ousa romper o selo do eclipse?", "§5[Archon] §dWho dares to break the seal of the eclipse?"),
    "zenite.arconte.fase2": ("§5[Arconte] §dVocê brilha demais... eu vou apagar a sua luz.", "§5[Archon] §dYou shine too brightly... I will put out your light."),
    "zenite.arconte.fase3": ("§5[Arconte] §cQUE O ECLIPSE SEJA TOTAL!", "§5[Archon] §cLET THE ECLIPSE BE TOTAL!"),
    "zenite.arconte.morte": ("§5[Arconte] §dO céu... escolheu... você...", "§5[Archon] §dThe sky... has chosen... you..."),
    "zenite.arconte.vitoria": ("§5[Arconte] §dMais uma estrela que se apaga.", "§5[Archon] §dAnother star goes dark."),
    "zenite.arconte.aviso_feixe": ("§c⚠ O Arconte concentra o Eclipse Total! Saia da linha!", "§c⚠ The Archon gathers the Total Eclipse! Get out of the line!"),
    "zenite.arconte.veu": ("§8O Arconte se envolve num Véu Negro.", "§8The Archon wraps itself in a Black Veil."),
    "zenite.arconte.ecos": ("§8Ecos do Vazio respondem ao chamado!", "§8Echoes of the Void answer the call!"),
    "zenite.arconte.eco": ("§8Eco do Vazio", "§8Void Echo"),
    # ------------------------------------------------------------- Roda de Técnicas
    "zenite.menu.titulo": ("§l§bRoda de Técnicas", "§l§bTechnique Wheel"),
    "zenite.menu.corpo": ("Escolha a técnica que o Astrolábio vai lançar.", "Choose the technique the Astrolabe will cast."),
    "zenite.menu.custo": ("Custo", "Cost"),
    "zenite.menu.recarga": ("Recarga", "Cooldown"),
    "zenite.menu.bloqueada": ("§8BLOQUEADA", "§8LOCKED"),
    "zenite.menu.selecionada": ("§a» SELECIONADA «", "§a» SELECTED «"),
    "zenite.menu.eter_cheio": ("Éter cheio", "Full Ether"),
    "zenite.menu.nivel": ("Nv.", "Lv."),
    "zenite.menu.coracao": ("Coração", "Heart"),
    "zenite.menu.sigilos": ("§6Receber Sigilos", "§6Get Sigils"),
    "zenite.menu.status": ("§3Status e Maestria", "§3Status & Mastery"),
    "zenite.menu.config": ("§7Configurações", "§7Settings"),
    "zenite.menu.codice": ("§eAbrir o Códice", "§eOpen the Codex"),
    "zenite.menu.tecnicas": ("Técnicas", "Techniques"),
    "zenite.menu.mais": ("Mais", "More"),
    "zenite.menu.voltar": ("« Voltar", "« Back"),
    # ------------------------------------------------------------- status
    "zenite.status.titulo": ("§l§3Status do Feiticeiro", "§l§3Sorcerer Status"),
    "zenite.status.nivel": ("§bMaestria:§f nível", "§bMastery:§f level"),
    "zenite.status.xp": ("§bExperiência:§f", "§bExperience:§f"),
    "zenite.status.proximo": ("§7até o próximo nível", "§7to the next level"),
    "zenite.status.maximo": ("§6Nível máximo alcançado!", "§6Maximum level reached!"),
    "zenite.status.eter": ("§bÉter máximo:§f", "§bMax Ether:§f"),
    "zenite.status.regen": ("§bRegeneração:§f", "§bRegeneration:§f"),
    "zenite.status.por_segundo": ("por segundo", "per second"),
    "zenite.status.conjunto": ("§bTraje do Zênite completo:§f", "§bFull Zenith Attire:§f"),
    "zenite.status.abobada": ("§bAbóbada Celeste:§f", "§bCelestial Vault:§f"),
    "zenite.status.sim": ("§asim", "§ayes"),
    "zenite.status.nao": ("§cnão", "§cno"),
    "zenite.status.liberada": ("§aliberada", "§aunlocked"),
    "zenite.status.trancada": ("§8trancada", "§8locked"),
    # ------------------------------------------------------------- configurações
    "zenite.cfg.titulo": ("§l§7Configurações do Zênite", "§l§7Zenith Settings"),
    "zenite.cfg.jogador": ("§bSuas preferências", "§bYour preferences"),
    "zenite.cfg.camera": ("Câmera cinematográfica", "Cinematic camera"),
    "zenite.cfg.tremor": ("Tremor de tela", "Screen shake"),
    "zenite.cfg.hud": ("Mostrar barra de Éter", "Show Ether bar"),
    "zenite.cfg.glifos": ("Barra com ícones (desligue se aparecerem quadrados)", "Bar with icons (turn off if you see squares)"),
    "zenite.cfg.mundo": ("§6Mundo §7(só operadores)", "§6World §7(operators only)"),
    "zenite.cfg.destruicao": ("Técnicas destroem o terreno", "Techniques destroy terrain"),
    "zenite.cfg.pvp": ("Técnicas atingem outros jogadores", "Techniques hit other players"),
    "zenite.cfg.boas_vindas": ("Dar o Códice a novos jogadores", "Give the Codex to new players"),
    "zenite.cfg.salvar": ("Salvar", "Save"),
    # ------------------------------------------------------------- Códice
    "zenite.codice.titulo": ("§l§eCódice do Zênite", "§l§eZenith Codex"),
    "zenite.codice.corpo": ("§7As anotações de quem chegou ao ponto mais alto do céu.", "§7The notes of one who reached the highest point of the sky."),
    "zenite.codice.cap.inicio": ("§0Primeiros passos", "§0First steps"),
    "zenite.codice.cap.tecnicas": ("§1As sete técnicas", "§1The seven techniques"),
    "zenite.codice.cap.maestria": ("§3Éter e maestria", "§3Ether and mastery"),
    "zenite.codice.cap.traje": ("§6O Traje do Zênite", "§6The Zenith Attire"),
    "zenite.codice.cap.arconte": ("§5O Arconte do Eclipse", "§5The Eclipse Archon"),
    "zenite.codice.cap.comandos": ("§8Comandos", "§8Commands"),
    "zenite.codice.inicio.1": ("§lBem-vindo, feiticeiro.§r O Zênite é o ponto mais alto do céu — e, a partir de agora, a fonte do seu poder.", "§lWelcome, sorcerer.§r The Zenith is the highest point of the sky — and, from now on, the source of your power."),
    "zenite.codice.inicio.2": ("§b1.§r Crie §fPoeira Estelar§r: fragmento de ametista + pó de glowstone + lápis-lazúli (rende 2).", "§b1.§r Craft §fStardust§r: amethyst shard + glowstone dust + lapis lazuli (makes 2)."),
    "zenite.codice.inicio.3": ("§b2.§r Crie o §bAstrolábio do Zênite§r: 4 poeiras estelares nos cantos, 2 diamantes em cima e embaixo, 2 barras de ouro nas laterais e um olho do fim no centro.", "§b2.§r Craft the §bZenith Astrolabe§r: 4 stardust in the corners, 2 diamonds top and bottom, 2 gold ingots on the sides and an eye of ender in the middle."),
    "zenite.codice.inicio.4": ("§b3.§r §fUsar§r o Astrolábio lança a técnica selecionada. §fAgachar + usar§r abre a Roda de Técnicas.", "§b3.§r §fUsing§r the Astrolabe casts the selected technique. §fSneak + use§r opens the Technique Wheel."),
    "zenite.codice.inicio.5": ("As técnicas gastam §bÉter§r, que se regenera sozinho. A barra aparece na tela enquanto você segura o Astrolábio ou um Sigilo.", "Techniques spend §bEther§r, which regenerates on its own. The bar shows on screen while you hold the Astrolabe or a Sigil."),
    "zenite.codice.inicio.6": ("No §emodo criativo§r todas as técnicas já vêm liberadas e o Éter não acaba.", "In §ecreative mode§r every technique is already unlocked and Ether never runs out."),
    "zenite.codice.tecnicas.1": ("Toque numa técnica na Roda para selecioná-la. Os §6Sigilos§r lançam uma técnica direto da barra rápida.", "Tap a technique on the Wheel to select it. §6Sigils§r cast a technique straight from the hotbar."),
    "zenite.codice.maestria.1": ("Derrotar criaturas e lançar técnicas aumenta a sua §bmaestria§r. São 10 níveis.", "Defeating creatures and casting techniques raises your §bmastery§r. There are 10 levels."),
    "zenite.codice.maestria.2": ("Cada nível aumenta o Éter máximo em 10 e acelera a regeneração.", "Each level raises your max Ether by 10 and speeds up regeneration."),
    "zenite.codice.maestria.3": ("§eNível 2:§r Reversão Vital.  §eNível 4:§r Horizonte de Eventos.", "§eLevel 2:§r Vital Reversal.  §eLevel 4:§r Event Horizon."),
    "zenite.codice.maestria.4": ("A §5Abóbada Celeste§r só responde a quem possui o §dCoração do Firmamento§r.", "The §5Celestial Vault§r only answers whoever holds the §dHeart of the Firmament§r."),
    "zenite.codice.traje.1": ("Cada peça do Traje nasce da peça de diamante correspondente cercada de Poeira Estelar.", "Each Attire piece is made from the matching diamond piece surrounded by Stardust."),
    "zenite.codice.traje.2": ("§fDiadema:§r visão noturna e uma auréola que gira sobre a sua cabeça.", "§fDiadem:§r night vision and a halo that spins above your head."),
    "zenite.codice.traje.3": ("§fConjunto completo:§r Éter regenera 2× mais rápido, Velocidade I e o Véu gasta metade do Éter.", "§fFull set:§r Ether regenerates 2× faster, Speed I and the Veil costs half the Ether."),
    "zenite.codice.arconte.1": ("Crie o §5Selo do Eclipse§r (obsidiana chorona nos cantos, poeira estelar nas bordas e um olho do fim no centro) e use-o num lugar aberto.", "Craft the §5Eclipse Seal§r (crying obsidian in the corners, stardust on the edges and an eye of ender in the middle) and use it somewhere open."),
    "zenite.codice.arconte.2": ("§dFase 1:§r ele puxa e aparece nas suas costas. §dFase 2:§r ergue um Véu Negro, chama Ecos e dispara novas. §cFase 3:§r concentra o Eclipse Total — saia da linha marcada!", "§dPhase 1:§r it pulls you in and appears behind you. §dPhase 2:§r raises a Black Veil, calls Echoes and fires novas. §cPhase 3:§r it gathers the Total Eclipse — get out of the marked line!"),
    "zenite.codice.arconte.3": ("Derrote-o para conquistar o §dCoração do Firmamento§r e libertar a Abóbada Celeste.", "Defeat it to claim the §dHeart of the Firmament§r and free the Celestial Vault."),
    "zenite.codice.comandos.1": ("§f/zenite:menu§r — Roda de Técnicas.  §f/zenite:codice§r — este Códice.", "§f/zenite:menu§r — Technique Wheel.  §f/zenite:codice§r — this Codex."),
    "zenite.codice.comandos.2": ("Com trapaças: §f/zenite:kit§r, §f/zenite:nivel <1-10>§r, §f/zenite:arconte§r e §f/zenite:limpar§r (remove cúpulas esquecidas).", "With cheats: §f/zenite:kit§r, §f/zenite:nivel <1-10>§r, §f/zenite:arconte§r and §f/zenite:limpar§r (removes leftover vaults)."),
}

for tec, (pt, en, dpt, den) in TECNICAS.items():
    T[f"zenite.tec.{tec}.nome"] = (pt, en)
    T[f"zenite.tec.{tec}.desc"] = (dpt, den)
    T[f"item.zenite.sigilo_{tec}.name"] = (f"§6Sigilo: §f{pt}", f"§6Sigil: §f{en}")

PACK = {
    "pt_BR": ("§bZênite §f— Feitiçaria do Firmamento §7(Recursos)", "§7Texturas, modelos, partículas e sons do Zênite."),
    "en_US": ("§bZenith §f— Sorcery of the Firmament §7(Resources)", "§7Textures, models, particles and sounds for Zenith."),
}


def main() -> None:
    for lingua, idx in (("pt_BR", 0), ("en_US", 1)):
        linhas = [f"## Zênite — {lingua} (gerado por ferramentas/textos.py)", f"pack.name={PACK[lingua][0]}", f"pack.description={PACK[lingua][1]}"]
        for k in sorted(T):
            v = T[k][idx]
            assert "\n" not in v and "=" not in k, k
            linhas.append(f"{k}={v}")
        (RAIZ / "RP" / "texts" / f"{lingua}.lang").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"{len(T)} chaves escritas em pt_BR e en_US")


if __name__ == "__main__":
    main()
