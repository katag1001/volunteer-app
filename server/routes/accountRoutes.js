const router = require('express').Router()
const accountController = require('../controllers/accountController.js')
const { requireActiveMember } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.delete('/me', accountController.deleteMyAccount)

module.exports = router
