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
- **Sporulation** (prestige, dès 1 M) : spores = (total du cycle / 1 M)^¼, +5 % chacune (racine carrée avant la v6).
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
- `js/data.js` — tout le contenu chiffré (générateurs, saisons, évolutions, jalons, talents, sucre, événements, ambre et reliques, herbier, notes de terrain et objectifs guidés) : c'est ici qu'on ajoute.
- `js/i18n.js` — tous les textes, en français et en anglais (v10) : chaque ajout de contenu y met ses textes dans les deux langues.
- `js/game.js` — logique pure et sauvegarde.
- `js/network.js` — rendu canvas du réseau.
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
- v11 (prévu) « Sporulation continue » : plus aucune remise à zéro — les spores se libèrent en continu d’après le total produit depuis toujours (courbe ≈ racine 4ᵉ, plafond de sécurité ; étude au simulateur : rythme comparable à l’actuel), grande fructification visuelle à chaque palier ; mutation d’espèce à tout moment (1 par saison) ; défis transformés en planches d’épreuve parallèles ; remplacement des bonus de début de cycle (Germination rapide, Banque de graines, Sève fossile) ; sucre et évolutions sucrées permanents (prix revus) ; migration sans perte des parties existantes ; **compensation des joueurs qui ont déjà sporulé** (« Héritage des anciennes forêts » : +2 % de production permanente par sporulation passée, plafonné à +100 %, jalon exclusif « Ancien des forêts », titre « Pionnier de la sporulation » dans le Carnet, spore dorée au cœur du réseau) avec une note de carnet chaleureuse à la première ouverture qui les remercie comme pionniers.
- v12 (prévu) « Nouvelles planches » : 3 biomes colonisés en parallèle de la forêt principale, sur la base des planches d’épreuve de la v11 (Tourbière → tourbe, Forêt alpine → givre, Bois mort tropical → spores rares), 4 générateurs et une surface propres chacun, production continue et hors ligne, liens racinaires (bonus croisés), sélecteur de planches avec aperçus grisés, +3 espèces d’herbier.
- v13 (prévu) « Ambiance et partage » : paysage sonore Web Audio par saison et météo (désactivé par défaut, coupé en arrière-plan), fiche « Partager ma planche » en image (partage natif ou PNG, sans serveur), cycle jour/nuit selon l’heure réelle, petite faune décorative.
