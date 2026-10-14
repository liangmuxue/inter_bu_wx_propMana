const session = require('../store/session');
const userDisplay = require('../utils/user-display');
const { request } = require('./request');
const mock = require('../mock/patrol');
const patrolIssueFormat = require('../utils/patrol-issue-format');
const dataScope = require('../utils/data-scope');

function decorateIssueCreator(issue) {
  return patrolIssueFormat.ensureCreatorDisplay(
    issue,
    dataScope.formatUserDisplay,
    mock.getTaskExecutorId
  );
}

function decorateIssueList(list) {
  return patrolIssueFormat.ensureCreatorDisplayList(
    list,
    dataScope.formatUserDisplay,
    mock.getTaskExecutorId
  );
}

function getCurrentUser() {
  return userDisplay.normalizeUser(session.getUser());
}

module.exports = {
  getWorkbenchStats() {
    return request({
      url: '/patrol/workbench/stats',
      mockHandler: function () {
        return mock.workbenchStats(getCurrentUser());
      }
    });
  },

  getTasks(query) {
    query = query || {};
    return request({
      url: '/patrol/tasks',
      data: flattenQuery(query),
      mockHandler: function (data) {
        return mock.tasks(getCurrentUser(), data || query);
      }
    });
  },

  getTaskDetail(taskId) {
    return request({
      url: '/patrol/tasks/' + taskId,
      mockHandler: function () {
        return mock.taskDetail(taskId, getCurrentUser());
      }
    });
  },

  getSubtask(taskId, subtaskCode) {
    return request({
      url: '/patrol/tasks/' + taskId + '/subtasks/' + subtaskCode,
      mockHandler: function () {
        return mock.getSubtask(taskId, subtaskCode);
      }
    });
  },

  submitGuardCheckin(taskId, subtaskCode, payload) {
    return request({
      url: '/patrol/tasks/' + taskId + '/subtasks/' + subtaskCode + '/guard-checkin',
      method: 'POST',
      data: payload,
      mockHandler: function () {
        return mock.submitGuardCheckin(taskId, subtaskCode, payload, getCurrentUser());
      }
    });
  },

  submitRemoteResult(taskId, subtaskCode, payload) {
    return request({
      url: '/patrol/tasks/' + taskId + '/subtasks/' + subtaskCode + '/remote-result',
      method: 'POST',
      data: payload,
      mockHandler: function () {
        return mock.submitRemoteResult(taskId, subtaskCode, payload, getCurrentUser());
      }
    });
  },

  runAutoSubtask(taskId, subtaskCode) {
    return request({
      url: '/patrol/tasks/' + taskId + '/subtasks/' + subtaskCode + '/auto-run',
      method: 'POST',
      mockHandler: function () {
        // 人工入口一律拒绝；系统执行走 ensureSystemAutoSubtasks
        return mock.runAutoSubtask(taskId, subtaskCode, getCurrentUser(), { system: false });
      }
    });
  },

  applyTaskReassign(taskId, executorId, options) {
    return request({
      url: '/patrol/tasks/' + taskId + '/reassign',
      method: 'POST',
      data: Object.assign({ executorId: executorId }, options || {}),
      mockHandler: function () {
        mock.applyTaskReassign(taskId, executorId, options);
        return { ok: true };
      }
    });
  },

  urgeTask(taskId) {
    return request({
      url: '/patrol/tasks/' + taskId + '/urge',
      method: 'POST',
      mockHandler: function () {
        return mock.urgeTask(taskId, getCurrentUser());
      }
    });
  },

  listReassignCandidates(taskId) {
    return request({
      url: '/patrol/tasks/' + taskId + '/reassign-candidates',
      mockHandler: function () {
        return mock.listReassignCandidates(taskId, getCurrentUser());
      }
    });
  },

  reassignTask(taskId, executorId) {
    return request({
      url: '/patrol/tasks/' + taskId + '/reassign',
      method: 'POST',
      data: { executorId: executorId },
      mockHandler: function () {
        return mock.reassignTask(taskId, executorId, getCurrentUser());
      }
    });
  },

  getIssues(query) {
    query = query || {};
    return request({
      url: '/patrol/issues',
      data: flattenQuery(query),
      mockHandler: function (data) {
        const res = mock.issues(getCurrentUser(), data || query);
        res.list = decorateIssueList(res.list);
        res.total = res.list.length;
        return res;
      }
    });
  },

  getIssueDetail(issueNo) {
    return request({
      url: '/patrol/issues/' + issueNo,
      mockHandler: function () {
        return decorateIssueCreator(mock.issueDetail(issueNo, getCurrentUser()));
      }
    });
  },

  submitIssueRectify(issueNo, payload) {
    return request({
      url: '/patrol/issues/' + issueNo + '/rectify',
      method: 'POST',
      data: payload,
      mockHandler: function () {
        return mock.submitIssueRectify(issueNo, payload, getCurrentUser());
      }
    });
  },

  submitIssueReinspectCheckin(issueNo, pointId) {
    return request({
      url: '/patrol/issues/' + issueNo + '/reinspect-checkin',
      method: 'POST',
      data: { pointId: pointId },
      mockHandler: function () {
        return mock.submitIssueReinspectCheckin(issueNo, pointId, getCurrentUser());
      }
    });
  },

  submitIssueReinspect(issueNo, payload) {
    return request({
      url: '/patrol/issues/' + issueNo + '/reinspect',
      method: 'POST',
      data: payload,
      mockHandler: function () {
        return mock.submitIssueReinspect(issueNo, payload, getCurrentUser());
      }
    });
  },

  submitIssueReport(payload) {
    return request({
      url: '/patrol/issues/report',
      method: 'POST',
      data: payload,
      mockHandler: function () {
        return mock.submitIssueReport(payload, getCurrentUser());
      }
    });
  },

  updateIssueReport(issueNo, payload) {
    return request({
      url: '/patrol/issues/' + issueNo + '/report',
      method: 'PUT',
      data: payload,
      mockHandler: function () {
        return mock.updateIssueReport(issueNo, payload, getCurrentUser());
      }
    });
  },

  getMySchedule() {
    return request({
      url: '/patrol/schedule/my',
      mockHandler: function () {
        const user = getCurrentUser();
        return mock.mySchedule(user && user.id);
      }
    }).then(function (data) {
      return decorateSchedule(data);
    });
  }
};

function flattenQuery(query) {
  query = query || {};
  const out = {};
  Object.keys(query).forEach(function (key) {
    const value = query[key];
    if (value === undefined || value === null || value === '') return;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.keys(value).forEach(function (inner) {
        const iv = value[inner];
        if (iv === undefined || iv === null || iv === '') return;
        out[inner] = iv;
      });
    } else {
      out[key] = value;
    }
  });
  return out;
}

function decorateSchedule(data) {
  if (!data) return { teams: [], hasTeam: false, hasMyTeam: false };
  if (data.hasTeam != null) return data;
  try {
    const patrolSchedule = require('../utils/patrol-schedule');
    const user = getCurrentUser();
    const teams = data.teams || data.schedules || [];
    const view = patrolSchedule.buildMyScheduleView(teams, user && (user.personCode || user.id));
    view.hasTeam = (view.teams || []).length > 0;
    view.hasMyTeam = (view.myTeams || []).length > 0;
    const onDuty = (view.myTeams || []).filter(function (t) { return t.todayOnDuty; });
    view.todayOnDuty = onDuty.length > 0;
    view.todayDutyTeamText = onDuty.map(function (t) { return t.name; }).join('、');
    return view;
  } catch (e) {
    const teams = data.teams || [];
    return Object.assign({
      hasTeam: teams.length > 0,
      hasMyTeam: false,
      todayOnDuty: false
    }, data);
  }
}
