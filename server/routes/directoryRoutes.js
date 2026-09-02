const router = require('express').Router()
const directoryController = require('../controllers/directoryController.js')
const { requireActiveMember } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.get('/members', directoryController.listMembers)
router.get('/members/:id', directoryController.getMember)

module.exports = router
