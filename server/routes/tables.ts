import { Router, Request, Response } from 'express'
import { getTables, saveTables } from '../models/store.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(getTables())
})

router.patch('/:id/statut', (req: Request, res: Response) => {
  const tables = getTables()
  const table = tables.find((t) => t.id === req.params.id)
  if (!table) return res.status(404).json({ message: 'Table introuvable' })
  table.statut = req.body.statut
  saveTables(tables)
  res.json(table)
})

export default router
