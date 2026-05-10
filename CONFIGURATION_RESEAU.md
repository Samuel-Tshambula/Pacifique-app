# Configuration Réseau - Guide Pratique

## 🎯 Objectif
Ce guide explique comment configurer le réseau pour faire communiquer le serveur et les clients de l'application Pacifique.

## 📋 Scénarios typiques

### Scénario 1 : Petit restaurant (2-3 machines)
```
                    ┌─────────────────┐
                    │   Routeur WiFi  │
                    │   192.168.1.1   │
                    └────────┬────────┘
                             │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌──────▼──────┐    ┌───────▼──────┐
│   Caisse     │    │   Cuisine   │    │  Réception  │
│ (Serveur)    │    │  (Client)   │    │   (Client)  │
│192.168.1.100 │    │192.168.1.101│    │192.168.1.102│
└──────────────┘    └──────────────┘    └──────────────┘
```

**Configuration** :
- Serveur : `192.168.1.100:3001`
- Clients : Se connectent à `http://192.168.1.100:3001`

### Scénario 2 : Hôtel moyen (5-10 machines)
```
                    ┌─────────────────┐
                    │    Switch       │
                    │  192.168.2.1    │
                    └────────┬────────┘
                             │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌──────▼──────┐    ┌───────▼──────┐
│  Serveur     │    │  Réception  │    │   Cuisine   │
│192.168.2.10  │    │192.168.2.20 │    │192.168.2.30 │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
┌───────▼──────┐    ┌──────▼──────┐    ┌───────▼──────┐
│   Bar        │    │  Étage 1    │    │  Étage 2    │
│192.168.2.40  │    │192.168.2.50 │    │192.168.2.60 │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Scénario 3 : Grand établissement (réseau segmenté)
```
                    ┌─────────────────┐
                    │   Routeur       │
                    │  10.0.0.1       │
                    └────────┬────────┘
                             │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌──────▼──────┐    ┌───────▼──────┐
│ VLAN Admin   │    │ VLAN Salle  │    │ VLAN Cuisine│
│ 10.0.1.0/24  │    │ 10.0.2.0/24 │    │ 10.0.3.0/24 │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🔧 Configuration étape par étape

### Étape 1 : Configurer le serveur

#### 1.1 Trouver l'IP du serveur
```bash
# Windows
ipconfig
# Chercher : IPv4 Address. . . . . . . . . . . : 192.168.1.10

# macOS/Linux
ifconfig
# Chercher : inet 192.168.1.10
```

#### 1.2 Attribuer une IP fixe (recommandé)

**Sur le routeur** :
1. Accéder à l'interface admin du routeur (généralement `192.168.1.1`)
2. Aller dans "DHCP" → "Réservation d'adresses"
3. Ajouter l'adresse MAC du serveur avec IP `192.168.1.10`

**Alternative : Configurer statiquement sur le serveur**
```bash
# Exemple configuration manuelle
Adresse IP : 192.168.1.10
Masque : 255.255.255.0
Passerelle : 192.168.1.1
DNS : 8.8.8.8, 8.8.4.4
```

#### 1.3 Configurer l'application comme serveur

Dans `Configuration` → `Rôle de cette machine` :
```
☑ Rôle : Serveur
☑ Écran : Administration
☑ URL serveur : http://192.168.1.10:3001
```

#### 1.4 Démarrer le serveur
```bash
cd Pacifique-app
npm run server
```

**Vérification** :
```
✅ Serveur démarré sur http://192.168.1.10:3001
✅ Socket.IO prêt sur le port 3001
✅ Base de données connectée
✅ En attente de connexions clients...
```

### Étape 2 : Configurer les clients

#### 2.1 Sur chaque machine cliente

Dans `Configuration` → `Rôle de cette machine` :
```
☑ Rôle : Client
☑ Écran : [Réception/Cuisine/Bar selon la machine]
☑ URL serveur : http://192.168.1.10:3001
```

#### 2.2 Vérifier la connexion

**Test manuel** :
```bash
# Depuis un client, tester la connexion
ping 192.168.1.10
# Réponse : Réponse de 192.168.1.10...

# Tester le port
telnet 192.168.1.10 3001
# Ou avec curl
curl http://192.168.1.10:3001/health
```

**Dans l'application** :
- Sidebar doit afficher : `🟢 Temps réel actif`
- Sidebar doit afficher : `🟢 En ligne`

### Étape 3 : Configurer le firewall

#### Windows
1. Ouvrir "Pare-feu Windows"
2. "Paramètres avancés"
3. "Règles de trafic entrant" → "Nouvelle règle"
4. Port → `3001` → Autoriser la connexion

#### macOS
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

#### Linux (Ubuntu/Debian)
```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

---

## 🌐 Exemples concrets de configuration

### Exemple 1 : Café avec WiFi public

**Problème** : Les clients se connectent au WiFi invité qui est isolé.

**Solution** :
```
WiFi Staff (192.168.1.0/24)    WiFi Invité (192.168.2.0/24)
      │                                │
      ▼                                ▼
┌────────────┐                  ┌────────────┐
│  Serveur   │                  │   Clients  │
│192.168.1.10│   ❌ Pas de      │192.168.2.xx│
└────────────┘   connexion      └────────────┘
```

**Correction** :
1. Mettre toutes les machines professionnelles sur le même réseau
2. Créer un WiFi dédié "Staff" avec mot de passe
3. Interdire l'accès invité aux machines professionnelles

### Exemple 2 : Hôtel avec plusieurs bâtiments

**Problème** : Le signal WiFi ne passe pas partout.

**Solution** :
```
Bâtiment A ────[WiFi]──── Bâtiment B ────[Câble]──── Bâtiment C
   │                         │                         │
   ▼                         ▼                         ▼
Serveur                  Répétiteur                 Client
192.168.10.10           192.168.10.20             192.168.10.30
```

**Configuration** :
- Même sous-réseau partout : `192.168.10.0/24`
- Serveur central dans le bâtiment principal
- Répéteurs WiFi pour étendre la couverture
- Câblage Ethernet entre bâtiments si possible

### Exemple 3 : Restaurant avec tablette Android

**Problème** : Les tablettes changent d'IP dynamiquement.

**Solution** :
```javascript
// Dans la configuration
{
  "role": "client",
  "screen": "serveur",
  "serverUrl": "http://192.168.1.10:3001",
  "autoReconnect": true,
  "discovery": true  // Optionnel : découverte automatique
}
```

**Astuce** : Utiliser le nom d'hôte si disponible
```
http://serveur-pacifique.local:3001
```

---

## 🔍 Diagnostic des problèmes de connexion

### Symptôme : "Serveur inaccessible"

**Checklist** :
1. ✅ Le serveur est-il allumé ?
2. ✅ L'application serveur est-elle démarrée ?
3. ✅ Le port 3001 est-il ouvert ?
4. ✅ Le firewall bloque-t-il la connexion ?
5. ✅ L'IP est-elle correcte ?
6. ✅ Les machines sont-elles sur le même réseau ?

**Commandes de diagnostic** :
```bash
# 1. Ping le serveur
ping 192.168.1.10

# 2. Vérifier le port
netstat -an | grep 3001  # Linux/Mac
netstat -an | findstr 3001  # Windows

# 3. Tester depuis un client
curl -v http://192.168.1.10:3001/health

# 4. Vérifier les logs serveur
tail -f server.log  # Voir les connexions
```

### Symptôme : "Connexion intermittente"

**Causes possibles** :
- Signal WiFi faible
- Interférences
- Surcharge réseau
- DHCP qui change les IP

**Solutions** :
1. Utiliser Ethernet si possible
2. Changer le canal WiFi
3. Réduire la distance avec le routeur
4. Utiliser des IP fixes

### Symptôme : "Socket.IO déconnecté"

**Messages d'erreur typiques** :
```
WebSocket connection to 'ws://192.168.1.10:3001/socket.io/' failed
Socket connection error: xhr poll error
```

**Solutions** :
```javascript
// Dans le code client
const socket = io('http://192.168.1.10:3001', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
});
```

---

## 🛡️ Sécurité réseau

### Recommandations minimales

1. **Changer les mots de passe par défaut**
   - Routeur WiFi
   - Comptes admin application

2. **Segmenter le réseau**
   ```
   Réseau Staff (192.168.10.0/24) ≠ Réseau Invités (192.168.20.0/24)
   ```

3. **Mettre à jour régulièrement**
   - Firmware routeur
   - Application Pacifique
   - Systèmes d'exploitation

4. **Sauvegardes**
   ```bash
   # Sauvegarde automatique des données
   0 2 * * * tar -czf /backups/pacifique-$(date +%Y%m%d).tar.gz /chemin/vers/Pacifique-app/data/
   ```

### Configuration avancée

**Pour les grands établissements** :
```bash
# Configuration Nginx comme reverse proxy
server {
    listen 80;
    server_name pacifique.votre-hotel.com;
    
    location / {
        proxy_pass http://192.168.1.10:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Avec HTTPS** :
```javascript
// Configuration serveur
const server = require('https').createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app);
```

---

## 📊 Monitoring et maintenance

### Surveillance du réseau

**Outils simples** :
```bash
# Vérifier les connexions actives
netstat -an | grep :3001 | grep ESTABLISHED

# Surveiller la bande passante
iftop  # Linux
nload  # Linux
```

**Script de santé** :
```bash
#!/bin/bash
# health-check.sh

SERVER_IP="192.168.1.10"
PORT="3001"

# Vérifier si le serveur répond
if curl -s --connect-timeout 5 "http://$SERVER_IP:$PORT/health" > /dev/null; then
    echo "✅ Serveur accessible"
else
    echo "❌ Serveur inaccessible"
    # Envoyer une alerte
    echo "Alerte : Serveur Pacifique down" | mail -s "Alerte Serveur" admin@hotel.com
fi
```

### Maintenance préventive

**Quotidien** :
- Vérifier les logs d'erreur
- Contrôler l'espace disque
- Tester la connexion entre machines

**Hebdomadaire** :
- Redémarrer le serveur
- Nettoyer les logs anciens
- Vérifier les mises à jour

**Mensuel** :
- Sauvegarde complète
- Test de restauration
- Revue de sécurité

---

## 🚨 Procédures d'urgence

### Serveur down

1. **Vérifier l'alimentation et le réseau**
2. **Redémarrer la machine**
3. **Démarrer manuellement l'application** :
   ```bash
   cd /chemin/vers/Pacifique-app
   npm run server
   ```
4. **Si problème persiste** :
   ```bash
   # Restaurer depuis sauvegarde
   tar -xzf /backups/pacifique-derniere.tar.gz -C /chemin/vers/
   ```

### Perte de données

1. **Arrêter immédiatement l'application**
2. **Ne pas écrire sur le disque**
3. **Restaurer depuis sauvegarde** :
   ```bash
   # Trouver la dernière bonne sauvegarde
   ls -la /backups/pacifique-*.tar.gz
   
   # Restaurer
   tar -xzf /backups/pacifique-20260101.tar.gz -C /chemin/vers/Pacifique-app/
   ```

### Attaque réseau

1. **Déconnecter du réseau**
2. **Changer tous les mots de passe**
3. **Analyser les logs** :
   ```bash
   grep -i "failed\|error\|attack" /var/log/pacifique/*.log
   ```
4. **Restaurer système propre**

---

## 📞 Support technique

### Informations à fournir

En cas de problème, fournir :
1. **Configuration réseau** :
   ```
   Serveur IP : 192.168.1.10
   Client IP : 192.168.1.20
   Routeur : TP-Link Archer C7
   ```
2. **Logs d'erreur** :
   ```bash
   tail -100 /chemin/vers/Pacifique-app/server.log
   ```
3. **Capture réseau** (optionnel) :
   ```bash
   tcpdump -i any port 3001 -w capture.pcap
   ```

### Contacts

- **Support technique** : support@pacifique-app.com
- **Urgences 24/7** : +243 XX XXX XXX
- **Documentation** : https://docs.pacifique-app.com

---

**Note importante** : Ce guide est basé sur des scénarios typiques. Adaptez les adresses IP à votre configuration réseau réelle. Testez toujours la connectivité avant la mise en production.
 
