import { Router, Request, Response } from 'express'
import { getProduits } from '../models/store.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(getProduits().filter((p) => p.actif))
})

export default router
