const patrolTask = require('../../../services/patrol-task');
const pageAccess = require('../../../utils/page-access');

Page({
  data: {
    loading: true,
    schedule: null,
    teamIndex: 0,
    currentTeam: null,
    viewTab: 'team',
    previewTab: 'week'
  },

  onShow() {
    if (!pageAccess.ensureCurrentPageAccess()) return;
    this.loadSchedule();
  },

  loadSchedule() {
    this.setData({ loading: true });
    patrolTask.getMySchedule().then(function (schedule) {
      schedule = schedule || { teams: [], hasTeam: false, hasMyTeam: false };
      const teams = schedule.teams || [];
      let teamIndex = this.data.teamIndex;
      if (teams.length) {
        const preferred = teams.findIndex(function (t) { return t.isMyTeam; });
        if (preferred >= 0 && (teamIndex >= teams.length || !teams[teamIndex])) {
          teamIndex = preferred;
        } else if (teamIndex >= teams.length) {
          teamIndex = 0;
        }
      } else {
        teamIndex = 0;
      }
      const currentTeam = teams[teamIndex] || null;
      this.setData({
        loading: false,
        schedule: schedule,
        teamIndex: teamIndex,
        currentTeam: currentTeam
      });
    }.bind(this)).catch(function () {
      this.setData({ loading: false, schedule: null, currentTeam: null });
    }.bind(this));
  },

  onTeamChange(e) {
    const teamIndex = parseInt(e.detail.value, 10) || 0;
    const teams = (this.data.schedule && this.data.schedule.teams) || [];
    this.setData({
      teamIndex: teamIndex,
      currentTeam: teams[teamIndex] || null
    });
  },

  onViewTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.viewTab) return;
    this.setData({ viewTab: tab });
  },

  onPreviewTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.previewTab) return;
    this.setData({ previewTab: tab });
  },

  onPullDownRefresh() {
    this.loadSchedule();
    wx.stopPullDownRefresh();
  }
});
