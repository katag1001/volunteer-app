const router = require('express').Router()
const profileController = require('../controllers/profileController.js')
const { requireActiveMember } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.get('/me', profileController.getMyProfile)
router.put('/me', profileController.updateMyProfile)
router.delete('/me', profileController.deleteMyAccount)

module.exports = router
