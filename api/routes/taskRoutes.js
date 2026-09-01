const router = require('express').Router()
const taskController = require('../controllers/taskController.js')
const { requireActiveMember } = require('../middleware/auth.js')

router.use(requireActiveMember)

router.patch('/:id/assign', taskController.assignTask)
router.patch('/:id/status', taskController.setTaskStatus)
router.post('/:id/resolve', taskController.resolveTask)
router.post('/:id/links', taskController.addTaskLink)

module.exports = router
