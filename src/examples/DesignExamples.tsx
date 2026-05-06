import { useState } from 'react'
import { 
  Button, PrimaryButton, SuccessButton, DangerButton, OutlineButton,
  Card, CardHeader, CardContent, CardFooter, StatCard,
  notify, showOrderNotification, showStockAlert,
  ShoppingCart, Users, TrendingUp, Package, Bell, Settings
} from '../components/ui'
import { useAnimatedAction } from '../hooks/useAnimations'

export default function DesignExamples() {
  const [loading, setLoading] = useState(false)
  const { withSound } = useAnimatedAction()

  const handleSuccess = withSound(() => {
    notify.success('Opération réussie avec succès !')
  }, 'success')

  const handleError = withSound(() => {
    notify.error('Une erreur est survenue')
  }, 'error')

  const handleLoading = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  const handleOrder = () => {
    showOrderNotification('12', 3)
  }

  const handleStockAlert = () => {
    showStockAlert('Coca-Cola', 5)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Exemples de Design - Application Pacifique</h1>

      {/* Section Boutons */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Boutons améliorés</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <PrimaryButton onClick={handleSuccess}>
            <ShoppingCart size={16} />
            Primary
          </PrimaryButton>
          
          <SuccessButton onClick={handleSuccess}>
            Succès
          </SuccessButton>
          
          <DangerButton onClick={handleError}>
            Danger
          </DangerButton>
          
          <OutlineButton onClick={handleLoading} loading={loading}>
            {loading ? 'Chargement...' : 'Outline'}
          </OutlineButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Button size="sm" variant="primary">
            Petit
          </Button>
          
          <Button size="md" variant="success">
            Moyen
          </Button>
          
          <Button size="lg" variant="warning" icon={<Bell size={20} />}>
            Grand avec icône
          </Button>
        </div>
      </section>

      {/* Section Cartes */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Cartes animées</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Ventes du jour"
            value="125,400 FC"
            icon={<ShoppingCart size={24} />}
            trend={{ value: 12, label: 'vs hier' }}
            color="primary"
          />
          
          <StatCard
            title="Clients actifs"
            value="42"
            icon={<Users size={24} />}
            trend={{ value: 8, label: 'vs semaine dernière' }}
            color="success"
          />
          
          <StatCard
            title="Stock faible"
            value="7"
            icon={<Package size={24} />}
            color="warning"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card hoverable clickable onClick={() => notify.info('Carte cliquée !')}>
            <CardHeader
              title="Carte interactive"
              subtitle="Cliquez pour voir l'effet"
              icon={<Settings size={20} />}
              action={
                <Button size="sm" variant="outline">
                  Action
                </Button>
              }
            />
            <CardContent>
              <p className="text-gray-600">
                Cette carte a des animations au hover et au clic. 
                Elle utilise Framer Motion pour des transitions fluides.
              </p>
            </CardContent>
            <CardFooter>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline">
                  Annuler
                </Button>
                <Button size="sm" variant="primary">
                  Confirmer
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader
              title="Carte simple"
              subtitle="Sans animations"
            />
            <CardContent>
              <p className="text-gray-600">
                Cette carte n'a pas d'animations pour démontrer la différence.
                Utile pour les contenus statiques.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section Notifications */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Notifications avec sons</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="success" onClick={handleOrder}>
            <Bell size={16} />
            Commande
          </Button>
          
          <Button variant="warning" onClick={handleStockAlert}>
            <Package size={16} />
            Stock
          </Button>
          
          <Button variant="info" onClick={() => notify.info('Information importante')}>
            Info
          </Button>
          
          <Button variant="outline" onClick={() => notify.loading('Chargement en cours...')}>
            Chargement
          </Button>
        </div>
      </section>

      {/* Section Explications */}
      <section className="bg-gray-50 p-6 rounded-xl">
        <h2 className="text-2xl font-semibold mb-4">Fonctionnalités implémentées</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">🎨 Design amélioré</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Icônes Lucide au lieu d'émojis</li>
              <li>Animations fluides avec Framer Motion</li>
              <li>Sons discrets pour le feedback</li>
              <li>Thème CSS cohérent</li>
              <li>Composants réutilisables</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">⚡ Expérience utilisateur</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Feedback visuel immédiat</li>
              <li>Animations au hover et au clic</li>
              <li>États de chargement clairs</li>
              <li>Notifications contextuelles</li>
              <li>Accessibilité améliorée</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 Comment utiliser</h3>
          <p className="text-blue-700">
            Tous les composants sont disponibles dans <code>src/components/ui/</code>.
            Importez-les et utilisez-les comme dans cet exemple. Les animations
            et sons sont activés par défaut mais peuvent être désactivés.
          </p>
        </div>
      </section>
    </div>
  )
}