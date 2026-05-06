# Démarrage Rapide - Application Pacifique

## 🚀 Premiers pas en 10 minutes

### Étape 1 : Installer sur la machine serveur

1. **Copier l'application** sur le PC qui servira de serveur
2. **Ouvrir un terminal** dans le dossier `Pacifique-app`
3. **Installer les dépendances** :
   ```bash
   npm install
   ```
4. **Démarrer en mode développement** :
   ```bash
   npm run dev:all
   ```

### Étape 2 : Configurer comme serveur

1. **Ouvrir l'application** dans le navigateur : `http://localhost:5173`
2. **Se connecter** avec :
   ```
   Utilisateur : admin
   Mot de passe : admin123
   ```
3. **Aller dans Configuration** (icône ⚙️ en bas de la sidebar)
4. **Configurer** :
   ```
   Rôle : ☑ Serveur
   Écran : ☑ Administration
   URL serveur : http://VOTRE-IP:3001
   ```
5. **Cliquer sur "Sauvegarder"**

### Étape 3 : Trouver votre IP

```bash
# Windows
ipconfig
# Notez l'IPv4 (ex: 192.168.1.10)

# macOS/Linux
ifconfig
# Notez l'inet (ex: 192.168.1.10)
```

### Étape 4 : Installer sur les clients

1. **Répéter l'étape 1** sur chaque machine cliente
2. **Configurer comme client** :
   ```
   Rôle : ☑ Client
   Écran : [Choisir selon l'usage]
   URL serveur : http://IP-DU-SERVEUR:3001
   ```
3. **Sauvegarder et redémarrer**

---

## 🎯 Vérification de la connexion

### Sur le serveur
Vérifiez dans le terminal :
```
✅ Serveur démarré sur http://192.168.1.10:3001
✅ Socket.IO prêt
✅ En attente de connexions...
```

### Sur les clients
Dans la sidebar, vérifiez :
```
🟢 Temps réel actif
🟢 En ligne
🟢 Cloud sync
```

---

## 📞 Problèmes courants et solutions

### ❌ "Serveur inaccessible"
**Solution** :
1. Vérifier que le serveur est démarré
2. Vérifier l'IP dans la configuration
3. Tester avec : `ping IP-DU-SERVEUR`

### ❌ "Socket.IO déconnecté"
**Solution** :
1. Recharger la page (F5)
2. Vérifier le firewall (port 3001 ouvert)
3. Redémarrer l'application

### ❌ "Données non synchronisées"
**Solution** :
1. Vérifier la connexion Internet
2. Cliquer sur "Cloud sync" dans la sidebar
3. Attendre la fin de la synchronisation

---

## 🆘 Besoin d'aide ?

### Informations à fournir :
1. **Version** : Regardez en bas de la page Configuration
2. **Système** : Windows/macOS/Linux + version
3. **Erreur** : Message exact + capture d'écran
4. **Réseau** : IP serveur + IP client

### Contact :
- **Email** : support@pacifique-app.com
- **Téléphone** : +243 XX XXX XXX
- **Documentation** : Lisez `GUIDE_UTILISATION.md`

---

## ✅ Checklist de mise en service

- [ ] Serveur installé et démarré
- [ ] IP fixe configurée sur le serveur
- [ ] Firewall ouvert (port 3001)
- [ ] Clients installés et configurés
- [ ] Connexion vérifiée sur tous les postes
- [ ] Utilisateurs créés (admin, serveurs, cuisiniers)
- [ ] Produits ajoutés au catalogue
- [ ] Tables configurées
- [ ] Sauvegarde initiale effectuée

---

**Astuce** : Commencez avec 2-3 machines pour tester, puis déployez progressivement.

**Bon à savoir** : L'application fonctionne en mode hors ligne limité si le serveur est inaccessible, puis se resynchronise automatiquement.