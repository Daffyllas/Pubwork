// Les mots des pages françaises ajoutées pour le lancement : autres convertisseurs, outils de création, pages par
// appareil, guides, soutien, et nouvelles versions de la confidentialité et des conditions. {email}, {site} et {kofi}
// viennent de site.config.json.
export default {
  slugs: {
    compare: "comparatif-editeurs-pub",
    edit: "modifier-fichier-pub",
    word: 'pub-en-word', batch: 'convertir-plusieurs-fichiers-pub', alternative: 'alternative-a-publisher',
    mac: 'ouvrir-fichier-pub-sur-mac', chromebook: 'ouvrir-fichier-pub-sur-chromebook', mobile: 'ouvrir-fichier-pub-sur-iphone-ipad-android',
    flyer: 'creer-un-flyer', menu: 'creer-un-menu', invitation: 'creer-une-invitation', certificate: 'creer-un-diplome',
    newsletter: 'creer-un-bulletin', calendar: 'creer-un-calendrier', labels: 'creer-des-etiquettes',
    retired: 'fin-de-publisher', 'guide-merge': 'publipostage', 'guide-booklet': 'imprimer-un-livret',
    'guide-labels': 'imprimer-etiquettes-et-cartes-de-visite', it: 'pour-les-services-informatiques', support: 'soutenir',
  },
  nav: {
    compare: "Comparatif des éditeurs .pub",
    edit: "Modifier un fichier .pub",
    word: '.pub en Word', batch: 'Convertir plusieurs fichiers', alternative: 'Alternative à Publisher',
    mac: 'Sur Mac', chromebook: 'Sur Chromebook', mobile: 'Sur téléphone ou tablette',
    flyer: 'Créer un flyer', menu: 'Créer un menu', invitation: 'Créer une invitation', certificate: 'Créer un diplôme',
    newsletter: 'Créer un bulletin', calendar: 'Créer un calendrier', labels: 'Créer des étiquettes',
    retired: 'Publisher est arrêté : et maintenant ?', 'guide-merge': 'Publipostage', 'guide-booklet': 'Imprimer un livret',
    'guide-labels': 'Imprimer étiquettes et cartes de visite', it: 'Pour les services informatiques', support: 'Soutenir Pubwork',
  },
  navGroups: { convert: 'Ouvrir et convertir', make: 'Créer quelque chose de nouveau', help: 'Aide et guides' },
  openApp: 'Ouvrir Pubwork',
  pages: {
    edit: {
      title: "Modifier un fichier .pub en ligne, gratuit – éditeur Publisher | Pubwork",
      desc: "Modifiez vos fichiers Microsoft Publisher (.pub) dans le navigateur, gratuitement et sans Publisher. Changez textes, images et pages, puis enregistrez en PDF ou Word, ou imprimez. Rien à installer, rien n’est envoyé.",
      h1: "Modifiez vos fichiers Publisher en ligne, gratuitement",
      lede: "Changer le texte, remplacer une image, ajouter une page : Pubwork est un éditeur de fichiers .pub gratuit qui fonctionne dans votre navigateur, sans licence Publisher ni installation.",
      steps: [
        ["Ouvrez le fichier .pub", "Cliquez sur « Choisir un fichier Publisher » ou faites glisser le fichier sur cette page. Chaque page s’affiche telle qu’elle a été créée."],
        ["Faites vos modifications", "Double-cliquez sur un texte pour écrire. Cliquez sur une image pour la remplacer ou la recadrer. Ajoutez zones de texte, formes, WordArt, tableaux et pages depuis la barre d’outils."],
        ["Enregistrez ou imprimez", "Enregistrez en PDF, Word ou images, gardez un fichier Pubwork pour le modifier plus tard, ou imprimez, y compris en livret et en étiquettes."],
      ],
      faq: [
        ["Puis-je modifier un fichier .pub sans Microsoft Publisher ?", "Oui. Pubwork lit le fichier lui-même : vous n’avez besoin ni de Publisher ni d’un abonnement Microsoft 365."],
        ["Puis-je enregistrer mes modifications au format .pub ?", "Non. Le format .pub est fermé, donc Pubwork enregistre en PDF, Word, PowerPoint ou images, ou dans son propre fichier Pubwork, que vous pouvez rouvrir et modifier."],
        ["Que puis-je modifier ?", "Textes et polices, images, formes, WordArt, tableaux, couleurs, format de page et ordre des pages. Les pages maîtres, les colonnes et le texte qui passe d’une zone à l’autre fonctionnent aussi."],
        ["Mon fichier est-il envoyé en ligne ?", "Non. Tout se passe dans votre navigateur : le fichier reste sur votre ordinateur."],
      ],
    },
    word: {
      title: 'Convertir .pub en Word (.docx) en ligne, gratuit – sans envoi | Pubwork',
      desc: 'Transformez un fichier Microsoft Publisher (.pub) en document Word qui garde sa mise en page : zones de texte, images et formes restent à leur place. Gratuit, sans compte, rien n’est envoyé.',
      h1: 'Convertir .pub en Word, gratuitement',
      lede: 'Choisissez un fichier Publisher et un document Word est enregistré aussitôt. Zones de texte, images et formes restent à leur place, et le texte reste modifiable.',
      steps: [
        ['Choisissez votre fichier .pub', 'Cliquez sur le bouton ou glissez le fichier sur cette page. Vous pouvez aussi en choisir plusieurs à la fois.'],
        ['Il est converti sur votre ordinateur', 'Pubwork lit le fichier dans votre navigateur. Rien n’est envoyé nulle part.'],
        ['Ouvrez-le dans Word', 'Le fichier .docx arrive dans le dossier Téléchargements. Il s’ouvre dans Word, Google Docs et LibreOffice.'],
      ],
      faq: [
        ['Le fichier Word ressemblera-t-il à ma page Publisher ?', 'Oui, autant que Word le permet. Chaque zone de texte, image et forme est placée au même endroit sur la page. Word est un traitement de texte, pas un logiciel de mise en page : pour déplacer des éléments ensuite, c’est plus simple dans Pubwork.'],
        ['Puis-je encore modifier le texte ?', 'Oui. C’est du vrai texte, dans des zones de texte Word, avec ses polices, ses tailles et ses couleurs.'],
        ['Pourquoi ne pas enregistrer en PDF puis l’ouvrir dans Word ?', 'Par ce chemin, il ne reste souvent que le texte : les images bougent, les zones se séparent et le texte se retrouve sur la mauvaise page. Pubwork lit directement le fichier Publisher, la mise en page est donc conservée.'],
        ['J’ai des centaines de fichiers. Dois-je les faire un par un ?', 'Non. Choisissez plusieurs fichiers à la fois, ou un dossier entier, et vous obtenez un seul fichier .zip avec un document Word pour chacun.'],
        ['Mon fichier est-il envoyé en ligne ?', 'Non. Tout se passe dans votre navigateur. Votre fichier ne quitte jamais votre ordinateur.'],
      ],
    },
    batch: {
      title: 'Convertir plusieurs fichiers .pub à la fois – un dossier entier en PDF ou Word, gratuit | Pubwork',
      desc: 'Convertissez des centaines de fichiers Microsoft Publisher (.pub) d’un coup : choisissez un dossier et recevez chaque fichier en PDF, Word, JPG ou PNG dans un seul .zip. Gratuit, sans envoi, sans Publisher.',
      h1: 'Convertissez tous vos fichiers .pub d’un coup',
      lede: 'Choisissez PDF ou Word, puis un dossier entier de fichiers Publisher. Chaque fichier est converti sur votre ordinateur, et tout revient ensemble dans un seul fichier .zip.',
      steps: [
        ['Choisissez PDF, Word, JPG ou PNG', 'Le PDF garde l’apparence, pour imprimer et partager. Word garde le texte modifiable.'],
        ['Choisissez un dossier ou plusieurs fichiers', 'Cliquez sur « Choisir un dossier » pour prendre tous les fichiers .pub qu’il contient, y compris dans ses sous-dossiers.'],
        ['Recevez un seul fichier .zip', 'Vos dossiers sont conservés, et une courte liste indique comment chaque fichier s’est passé.'],
      ],
      faq: [
        ['Combien de fichiers puis-je convertir ?', 'Autant que vous voulez. Chaque fichier prend quelques secondes. Pour des milliers de fichiers, faites un dossier à la fois et laissez l’onglet du navigateur ouvert.'],
        ['Faut-il avoir Publisher installé ?', 'Non. Le script de conversion en masse de Microsoft demande une copie de Publisher sous licence ; Pubwork n’a besoin que d’un navigateur.'],
        ['Mes fichiers sont-ils envoyés en ligne ?', 'Non. Les fichiers sont lus et convertis dans votre navigateur, ils ne quittent donc jamais votre ordinateur. C’est aussi pour cela qu’il convient aux fichiers d’école, de paroisse et d’entreprise.'],
        ['Et si un fichier ne peut pas être lu ?', 'Il est mis de côté et les autres continuent. La liste dans le .zip nomme chaque fichier qui n’a pas pu être converti, et pourquoi.'],
        ['Que choisir, PDF ou Word ?', 'Le PDF si vous voulez simplement garder, imprimer ou partager vos fichiers : il ressemble exactement à la page. Word si vous devez modifier le texte plus tard dans Word. Vous pouvez aussi continuer à les modifier dans Pubwork.'],
      ],
    },
    alternative: {
      title: 'Alternative gratuite à Microsoft Publisher – ouvre vos fichiers .pub | Pubwork',
      desc: 'Une alternative gratuite à Microsoft Publisher qui ouvre vos anciens fichiers .pub, fonctionne dans tout navigateur, avec modèles, publipostage, étiquettes, livrets et calendriers. Rien à télécharger, sans compte.',
      h1: 'L’alternative gratuite à Publisher qui ouvre vos fichiers .pub',
      lede: 'Continuez à utiliser les fichiers créés avec Publisher, et créez de nouveaux flyers, menus, bulletins et cartes comme vous en avez l’habitude. Gratuit, dans votre navigateur, sur Windows, Mac et Chromebook.',
      intro: [
        'Microsoft a arrêté Publisher en octobre 2026 et propose à la place Word, PowerPoint ou Designer. Ce sont de bons programmes, mais ils n’ouvrent pas les fichiers .pub et ne sont pas faits pour mettre en page. Pubwork, si : des zones de texte que vous placez où vous voulez, du texte qui passe d’une zone à l’autre, des images, des formes, des tableaux et des pages.',
      ],
      steps: [
        ['Ouvrez un ancien fichier ou un modèle', 'Glissez un fichier .pub, ou choisissez l’un des plus de 150 modèles gratuits.'],
        ['Modifiez-le comme dans Publisher', 'Double-cliquez sur un texte pour écrire. Faites glisser les éléments pour les déplacer. Un clic change toutes les couleurs ou les polices.'],
        ['Imprimez ou enregistrez', 'Imprimez des livrets, des étiquettes et plusieurs exemplaires par feuille, ou enregistrez en PDF, Word ou images.'],
      ],
      why: [
        ['Ouvre vos fichiers .pub', 'Les fichiers de Publisher 97 à Microsoft 365, avec leur texte, leurs images et leur mise en page.'],
        ['Les fonctions que vous utilisiez', 'Publipostage, étiquettes, cartes de visite, livrets, calendriers, blocs prêts à l’emploi et vérification avant impression.'],
        ['Gratuit et privé', 'Sans compte, sans abonnement, et vos fichiers ne quittent jamais votre ordinateur.'],
      ],
      faq: [
        ['Pubwork est-il vraiment gratuit ?', 'Oui. Ouvrir, modifier, imprimer et enregistrer est gratuit, sans filigrane et sans limite. Le site peut afficher de la publicité sur ses pages d’information, jamais dans l’éditeur.'],
        ['Puis-je enregistrer de nouveau en .pub ?', 'Non. Microsoft n’a jamais publié comment écrire des fichiers .pub. Pubwork les ouvre et enregistre dans son propre format, ainsi qu’en PDF, Word, LibreOffice Draw, JPG et PNG.'],
        ['Est-il aussi complet que Publisher ?', 'Pour le travail de tous les jours (flyers, bulletins, menus, cartes, étiquettes, livrets, publipostage), il fait ce pour quoi la plupart des gens utilisaient Publisher. Il a aussi WordArt, la séparation des couleurs pour les imprimeurs, les styles, les pages maîtres et la vérification orthographique. Il ne peut pas réenregistrer en .pub, et quelques outils rarement utilisés de Publisher, comme ses fonctions de pages web, manquent.'],
        ['Dois-je apprendre quelque chose de nouveau ?', 'Très peu. La page est au milieu, les pages à gauche, et les options de ce que vous avez cliqué à droite, comme dans Publisher.'],
        ['Et Word, PowerPoint, Canva ou Scribus ?', 'Word et PowerPoint n’ouvrent pas les fichiers .pub et sont peu pratiques pour la mise en page. Canva demande un compte et n’ouvre pas les fichiers .pub. Scribus et LibreOffice Draw sont puissants mais plus difficiles à apprendre. Pubwork est fait pour ressembler à Publisher.'],
      ],
    },
    mac: {
      title: 'Ouvrir un fichier .pub sur Mac – gratuit, sans Publisher | Pubwork',
      desc: 'Publisher n’a jamais existé sur Mac. Ouvrez vos fichiers Microsoft Publisher (.pub) sur Mac dans Safari, Chrome ou Firefox, puis modifiez-les, imprimez-les ou enregistrez-les en PDF ou Word. Gratuit, rien à installer.',
      h1: 'Ouvrez vos fichiers .pub sur Mac',
      lede: 'Il n’y a jamais eu de version Mac de Publisher. Pubwork ouvre les fichiers .pub ici même, dans Safari, Chrome ou Firefox, sans rien installer.',
      steps: [
        ['Choisissez le fichier', 'Cliquez sur « Choisir un fichier Publisher », ou glissez le fichier .pub depuis le Finder sur cette page.'],
        ['Regardez-le et modifiez-le', 'Chaque page apparaît telle qu’elle a été créée. Double-cliquez sur un texte pour le modifier.'],
        ['Imprimez ou enregistrez', 'Enregistrez-le en PDF ou en Word, ou imprimez-le. Dans la fenêtre d’impression, choisissez l’échelle 100 %.'],
      ],
      faq: [
        ['Est-ce que ça marche dans Safari ?', 'Oui, dans Safari 15 ou plus récent, ainsi que dans Chrome, Firefox et Edge pour Mac.'],
        ['Les polices seront-elles correctes ?', 'Les polices Windows comme Calibri et Cambria sont affichées avec des polices libres exactement de même largeur, pour que les lignes se coupent au même endroit. Les polices incluses dans le fichier sont utilisées telles quelles.'],
        ['Puis-je ouvrir un fichier .pub dans Pages ou Keynote ?', 'Non. Les applications d’Apple n’ouvrent pas les fichiers Publisher. Enregistrez depuis Pubwork en PDF, ou en Word (.docx), que Pages sait ouvrir.'],
        ['Mon fichier est-il envoyé en ligne ?', 'Non. Pubwork fonctionne dans votre navigateur, le fichier reste donc sur votre Mac.'],
      ],
    },
    chromebook: {
      title: 'Ouvrir un fichier .pub sur Chromebook – gratuit | Pubwork',
      desc: 'Ouvrez vos fichiers Microsoft Publisher (.pub) sur un Chromebook, y compris depuis Google Drive. Modifiez, imprimez, ou enregistrez en PDF ou Word. Gratuit, dans Chrome, rien à installer.',
      h1: 'Ouvrez vos fichiers .pub sur un Chromebook',
      lede: 'Publisher n’a jamais fonctionné sur ChromeOS. Pubwork ouvre les fichiers .pub dans Chrome, directement depuis votre Chromebook ou Google Drive.',
      steps: [
        ['Choisissez le fichier', 'Cliquez sur « Choisir un fichier Publisher ». Dans la fenêtre Fichiers, votre Google Drive apparaît à gauche.'],
        ['Regardez-le et modifiez-le', 'Chaque page apparaît telle qu’elle a été créée. Double-cliquez sur un texte pour le modifier.'],
        ['Imprimez ou enregistrez', 'Enregistrez en PDF ou en Word dans Téléchargements ou dans Google Drive, ou imprimez-le.'],
      ],
      faq: [
        ['Les élèves et le personnel peuvent-ils l’utiliser sur les Chromebooks de l’école ?', 'Oui. Rien n’est installé, aucun compte n’est nécessaire et les fichiers ne sont jamais envoyés en ligne : il convient donc aux documents scolaires. Les services informatiques trouveront plus d’informations sur notre page qui leur est consacrée.'],
        ['Puis-je ouvrir un fichier .pub depuis Google Drive ?', 'Oui. Choisissez-le dans la fenêtre Fichiers, où Google Drive apparaît à gauche. Google Drive lui-même ne sait pas afficher les fichiers .pub.'],
        ['Puis-je l’enregistrer dans Google Docs ?', 'Enregistrez-le en Word (.docx), puis ouvrez-le dans Google Docs. Ou enregistrez en PDF pour garder exactement l’apparence.'],
        ['Faut-il une connexion Internet ?', 'Seulement pour charger la page. Vos fichiers sont ensuite ouverts, modifiés et enregistrés sur le Chromebook lui-même, jamais sur un serveur.'],
      ],
    },
    mobile: {
      title: 'Ouvrir un fichier .pub sur iPhone, iPad et Android – gratuit | Pubwork',
      desc: 'Ouvrez vos fichiers Microsoft Publisher (.pub) sur téléphone ou tablette, dans Safari ou Chrome. Voyez chaque page, puis enregistrez en PDF ou en images, ou imprimez. Gratuit, aucune application à installer.',
      h1: 'Ouvrez vos fichiers .pub sur téléphone ou tablette',
      lede: 'On vous a envoyé un fichier .pub ? Ouvrez-le ici dans Safari ou Chrome, sur iPhone, iPad ou Android, sans installer d’application.',
      steps: [
        ['Choisissez le fichier', 'Touchez « Choisir un fichier Publisher » et prenez-le dans Fichiers, Téléchargements ou vos pièces jointes.'],
        ['Regardez chaque page', 'Faites défiler les pages, et utilisez + et − pour zoomer.'],
        ['Enregistrez ou partagez', 'Enregistrez-le en PDF ou en images, qui s’ouvrent dans n’importe quelle application, ou imprimez-le.'],
      ],
      faq: [
        ['Quels téléphones et tablettes fonctionnent ?', 'iPhone et iPad avec Safari ou Chrome, et téléphones et tablettes Android avec Chrome, datant d’environ cinq ans ou moins.'],
        ['Comment ouvrir un fichier .pub reçu par e-mail ?', 'Enregistrez d’abord la pièce jointe (sur iPhone : touchez-la, puis Partager, puis Enregistrer dans Fichiers), puis revenez ici et choisissez-la.'],
        ['Puis-je modifier sur un téléphone ?', 'Vous pouvez changer le texte et déplacer des éléments, mais sur un petit écran c’est peu pratique. Pour plus que de petites retouches, utilisez une tablette ou un ordinateur.'],
        ['Mon fichier est-il envoyé en ligne ?', 'Non. Il est ouvert dans votre navigateur et reste sur votre téléphone.'],
      ],
    },
    flyer: {
      title: 'Créer un flyer gratuit – flyers et affiches prêts à imprimer, sans inscription | Pubwork',
      desc: 'Créez un flyer ou une affiche en quelques minutes à partir d’un modèle gratuit : événement, soldes, animal perdu, cours, concert. Imprimez-le, ou enregistrez en PDF ou en images. Sans compte, sans filigrane.',
      h1: 'Créer un flyer gratuitement',
      lede: 'Choisissez un modèle, changez le texte et la photo, et imprimez. Événement, soldes, animal perdu, vide-grenier, cours ou concert : prêt en quelques minutes.',
      cta: 'Choisir un modèle de flyer', ctaHint: 'Modèles gratuits, sans compte, sans filigrane.',
      steps: [
        ['Choisissez un modèle', 'Prenez l’un des modèles de flyer. Essayez d’autres couleurs et polices d’un seul clic.'],
        ['Personnalisez-le', 'Double-cliquez sur un texte pour écrire. Double-cliquez sur le cadre photo pour ajouter votre propre image.'],
        ['Imprimez ou partagez', 'Imprimez-le, mettez-en 2 ou 4 sur une feuille, ou enregistrez en PDF, JPG ou PNG pour Facebook et WhatsApp.'],
      ],
      faq: [
        ['Puis-je l’utiliser gratuitement pour mon entreprise ?', 'Oui. Les modèles, images et icônes sont libres d’utilisation pour tout usage, y compris pour votre entreprise, sur papier et en ligne.'],
        ['Puis-je ajouter des languettes détachables avec mon numéro ?', 'Oui. Cliquez sur Blocs, puis Bons et coupons détachables, et ajoutez des languettes détachables avec votre numéro de téléphone.'],
        ['Puis-je imprimer plusieurs flyers sur une feuille ?', 'Oui. Cliquez sur Imprimer et choisissez 2 ou 4 exemplaires par feuille.'],
        ['Puis-je faire une grande affiche ?', 'Choisissez le format A3 ou Tabloïd, ou enregistrez un PDF pour un imprimeur, avec fond perdu et traits de coupe.'],
      ],
    },
    menu: {
      title: 'Créer un menu gratuit – restaurant, café et carte des boissons | Pubwork',
      desc: 'Créez un menu de restaurant, de café, de brasserie ou une carte des boissons à partir d’un modèle gratuit, ou transformez votre liste de prix Excel en menu d’un coup. Imprimez ou enregistrez en PDF. Sans compte.',
      h1: 'Créer un menu gratuitement',
      lede: 'Choisissez un modèle de menu et tapez vos plats, ou créez tout le menu d’un coup à partir d’une liste de plats et de prix dans Excel.',
      cta: 'Choisir un modèle de menu', ctaHint: 'Café, restaurant, pizzeria, menu enfant, carte des boissons et plus.',
      steps: [
        ['Choisissez un modèle', 'Prenez un modèle de menu et essayez d’autres couleurs et polices d’un seul clic.'],
        ['Ajoutez vos plats', 'Tapez-les, ou utilisez Publipostage pour créer le menu à partir d’une liste de plats, de prix et de photos.'],
        ['Imprimez-le', 'Imprimez chez vous, ou enregistrez un PDF avec traits de coupe pour un imprimeur.'],
      ],
      faq: [
        ['Puis-je créer un menu à partir de ma liste de prix Excel ?', 'Oui. Ouvrez la fenêtre Publipostage, choisissez votre liste, puis « Créer une liste de prix ou un catalogue ». Rubriques, prix, descriptions et photos sont mis en page pour vous.'],
        ['Puis-je changer les prix plus tard ?', 'Oui. Enregistrez votre menu en fichier Pubwork et rouvrez-le chaque fois que les prix changent.'],
        ['Puis-je faire un menu pour un chevalet de table ou une vitrine ?', 'Oui. Choisissez n’importe quel format, de la carte A6 à l’affiche A3.'],
        ['Puis-je ouvrir mon ancien menu Publisher ?', 'Oui. Ouvrez le fichier .pub ici, changez les prix et imprimez-le.'],
      ],
    },
    invitation: {
      title: 'Créer une invitation ou une carte gratuite – anniversaire, mariage, baptême | Pubwork',
      desc: 'Créez des invitations et des cartes pour un anniversaire, un mariage, un baptême, Noël ou un remerciement à partir de modèles gratuits. Imprimez-les, ou envoyez-les en image. Sans inscription.',
      h1: 'Créer une invitation ou une carte gratuitement',
      lede: 'Anniversaire, mariage, baptême, Noël ou remerciement : choisissez un modèle, ajoutez vos informations, puis imprimez ou envoyez.',
      cta: 'Choisir un modèle d’invitation', ctaHint: 'Des modèles gratuits pour chaque occasion.',
      steps: [
        ['Choisissez un modèle', 'Prenez une invitation ou une carte, et essayez d’autres couleurs et polices.'],
        ['Ajoutez vos informations', 'Tapez le nom, la date et le lieu. Ajoutez une photo si vous le souhaitez.'],
        ['Imprimez ou envoyez', 'Imprimez-en plusieurs sur une feuille, ou enregistrez-la en image pour l’envoyer sur WhatsApp.'],
      ],
      faq: [
        ['Puis-je mettre le nom de chaque invité sur son invitation ?', 'Oui. Utilisez Publipostage avec une liste de noms : chaque invitation reçoit son propre nom, prête à imprimer.'],
        ['Puis-je imprimer 2 ou 4 invitations sur une feuille ?', 'Oui. Cliquez sur Imprimer et choisissez 2 ou 4 exemplaires par feuille, puis découpez.'],
        ['Puis-je l’envoyer sur WhatsApp ou par e-mail ?', 'Oui. Enregistrez-la en JPG ou PNG et envoyez l’image.'],
        ['Les modèles sont-ils gratuits ?', 'Oui, tous, pour un usage personnel comme professionnel.'],
      ],
    },
    certificate: {
      title: 'Créer un diplôme ou un certificat gratuit – avec les noms d’une liste Excel | Pubwork',
      desc: 'Créez des diplômes, certificats et attestations à partir de modèles gratuits, et remplissez tous les noms depuis une liste Excel d’un coup. Imprimez ou enregistrez en PDF. Sans compte, sans filigrane.',
      h1: 'Créer un diplôme ou un certificat gratuitement',
      lede: 'Créez un seul certificat, ou un pour chaque élève, joueur ou employé d’un coup : choisissez un modèle, puis remplissez les noms depuis votre liste.',
      cta: 'Choisir un modèle de certificat', ctaHint: 'Récompenses, formations, employé du mois, diplômes.',
      steps: [
        ['Choisissez un modèle', 'Prenez un certificat et essayez d’autres couleurs et polices.'],
        ['Ajoutez les noms', 'Tapez un nom, ou cliquez sur Publipostage et choisissez votre liste Excel ou CSV.'],
        ['Imprimez-les tous', 'Chaque nom a sa propre page, prête à imprimer ou à enregistrer dans un seul PDF.'],
      ],
      faq: [
        ['Comment faire des diplômes pour toute une classe ?', 'Mettez les noms dans Excel ou Google Sheets, avec un titre comme « Nom » sur la première ligne. Cliquez sur Publipostage, choisissez la liste, placez le champ «Nom» sur le certificat et cliquez sur « Créez toutes les pages ».'],
        ['Puis-je ajouter une signature ou un logo ?', 'Oui. Ajoutez une image de la signature ou du logo, ou enregistrez votre logo une fois pour toutes dans « Mes coordonnées ».'],
        ['Y a-t-il un filigrane ?', 'Non. Tout est gratuit et sans filigrane.'],
        ['Puis-je imprimer sur du papier cartonné ?', 'Oui. Imprimez à l’échelle 100 % sur du papier cartonné A4 ou Letter.'],
      ],
    },
    newsletter: {
      title: 'Créer un bulletin d’information gratuit – école, paroisse, association | Pubwork',
      desc: 'Créez le bulletin d’une école, d’une paroisse, d’une association ou d’une entreprise à partir d’un modèle gratuit, avec colonnes, photos et texte qui suit d’une page à l’autre. Ouvrez aussi vos anciens bulletins Publisher.',
      h1: 'Créer un bulletin d’information gratuitement',
      lede: 'Partez d’un modèle de bulletin, ou ouvrez le bulletin Publisher du mois dernier et changez simplement les nouvelles.',
      cta: 'Choisir un modèle de bulletin', ctaHint: 'Bulletins d’école, de paroisse, d’association, de quartier et d’entreprise.',
      steps: [
        ['Partez d’un modèle ou du mois dernier', 'Choisissez un modèle de bulletin, ou ouvrez votre ancien bulletin .pub.'],
        ['Changez les nouvelles', 'Le texte passe d’une zone à l’autre, d’une page à l’autre. Double-cliquez sur les photos pour les remplacer.'],
        ['Imprimez ou envoyez par e-mail', 'Imprimez-le en livret plié, ou enregistrez-le en PDF pour l’envoyer par e-mail.'],
      ],
      faq: [
        ['Puis-je ouvrir les bulletins que j’ai faits avec Publisher ?', 'Oui. Ouvrez le fichier .pub, changez la date et les nouvelles, puis imprimez-le ou enregistrez-le.'],
        ['Puis-je l’imprimer en livret plié ?', 'Oui. Cliquez sur Imprimer, choisissez Livret et imprimez en recto verso. Pubwork met les pages dans le bon ordre.'],
        ['Et si mon article est trop long pour sa zone ?', 'La zone indique que le texte ne tient pas, et Vérifier liste avant l’impression toutes les zones qui ont trop de texte.'],
        ['Puis-je l’envoyer par e-mail ?', 'Enregistrez-le en PDF : il est léger et s’affiche de la même façon sur tous les ordinateurs.'],
      ],
    },
    calendar: {
      title: 'Créer un calendrier gratuit – calendrier photo avec jours fériés et anniversaires | Pubwork',
      desc: 'Créez un calendrier photo, un planning mensuel ou un planning annuel pour n’importe quelle année, avec les jours fériés de votre pays et vos propres anniversaires. Imprimez-le ou enregistrez en PDF. Gratuit.',
      h1: 'Créer un calendrier gratuitement',
      lede: 'Choisissez l’année et les mois, ajoutez vos photos, les jours fériés de votre pays et les anniversaires de votre famille, puis imprimez.',
      cta: 'Créer un calendrier', ctaHint: 'Calendrier photo, planning mensuel ou planning annuel.',
      steps: [
        ['Choisissez un type', 'Une photo pour chaque mois, un planning mensuel avec de la place pour écrire, ou toute l’année sur une page.'],
        ['Ajoutez jours fériés et dates', 'Choisissez votre pays pour les jours fériés et ajoutez anniversaires et autres dates.'],
        ['Ajoutez des photos et imprimez', 'Choisissez une photo pour chaque mois, puis imprimez ou enregistrez en PDF.'],
      ],
      faq: [
        ['Les jours fériés de quels pays sont inclus ?', 'Plus de 20 pays, dont le Royaume-Uni, l’Irlande, les États-Unis, le Canada, l’Australie, l’Espagne, l’Allemagne, la France, l’Italie, le Portugal, le Brésil, le Mexique et la Grèce. Vous pouvez ajouter vous-même n’importe quelle autre date.'],
        ['Le calendrier peut-il commencer en septembre ?', 'Oui. Choisissez n’importe quel mois de départ, par exemple pour une année scolaire, et jusqu’à 24 mois.'],
        ['Les semaines peuvent-elles commencer le dimanche ?', 'Oui. Choisissez lundi ou dimanche.'],
        ['Mes anniversaires sont-ils gardés ?', 'Oui, dans votre propre navigateur : le calendrier de l’an prochain les aura déjà. Ils ne sont jamais envoyés nulle part.'],
      ],
    },
    labels: {
      title: 'Créer des étiquettes gratuites – étiquettes d’adresse, badges, cartes de visite sur planches Avery | Pubwork',
      desc: 'Créez des étiquettes d’adresse, des badges, des étiquettes de prix et des cartes de visite, et imprimez-les sur planches Avery, Herma ou Zweckform. Remplissez-les depuis une liste Excel. Gratuit, sans compte.',
      h1: 'Créer des étiquettes gratuitement',
      lede: 'Étiquettes d’adresse, badges, étiquettes de rayon et de prix, et cartes de visite, imprimés sur les planches d’étiquettes que vous avez déjà.',
      cta: 'Choisir un modèle d’étiquette', ctaHint: 'Ou partez d’une étiquette ou d’une carte de visite vierge.',
      steps: [
        ['Choisissez un modèle', 'Prenez une étiquette, un badge ou une carte de visite, ou partez d’un modèle vierge.'],
        ['Ajoutez les noms d’une liste', 'Tapez le texte, ou utilisez Publipostage pour mettre chaque nom et adresse de votre liste Excel sur sa propre étiquette.'],
        ['Imprimez sur vos planches', 'Cliquez sur Imprimer, choisissez Étiquettes et la référence de votre planche, comme Avery L7160 ou 5160.'],
      ],
      faq: [
        ['Quelles planches d’étiquettes fonctionnent ?', 'Les planches Avery courantes (L7160, L7161, L7162, L7163, L7165, L7173, L7651, 5160, 5161, 5163, 5164, 5167), Avery Zweckform 3474 et 3490, et les planches de cartes de visite C32011 et 8371.'],
        ['Comment imprimer des étiquettes d’adresse depuis Excel ?', 'Cliquez sur Publipostage, choisissez votre liste Excel, placez les champs sur l’étiquette, puis « Créez toutes les pages ». Dans Imprimer, choisissez Étiquettes : chaque emplacement de la planche reçoit l’adresse suivante.'],
        ['Comment imprimer 10 cartes de visite sur une feuille ?', 'Créez une carte au format carte de visite, cliquez sur Imprimer et choisissez « Remplir la feuille », ou une planche de cartes de visite sous Étiquettes.'],
        ['Les étiquettes ne tombent pas juste. Que faire ?', 'Dans la fenêtre d’impression, choisissez « Taille réelle » ou l’échelle 100 %, et désactivez « Ajuster à la page ».'],
      ],
    },
  },

  // ---------------------------------------------------------------- guides
  retired: {
    title: 'Fin de Microsoft Publisher : que faire de vos fichiers .pub ? | Pubwork',
    desc: 'Microsoft Publisher a quitté Microsoft 365 le 1er octobre 2026. Un guide simple, étape par étape, pour retrouver, conserver, ouvrir et convertir vos fichiers .pub, sans Publisher.',
    h1: 'Publisher est arrêté. Que faire de mes fichiers ?',
    updated: 'Dernière mise à jour : {date}',
    body: [
      ['p', 'Si vous avez créé des bulletins, des flyers, des menus ou des cartes avec Microsoft Publisher, vos fichiers sont toujours là et vous pouvez encore les utiliser. Voici ce qui a changé, et ce que vous pouvez faire, étape par étape.'],
      ['h', 'Ce qui s’est passé'],
      ['ul', [
        'Microsoft a retiré Publisher de Microsoft 365 le 1er octobre 2026.',
        'Le support des versions achetées une fois (Publisher 2016, 2019 et 2021) a pris fin le 13 octobre 2026. Elles s’ouvrent peut-être encore sur votre ordinateur, mais ne reçoivent plus de mises à jour de sécurité.',
        'Aucun autre programme Microsoft n’ouvre les fichiers .pub : ni Word, ni PowerPoint, ni Designer.',
      ]],
      ['h', '1. Retrouvez vos fichiers .pub'],
      ['p', 'Sur Windows, ouvrez l’Explorateur de fichiers, cliquez dans la zone de recherche en haut à droite et tapez *.pub. Sur Mac, ouvrez le Finder et recherchez .pub. Regardez aussi dans Documents, Bureau, Téléchargements, OneDrive, sur vos clés USB et dans vos anciens e-mails.'],
      ['h', '2. Gardez une copie'],
      ['p', 'Copiez les fichiers dans un seul dossier et gardez une deuxième copie sur une clé USB ou dans votre stockage en ligne. Microsoft ne supprime pas les fichiers .pub eux-mêmes ; seul le programme a disparu.'],
      ['h', '3. Ouvrez-les sans Publisher'],
      ['p', 'Pubwork ouvre les fichiers .pub de Publisher 97 à Microsoft 365 dans n’importe quel navigateur, sur Windows, Mac et Chromebook. Rien n’est installé et vos fichiers ne sont jamais envoyés en ligne.'],
      ['go', 'Ouvrir un fichier .pub maintenant', 'home'],
      ['h', '4. Choisissez comment les conserver'],
      ['ul', [
        'Pour les garder, les imprimer ou les partager tels quels : enregistrez-les en PDF. Un PDF s’affiche de la même façon sur tous les ordinateurs, et pour des années.',
        'Pour continuer à les modifier : ouvrez-les dans Pubwork et enregistrez-les en fichiers Pubwork, ou en Word (.docx) si vous préférez travailler dans Word.',
        'Pour des images à publier en ligne : enregistrez chaque page en JPG ou PNG.',
      ]],
      ['h', '5. Beaucoup de fichiers ? Faites-les tous d’un coup'],
      ['p', 'Choisissez un dossier entier : chaque fichier .pub qu’il contient est converti en PDF ou en Word d’un seul coup, et tout revient dans un seul fichier .zip, avec une liste qui indique comment chaque fichier s’est passé.'],
      ['go', 'Convertir plusieurs fichiers à la fois', 'batch'],
      ['h', 'Et les conseils de Microsoft ?'],
      ['p', 'Microsoft conseille d’enregistrer les fichiers en PDF tant que vous avez encore Publisher, puis d’ouvrir le PDF dans Word pour le modifier. Cela marche pour du texte simple, mais les images et les zones de texte bougent ou se séparent souvent. Et si vous n’avez plus Publisher, la première étape est tout simplement impossible. Pubwork lit directement le fichier .pub, la mise en page est donc conservée.'],
      ['ad'],
      ['h', 'Pour de nouveaux flyers, bulletins et cartes'],
      ['p', 'Inutile d’apprendre un programme compliqué. Pubwork a une page au milieu, vos pages à gauche et des options simples à droite, comme Publisher. Il propose aussi des modèles, le publipostage, des étiquettes, des livrets et des calendriers.'],
      ['go', 'Partir d’un modèle', 'flyer'],
      ['h', 'Questions'],
      ['p', 'Puis-je enregistrer de nouveau en .pub ? Non : Microsoft n’a jamais publié comment écrire des fichiers .pub, aucun autre programme ne le peut donc. Gardez les fichiers .pub d’origine tels quels, et enregistrez vos nouvelles versions en PDF, Word ou fichiers Pubwork.'],
      ['p', 'Les très anciens fichiers sont-ils pris en charge ? Les fichiers à partir de Publisher 97 s’ouvrent. Ceux de Publisher 95 et versions antérieures ne peuvent pas être lus.'],
    ],
  },
  'guide-merge': {
    title: 'Faire un publipostage sans Publisher ni Word : étiquettes, badges, diplômes depuis Excel | Pubwork',
    desc: 'Comment faire un publipostage gratuitement dans votre navigateur : invitations, badges, étiquettes d’adresse et certificats depuis une liste Excel, Google Sheets ou CSV. Étape par étape.',
    h1: 'Comment faire un publipostage',
    updated: 'Dernière mise à jour : {date}',
    body: [
      ['p', 'Un publipostage crée un exemplaire pour chaque personne d’une liste : des invitations avec le nom de chaque invité, des étiquettes d’adresse, des badges ou des certificats. Dans Pubwork, cela se fait en quatre étapes.'],
      ['h', 'Avant de commencer : votre liste'],
      ['p', 'Mettez votre liste dans Excel, Google Sheets ou LibreOffice, avec les noms des colonnes sur la première ligne (par exemple Prénom, Nom, Adresse, Ville) et une personne par ligne en dessous. Depuis Google Sheets, choisissez Fichier → Télécharger → Microsoft Excel (.xlsx) ou Valeurs séparées par des virgules (.csv).'],
      ['h', 'Étape par étape'],
      ['ol', [
        'Ouvrez votre document : un modèle, une page vierge ou votre ancien fichier .pub.',
        'Cliquez sur Publipostage, puis sur « Choisir une liste… » et prenez votre fichier. Vous pouvez aussi coller des cellules directement depuis Excel.',
        'Cliquez dans une zone de texte, là où un nom doit aller, puis cliquez sur le champ, par exemple «Prénom». Les champs peuvent être au milieu d’une phrase : « Cher «Prénom», vous êtes invité… ».',
        'Cochez « Afficher le texte rempli avec la liste » et utilisez les flèches pour vérifier quelques exemplaires.',
        'Cliquez sur « Créez toutes les pages ». Un nouveau document est créé avec un exemplaire pour chaque ligne ; votre original reste tel quel.',
        'Imprimez, ou enregistrez dans un seul PDF.',
      ]],
      ['go', 'Ouvrir Pubwork et essayer', 'home'],
      ['h', 'Étiquettes et badges : plusieurs sur une feuille'],
      ['p', 'Pour des étiquettes, donnez d’abord à votre page la taille d’une étiquette. Après « Créez toutes les pages », cliquez sur Imprimer et choisissez Étiquettes et la référence de votre planche (par exemple Avery L7160 ou 5160). « Une page différente à chaque emplacement » est coché pour vous : chaque étiquette de la planche reçoit le nom suivant.'],
      ['ad'],
      ['h', 'Astuces'],
      ['ul', [
        'Les lignes où tous les champs utilisés sont vides sont laissées de côté.',
        'Les anciens fichiers Excel (.xls) ne peuvent pas être lus : dans Excel, choisissez Fichier → Enregistrer sous → Classeur Excel (.xlsx).',
        'Un champ absent de votre liste est affiché tel quel, pour que vous repériez les différences d’orthographe.',
        'Pour un menu ou une liste de prix avec photos, utilisez « Créer une liste de prix ou un catalogue » dans la même fenêtre.',
      ]],
    ],
  },
  'guide-booklet': {
    title: 'Comment imprimer un livret (feuille paroissiale, programme, bulletin) | Pubwork',
    desc: 'Imprimez un livret plié à partir d’un fichier Publisher ou d’un modèle : les pages sont mises dans le bon ordre automatiquement. Étape par étape, pour papier A4 et US Letter. Gratuit, dans votre navigateur.',
    h1: 'Comment imprimer un livret plié',
    updated: 'Dernière mise à jour : {date}',
    body: [
      ['p', 'Un livret, c’est une pile de feuilles imprimées en recto verso et pliées au milieu : une feuille A4 donne deux pages A5 de chaque côté, une feuille US Letter donne deux pages demi-lettre. Les feuilles paroissiales, les programmes de concert et les bulletins d’école sont souvent imprimés ainsi. Pubwork met les pages dans le bon ordre pour vous.'],
      ['h', 'Étape par étape'],
      ['ol', [
        'Ouvrez votre fichier .pub, ou partez d’un modèle de bulletin. Les livrets fonctionnent mieux avec des pages A5 ou demi-lettre.',
        'Cliquez sur Imprimer et choisissez Livret.',
        'Vérifiez le format du papier (A4 ou Letter) et cliquez sur Imprimer, ou sur Enregistrer en PDF pour imprimer plus tard.',
        'Dans la fenêtre de votre imprimante, choisissez « Recto verso » et « Retourner sur le bord court », et l’échelle 100 %.',
        'Empilez les feuilles, pliez-les au milieu, et agrafez sur le pli si vous le souhaitez.',
      ]],
      ['tip', 'Un livret compte ses pages par quatre (4, 8, 12…). Si votre document a, par exemple, 6 pages, 2 pages blanches sont ajoutées à la fin pour vous.'],
      ['go', 'Ouvrir un fichier et imprimer un livret', 'home'],
      ['ad'],
      ['h', 'Si votre imprimante n’imprime pas en recto verso'],
      ['p', 'Enregistrez en PDF. Imprimez d’abord les pages impaires, remettez la pile dans l’imprimante (essayez d’abord avec une feuille pour voir dans quel sens), puis imprimez les pages paires.'],
      ['h', 'Pour un imprimeur'],
      ['p', 'Choisissez « Enregistrer en PDF » dans la fenêtre d’impression, avec fond perdu et traits de coupe : l’imprimeur coupe alors les pages exactement.'],
    ],
  },
  'guide-labels': {
    title: 'Comment imprimer des étiquettes et des cartes de visite sur planches Avery | Pubwork',
    desc: 'Imprimez des étiquettes d’adresse, des badges et 10 cartes de visite par feuille sur planches Avery, Herma ou Zweckform, parfaitement alignés. Étape par étape, gratuit, dans votre navigateur.',
    h1: 'Comment imprimer des étiquettes et des cartes de visite',
    updated: 'Dernière mise à jour : {date}',
    body: [
      ['h', 'Cartes de visite : 10 par feuille'],
      ['ol', [
        'Choisissez un modèle de carte de visite, ou commencez une page Carte de visite vierge.',
        'Saisissez vos informations une seule fois dans « Mes coordonnées » et elles sont remplies pour vous. Ajoutez-y aussi votre logo.',
        'Cliquez sur Imprimer et choisissez « Remplir la feuille » : autant de cartes qu’il en tient, avec des traits de coupe. Ou choisissez Étiquettes et une planche de cartes de visite comme Avery C32011 (A4) ou 8371 (Letter).',
        'Imprimez à l’échelle 100 % sur du papier cartonné.',
      ]],
      ['h', 'Étiquettes : la même partout, ou une différente à chaque fois'],
      ['ol', [
        'Commencez une page de la taille d’une étiquette (ou choisissez un modèle d’étiquette).',
        'Pour la même étiquette partout, créez-la simplement. Pour des adresses ou des noms tirés d’une liste, utilisez d’abord Publipostage (voir le guide du publipostage).',
        'Cliquez sur Imprimer, choisissez Étiquettes, puis la référence de votre planche : elle est imprimée sur le paquet, comme L7160 ou 5160.',
        'Imprimez une feuille d’essai sur du papier ordinaire et posez-la contre une planche d’étiquettes pour vérifier avant d’utiliser les étiquettes.',
      ]],
      ['go', 'Créer des étiquettes maintenant', 'labels'],
      ['ad'],
      ['h', 'Si les étiquettes ne tombent pas juste'],
      ['ul', [
        'Dans la fenêtre d’impression, choisissez « Taille réelle » ou l’échelle 100 %, et désactivez « Ajuster à la page ».',
        'Vérifiez le format du papier : planches A4 avec le réglage A4, planches Letter avec Letter.',
        'Certaines imprimantes décalent tout d’un ou deux millimètres. Laissez un peu d’espace autour du texte de votre étiquette.',
      ]],
    ],
  },
  it: {
    title: 'Pubwork pour les services informatiques : ouvrir les fichiers Publisher après son arrêt | Pubwork',
    desc: 'Une note pour l’informatique des écoles, paroisses, mairies et entreprises : un outil gratuit dans le navigateur pour ouvrir, convertir et modifier les fichiers .pub. Rien à installer, rien d’envoyé, sans comptes.',
    h1: 'Pour les services informatiques : une note à transmettre',
    updated: 'Dernière mise à jour : {date}',
    body: [
      ['p', 'Publisher a quitté Microsoft 365 le 1er octobre 2026, et votre personnel a encore des années de fichiers .pub. Pubwork est un site gratuit qui les ouvre. Vous pouvez transmettre cette page telle quelle.'],
      ['h', 'Ce qu’il fait'],
      ['ul', [
        'Ouvre les fichiers .pub de Publisher 97 à Microsoft 365, et les garde modifiables.',
        'Convertit en PDF, Word (.docx), JPG et PNG, un fichier à la fois ou des dossiers entiers d’un coup.',
        'Imprime livrets, étiquettes, cartes de visite et publipostages ; propose des modèles pour les nouveaux documents.',
        'Interface en anglais, espagnol, allemand, français, portugais et italien.',
      ]],
      ['h', 'Pourquoi vous pouvez l’autoriser sans risque'],
      ['ul', [
        'Rien n’est installé : c’est une page web qui fonctionne dans Chrome, Edge, Firefox ou Safari, y compris sur des Chromebooks gérés.',
        'Les fichiers ne sont jamais envoyés en ligne. Ils sont lus et convertis dans le navigateur, sur l’appareil de l’utilisateur ; le serveur ne fournit que les fichiers du programme.',
        'Pas de compte, pas de connexion, aucun cookie déposé par Pubwork.',
        'Open source sous Mozilla Public License 2.0, construit sur libmspub, le lecteur qu’utilise LibreOffice.',
      ]],
      ['h', 'Pour votre personnel'],
      ['p', 'Envoyez-les sur {site}. Pour convertir d’un coup en PDF tout un dossier partagé d’anciens bulletins, utilisez la page « Convertir plusieurs fichiers ».'],
      ['go', 'Convertir plusieurs fichiers à la fois', 'batch'],
      ['h', 'Questions'],
      ['p', 'Écrivez à {email}.'],
    ],
  },
  support: {
    title: 'Soutenir Pubwork | Pubwork',
    desc: 'Pubwork est gratuit pour tous, sans compte et sans filigrane. Voici comment il reste gratuit, et comment vous pouvez aider.',
    h1: 'Aidez Pubwork à rester gratuit',
    body: [
      ['p', 'Pubwork est gratuit pour tous : paroisses, écoles, associations, petits commerces et familles. Sans compte, sans filigrane, sans limite, et vos fichiers ne quittent jamais votre ordinateur. Cela restera ainsi.'],
      ['h', 'Comment il se finance'],
      ['ul', [
        'Un petit don de la part de ceux qui le trouvent utile.',
        'De la publicité sur certaines pages d’information de ce site, jamais dans l’éditeur lui-même.',
        'Plus tard : des options facultatives pour les organisations, comme des modèles partagés pour toute une école ou une entreprise. Tout ce qui est gratuit aujourd’hui le restera.',
      ]],
      ['h', 'Comment aider'],
      ['kofi', 'Offrez-nous un café sur Ko-fi'],
      ['ul', [
        'Parlez-en à votre paroisse, votre école ou votre association : un lien dans un bulletin aide plus que vous ne le pensez.',
        'Envoyez-nous un fichier .pub qui ne s’affiche pas correctement (seulement si vous avez le droit de le partager), pour que nous le corrigions pour tout le monde.',
        'Aidez à traduire Pubwork dans votre langue.',
      ]],
      ['p', 'Écrivez à {email}.'],
    ],
  },

  // ---------------------------------------------------------------- les mentions, nouvelles versions
  privacy: {
    title: 'Confidentialité | Pubwork',
    desc: 'Comment Pubwork traite vos fichiers et votre visite : les fichiers sont ouverts sur votre ordinateur et jamais envoyés en ligne.',
    h1: 'Confidentialité',
    updated: 'Dernière mise à jour : {date}',
    body: [
      ['p', 'En bref : vos fichiers ne quittent jamais votre ordinateur, Pubwork lui-même n’utilise pas de cookies, et nous ne savons pas qui vous êtes.'],
      ['h', 'Vos fichiers'],
      ['p', 'Quand vous ouvrez un fichier .pub, une liste, une image ou un fichier Pubwork, Pubwork le lit dans votre navigateur. Le fichier et tout ce qui en est tiré (PDF, images, fichiers Word) restent sur votre appareil. Ils ne sont jamais envoyés, ni à nous ni à personne.'],
      ['h', 'Ce qui est gardé dans votre navigateur'],
      ['p', 'Pour vous être utile, Pubwork garde certaines choses dans le stockage de votre propre navigateur : vos documents récents (pour reprendre là où vous en étiez), « Mes coordonnées », vos propres modèles, les dates ajoutées aux calendriers et votre langue. Elles restent sur votre appareil, et vous pouvez les supprimer en effaçant les données de ce site dans votre navigateur.'],
      ['h', 'Ce que reçoit le site'],
      ['p', 'Comme tout site web, le serveur qui fournit les pages de Pubwork reçoit à chaque requête des informations techniques de base, comme votre adresse IP, le type de navigateur et la page demandée. Notre hébergeur les conserve peu de temps dans des journaux pour faire fonctionner le service en sécurité. Nous ne les utilisons pas pour vous identifier.'],
      ['p', 'Nous comptons les visites et quelques actions dans l’éditeur (par exemple « un fichier a été ouvert » ou « un PDF a été enregistré ») pour savoir ce qui est utile. Nous utilisons pour cela Cloudflare Web Analytics et Umami, tous deux sans cookies. Seul le nom de l’action est envoyé : jamais votre fichier, son nom ni son contenu. Ces comptages ne vous identifient pas.'],
      ['h', 'Publicité'],
      ['adsOff', 'Pubwork n’affiche aucune publicité pour le moment. L’éditeur n’en affichera jamais. Si de la publicité est ajoutée aux pages d’information, cette page sera d’abord mise à jour.'],
      ['adsOn', 'Certaines pages d’information de ce site (pas l’éditeur, et jamais vos fichiers) affichent des annonces Google AdSense. Google et ses partenaires peuvent utiliser des cookies pour afficher des annonces et les mesurer. Dans l’Espace économique européen, au Royaume-Uni et en Suisse, votre accord vous est d’abord demandé, et vous pouvez refuser. Pour en savoir plus et désactiver les annonces personnalisées : https://policies.google.com/technologies/ads et https://adssettings.google.com.'],
      ['adsOn', 'Les annonces ne voient jamais vos documents : ils ne sont ouverts que dans votre navigateur, et rien à leur sujet n’est envoyé à Google ni à nous.'],
      ['h', 'Enfants'],
      ['p', 'Pubwork ne collecte aucune donnée personnelle, ni d’enfants ni de quiconque.'],
      ['h', 'Contact'],
      ['p', 'Questions sur la confidentialité : {email}.'],
    ],
  },
  terms: {
    title: 'Conditions d’utilisation | Pubwork',
    desc: 'Les conditions simples d’utilisation de Pubwork, l’éditeur et convertisseur gratuit de fichiers Microsoft Publisher.',
    h1: 'Conditions d’utilisation',
    updated: 'Dernière mise à jour : {date}',
    body: [
      ['p', 'Pubwork est un outil gratuit pour ouvrir, modifier, imprimer et convertir les fichiers Microsoft Publisher (.pub), et pour créer de nouveaux documents. En l’utilisant, vous acceptez ces conditions.'],
      ['h', 'Vos fichiers restent à vous'],
      ['p', 'Tout se passe dans votre navigateur. Nous ne recevons, ne conservons ni ne revendiquons aucun droit sur vos fichiers ou sur ce que vous en faites.'],
      ['h', 'Modèles et images'],
      ['p', 'Les modèles, blocs prêts à l’emploi, images et icônes de Pubwork sont libres d’utilisation pour tout usage, y compris pour votre entreprise, sur papier et en ligne. Les images et icônes proviennent de Fluent Emoji (Microsoft, licence MIT) et de Tabler Icons (licence MIT).'],
      ['h', 'Utilisation loyale'],
      ['p', 'N’utilisez Pubwork qu’avec des fichiers que vous avez le droit d’utiliser. N’essayez pas de perturber, de surcharger ou de détourner le site.'],
      ['h', 'Aucune garantie'],
      ['p', 'Pubwork est fourni tel quel, sans aucune garantie. Nous faisons de notre mieux pour afficher les fichiers fidèlement, mais certains peuvent s’afficher différemment de Publisher ou ne pas s’ouvrir. Vérifiez les documents importants avant de les imprimer ou de les envoyer. Dans la mesure permise par la loi, nous déclinons toute responsabilité pour les pertes liées à l’utilisation de Pubwork.'],
      ['h', 'Open source'],
      ['p', 'Le code de Pubwork est open source, sous Mozilla Public License 2.0. Il utilise libmspub (MPL 2.0) pour lire les fichiers Publisher, et des polices libres sous SIL Open Font License et Apache License.'],
      ['source', 'Code source sur GitHub'],
      ['h', 'Marques'],
      ['p', 'Microsoft et Publisher sont des marques de Microsoft Corporation. Pubwork n’est ni conçu, ni approuvé par Microsoft, ni lié à Microsoft.'],
      ['h', 'Modifications'],
      ['p', 'Si ces conditions changent, la nouvelle version sera publiée ici avec une nouvelle date.'],
      ['h', 'Contact'],
      ['p', '{email}'],
    ],
  },
  compare: {
    "title": "Éditeurs gratuits de fichiers .pub comparés : Pubwork, stillPUB, LayoutSplat, LibreOffice | Pubwork",
    "desc": "Une comparaison honnête des moyens gratuits d’ouvrir et de modifier les fichiers Microsoft Publisher (.pub) depuis l’arrêt de Publisher : éditeurs dans le navigateur, LibreOffice Draw et convertisseurs en ligne.",
    "h1": "Ouvrir et modifier des fichiers .pub : les solutions comparées",
    "updated": "Dernière vérification : {date}",
    "body": [
      [
        "p",
        "Depuis que Microsoft a arrêté Publisher, plusieurs outils gratuits ouvrent les fichiers .pub. Chacun a ses points forts. Ce tableau les compare sur ce dont la plupart des gens ont besoin. Les informations sur les autres outils viennent de leurs propres sites et ont pu changer depuis notre vérification."
      ],
      [
        "table",
        [
          "",
          "Pubwork",
          "stillPUB",
          "LayoutSplat",
          "LibreOffice Draw",
          "Convertisseurs en ligne (Zamzar, Aspose…)"
        ],
        [
          [
            "Prix",
            "Gratuit",
            "Gratuit",
            "Gratuit",
            "Gratuit",
            "Gratuit, avec limites"
          ],
          [
            "Installation",
            "Aucune : dans le navigateur",
            "Aucune : dans le navigateur",
            "Aucune : dans le navigateur",
            "Logiciel à installer",
            "Aucune : site web"
          ],
          [
            "Votre fichier est-il envoyé ?",
            "Non, il reste sur votre appareil",
            "Non, il reste sur votre appareil",
            "Non précisé",
            "Non, il reste sur votre ordinateur",
            "Oui, il part sur leur serveur"
          ],
          [
            "Ouvre les fichiers .pub",
            "Oui",
            "Oui",
            "Oui (ils conseillent de vérifier chaque page)",
            "Oui",
            "Convertit seulement"
          ],
          [
            "Modifier textes et images",
            "Oui",
            "Oui",
            "Oui",
            "Oui",
            "Non"
          ],
          [
            "Téléphones et tablettes",
            "Oui (iPhone, iPad, Android)",
            "Ordinateurs (Chrome, Edge, Firefox)",
            "Non précisé",
            "Non (Windows, Mac, Linux)",
            "Oui"
          ],
          [
            "Langues de l’interface",
            "6 (anglais, espagnol, allemand, français, portugais, italien)",
            "Anglais",
            "Anglais",
            "Plus de 100",
            "Nombreuses"
          ],
          [
            "Enregistrer en",
            "PDF, Word, PowerPoint, LibreOffice Draw, XPS, page web, e-mail, JPG, PNG, SVG, Scribus, InDesign (IDML)",
            "PDF, JPG, PNG",
            "PDF, PNG, JPEG, SVG, IDML, Scribus, HTML",
            "PDF, formats LibreOffice, images",
            "PDF, images et autres"
          ],
          [
            "Modèles",
            "Plus de 150",
            "8",
            "123",
            "Peu pour la mise en page",
            "Aucun"
          ],
          [
            "Publipostage",
            "Oui, depuis CSV ou Excel, avec photos et un e-mail par personne",
            "Non précisé",
            "Oui, depuis CSV, TSV ou Excel",
            "Dans Writer, pas pour les mises en page .pub",
            "Non"
          ],
          [
            "Imprimer livrets, affiches, étiquettes",
            "Oui, les trois, plus les cartes pliées",
            "Étiquettes (Avery 5160)",
            "Étiquettes (29 planches Avery)",
            "À la main",
            "Non"
          ],
          [
            "Convertir beaucoup de fichiers d’un coup",
            "Oui",
            "Non précisé",
            "Non précisé",
            "Avec des outils en ligne de commande",
            "Variable"
          ],
          [
            "Fonctionne hors ligne",
            "Oui, après la première visite",
            "Oui, après la première visite",
            "Non précisé",
            "Oui",
            "Non"
          ],
          [
            "Open source",
            "Oui (MPL 2.0)",
            "Non précisé",
            "Peut être auto-hébergé",
            "Oui",
            "Non"
          ],
          [
            "Réenregistre en .pub",
            "Non",
            "Non",
            "Non",
            "Non",
            "Non"
          ]
        ]
      ],
      [
        "h",
        "Lequel choisir ?"
      ],
      [
        "ul",
        [
          "Pubwork : pour ouvrir, modifier, imprimer et convertir des fichiers .pub dans n’importe quel navigateur, y compris sur téléphone ou tablette, dans votre langue, avec publipostage, livrets et étiquettes.",
          "LibreOffice Draw : si vous préférez un logiciel installé sur votre ordinateur, dans une suite bureautique gratuite complète.",
          "stillPUB : un éditeur simple dans le navigateur, qui peut aussi importer des documents Word et des PDF.",
          "LayoutSplat : un autre éditeur dans le navigateur, avec de nombreuses planches d’étiquettes Avery et la possibilité de l’héberger vous-même.",
          "Un convertisseur en ligne : si vous voulez juste un PDF rapide et que l’envoi de votre fichier ne vous gêne pas."
        ]
      ],
      [
        "tip",
        "Aucun outil ne peut réenregistrer en .pub, car Microsoft n’a jamais publié comment écrire ce format. Gardez vos fichiers .pub d’origine et enregistrez la version modifiée en PDF, Word ou dans le fichier propre à l’outil."
      ],
      [
        "go",
        "Ouvrir un fichier .pub dans Pubwork",
        "home"
      ]
    ]
  },
};
