const Project = require('../models/Project.js')
const ProjectMember = require('../models/ProjectMember.js')
const ProjectTeam = require('../models/ProjectTeam.js')
const Issue = require('../models/Issue.js')
const IssueMember = require('../models/IssueMember.js')
const Task = require('../models/Task.js')
const TaskLink = require('../models/TaskLink.js')
const Poll = require('../models/Poll.js')
const PollOption = require('../models/PollOption.js')
const PollVote = require('../models/PollVote.js')

// prd.md §4.3 — deleting a project (only allowed once resolved). Unlike the
// user-deletion cascade (prd.md §3.6), there's no "leave historical
// attribution dangling" concept here — a deleted project's issues/tasks/
// polls have no meaning without their parent, so they're removed with it.
async function deleteProjectCascade(projectId) {
  const issues = await Issue.find({ project_id: projectId }, '_id')
  const issueIds = issues.map((issue) => issue._id)
  const tasks = await Task.find({ issue_id: { $in: issueIds } }, '_id')
  const taskIds = tasks.map((task) => task._id)
  const polls = await Poll.find({ issue_id: { $in: issueIds } }, '_id')
  const pollIds = polls.map((poll) => poll._id)
  const pollOptions = await PollOption.find({ poll_id: { $in: pollIds } }, '_id')
  const pollOptionIds = pollOptions.map((option) => option._id)

  await TaskLink.deleteMany({ task_id: { $in: taskIds } })
  await Task.deleteMany({ issue_id: { $in: issueIds } })
  await PollVote.deleteMany({ option_id: { $in: pollOptionIds } })
  await PollOption.deleteMany({ poll_id: { $in: pollIds } })
  await Poll.deleteMany({ issue_id: { $in: issueIds } })
  await IssueMember.deleteMany({ issue_id: { $in: issueIds } })
  await Issue.deleteMany({ project_id: projectId })
  await ProjectMember.deleteMany({ project_id: projectId })
  await ProjectTeam.deleteMany({ project_id: projectId })
  await Project.deleteOne({ _id: projectId })
}

module.exports = { deleteProjectCascade }
