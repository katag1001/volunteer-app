const router = require('express').Router()
const disputeController = require('../controllers/disputeController.js')
const { requireActiveMember, requireAdmin } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.get('/', disputeController.listDisputes)
router.post('/', disputeController.createDispute)
router.get('/:id', disputeController.getDispute)
router.patch('/:id', disputeController.updateDispute)
router.delete('/:id', requireAdmin, disputeController.deleteDispute)
router.post('/:id/pick-up', disputeController.pickUpDispute)
router.post('/:id/unpick', disputeController.unpickDispute)
router.post('/:id/resolve', disputeController.resolveDispute)
router.post('/:id/reopen', disputeController.reopenDispute)

module.exports = router
