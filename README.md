# 🍄 Claudius — idle mycélien

Tu es **Claudius**, une spore qui germe sous une forêt. Digère la litière, tisse ton réseau,
pactise avec les arbres et deviens le plus grand être vivant du monde.

## Jouer
En ligne : **https://patetiik.github.io/claudius/** (ordinateur, Android, iPhone, tablette).

En local : ouvrir `index.html` dans un navigateur (aucune dépendance, aucun build),
ou servir le dossier : `python3 -m http.server 8765 --bind 127.0.0.1`.

## Mécaniques
- **Clic** sur le réseau → nutriments.
- **11 générateurs** (Hyphe → Noosphère fongique), découverts progressivement.
- **Saisons** (90 s chacune) qui boostent ou freinent certains générateurs.
- **Gouttes de pluie 💧** aléatoires : ondée (×3), flaque (gain instantané) ou orage (clic ×15).
- **Évolutions** : ×2/×3 par générateur, clic en % de la prod, bonus globaux.
- **Jalons** (43) : +2 % de production chacun.
- **Sporulation continue** (v11, plus aucune remise à zéro) : spores = 1,25 × (total produit depuis toujours / 1 M)^¼, libérées toutes seules (même hors ligne), +5 % chacune. Avant la v11 : prestige avec remise à zéro, (total du cycle / 1 M)^¼.
- **Nouvelles planches** (v12) : 3 biomes à côté de la forêt (Tourbière, Forêt alpine, Bois mort tropical), avec leur ressource,
  leurs générateurs et des **liens racinaires** sans fin ; **épreuves à niveaux** sans fin, réglées pour durer une vingtaine de minutes.
- Sauvegarde auto (localStorage, 10 s) + gains hors-ligne (50 %, 8 h max).

## Nouveautés v2
- **Arbre de spores** (onglet Sporulation) : 11 talents permanents en 3 branches
  (🌿 Croissance, 🦷 Digestion, 🌦️ Climat), achetés avec les spores.
  Les spores dépensées **continuent de compter** pour le bonus de +5 %.
- **Export / import** de la sauvegarde (onglet Stats) : code texte `CLAUDIUS2:…`,
  copie dans le presse-papiers ou fichier `.txt`. Un code invalide ne touche pas à la partie.
- 2 nouveaux jalons (Héritage, Arbre de vie). Les sauvegardes v1 se chargent telles quelles.

## Nouveautés v3
- **🍯 Sucre**, 2ᵉ ressource : les mycorhizes (0,1/s), le Wood Wide Web (0,5/s) et le mycélium
  continental (2/s) échangent ton phosphore contre le sucre des arbres. Été ×2, hiver ×0,3.
  Remis à zéro à chaque sporulation.
- **7 évolutions sucrées** (onglet Évolutions, aperçu grisé avant la 1ʳᵉ mycorhize) :
  Échange équitable, Sève sucrée, Appât sucré, Réserves d’amidon, Fermentation (bonus selon le sucre
  en réserve), Nectar lumineux, Symbiose totale.
- **🐗 Sanglier truffier** (dès la 1ʳᵉ mycorhize, toutes les 2,5–5 min) : il traverse la surface ;
  clique-le pour un gros gain immédiat et une production ×2 pendant 45 s.
- **☀️ Sécheresse** (50 % de chance en été, 15 % en automne) : production ×0,5, sucre ×0,5 et plus de
  pluie pendant 45 s. Le bouton **💦 Arroser** y met fin contre du sucre.
- **Surface redessinée** : ciel et astre selon la saison, forêt lointaine, herbe/neige, humus,
  vrais arbres (3 en décor dès le début), racines dorées où descend le sucre des arbres pactisés,
  feuilles mortes en automne, neige en hiver.
- 5 nouveaux jalons. Sauvegardes et codes v2 compatibles (codes d’export `CLAUDIUS3:…`).

## Nouveautés v4
- **🧬 Espèces** (onglet Sporulation) : on choisit l’espèce du prochain cycle, appliquée à la sporulation.
  - 🍄 Claudius commun — équilibré.
  - 🟤 Armillaire obscure — inactif : production ×2, clic ×0,25.
  - 🦪 Pleurote carnivore — actif : clic ×4 et +5 % de la prod par clic, production ×0,6.
  - 🟣 Laccaire améthyste — sucre : sucre ×3, mycorhizes ×2, hyphes/rhizomorphes ×0,5 (jalon « Dent sucrée »).
  - ⚫ Truffe noire — événements : sanglier 3× plus fréquent et 2× plus rentable, pluie 2× plus rare
    (jalon « Truffe ! » + 3 sporulations).
- **⚔️ 5 défis** (après la 1ʳᵉ sporulation) : lancer un défi fait sporuler (spores gagnées conservées) ;
  atteindre l’objectif sur le cycle donne une récompense permanente. Abandon possible à tout moment.
  - 🤐 Sans dents (1 M) — clics inutiles → production +10 %.
  - 🧵 Filament solitaire (2 M) — seuls les 3 premiers générateurs → ces 3 générateurs ×3.
  - ❄️ Hiver éternel (5 M) — saison bloquée en hiver → l’hiver ne pénalise plus.
  - 🏜️ Désert (10 M) — sécheresse permanente → immunité aux sécheresses.
  - 🫥 Sans mémoire (50 M) — spores et talents désactivés → +1 % par spore.
- 3 nouveaux jalons. Sauvegardes et codes v2/v3 compatibles (codes d’export `CLAUDIUS4:…`).

## Nouveautés v5 (visuelle)
- **Réseau identique au rechargement** : la sauvegarde garde une graine et l’ordre des branches
  (`netSeed`, `netLog`) ; le dessin est rejoué à l’identique. Nouvelle graine à chaque sporulation.
  Les anciennes sauvegardes reçoivent leur journal au premier chargement, puis restent stables.
- **Réseau plus fin, même DA** : filaments courbes qui s’épaississent vers le cœur, halo lumineux,
  pointes de croissance claires, impulsions en comètes, cœur organique qui respire, sol texturé
  (strates, cailloux). Le réseau est pré-rendu sur un calque et redessiné seulement quand il change.
- **Interface « carnet de naturaliste »** : typographie à empattements, registre à filets pour les
  générateurs, onglets soulignés, cadre gravé autour de la planche du réseau avec légende,
  boutons sobres, bien moins d’emojis décoratifs. Onglet « Stats » renommé « Carnet ».

## Nouveautés v6 — l’ère de l’ambre
- **3 générateurs de fin de partie** après le Mycélium continental, avec leurs 5 évolutions chacun :
  Lichen pionnier (aime l’hiver, donne du sucre), Mycélium abyssal (insensible aux saisons),
  Noosphère fongique (beaucoup de sucre). À la surface : rochers couverts de lichen, lueur vert d’eau
  au fond de la planche, aurore dans le ciel.
- **Ambre**, sans remise à zéro (onglet **Ambre**, en aperçu grisé jusqu’à 200 spores) : les spores gagnées
  se figent d’elles-mêmes en ambre, ambre = √(spores gagnées / 200), mis à jour à chaque sporulation.
  Chaque ambre donne **+25 % de production** (l’ambre dépensé compte toujours) et se dépense en reliques.
  Une première version avec « Fossilisation » (tout remettre à zéro contre de l’ambre) a été retirée :
  l’idle doit pouvoir progresser sans sacrifice.
- **8 reliques** achetées avec l’ambre : Banque de graines (cycles qui démarrent avec 25 hyphes, 25 rhizomorphes, 10 champignons de litière), **Instinct** (achat auto des évolutions),
  **Croissance autonome** (achat auto des générateurs), Résine (+50 % de spores), Mémoire des saisons,
  Sève fossile, Gardien du sous-bois, Conscience planétaire (×3).
- **Colonie rivale** (dès le 1ᵉʳ Wood Wide Web, toutes les 4–8 min **de jeu actif** : seulement si tu as cliqué
  dans la dernière minute ; laissé seul, le jeu ne perd rien) : un mycélium violet rampe depuis un
  bord de la planche et vole 25 % de la production. 30 clics sur le réseau en 45 s pour la repousser :
  gros gain et production ×1,5 pendant 90 s.
- **Poussée de carpophores** (60 % des automnes, après la 1ʳᵉ sporulation) : 7 petits champignons
  sortent de terre, à cueillir pendant 22 s.
- 3 talents profonds (Colonisation, Mycophagie, Aurore), 2 évolutions sucrées (Photobionte, Marée de sève),
  2 évolutions globales, 10 jalons.
- **Rééquilibrage** testé au simulateur (bot de 30 h, actif et inactif). Avec la racine carrée, les spores
  s’emballaient dès le Mycélium continental (×10 000 en 20 min). En racine 4ᵉ et avec des générateurs de fin
  de partie plus chers, un bot optimal (2 clics/s) atteint le Mycélium continental vers 1 h 10, le Lichen
  vers 1 h 40 et la Noosphère vers 2 h ; un joueur inactif vers 1 h 40, 2 h 30 et 3 h. Ensuite la
  croissance ralentit nettement et plafonne (pas de débordement vers l’infini).
- **Mobile (retours du test iPhone)** : plus de zoom quand on tape vite ; la barre d’onglets ne défile
  qu’horizontalement ; quand Safari met la page en veille, le retour compte comme du hors-ligne
  (50 %, 8 h max) et affiche la fenêtre « Bon retour », au lieu d’un rattrapage silencieux.
- **Correctifs** : la planche ne reste plus vide si la page s’ouvre dans un onglet caché ; numéro de version
  dans les liens des scripts (`?v=6.3`) pour que le navigateur ne mélange pas anciens et nouveaux fichiers.
- Sauvegardes et codes v1–v5 compatibles (codes d’export `CLAUDIUS6:…`). Les spores déjà gagnées
  sont conservées ; seules les prochaines suivent la nouvelle formule.

## Nouveautés v7 — lisibilité de la surface
- **Carpophores à cueillir** (poussée d’automne) : grands champignons au chapeau ivoire lumineux, halo qui
  pulse à leur pied, léger balancement. Zone de toucher de 44 px, confortable au doigt sur tous les écrans.
  Une annotation de carnet « carpophores — à cueillir » apparaît quelques secondes au début de la poussée,
  et un encart sous les ressources indique combien il en reste et le temps restant.
- **Champignons de litière** : redevenus un simple décor, petits, ocre-brun, sans éclat, groupés en touffes
  au pied de l’herbe. On ne les confond plus avec les carpophores.
- **Rochers de lichen** plus visibles : plus gros, pierre claire éclairée par la lune avec arête lumineuse,
  contour et ombre portée ; croûtes de lichen en rosettes vert pâle et jaune orangé, plus vives en hiver,
  avec un peu de neige sur le dessus. Placés entre les arbres.
- Aucun changement de sauvegarde : les parties et codes v6 se chargent tels quels.

## Nouveautés v8 — jouable par tout le monde
Lot technique, sans nouveau contenu ni changement de gameplay.
- **En ligne** sur GitHub Pages (HTTPS). Chemins tous relatifs : le jeu marche à la racine d’un site comme dans un sous-dossier.
- **Toujours la dernière version** : un service worker (`sw.js`) prend d’abord les fichiers du serveur (revalidés à chaque
  ouverture) et n’utilise sa copie que hors connexion ou si le réseau met plus de 4 s à répondre. Les `?v=…` restent en
  plus dans les liens des scripts et du CSS.
- **Jouable hors connexion** et **installable** comme une application (manifeste, icônes, écran d’accueil sur iPhone
  et Android, application sur ordinateur via Chrome ou Edge).
- **Une partie par joueur** : chaque personne a sa sauvegarde dans son navigateur (localStorage, propre à chaque site
  et à chaque appareil). Rien n’est envoyé sur Internet. Pour changer d’appareil, on passe par l’export / import
  (codes `CLAUDIUSn:`, toujours compatibles v1 à v7). La partie jouée sur `localhost` ne se retrouve pas d’elle-même en
  ligne : l’exporter depuis le Carnet en local puis l’importer sur le site.
- **Un seul onglet actif** : si le jeu s’ouvre dans un 2ᵉ onglet du même navigateur, le 1ᵉʳ se met en pause et
  n’écrit plus rien (« Partie ouverte ailleurs », bouton « Jouer ici »). Avant, les deux onglets s’écrasaient.
- Le bac à sable `?sandbox=<nom>` et les sauvegardes de secours (`…:backup`, `…:corrupt`) marchent pareil en ligne,
  séparément pour chaque joueur.
- **Stockage** : avertissement si le navigateur ne garde pas la partie (navigation privée stricte) ; Chrome, Edge et le
  jeu installé demandent un stockage persistant ; une note dans le Carnet rappelle que Safari peut effacer un site
  non ouvert pendant une semaine.
- **Tous les écrans** : téléphone en paysage (deux colonnes qui défilent), encoches (`safe-area`), très petits écrans
  (320 px), planche plus haute sur tablette en portrait, pas de zoom en touchant le champ de code sur mobile, pas de
  menu « copier » sur un appui long, pas de « tirer pour recharger » sur Android ; sur ordinateur, la page ne défile
  plus de 4 px.
- **Arrière-plan sur mobile** : sauvegarde aussi à `pagehide` (fermeture d’onglet sur iPhone et Android), en plus du
  passage en arrière-plan.
- Métadonnées de partage (aperçu dans les messageries) et icône d’onglet.
- Testé : Chrome (ordinateur et émulation mobile tactile, 8 tailles d’écran de 320 px à 1440 px, portrait et paysage),
  hors connexion, deux onglets, sauvegardes v1, v7 et codes `CLAUDIUS2:`/`CLAUDIUS6:`. Pas encore testé sur un vrai
  Firefox, Safari ou Android.

## Nouveautés v9 — l’herbier
Une couche de collection cumulative, sans aucune remise à zéro, qui avance toute seule.
- **Herbier** (nouvel onglet) : 12 espèces réelles, 3 par saison, chacune avec sa planche dessinée à la plume (SVG),
  son nom latin et une note de carnet. Printemps : Morille, Pézize orangée, Tricholome de la Saint-Georges. Été : Girolle,
  Cèpe de Bordeaux, Amanite des Césars. Automne : Coprin chevelu, Trompette de la mort, Clathre rouge. Hiver : Mycène
  lumineuse, Pied bleu, Polypore du bouleau.
- **Prospection** : le réseau fouille la forêt tout seul (barre « Prospection » sous les ressources) et rapporte un
  spécimen de la saison en cours : environ toutes les 7 min au début, plus vite quand la production grandit (≈ 2 min en fin
  de partie). Elle continue **hors ligne** (au taux hors ligne) ; la fenêtre « Bon retour » liste les espèces rapportées.
  S’il n’y a rien de nouveau à trouver dans la saison, la barre attend à 100 % la saison suivante.
- **Niveaux** : chaque espèce monte jusqu’au niveau 5. Chaque niveau donne **+3 % de production** (jusqu’à ×2,8 pour
  l’herbier complet) et l’effet propre à l’espèce (+20 % sur un générateur, ou sucre, clic, pluie, sanglier,
  carpophores). Les espèces encore inconnues restent en **aperçu grisé**, avec leur saison et le générateur qu’elles
  demandent. L’herbier est conservé aux sporulations.
- **Lueur dans la litière** (dès le 1ᵉʳ spécimen, toutes les 3 à 6 min, 12 s pour la toucher) : un spécimen trouvé
  aussitôt, **même hors saison**. La rater ne coûte rien.
- **Relique « Loupe de naturaliste »** (4 ambre) : prospection 2× plus rapide.
- **5 jalons** : Première planche, Herbier de poche, Flore complète, Une saison sous la loupe, Spécimen de référence.
- Sauvegarde v7 (codes d’export `CLAUDIUS7:…`). Les parties et codes v1 à v8 se chargent tels quels, avec un herbier vide.

## Nouveautés v10 — premières pages
Une version d’accueil pour les nouveaux venus, sans nouvelle mécanique de jeu.
- **Notes de terrain** : une courte note de carnet s’ouvre la première fois qu’on rencontre chaque mécanique
  (1ᵉʳ filament, évolutions, pluie, saisons, jalons, sucre, sanglier, sécheresse, herbier, lueur, sporulation, spores et talents,
  colonie rivale, poussée de carpophores, ambre : 15 notes). Posée en bas de la planche, elle se referme d’un toucher ou d’un
  glissement ; une seule à la fois, jamais par-dessus une fenêtre, et celles d’un événement à l’écran passent devant.
  Les gouttes et les lueurs apparaissent au-dessus d’une note ouverte. Toutes sont relisibles dans le Carnet,
  section « Notes de terrain » (aperçu grisé pour celles pas encore rencontrées).
  **Joueurs existants** : au chargement d’une partie d’avant la v10, les notes des mécaniques déjà connues sont marquées lues
  d’après l’état de la partie (un événement débloqué depuis plus de 30 min de jeu compte comme vu).
- **Objectifs guidés** sous les ressources : digérer 10 fois, 1ʳᵉ hyphe, 5 hyphes, 1ʳᵉ évolution, rhizomorphe, champignon de
  litière, mycorhize. Un seul à la fois avec sa progression, puis « Premiers pas terminés » et ils disparaissent pour de bon
  (conservé aux sporulations). Masqués d’office pour les parties déjà avancées.
- **Aide contextuelle** : un « ? » discret sur chaque ressource (nutriments, production, sucre, ambre, prospection, spores),
  chaque onglet, la saison et chaque effet en cours. Infobulle au survol, à l’appui long sur mobile (sans changer d’onglet),
  au toucher du « ? » ou au clavier. Elle détaille d’où vient la valeur : production par générateur puis multiplicateur par
  multiplicateur (base, évolutions, saison, évolutions globales, jalons, spores, talents, espèce, défis, ambre, reliques,
  herbier, effets en cours, colonie rivale), sources et multiplicateurs du sucre, vitesse de prospection, effets de la saison…
- **Réglages** (Carnet) : animations réduites (suit `prefers-reduced-motion` par défaut ; fige aussi le décor de la planche),
  taille du texte en 3 niveaux, contraste renforcé, nombres en suffixes ou en notation scientifique, **langue FR/EN**.
  Propres à chaque joueur : rangés à part de la partie (`claudius-settings-v1`, avec le même suffixe de bac à sable),
  ils ne partent pas dans les codes d’export et « Effacer » ne les touche pas. Langue par défaut : celle du navigateur pour
  un nouveau joueur, le français pour une partie existante. L’accueil propose « Play in English ».
- **Traduction** : tous les textes sont dans `js/i18n.js` (contenu par identifiant, interface par clé), l’anglais est complet.
  `data.js` ne garde que les chiffres. Pour la v11/v12 : ajouter les textes des nouveautés dans chaque langue, même clé.
- **Équilibrage des 30 premières minutes**, au simulateur (bot qui clique puis s’arrête presque, médiane de 7 parties) :
  champignon de litière 1 100 → 900, mycorhize 12 000 → 8 500. Joueur « typique » (2 clics/s puis 0,5) : 1ᵉʳ achat à 8 s,
  1ʳᵉ mycorhize à 9 min (au lieu de 10 min 23), litière à 4 min 18 (au lieu de 6 min 16, fin du trou de 3–4 min sans
  nouveauté) ; environ 60 nouveautés en 30 min. Joueur très actif : mycorhize à 7 min 36. À 2 h, les mêmes générateurs
  qu’avant : l’avance du début se dissipe.
- **Production affichée avec les clics** (v10.1, remarque de Nicolas) : le « /s » sous les nutriments = production passive +
  revenu des clics et cueillettes actives (réseau, sanglier, gouttes, carpophores, colonie repoussée) sur les 5 dernières
  secondes, avec « dont … de clics » et le détail dans l’infobulle. Affichage seulement : `Game.nps()`, le clic (qui gagne
  un % de `nps()`), le hors-ligne et les jalons n’en tiennent pas compte (`Game.displayRate()`, `Game.activeRate()`).
- **Bon retour détaillé** : durée d’absence (et durée comptée si le plafond est atteint), nutriments rapportés et part des
  4 générateurs qui ont le plus produit, sucre, spécimens rapportés (espèce, nouvelle ou niveau atteint), équivalent en
  production en direct, rappel que rien n’a été perdu et du taux hors ligne.
- **Notes de version** : bandeau discret en haut de page « Nouveautés de la version 10 » à l’arrivée d’une nouvelle version
  (pas pour un tout nouveau joueur) ; une fois fermé, il ne revient qu’à la version suivante (dernière version vue gardée
  dans les réglages du joueur). L’historique complet, de la v1 à la v10, au format changelog (Ajouté / Modifié / Retiré /
  Corrigé), s’ouvre depuis le bandeau ou le Carnet. Contenu dans `js/changelog.js`, anglais dans `js/i18n.js`.
- Sauvegarde v8 (codes `CLAUDIUS8:…`) : champs `notes` et `guideDone`. Les parties et codes v1 à v9 se chargent tels quels.

## Nouveautés v11 — sporulation continue
Plus aucune remise à zéro : refonte du cœur du jeu, testée au simulateur et sur d’anciennes sauvegardes.
- **Spores continues** : `spores = sporeLegacy + ⌊m × (courbe(total depuis toujours) − sporeOrigin)⌋`, jamais moins qu’un nouveau
  joueur au même total (`⌊m × courbe⌋`). Courbe `1,25 × (total / 1 M)^0,25` (`SPORE_K`, `SPORE_EXP` dans `data.js`), plafond de sécurité :
  au-delà de 200 000 spores la courbe passe en racine carrée, jamais plus de 10⁸. `m` = ×1,5 avec la Résine. Les spores se mettent à jour
  à chaque tick et pendant l’absence (`syncSpores`). Barre « Prochaine spore » sur le total depuis toujours (`Game.sporeProgress()`).
  Le bouton « Sporuler » et la remise à zéro (`prestige()`) sont retirés.
- **Grande fructification** : à chaque palier de spores (chaque spore jusqu’à 10, puis tous les +10 %, `nextFruitAfter`), un grand
  carpophore ivoire sort de terre à la surface et lâche un nuage de spores qui retombe sur la planche (≈ 10 s, au plus une toutes les 40 s ;
  figé et plus court en animations réduites). Purement visuel. Note de terrain « Grande fructification » la première fois.
- **Mutation d’espèce** : à tout moment, effet immédiat, au plus une par saison (`Game.mutate`, `s.mutSeason` = `stats.seasonsSeen`).
  Remplace le choix « pour le prochain cycle » (`nextSpecies` ignoré).
- **Planches d’épreuve** (les 5 défis) : un petit réseau à part (`s.plates[id]` : nutriments, générateurs, graine et journal de dessin),
  dessiné sur son propre canvas (`PlateView.make`) dans l’onglet Sporulation, à côté du réseau principal qu’il ne touche jamais.
  Il hérite des évolutions et des bonus permanents du réseau principal, moins ce que sa règle retire (`rule` : `noClick`, `season`,
  `prod`, `noSpores` ; `gens` : générateurs permis). Il pousse aussi hors ligne et avec la Croissance autonome ; ce qu’il produit ne compte
  pas pour les spores. Une seule à la fois, abandon sans pénalité, récompenses inchangées (`challengesDone`). Débloquées à 5 spores.
  **Pour la v12 (biomes)** : ajouter des définitions de planches à côté de `CHALLENGES` (même forme : `gens`, `rule`, `goal`), les chercher
  dans `Game.plateDef`, et les nettoyer dans `cleanPlates` ; tout le reste (production, achats, dessin, hors ligne) est déjà générique.
- **Bonus de début de cycle remplacés** (ceux qui les possèdent les gardent) : Germination rapide → hyphes et rhizomorphes ×3 ;
  Banque de graines → générateurs 25 % moins chers ; Sève fossile → sucre ×2 (inchangé) et sucre à 100 % hors ligne.
- **Sucre et évolutions sucrées permanents**, prix revus (15 → 150 000 au lieu de 10 → 40 000) ; Fermentation : +1 % par 50 de sucre
  (au lieu de 10), toujours au plus +50 %.
- **Retouches** : « sur ce cycle » → « au total » (générateurs mystère, évolutions globales) ; jalon « Dans le vent » = « Première spore » ;
  Armillaire et Pleurote à la 1ʳᵉ spore, Truffe noire à 25 spores (ou 3 anciennes sporulations), poussée de carpophores dès la 1ʳᵉ spore ;
  textes FR/EN, notes de terrain (« Bientôt des spores », « Spores et talents », + « Grande fructification », « Mutation »,
  « Planches d’épreuve ») et infobulles réécrits. Le Carnet compte les spores et les fructifications (et les sporulations d’avant la v11).
- **Migration sans perte** (sauvegarde v9, codes `CLAUDIUS9:` ; v1 à v8 acceptés) : spores gardées (`sporeLegacy`), la courbe repart du
  point où en est le joueur (`sporeOrigin`) pour que la progression reprenne tout de suite ; réseau, sucre et évolutions sucrées conservés ;
  un défi en cours est annulé sans pénalité (fenêtre d’explication).
- **Héritage des anciennes forêts** (parties avec `stats.prestiges ≥ 1`, posé uniquement à la migration d’une sauvegarde d’avant la v11) :
  +2 % de production par sporulation passée (au plus +100 %), jalon exclusif « Ancien des forêts » (caché pour les autres, hors du total),
  titre « Pionnier de la sporulation » dans le Carnet, spore dorée qui tourne autour du cœur du réseau, et une note de carnet de
  remerciement à la première ouverture (relisible depuis le Carnet). Les fenêtres de démarrage s’enchaînent sans se chevaucher.
- **Équilibrage** (simulateur `.claude/outils/sim.js`, modèle A = v10.1 dans `snap-v10/`, modèle B = v11 dans `snap/`, profils `lazy` et
  `active`, 3 graines) : bot peu actif (2 clics/s pendant 5 min puis rien) — v10.1 : Mycélium continental 2 h 03, 1ᵉʳ ambre 2 h 47,
  Lichen 4 h 34, Noosphère 5 h 15 ; v11 : 1 h 10, 3 h 41, 4 h 42, 4 h 57. Bot actif (2 clics/s en continu, attrape tout) — v10.1 :
  continental 0 h 50, Noosphère 1 h 09 ; v11 : 0 h 21, 0 h 34 (sans remise à zéro, il ne reconstruit plus son réseau). En puissance 0,30,
  la boucle s’emballait déjà ; le plafond arrête la course vers 10⁶ spores (5 × 10⁶ en v10.1 à 30 h).

## Nouveautés v12 — nouvelles planches
Une fin de partie qui ne s'arrête plus, sans aucune remise à zéro (cahier des charges : ligne v12 de la feuille de route).
- **Trois biomes** colonisés l'un après l'autre à côté de la forêt (Pl. I) : **Tourbière** (Pl. II, tourbe) dès la 1ʳᵉ noosphère
  fongique, **Forêt alpine** (Pl. III, givre) à 6 Md de tourbe produits, **Bois mort tropical** (Pl. IV, spores rares) à 25 Md de givre.
  Chacun est une planche (`s.plates[id]`, le modèle des épreuves de la v11 : `BIOMES` dans `data.js`, `Game.plateDef`, `cleanPlates`) avec
  sa ressource, 4 générateurs à lui (`gens` du biome, lettres a–d dans le journal du dessin), sa surface dessinée (`drawBog`, `drawAlpine`,
  `drawTropical` dans `network.js`, sol propre `BIOME_SOIL`) et son réseau déterministe. Il démarre avec 5 générateurs offerts, pousse tout
  seul, hors ligne compris (au taux hors ligne), et la Croissance autonome y achète aussi. La forêt le nourrit : ×(1 + 0,08 × log₁₀ de la
  production principale). Ce qu'il produit ne compte pas pour les spores.
- **Sélecteur de planches** au-dessus du réseau (dès le 1ᵉʳ ambre ou lichen) : Pl. I Forêt, puis les biomes ; ceux pas encore atteints en
  **aperçu grisé** avec leur condition et une barre de progression. Sous la planche d'un biome : sa ressource (« ? » détaillé), ses
  générateurs et ses liens. La forêt continue de pousser ; une colonie rivale ramène la vue sur la forêt.
- **Liens racinaires** (`LINKS`, 3 par biome), achetés avec la ressource du biome, par niveaux sans limite, prix polynomial
  (prix × n³ × 1,02ⁿ⁻¹, `LINK_POW`) : production principale +10 %/niv., sucre +15 %, prospection +10 %, spores libérées +3 %, et la
  production des biomes eux-mêmes ou de leurs voisins (+20 à +25 %).
- **Épreuves à niveaux, sans fin** : une épreuve réussie se replante au niveau suivant. Objectif nominal ×10 par niveau, ramené au
  lancement (`Game.trialGoal`, simulation rapide de la planche vide avec tous les bonus du moment) entre ce qu'un réseau sans clic produirait
  en 20 min (+2 min par niveau) et en 34 min. Chaque niveau au-delà du 1ᵉʳ : +5 % sur le domaine de la récompense (Sans dents : production ;
  Filament solitaire : les 3 générateurs ; Hiver éternel : production en hiver ; Désert : sucre ; Sans mémoire : +0,05 % par spore).
  Les épreuves déjà réussies comptent pour le niveau 1 ; une épreuve en cours garde son objectif.
- **Herbier** : 3 espèces de biome (Hypholome des sphaignes, Hygrophore de mars, Satyre voilé), en toute saison une fois le biome colonisé,
  +20 % de la ressource du biome par niveau. Les niveaux continuent au-delà de 5 (effets plafonnés au niveau 5) : la prospection ne s'arrête
  plus. Au-delà du niveau 5, chaque trouvaille peut être une **variante rare** (albinos, géante, fasciée : vignettes grisées tant qu'on ne les
  a pas), +2 % de production chacune ; chance de 5 % divisée par la vitesse due à la production, soit environ une variante toutes les 2 h 30
  de prospection à tous les stades (plus avec la Loupe et le lien « Sentiers de givre »).
- **Prestige de collection** (Carnet) : herbier 1 pt/niveau, variante 10, niveau d'épreuve 5, niveau de lien 2, biome 25, jalon 1 ;
  9 rangs, de Promeneur à Mémoire de la forêt. **11 jalons** de fin de partie (54 en tout).
- Notes de terrain « Épreuves à niveaux », « Nouvelle planche », « Liens racinaires », « Variante rare » ; « Bon retour » détaille la
  production des biomes, les planches colonisées et les variantes trouvées ; relevés du Carnet ; textes FR/EN complets.
- Sauvegarde v10 (codes `CLAUDIUS10:…`) : champs `trialLevels`, `links`, `variants` ; planches de biome dans `plates`. Les parties et codes
  v1 à v11 se chargent tels quels (`.claude/outils/saves.js`).
- **Équilibrage** (outils non publiés dans `.claude/outils/`) :
  - `trials.js` (5 épreuves × 3 profils × niveaux 1 à 5) : 20 à 40 min partout, qu'on touche la planche 5 min ou 1 min
    (avant : 53 min à 4 h 34 pour un débutant, 1 à 10 s… ou 10 min en fin de partie).
  - `biomes.js` (fin de partie, production principale 10²⁶/s) : joueur actif, Forêt alpine à 3 h 25, Bois mort à 10 h 40, 50 niveaux de liens
    à 8 h, 182 à 40 h, 250 à 80 h (production principale ×3,7, spores libérées ×1,57 : pas d'emballement) ; avec seulement la Croissance
    autonome, 4 h 10 et 12 h ; en passant 3 fois par jour, 24 h et 64 h.
  - `sim.js` : rythme du jeu principal inchangé (Noosphère à 4 h 58 pour le joueur peu actif).

## Publier une mise à jour
1. Modifier le jeu, le tester en local sur `http://127.0.0.1:8765/?sandbox=test`.
2. Changer le numéro de version (sinon les joueurs peuvent garder l’ancienne version en cache) :
   `./nouvelle-version.sh 8.1` (met à jour les `?v=` de `index.html` et `VERSION` dans `sw.js`).
3. Ajouter l’entrée de la version dans `js/changelog.js` (en tête de liste, rédigée pour les joueurs), et sa traduction
   anglaise dans `js/i18n.js` (`I18N.en.content.changelog`).
4. Publier : `git add -A && git commit -m "v8.1 : …" && git push`. Le site est à jour en une à deux minutes.
   `.gitignore` garde hors ligne les fichiers de travail (`CLAUDE.md`, `TEST-IPHONE.md`, `.claude/`).
5. Vérifier sur https://patetiik.github.io/claudius/?sandbox=test (jamais sur ta vraie partie).

## Structure
- `js/data.js` — tout le contenu chiffré (générateurs, saisons, évolutions, jalons, courbe des spores, talents, sucre, événements, planches d’épreuve, ambre et reliques, herbier, notes de terrain et objectifs guidés) : c'est ici qu'on ajoute.
- `js/i18n.js` — tous les textes, en français et en anglais (v10) : chaque ajout de contenu y met ses textes dans les deux langues.
- `js/game.js` — logique pure et sauvegarde.
- `js/network.js` — rendu canvas du réseau, grande fructification, spore dorée, vues de planches (`PlateView`), surfaces des biomes (v12).
- `js/ui.js`, `js/main.js` — interface et boucles ; `js/help.js` — aide contextuelle (« ? » et infobulles, v10).
- `js/util.js` — bac à sable, réglages du joueur, format des nombres.
- `index.html` — page unique ; à chaque version, lancer `./nouvelle-version.sh` (voir ci-dessus).
- `sw.js`, `manifest.webmanifest`, `icons/` — hors connexion et installation (v8).

## Feuille de route
- ~~v2 : boutique de spores (arbre de talents permanent), export/import de sauvegarde.~~ ✅
- ~~v3 : 2ᵉ ressource **Sucre** (via mycorhizes) pour des évolutions spéciales ; événements « Sanglier truffier », « Sécheresse ».~~ ✅
- ~~v4 : espèces de champignons à choisir à chaque sporulation (styles de jeu différents), défis.~~ ✅
- ~~v5 (visuelle) : réseau identique au rechargement ; réseau plus beau en gardant la DA ; interface plus artisanale, moins « générée ».~~ ✅
- ~~v6 : fin de partie (3 générateurs), ambre et reliques (sans remise à zéro), événements « Colonie rivale » et « Poussée de carpophores », rééquilibrage des spores.~~ ✅
- ~~v7 : lisibilité de la surface : carpophores à cueillir bien distincts des champignons de litière, rochers de lichen plus visibles ; retours de Nicolas après test en jeu réel et sur iPhone (rien à signaler).~~ ✅
- ~~v8 : jeu jouable par d’autres personnes, sur n’importe quel appareil (pas seulement iPhone) : hébergement public, navigateurs et écrans variés (ordinateur, Android, tablette), sauvegarde propre à chaque joueur.~~ ✅
- ~~v9 : herbier (collection cumulative de 12 espèces, prospection automatique même hors ligne, lueurs dans la litière, relique Loupe de naturaliste).~~ ✅
- ~~v10 « Premières pages » : accueil des nouveaux joueurs — notes de carnet à la 1ʳᵉ rencontre de chaque mécanique (relisibles dans le Carnet), objectifs guidés des 5 premières minutes, « ? » et infobulles détaillant chaque valeur, réglages (animations réduites, taille du texte, contraste, format des nombres, langue FR/EN), équilibrage des 30 premières minutes, fenêtre « Bon retour » détaillée.~~ ✅
- ~~v11 « Sporulation continue » : plus aucune remise à zéro — les spores se libèrent en continu d’après le total produit depuis toujours (courbe ≈ racine 4ᵉ, plafond de sécurité ; étude au simulateur : rythme comparable à l’actuel), grande fructification visuelle à chaque palier ; mutation d’espèce à tout moment (1 par saison) ; défis transformés en planches d’épreuve parallèles ; remplacement des bonus de début de cycle (Germination rapide, Banque de graines, Sève fossile) ; sucre et évolutions sucrées permanents (prix revus) ; migration sans perte des parties existantes ; **compensation des joueurs qui ont déjà sporulé** (« Héritage des anciennes forêts » : +2 % de production permanente par sporulation passée, plafonné à +100 %, jalon exclusif « Ancien des forêts », titre « Pionnier de la sporulation » dans le Carnet, spore dorée au cœur du réseau) avec une note de carnet chaleureuse à la première ouverture qui les remercie comme pionniers.~~ ✅
- ~~v12 « Nouvelles planches » : 3 biomes colonisés en parallèle de la forêt principale, sur la base des planches d’épreuve de la v11 (Tourbière → tourbe, Forêt alpine → givre, Bois mort tropical → spores rares), 4 générateurs et une surface propres chacun, production continue et hors ligne, liens racinaires (bonus croisés), sélecteur de planches avec aperçus grisés, +3 espèces d’herbier. Élargie (2026-11-11, Nicolas a fini 100 % du jeu) : **épreuves à niveaux sans fin** (objectif ×10 par niveau, petite récompense cumulative par niveau, objectif adapté à la progression pour viser 20–40 min par épreuve, car en v11 elles se règlent en 9 s en fin de partie) ; **variantes rares** d’herbier (albinos, géantes) au-delà du niveau 5 ; jalons de fin de partie et compteur de « prestige de collection » dans le Carnet.~~ ✅
- v13 (prévu) « Ambiance et partage » : paysage sonore Web Audio par saison et météo (désactivé par défaut, coupé en arrière-plan), fiche « Partager ma planche » en image (partage natif ou PNG, sans serveur), cycle jour/nuit selon l’heure réelle, petite faune décorative.
