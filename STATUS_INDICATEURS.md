# Indicateurs de Statut - Application Pacifique

## 📊 Vue d'ensemble des indicateurs

### Dans la sidebar (bas à gauche)

```
┌─────────────────────────────────────┐
│        🟢 Temps réel actif          │
│        🟢 En ligne                  │
│        🟢 Cloud sync                │
└─────────────────────────────────────┘
```

### Signification des couleurs

| Couleur | Signification | Action requise |
|---------|---------------|----------------|
| **🟢 Vert** | Tout fonctionne normalement | Aucune |
| **🟡 Orange** | Attention, fonctionnement dégradé | Surveiller |
| **🔴 Rouge** | Problème critique | Intervention immédiate |
| **⚫ Noir** | Données périmées/erreur | Vérifier/Corriger |

---

## 🔌 Indicateurs de connexion

### 1. Temps réel (Socket.IO)

| Statut | Icône | Signification | Causes possibles |
|--------|-------|---------------|------------------|
| **🟢 Actif** | `Wifi` | Connexion Socket.IO établie | - |
| **🟡 Connexion...** | `Loader` | En cours de connexion | Démarrage, reconnexion |
| **🔴 Hors ligne** | `WifiOff` | Serveur inaccessible | Serveur down, réseau coupé |
| **🔴 Erreur réseau** | `WifiOff` | Erreur de connexion | IP incorrecte, port bloqué |

**Impact** :
- ✅ **Actif** : Commandes en temps réel, notifications instantanées
- ⚠️ **Connexion...** : Attendre la connexion
- ❌ **Hors ligne** : Mode local uniquement, pas de temps réel

### 2. Statut réseau

| Statut | Icône | Signification | Causes possibles |
|--------|-------|---------------|------------------|
| **🟢 En ligne** | `Wifi` | Serveur accessible | - |
| **🔴 Hors ligne** | `WifiOff` | Serveur inaccessible | Problème réseau |

**Impact** :
- ✅ **En ligne** : Synchronisation bidirectionnelle
- ❌ **Hors ligne** : Mode dégradé, file d'attente locale

### 3. Synchronisation cloud

| Statut | Icône | Signification | Causes possibles |
|--------|-------|---------------|------------------|
| **🟢 Cloud sync** | `Cloud` | Synchronisation active | - |
| **🟡 Sync...** | `RefreshCw` | Synchronisation en cours | Données à synchroniser |
| **🔴 Cloud off** | `CloudOff` | Pas de connexion cloud | Internet coupé, MongoDB down |

**Impact** :
- ✅ **Cloud sync** : Données sauvegardées dans le cloud
- ⚠️ **Sync...** : Attendre la fin de la sync
- ❌ **Cloud off** : Données locales uniquement

---

## 🏪 Indicateurs métier

### 1. Commandes (page Cuisine)

| Badge | Signification | Délai typique | Action |
|-------|---------------|---------------|---------|
| **🟢 Nouvelle** | Commande reçue | 0-5 min | Démarrer la préparation |
| **🟡 En préparation** | En cours | 5-15 min | Continuer |
| **🔴 En retard** | > temps estimé | >15 min | Accélérer |
| **✅ Prêt** | À servir | - | Notifier le serveur |
| **🚚 En livraison** | En route table | 1-3 min | Livrer |
| **💳 Payé** | Commande réglée | - | Archiver |

**Exemple visuel** :
```
[12:05] Table 4 - 2x Burger + 1x Frites
      🟡 En préparation (8/15 min)
      
[12:10] Table 6 - 1x Pizza Margherita
      🔴 En retard (18/15 min) ⚠️
      
[12:12] Table 2 - 1x Salade César
      ✅ Prêt à servir
```

### 2. Stock

| Niveau | Couleur | Seuil | Action |
|--------|---------|-------|---------|
| **Normal** | 🟢 Vert | > stock_min × 2 | Surveillance normale |
| **Faible** | 🟡 Orange | stock_min × 1.5 → stock_min × 2 | Commander bientôt |
| **Critique** | 🟠 Orange foncé | stock_min → stock_min × 1.5 | Commander rapidement |
| **Rupture** | 🔴 Rouge | < stock_min | Commander immédiatement |
| **Périmé** | ⚫ Noir | date_expiration dépassée | Retirer du stock |

**Exemple** :
```
Coca-Cola 33cl : 🟢 150/50 (300%)
Jus d'orange : 🟡 80/50 (160%) → Commander bientôt
Bière Primus : 🔴 20/50 (40%) → COMMANDER
Lait : ⚫ Périmé 05/05/2026 → RETIRER
```

### 3. Hébergement (chambres)

| Statut | Icône | Signification | Actions possibles |
|--------|-------|---------------|-------------------|
| **🟢 Libre** | `Bed` | Chambre disponible | Check-in |
| **🔴 Occupée** | `Bed` | Client présent | Check-out, services |
| **🟡 Nettoyage** | `Sparkles` | En nettoyage | Marquer comme propre |
| **🟠 Maintenance** | `Wrench` | En réparation | Réparer, rendre disponible |
| **🔵 Réservée** | `Calendar` | Réservée à venir | Préparer, check-in futur |

**Exemple** :
```
Chambre 101 : 🟢 Libre - 80€/nuit
Chambre 102 : 🔴 Occupée - Dupont (départ 14h)
Chambre 103 : 🟡 Nettoyage - Prévu 11h
Chambre 104 : 🟠 Maintenance - Fuite lavabo
Chambre 105 : 🔵 Réservée - Arrivée 16h
```

### 4. Performance employés

| Métrique | Excellent | Bon | À améliorer |
|----------|-----------|-----|-------------|
| **Commandes/heure** | > 8 | 5-8 | < 5 |
| **Ventes moyennes** | > 15k FC | 10-15k FC | < 10k FC |
| **Satisfaction** | > 4.8/5 | 4.5-4.8/5 | < 4.5/5 |
| **Retards** | 0% | < 5% | > 5% |

**Badges de performance** :
- 🥇 **Top vendeur** : Meilleures ventes du jour
- ⚡ **Rapide** : Temps de service < moyenne
- 💬 **Service+** : Notes clients excellentes
- 📊 **Consistant** : Performance stable

---

## 🚨 Alertes et notifications

### Types d'alertes

| Type | Son | Durée | Priorité |
|------|-----|-------|----------|
| **🔔 Nouvelle commande** | `notification` | 5s | Haute |
| **⚠️ Stock faible** | `notification` | 5s | Moyenne |
| **🚨 Rupture stock** | `error` | 7s | Critique |
| **✅ Commande prête** | `success` | 3s | Haute |
| **💳 Paiement reçu** | `success` | 3s | Basse |
| **🔴 Serveur down** | `error` | 10s | Critique |

### Où apparaissent les alertes

1. **📱 Notifications toast** : Coin supérieur droit
2. **🔔 Badge sidebar** : Nombre à côté de "Ventes"
3. **⚠️ Page Dashboard** : Section "Alertes"
4. **📧 Optionnel** : Email/SMS (si configuré)

**Exemple de notification** :
```
🍽️ NOUVELLE COMMANDE
Table 12 - 3x Plat du jour
Note : Sans gluten
Temps estimé : 20 min
```

---

## 🔄 États de l'application

### 1. Mode normal
```
✅ Serveur connecté
✅ Socket.IO actif
✅ Synchronisation cloud
✅ Données à jour
```
**Fonctionnalités** : Toutes disponibles

### 2. Mode dégradé
```
⚠️ Serveur accessible
⚠️ Socket.IO intermittent
✅ Synchronisation cloud
⚠️ Données partiellement à jour
```
**Fonctionnalités** : Limitées, file d'attente locale

### 3. Mode hors ligne
```
❌ Serveur inaccessible
❌ Socket.IO déconnecté
❌ Synchronisation cloud
⚠️ Données locales uniquement
```
**Fonctionnalités** : Travail local, sync à la reconnexion

### 4. Mode maintenance
```
🛠️ Application en maintenance
⏸️ Opérations suspendues
📋 Message personnalisé affiché
```
**Fonctionnalités** : Aucune (sauf admin)

---

## 📈 Indicateurs de performance

### Dashboard KPI

| KPI | Formule | Bon | Moyen | Mauvais |
|-----|---------|-----|-------|---------|
| **Taux occupation** | `chambres_occupées / total_chambres` | > 80% | 60-80% | < 60% |
| **Panier moyen** | `ventes_total / nb_commandes` | > 25k FC | 15-25k FC | < 15k FC |
| **Temps prépa** | `moyenne(temps_préparation)` | < 15 min | 15-25 min | > 25 min |
| **Satisfaction** | `moyenne(notes_clients)` | > 4.5/5 | 4-4.5/5 | < 4/5 |
| **Ruptures stock** | `nb_produits_rupture` | 0 | 1-3 | > 3 |

### Graphiques de performance

1. **📈 Ventes par heure** : Pic attendu 12h-14h et 19h-21h
2. **📊 Produits populaires** : Top 5 chaque jour
3. **👥 Performance serveurs** : Classement quotidien
4. **🛏️ Occupation chambres** : Tendance sur 7 jours

---

## 🛠️ Diagnostic rapide

### Arbre de décision - Problèmes de connexion

```
Début
  ↓
[Sidebar montre 🔴 Hors ligne ?]
  ↓
├── Oui → [Ping serveur fonctionne ?]
│         ↓
│         ├── Oui → [Port 3001 ouvert ?]
│         │         ↓
│         │         ├── Oui → Redémarrer l'application
│         │         └── Non → Ouvrir port firewall
│         │
│         └── Non → Vérifier réseau/câbles
│
└── Non → [🟡 Connexion... depuis longtemps ?]
          ↓
          ├── Oui → Vérifier logs serveur
          └── Non → Tout fonctionne ✅
```

### Codes d'erreur courants

| Code | Signification | Solution |
|------|---------------|----------|
| **ERR_NETWORK** | Problème réseau | Vérifier connexion, firewall |
| **ERR_CONNECTION_REFUSED** | Port fermé | Ouvrir port 3001 |
| **ERR_TIMED_OUT** | Timeout | Vérifier serveur, réseau lent |
| **ERR_NAME_NOT_RESOLVED** | DNS échoue | Utiliser IP au lieu du nom |
| **ERR_SSL_PROTOCOL_ERROR** | HTTPS problème | Vérifier certificats |

---

## 📋 Checklist de vérification quotidienne

### Ouverture
- [ ] Vérifier tous les indicateurs 🟢 dans la sidebar
- [ ] Tester une commande d'essai
- [ ] Vérifier les alertes stock
- [ ] Confirmer la connexion de toutes les machines

### Pendant la journée
- [ ] Surveiller les indicateurs de performance
- [ ] Répondre aux alertes dans les 5 minutes
- [ ] Vérifier la synchronisation régulièrement
- [ ] Noter les problèmes rencontrés

### Fermeture
- [ ] Sauvegarder les données
- [ ] Vérifier les logs d'erreur
- [ ] Planifier les commandes stock
- [ ] Préparer le rapport quotidien

---

## 🎯 Bonnes pratiques

### Pour les indicateurs
- **Ne jamais ignorer** un indicateur 🔴 rouge
- **Investiguez toujours** les indicateurs 🟡 orange
- **Documentez** les problèmes récurrents
- **Formez** le personnel à comprendre les indicateurs

### Pour la maintenance
- **Vérifiez quotidiennement** tous les indicateurs
- **Testez régulièrement** les scénarios de panne
- **Maintenez à jour** la documentation
- **Communiquez** les changements d'état

### Pour le dépannage
- **Commencez par les indicateurs** dans la sidebar
- **Utilisez l'arbre de décision** ci-dessus
- **Documentez les solutions** trouvées
- **Partagez les connaissances** avec l'équipe

---

## 📞 Support

### Quand contacter le support

| Situation | Urgence | Contact |
|-----------|---------|---------|
| **Indicateur 🔴 > 15 min** | Haute | Téléphone immédiat |
| **Données corrompues** | Haute | Téléphone + email |
| **Problème réseau persistant** | Moyenne | Email avec logs |
| **Question sur indicateurs** | Basse | Email/documentation |

### Informations à fournir

1. **Capture d'écran** des indicateurs
2. **Logs d'erreur** (F12 → Console)
3. **Configuration réseau** (IPs, routeur)
4. **Actions déjà tentées**

### Contacts
- **Support technique** : support@pacifique-app.com
- **Urgences 24/7** : +243 XX XXX XXX
- **Documentation en ligne** : https://docs.pacifique-app.com/status

---

**Dernière mise à jour** : 6 mai 2026  
**Version des indicateurs** : 2.1.0