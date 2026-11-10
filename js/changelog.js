// Notes de version destinées aux joueurs (format changelog : la plus récente en premier).
// Rubriques : added (Ajouté), changed (Modifié), removed (Retiré), fixed (Corrigé).
// Pour chaque nouvelle version : ajouter une entrée EN TÊTE de liste, rédigée pour les joueurs
// (pas de jargon technique), et la traduire dans le fichier de traduction si besoin.
const CHANGELOG = [
  {
    version: '11.1', date: '2026-11-11', title: 'Correctif des épreuves',
    summary: 'L’épreuve « Sans dents » peut enfin être réussie.',
    fixed: [
      'L’épreuve « Sans dents » était impossible : sans clic, sa planche vide ne pouvait jamais acheter sa première hyphe. Elle démarre désormais avec 10 hyphes offertes.',
    ],
  },
  {
    version: '11.0', date: '2026-11-10', title: 'Sporulation continue',
    summary: 'Plus aucune remise à zéro : ton réseau reste, et tes spores se libèrent toutes seules. Tu gardes toutes celles que tu avais.',
    added: [
      'Spores continues : elles se libèrent d’elles-mêmes d’après tout ce que ton réseau a produit depuis toujours, même jeu fermé. La barre « Prochaine spore » de l’onglet Sporulation montre où tu en es.',
      'Grande fructification : à chaque palier de spores, un grand champignon sort de terre et lâche un nuage de spores. C’est juste beau à regarder : rien n’est effacé.',
      'Mutation : change d’espèce quand tu veux, l’effet est immédiat (une mutation par saison).',
      'Planches d’épreuve : les défis deviennent de petits réseaux à part, qui poussent à côté du tien sans le toucher, même jeu fermé. Les récompenses déjà gagnées restent.',
      'Pour celles et ceux qui ont sporulé avant cette version : l’Héritage des anciennes forêts (+2 % de production par sporulation passée, jusqu’à +100 %, un jalon et un titre réservés, une spore dorée au cœur du réseau).',
    ],
    changed: [
      'Tes spores sont toutes conservées, et les nouvelles s’ajoutent tout de suite à partir de là. Ton réseau actuel devient définitif.',
      'Le sucre et les évolutions sucrées sont permanents ; leurs prix ont été revus en conséquence.',
      'Germination rapide (hyphes et rhizomorphes ×3), Banque de graines (générateurs 25 % moins chers) et Sève fossile (sucre à 100 % hors ligne) ont de nouveaux effets, utiles sans cycle. Ceux qui les possédaient les gardent.',
      'Ce qui se comptait « sur ce cycle » se compte désormais au total ; les espèces et la poussée de carpophores se débloquent avec tes spores.',
    ],
    removed: [
      'La sporulation qui remettait tout à zéro, et le bouton « Sporuler ». Un défi en cours au moment de la mise à jour est annulé, sans pénalité.',
    ],
  },
  {
    version: '10.0', date: '2026-11-10', title: 'Premières pages',
    summary: 'Des notes de terrain, des objectifs et une aide « ? » pour bien démarrer, des réglages, et le jeu en anglais.',
    added: [
      'Notes de terrain : une courte note s’ouvre la première fois que tu rencontres chaque nouveauté. Toutes se relisent dans le Carnet.',
      'Premiers pas : quelques objectifs guidés pour tes premières minutes, qui disparaissent ensuite.',
      'Un « ? » sur chaque ressource, chaque onglet et chaque bonus : il explique d’où vient la valeur, multiplicateur par multiplicateur. Au survol, ou d’un appui long sur mobile.',
      'Réglages dans le Carnet : animations réduites, taille du texte, contraste renforcé, format des nombres.',
      'Le jeu existe aussi en anglais (Carnet → Réglages → Langue).',
      'Notes de version : ce bandeau à chaque nouvelle version, et tout l’historique dans le Carnet.',
    ],
    changed: [
      'La production par seconde affichée compte aussi ce que rapportent tes clics du moment (« dont … de clics »).',
      'Les premières minutes vont plus vite : le champignon de litière et la mycorhize de chêne coûtent moins cher.',
      'La fenêtre « Bon retour » détaille ce que ton réseau a produit et rapporté pendant ton absence.',
    ],
  },
  {
    version: '9.0', date: '2026-11-10', title: 'L’herbier',
    added: [
      'Onglet Herbier : 12 champignons réels à collectionner, 3 par saison, chacun avec sa planche dessinée à la plume, son nom latin et une note de carnet.',
      'Prospection : ton réseau fouille la forêt tout seul et rapporte des spécimens de la saison, même quand tu n’es pas là.',
      'Chaque espèce monte jusqu’au niveau 5 : +3 % de production par niveau, plus un effet propre (générateur, sucre, clic, pluie, sanglier, carpophores).',
      'Lueurs dans la litière : touche-les pour trouver aussitôt un spécimen, même hors saison. Les rater ne coûte rien.',
      'Relique « Loupe de naturaliste » : prospection deux fois plus rapide.',
      '5 nouveaux jalons liés à l’herbier.',
    ],
  },
  {
    version: '8.0', date: '2026-11-10', title: 'Jouable par tout le monde',
    added: [
      'Le jeu est en ligne : il suffit d’un lien pour jouer, sur ordinateur, Android, iPhone ou tablette.',
      'Jouable hors connexion, et installable comme une application (écran d’accueil du téléphone, ou application sur ordinateur).',
      'Chaque joueur a sa propre partie, gardée dans son navigateur. Rien n’est envoyé sur Internet. Pour changer d’appareil, utilise l’export / import du Carnet.',
      'Si le jeu est ouvert dans deux onglets, le premier se met en pause pour ne pas écraser ta partie (« Jouer ici » pour le reprendre).',
      'Avertissement si ton navigateur risque de ne pas garder la partie (navigation privée stricte).',
    ],
    changed: [
      'Affichage adapté à tous les écrans : téléphone en paysage, encoches, très petits écrans, tablettes.',
      'Le jeu se met toujours à jour vers la dernière version à l’ouverture.',
    ],
  },
  {
    version: '7.0', date: '2026-11-10', title: 'Une surface plus lisible',
    changed: [
      'Les carpophores à cueillir sont grands, ivoire et lumineux, avec une zone de toucher confortable au doigt. Un encart indique combien il en reste.',
      'Les champignons de litière redeviennent un simple décor discret : on ne les confond plus avec les carpophores.',
      'Les rochers de lichen sont plus gros et bien visibles, éclairés par la lune.',
    ],
  },
  {
    version: '6.0', date: '2026-11-10', title: 'L’ère de l’ambre',
    added: [
      '3 générateurs de fin de partie : Lichen pionnier, Mycélium abyssal et Noosphère fongique.',
      'Ambre : tes spores se figent d’elles-mêmes en ambre, sans rien perdre. Chaque ambre donne +25 % de production.',
      '8 reliques à acheter avec l’ambre, dont l’achat automatique des évolutions et des générateurs.',
      'Colonie rivale : un mycélium violet vient voler ta production, mais seulement quand tu joues. Repousse-le en cliquant sur le réseau.',
      'Poussée de carpophores : certains automnes, des champignons sortent de terre, à cueillir vite.',
      '3 talents, 2 évolutions sucrées, 2 évolutions globales et 10 jalons.',
    ],
    changed: [
      'Nouvel équilibrage des spores : elles ne s’emballent plus en fin de partie. Les spores déjà gagnées sont conservées.',
      'Sur mobile, revenir après une mise en veille compte comme du temps hors ligne et affiche la fenêtre « Bon retour ».',
    ],
    removed: [
      'La « Fossilisation », qui demandait de tout remettre à zéro contre de l’ambre : l’ambre se forme désormais tout seul.',
    ],
    fixed: [
      'Plus de zoom quand on tape vite sur iPhone.',
      'La planche ne reste plus vide si le jeu s’ouvre dans un onglet caché.',
    ],
  },
  {
    version: '5.0', date: '2026-11-10', title: 'Le carnet du naturaliste',
    changed: [
      'Ton réseau reste identique d’une visite à l’autre au lieu d’être redessiné au hasard.',
      'Réseau plus beau : filaments courbes, halo lumineux, pointes qui brillent, cœur qui respire, sol texturé.',
      'Nouvelle interface façon carnet de naturaliste : typographie soignée, planche du réseau encadrée, onglet « Stats » renommé « Carnet ».',
    ],
  },
  {
    version: '4.0', date: '2026-11-10', title: 'Espèces et défis',
    added: [
      '5 espèces de champignon, chacune avec son style de jeu : Claudius commun, Armillaire obscure, Pleurote carnivore, Laccaire améthyste, Truffe noire.',
      '5 défis à relever (Sans dents, Filament solitaire, Hiver éternel, Désert, Sans mémoire), chacun avec une récompense permanente.',
      '3 nouveaux jalons.',
    ],
  },
  {
    version: '3.0', date: '2026-11-10', title: 'Le sucre des arbres',
    added: [
      'Sucre, une 2ᵉ ressource : les arbres avec qui tu pactises te paient en sucre.',
      '7 évolutions sucrées.',
      'Sanglier truffier : il traverse parfois la surface. Clique-le pour un gros gain et une production doublée.',
      'Sécheresse : certains étés, la production baisse et la pluie s’arrête. Arrose avec ton sucre pour y mettre fin.',
      '5 nouveaux jalons.',
    ],
    changed: [
      'Surface redessinée : ciel selon la saison, vrais arbres, racines dorées par où descend le sucre, feuilles mortes et neige.',
    ],
  },
  {
    version: '2.0', date: '2026-11-10', title: 'L’arbre de spores',
    added: [
      'Arbre de spores : 11 talents permanents en 3 branches, achetés avec tes spores.',
      'Export / import de la sauvegarde, pour garder ta partie ou la passer sur un autre appareil.',
      'Aperçus grisés du contenu encore verrouillé, avec sa condition de déblocage.',
      '2 nouveaux jalons.',
    ],
  },
  {
    version: '1.0', date: '2026-11-10', title: 'Première germination',
    added: [
      'Tu es Claudius, une spore qui germe sous la forêt. Clique pour digérer la litière.',
      '8 générateurs, de l’Hyphe au Mycélium continental.',
      'Saisons qui favorisent certaines parties du réseau, et gouttes de pluie à attraper.',
      'Évolutions, jalons, et Sporulation pour gagner des spores.',
      'Sauvegarde automatique et gains hors ligne.',
    ],
  },
];
