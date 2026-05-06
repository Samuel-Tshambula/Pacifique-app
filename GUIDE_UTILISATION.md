# Guide d'Utilisation - Application Pacifique

## 📋 Table des matières
1. [Présentation de l'application](#présentation-de-lapplication)
2. [Architecture client-serveur](#architecture-client-serveur)
3. [Configuration réseau](#configuration-réseau)
4. [Guide d'installation](#guide-dinstallation)
5. [Utilisation des différentes pages](#utilisation-des-différentes-pages)
6. [Statuts et indicateurs](#statuts-et-indicateurs)
7. [Dépannage](#dépannage)
8. [FAQ](#faq)

---

## 🏨 Présentation de l'application

L'application **Pacifique** est un système de gestion intégré pour hôtels et restaurants. Elle permet de gérer :

- **🏨 Hébergement** : Réservations, check-in/out, gestion des chambres
- **🍽️ Restaurant** : Commandes, cuisine, service en salle
- **📦 Stock** : Gestion des produits, alertes de rupture
- **📊 Rapports** : Statistiques, ventes, performances
- **👥 Employés** : Gestion des utilisateurs et rôles

### Rôles utilisateurs

| Rôle | Accès | Description |
|------|-------|-------------|
| **Administrateur** | Toutes les pages | Accès complet, configuration système |
| **Serveur** | Ventes, Cuisine | Prise de commandes, service clients |
| **Cuisinier** | Cuisine | Préparation des commandes |
| **Réceptionniste** | Hébergement, Ventes | Accueil clients, gestion chambres |
| **Gestionnaire** | Dashboard, Stock, Rapports | Supervision, analyse |
| **Comptable** | Dashboard, Rapports | Suivi financier |

---

## 🔌 Architecture client-serveur

L'application fonctionne sur une architecture **client-serveur** :

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Client 1     │     │     Serveur     │     │    Client 2     │
│   (Réception)   │◄───►│   (Principal)   │◄───►│    (Cuisine)    │
│                 │     │                 │     │                 │
│ • Interface UI  │     │ • Base de données│     │ • Interface UI  │
│ • Socket client │     │ • API REST      │     │ • Socket client │
│ • Données cache │     │ • Socket server │     │ • Données cache │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Fonctionnement

1. **Serveur principal** : Héberge la base de données et l'API
2. **Clients** : Se connectent au serveur via le réseau local
3. **Communication** : Socket.IO pour le temps réel + API REST pour les données

---

## 🌐 Configuration réseau

### Cas typique dans un hôtel/restaurant

```
                    ┌─────────────────┐
                    │   Routeur WiFi  │
                    │   192.168.1.1   │
                    └────────┬────────┘
                             │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌──────▼──────┐    ┌───────▼──────┐
│   Serveur    │    │  Réception   │    │   Cuisine   │
│   (PC fixe)  │    │  (Tablette)  │    │ (Tablette)  │
│ 192.168.1.10 │    │ 192.168.1.20 │    │ 192.168.1.30│
└──────────────┘    └──────────────┘    └──────────────┘
```

### Configuration IP recommandée

| Machine | Rôle | IP fixe recommandée | Port |
|---------|------|---------------------|------|
| **Serveur principal** | Serveur | `192.168.1.10` | `3001` |
| **Réception** | Client | `192.168.1.20` | - |
| **Cuisine** | Client | `192.168.1.30` | - |
| **Bar** | Client | `192.168.1.40` | - |
| **Administration** | Client | `192.168.1.50` | - |

### Comment trouver l'IP de votre machine

#### Sur Windows :
```cmd
ipconfig
```
Recherchez "Adresse IPv4" (ex: `192.168.1.10`)

#### Sur macOS/Linux :
```bash
ifconfig
```
ou
```bash
ip addr show
```

---

## ⚙️ Guide d'installation

### Étape 1 : Installer le serveur (Machine principale)

1. **Sur le PC qui servira de serveur** :
   ```bash
   cd Pacifique-app
   npm install
   ```

2. **Configurer comme serveur** :
   - Ouvrir l'application
   - Aller dans **Configuration** (admin seulement)
   - Sélectionner **Rôle : Serveur**
   - URL serveur : `http://192.168.1.10:3001` (remplacer par votre IP)
   - Écran : `Réception` ou `Administration`
   - Cliquer sur **Sauvegarder**

3. **Démarrer le serveur** :
   ```bash
   npm run server
   ```
   Vous devriez voir :
   ```
   Serveur démarré sur http://192.168.1.10:3001
   Socket.IO prêt
   Base de données connectée
   ```

### Étape 2 : Installer les clients (Autres machines)

1. **Sur chaque machine cliente** :
   ```bash
   cd Pacifique-app
   npm install
   ```

2. **Configurer comme client** :
   - Ouvrir l'application
   - Aller dans **Configuration** (admin seulement)
   - Sélectionner **Rôle : Client**
   - URL serveur : `http://192.168.1.10:3001` (IP du serveur)
   - Écran : Selon l'usage (Cuisine, Réception, etc.)
   - Cliquer sur **Sauvegarder**

3. **Démarrer le client** :
   ```bash
   npm run dev
   ```

### Étape 3 : Vérifier la connexion

Sur chaque client, vérifiez dans la sidebar :
- ✅ **Temps réel actif** : Connexion Socket.IO établie
- ✅ **En ligne** : Serveur accessible
- ✅ **Cloud sync** : Synchronisation active

---

## 📱 Utilisation des différentes pages

### 1. Tableau de bord (`/dashboard`)
**Pour qui** : Admin, Gestionnaire, Comptable

**Fonctionnalités** :
- 📊 Ventes en temps réel
- 📈 Graphiques des performances
- 🏆 Classement des serveurs
- ⚠️ Alertes stock
- 🛏️ Occupation chambres

**Exemple d'utilisation** :
```
08:00 - Vérifier les ventes de la veille
12:00 - Surveiller le pic du déjeuner
18:00 - Analyser la journée
```

### 2. Ventes (`/ventes`)
**Pour qui** : Serveur, Réceptionniste

**Fonctionnalités** :
- 🪑 Sélection de table
- 🍔 Catalogue produits
- 🛒 Panier interactif
- 📝 Notes spéciales
- 🔊 Notification cuisine

**Workflow typique** :
1. Sélectionner une table
2. Ajouter des produits (clic ou touche)
3. Ajouter des notes (allergies, cuisson)
4. Valider (F8 ou bouton)
5. La commande arrive en cuisine automatiquement

### 3. Cuisine (`/cuisine`)
**Pour qui** : Cuisinier

**Fonctionnalités** :
- 🔔 Commandes en attente
- ⏱️ Temps de préparation
- ✅ Marquer comme prêt
- 📱 Notification serveur

**Workflow** :
```
[12:05] Table 4 - 2x Burger
      ⏱️ 15 min ⏳ En préparation
      
[12:07] Table 6 - 1x Pizza
      ⏱️ 10 min ✅ Prêt à servir
```

### 4. Hébergement (`/hebergement`)
**Pour qui** : Réceptionniste

**Fonctionnalités** :
- 🏨 Liste des chambres
- 🔵🟡🟢 Statuts (Libre/Occupé/Nettoyage)
- 👤 Check-in/out
- 💳 Gestion paiements

### 5. Stock (`/stock`)
**Pour qui** : Gestionnaire

**Fonctionnalités** :
- 📦 Niveaux de stock
- ⚠️ Alertes automatiques
- 📥 Entrées sorties
- 📋 Historique

### 6. Rapports (`/rapports`)
**Pour qui** : Admin, Gestionnaire, Comptable

**Fonctionnalités** :
- 💰 Chiffre d'affaires
- 📈 Tendances
- 👥 Performance employés
- 🍽️ Produits populaires

### 7. Employés (`/utilisateurs`)
**Pour qui** : Admin seulement

**Fonctionnalités** :
- 👥 Gestion des comptes
- 🔑 Réinitialisation mots de passe
- 📊 Statistiques par employé
- ⚠️ Verrouillage/déverrouillage

---

## 🚦 Statuts et indicateurs

### Dans la sidebar

| Indicateur | Signification | Action requise |
|------------|---------------|----------------|
| **🟢 Temps réel actif** | Socket.IO connecté | Rien - fonctionnement normal |
| **🟡 Connexion...** | En cours de connexion | Attendre quelques secondes |
| **🔴 Hors ligne** | Serveur inaccessible | Vérifier réseau/configuration |
| **🔴 Erreur réseau** | Problème de connexion | Vérifier IP serveur, firewall |
| **🟢 En ligne** | Serveur accessible | Rien - fonctionnement normal |
| **🔴 Hors ligne** | Mode dégradé | Travail local, sync plus tard |
| **🟢 Cloud sync** | Synchronisation active | Rien - données à jour |
| **🟡 Sync...** | Synchronisation en cours | Attendre la fin |
| **🔴 Cloud off** | Pas de connexion cloud | Vérifier Internet/MongoDB |

### Sur les commandes

| Badge | Signification |
|-------|---------------|
| **🟢** | Commande validée |
| **🟡** | En préparation |
| **🔴** | En retard |
| **✅** | Prêt à servir |
| **🚚** | En livraison |
| **💳** | Payé |

### Sur le stock

| Niveau | Couleur | Action |
|--------|---------|--------|
| **Normal** | 🟢 Vert | Rien |
| **Faible** | 🟡 Orange | Commander bientôt |
| **Rupture** | 🔴 Rouge | Commander immédiatement |
| **Périmé** | ⚫ Noir | Retirer du stock |

### Indicateurs de performance

| Métrique | Bon | Moyen | Mauvais |
|----------|-----|-------|---------|
| **Temps préparation** | < 15 min | 15-25 min | > 25 min |
| **Taux occupation** | > 80% | 60-80% | < 60% |
| **Satisfaction** | > 4.5/5 | 4-4.5/5 | < 4/5 |
| **Rupture stock** | 0 | 1-3 | > 3 |

---

## 🔧 Dépannage

### Problème : "Serveur inaccessible"

**Solutions** :
1. Vérifier que le serveur est démarré :
   ```bash
   # Sur la machine serveur
   npm run server
   ```

2. Vérifier l'IP du serveur :
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

3. Vérifier le firewall :
   - Windows : Autoriser Node.js dans le firewall
   - macOS : `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node`
   - Linux : `sudo ufw allow 3001`

4. Tester la connexion :
   ```bash
   # Depuis un client
   ping 192.168.1.10
   curl http://192.168.1.10:3001/health
   ```

### Problème : "Socket.IO déconnecté"

**Solutions** :
1. Recharger la page (F5)
2. Vérifier la connexion WiFi/Ethernet
3. Redémarrer l'application
4. Vérifier les logs serveur :
   ```bash
   # Regarder les logs du serveur
   npm run server
   ```

### Problème : "Données non synchronisées"

**Solutions** :
1. Vérifier la connexion Internet
2. Vérifier MongoDB (si utilisé)
3. Forcer une synchronisation :
   - Cliquer sur "Cloud sync" dans la sidebar
   - Attendre la fin de la sync

### Problème : "Application lente"

**Solutions** :
1. Vérifier la connexion réseau
2. Redémarrer l'application
3. Nettoyer le cache :
   ```bash
   rm -rf node_modules/.cache
   ```
4. Vérifier les ressources machine

---

## ❓ FAQ

### Q: Puis-je utiliser l'application sans serveur ?
**R**: Non, l'architecture nécessite un serveur. Mais un client peut temporairement travailler en mode hors ligne, puis synchroniser plus tard.

### Q: Combien de clients peuvent se connecter ?
**R**: Théoriquement illimité, mais recommandé : 10-15 clients maximum pour de bonnes performances.

### Q: Les données sont-elles sauvegardées ?
**R**: Oui, sur le serveur dans `data/`. Faites des sauvegardes régulières de ce dossier.

### Q: Puis-je accéder à distance ?
**R**: Oui, mais nécessite une configuration réseau avancée (port forwarding, VPN). Non recommandé pour la sécurité.

### Q: Comment changer un mot de passe oublié ?
**R**: Seul l'admin peut réinitialiser les mots de passe dans "Employés" → "Réinitialiser mot de passe".

### Q: L'application fonctionne-t-elle sur mobile ?
**R**: Oui, via navigateur web. Optimisé pour tablettes.

### Q: Comment ajouter un nouveau produit ?
**R**: Admin seulement : Aller dans "Configuration" → "Produits" → "Ajouter".

### Q: Puis-je imprimer des tickets ?
**R**: Oui, les commandes et factures peuvent être imprimées (bouton imprimante).

---

## 📞 Support

### En cas de problème

1. **Vérifier les logs** :
   ```bash
   # Logs serveur
   npm run server  # Affiche les logs en direct
   
   # Logs client (console navigateur)
   F12 → Console
   ```

2. **Informations à fournir** :
   - Version de l'application
   - Système d'exploitation
   - Message d'erreur exact
   - Capture d'écran
   - Configuration réseau

3. **Contact** :
   - Support technique : support@pacifique-app.com
   - Urgences : +243 XX XXX XXX

### Maintenance régulière

**Quotidien** :
- Vérifier les sauvegardes
- Contrôler les alertes stock
- Nettoyer les logs anciens

**Hebdomadaire** :
- Mettre à jour l'application
- Vérifier l'espace disque
- Analyser les performances

**Mensuel** :
- Sauvegarde complète
- Revue de sécurité
- Mise à jour des dépendances

---

## 🎯 Bonnes pratiques

### Pour le serveur
- Utiliser une IP fixe
- Mettre à jour régulièrement
- Faire des sauvegardes quotidiennes
- Surveiller l'espace disque

### Pour les clients
- Former les utilisateurs
- Utiliser des mots de passe forts
- Fermer la session en fin de service
- Signaler les problèmes rapidement

### Pour le réseau
- WiFi dédié si possible
- Signal fort partout
- Sécuriser l'accès
- Surveiller la bande passante

---

**Dernière mise à jour** : 6 mai 2026  
**Version** : 1.0.0  
**Auteur** : Équipe Pacifique