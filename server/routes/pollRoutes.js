const router = require('express').Router()
const pollController = require('../controllers/pollController.js')
const { requireActiveMember } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.post('/:id/options', pollController.addPollOption)
router.post('/:id/vote', pollController.toggleVote)
router.post('/:id/close', pollController.closePoll)
router.post('/:id/reopen', pollController.reopenPoll)

module.exports = router
