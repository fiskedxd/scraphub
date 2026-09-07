# Scraphub - Intelligence Tool Online

Un projet React full JSX similaire à searchhub.vip, avec une interface moderne et des fonctionnalités d'intelligence artificielle.

## 🚀 Fonctionnalités

- **Page d'accueil** avec message de bienvenue et bannière
- **Navigation fixe** avec style moderne et responsive
- **Système d'authentification** complet (connexion/inscription)
- **Pages protégées** accessibles uniquement aux utilisateurs connectés
- **Recherche intelligente** avec IA
- **Suite d'outils** pour l'analyse de données
- **Profil utilisateur** avec statistiques
- **Paramètres** pour gérer le compte (mot de passe, email, Discord)
- **Documentation** complète
- **Intégration Discord** pour les notifications

## 🛠️ Technologies utilisées

- **React 18** - Framework JavaScript
- **React Router DOM** - Navigation et routing
- **Tailwind CSS** - Framework CSS
- **Context API** - Gestion d'état pour l'authentification

## 📁 Structure du projet

```
src/
├── components/
│   ├── Navigation.jsx          # Barre de navigation
│   └── ProtectedRoute.jsx     # Protection des routes
├── contexts/
│   └── AuthContext.jsx        # Contexte d'authentification
├── pages/
│   ├── HomePage.jsx           # Page d'accueil
│   ├── LoginPage.jsx          # Page de connexion
│   ├── RegisterPage.jsx       # Page d'inscription
│   ├── SearchPage.jsx         # Page de recherche
│   ├── ToolsPage.jsx          # Page des outils
│   ├── ProfilePage.jsx        # Page de profil
│   ├── SettingsPage.jsx       # Page des paramètres
│   ├── DocumentationPage.jsx  # Page de documentation
│   └── DiscordPage.jsx        # Page d'intégration Discord
├── App.js                     # Composant principal
├── index.js                   # Point d'entrée
└── index.css                  # Styles globaux
```

## 🚀 Installation et démarrage

1. **Installer les dépendances :**
   ```bash
   npm install
   ```

2. **Démarrer le serveur de développement :**
   ```bash
   npm start
   ```

3. **Ouvrir dans le navigateur :**
   ```
   http://localhost:3000
   ```

## 📝 Utilisation

### Page d'accueil
- Accessible à tous les visiteurs
- Message de bienvenue "Hello, welcome to Scraphub"
- Description de la plateforme d'intelligence artificielle
- Boutons pour se connecter ou s'inscrire

### Authentification
- **Inscription :** Créer un nouveau compte avec nom, email et mot de passe
- **Connexion :** Se connecter avec email et mot de passe
- **Déconnexion :** Se déconnecter et retourner à la page d'accueil

### Pages protégées
Toutes les pages suivantes nécessitent une connexion :
- **Recherche :** Moteur de recherche intelligent
- **Outils :** Suite d'outils d'analyse de données
- **Profil :** Gestion du profil utilisateur et statistiques
- **Paramètres :** Configuration du compte (mot de passe, email, Discord)
- **Documentation :** Guide complet d'utilisation
- **Discord :** Intégration avec Discord pour les notifications

### Navigation
- **Style fixe** en haut de page avec `top-10`
- **Logo** Scraphub avec image `/pdp.png`
- **Boutons** pour toutes les fonctionnalités
- **Indicateur** de statut en ligne
- **Avatar** utilisateur quand connecté

## 🎨 Personnalisation

### Images
Placez vos images dans le dossier `public/` :
- `pdp.png` - Logo de l'application
- `banner.png` - Bannière de la page d'accueil

### Styles
Le projet utilise Tailwind CSS. Vous pouvez :
- Modifier les couleurs dans `tailwind.config.js`
- Ajouter des styles personnalisés dans `src/index.css`
- Utiliser les classes Tailwind existantes

### Authentification
Pour une authentification réelle, remplacez la logique simulée dans :
- `src/contexts/AuthContext.jsx`
- `src/pages/LoginPage.jsx`
- `src/pages/RegisterPage.jsx`

## 🔧 Configuration

### Variables d'environnement
Créez un fichier `.env` pour configurer :
```env
REACT_APP_API_URL=your_api_url
REACT_APP_DISCORD_CLIENT_ID=your_discord_client_id
```

### Build de production
```bash
npm run build
```

## 📱 Responsive Design

Le projet est entièrement responsive avec :
- Navigation adaptative (mobile/desktop)
- Grilles flexibles
- Images responsives
- Breakpoints Tailwind

## 🚀 Déploiement

Le projet peut être déployé sur :
- **Vercel** (recommandé)
- **Netlify**
- **GitHub Pages**
- **Heroku**

## 📄 Licence

Ce projet est sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème, contactez-nous via :
- Discord (si connecté)
- Email de support
- Issues GitHub
