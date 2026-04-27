import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentesStore } from '../../store/ventesStore'
import type { Table } from '../../store/ventesStore'
import './PlanSalle.css'

const STATUT_CONFIG = {
  libre:     { label: 'Libre',      color: '#22c55e' },
  occupee:   { label: 'Occupée',    color: '#ef4444' },
  reservee:  { label: 'Réservée',   color: '#3b82f6' },
  nettoyage: { label: 'Nettoyage',  color: '#f59e0b' },
}

const ZONES = ['salle', 'terrasse', 'bar'] as const

export default function PlanSalle() {
  const { tables, fetchTables, selectionnerTable } = useVentesStore()
  const navigate = useNavigate()

  useEffect(() => { fetchTables() }, [])

  function handleSelectTable(table: Table) {
    if (table.statut === 'libre') {
      selectionnerTable(table)
      navigate('/ventes/commande')
    }
  }

  return (
    <div className="plan-salle">
      <div className="plan-header">
        <h2>Plan de salle</h2>
        <div className="legende">
          {Object.entries(STATUT_CONFIG).map(([key, val]) => (
            <div key={key} className="legende-item">
              <span className="legende-dot" style={{ background: val.color }} />
              <span>{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {ZONES.map((zone) => {
        const tablesZone = tables.filter((t) => t.zone === zone)
        if (tablesZone.length === 0) return null
        return (
          <div key={zone} className="zone-section">
            <h3 className="zone-titre">{zone.charAt(0).toUpperCase() + zone.slice(1)}</h3>
            <div className="tables-grid">
              {tablesZone.map((table) => {
                const config = STATUT_CONFIG[table.statut]
                return (
                  <button
                    key={table.id}
                    className={`table-tile ${table.statut === 'libre' ? 'clickable' : 'non-clickable'}`}
                    style={{ borderColor: config.color, background: `${config.color}18` }}
                    onClick={() => handleSelectTable(table)}
                    title={table.statut !== 'libre' ? `Table ${table.statut}` : 'Cliquer pour commander'}
                  >
                    <div className="table-numero" style={{ color: config.color }}>
                      Table {table.numero}
                    </div>
                    <div className="table-capacite">{table.capacite} pers.</div>
                    <div className="table-statut" style={{ color: config.color }}>
                      {config.label}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
